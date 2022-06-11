import { type DB } from '../integrations/postgres';
import { LocationEffort } from '../effort/location_effort';
import { type SeedSpec, DissimilarityMetric } from '../../shared/model';
import {
  type TaxonTallyMap,
  DissimilarityCalculator,
  tallyTaxa
} from './metric_calculator';

// TODO: Find a memory locate that occasionally bombs node.js, which
// I suspect started occurring after creating this module.

const EFFORT_BATCH_SIZE = 100;

export async function getClusteredLocationIDs(
  db: DB,
  metric: DissimilarityMetric,
  seedIDs: number[],
  minSpecies: number,
  maxSpecies: number
): Promise<number[][]> {
  // console.log(
  //   '**** #### starting getClusteredLocationIDs ###################################'
  // );

  const metricCalculator = DissimilarityCalculator.create(metric);

  // Node.js's V8 engine should end up using sparse arrays of location IDs.
  const clusterByLocationID: Record<number, number> = [];
  let taxaTalliesByCluster: TaxonTallyMap[] = [];
  let nextTaxonTalliesByCluster: TaxonTallyMap[] = [];

  // Establish the initial clusters based on the seed locations.

  const seedEfforts = await LocationEffort.getByLocationIDs(db, seedIDs);
  for (let i = 0; i < seedIDs.length; ++i) {
    const seedEffort = seedEfforts[i];
    clusterByLocationID[seedEffort.locationID] = i;
    taxaTalliesByCluster.push(tallyTaxa(seedEffort));
  }

  // Provide an initial assignment of each location to its nearest cluster,
  // all the while preparing nextTaxonTalliesByCluster for use in reassignment.

  let skipCount = 0;
  let locationEfforts = await _getNextBatchToCluster(
    db,
    minSpecies,
    maxSpecies,
    skipCount
  );
  for (const seedTaxa of taxaTalliesByCluster) {
    nextTaxonTalliesByCluster.push(Object.assign({}, seedTaxa)); // copy
  }
  while (locationEfforts.length > 0) {
    for (const locationEffort of locationEfforts) {
      if (!seedIDs.includes(locationEffort.locationID)) {
        const effortTaxaTallies = tallyTaxa(locationEffort);
        const nearestClusterIndex = _getNearestClusterIndex(
          taxaTalliesByCluster,
          effortTaxaTallies,
          locationEffort,
          -1, // force assignment to a cluster
          metricCalculator
        );
        clusterByLocationID[locationEffort.locationID] = nearestClusterIndex;
        _updateTaxonTallies(
          nextTaxonTalliesByCluster[nearestClusterIndex],
          effortTaxaTallies
        );
      }
    }
    skipCount += locationEfforts.length;
    locationEfforts = await _getNextBatchToCluster(
      db,
      minSpecies,
      maxSpecies,
      skipCount
    );
  }
  //console.log('**** initial clusters', clusterByLocationID);

  // Loop reassigning the clusters of locations until none are reassigned.

  let firstPass = true; // first pass is required to evaluate initial assignments
  let reassigned = false;
  while (reassigned || firstPass) {
    firstPass = false;
    reassigned = false;
    taxaTalliesByCluster = nextTaxonTalliesByCluster;
    nextTaxonTalliesByCluster = [];
    taxaTalliesByCluster.forEach((_) => nextTaxonTalliesByCluster.push({}));
    //console.log('**** initial cluster taxa', taxaTalliesByCluster);

    // Examine every location for possible assignment to a different cluster, all
    // the while preparing nextTaxonTalliesByCluster for use in the next pass.

    let skipCount = 0;
    let locationEfforts = await _getNextBatchToCluster(
      db,
      minSpecies,
      maxSpecies,
      skipCount
    );
    while (locationEfforts.length > 0) {
      for (const locationEffort of locationEfforts) {
        const effortTaxaTallies = tallyTaxa(locationEffort);
        const currentClusterIndex = clusterByLocationID[locationEffort.locationID];
        const nearestClusterIndex = _getNearestClusterIndex(
          taxaTalliesByCluster,
          effortTaxaTallies,
          locationEffort,
          currentClusterIndex,
          metricCalculator
        );
        if (nearestClusterIndex != currentClusterIndex) {
          clusterByLocationID[locationEffort.locationID] = nearestClusterIndex;

          reassigned = true;
          // console.log(
          //   '****',
          //   effort.locationID,
          //   'changed cluster',
          //   clusterByLocationID
          // );
        }
        _updateTaxonTallies(
          nextTaxonTalliesByCluster[nearestClusterIndex],
          effortTaxaTallies
        );
      }
      skipCount += locationEfforts.length;
      locationEfforts = await _getNextBatchToCluster(
        db,
        minSpecies,
        maxSpecies,
        skipCount
      );
    }
  }

  // Convert sparse array to arrays of location IDs indexed by cluster index.

  const locationIDsByCluster: number[][] = taxaTalliesByCluster.map((_) => []);
  for (const [locationID, clusterIndex] of Object.entries(clusterByLocationID)) {
    locationIDsByCluster[clusterIndex].push(parseInt(locationID));
  }
  return locationIDsByCluster;
}

export async function getSeedLocationIDs(
  db: DB,
  seedSpec: SeedSpec
): Promise<number[]> {
  const seedIDs: number[] = [];
  const modeTallyMap: TaxonTallyMap = {};

  // Find each seed location, up to the maximum seeds allowed.

  while (seedIDs.length < seedSpec.maxClusters) {
    // Get the first batch of efforts for the search for the next seed location.
    // Efforts are sorted by total number of species, most species found first.

    let skipCount = 0;
    let locationEfforts = await LocationEffort.getNextBatch(
      db,
      seedSpec.minSpecies,
      seedSpec.maxSpecies,
      skipCount,
      EFFORT_BATCH_SIZE
    );
    if (locationEfforts.length == 0) return []; // no efforts in which to find seeds

    // The very first seed location is the one with the most species.

    const firstSeedLocation = locationEfforts[0];
    if (seedIDs.length == 0) {
      seedIDs.push(firstSeedLocation.locationID);
      _updateTaxonTallies(modeTallyMap, tallyTaxa(firstSeedLocation));
      if (seedSpec.maxClusters == 1) {
        // continuing from here could add a 2nd cluster within this loop iteration
        return seedIDs;
      }
    }

    // Each subsequent seed location is the one with the least similarity
    // to all previously selected seed locations.

    const metricCalculator = DissimilarityCalculator.create(seedSpec.metric);
    let minSimilarity = metricCalculator.leastUpperSimilarity(firstSeedLocation);
    let seedIDForMinSimilarity = 0;
    let effortForMinSimilarity: LocationEffort;

    while (locationEfforts.length > 0) {
      // Process efforts of the batch, looking for the next seed location
      // that is most dissimilar to prior seed locations.

      for (const locationEffort of locationEfforts) {
        if (metricCalculator.canShortcutSeeding(minSimilarity, locationEffort)) {
          // Short-circuit the search when not possible to beat minSimilarity.
          // Efforts are retrieved ordered most-diverse first to allow this.
          skipCount = Infinity;
          break;
        }
        if (!seedIDs.includes(locationEffort.locationID)) {
          const locationTaxonTallies = Object.values(tallyTaxa(locationEffort));
          const similarity = metricCalculator.calc(
            modeTallyMap,
            locationTaxonTallies,
            locationEffort
          );
          if (similarity < minSimilarity) {
            minSimilarity = similarity;
            seedIDForMinSimilarity = locationEffort.locationID;
            effortForMinSimilarity = locationEffort;
          }
        }
      }

      // Retrieve the next batch of efforts to examine for seed locations,
      // if we're not short-circuiting the present search.

      if (skipCount === Infinity) {
        locationEfforts = []; // end the search for this next seed location
      } else {
        skipCount += locationEfforts.length;
        locationEfforts = await LocationEffort.getNextBatch(
          db,
          seedSpec.minSpecies,
          seedSpec.maxSpecies,
          skipCount,
          EFFORT_BATCH_SIZE
        );
      }
    }

    // If we found another seed location, add it to the list and update the
    // set of all taxa against which to compare subsequent potential seeds.

    if (seedIDForMinSimilarity != 0) {
      seedIDs.push(seedIDForMinSimilarity);
      _updateTaxonTallies(modeTallyMap, tallyTaxa(effortForMinSimilarity!));
    } else {
      break; // no more seed locations found meeting the criteria
    }
  }

  return seedIDs;
}

function _getNearestClusterIndex(
  taxaTalliesByCluster: TaxonTallyMap[],
  taxonTallyMap: TaxonTallyMap,
  locationEffort: LocationEffort,
  currentClusterIndex: number,
  metricCalculator: DissimilarityCalculator
): number {
  //console.log('**** locationID', effort.locationID, 'effortTaxa', effortTaxa);
  const effortTallies = Object.values(taxonTallyMap);

  // Collect into indexesForMaxSimilarity the indexes of all clusters
  // having the greatest similarity to the taxa of the provided effort,
  // with the taxa having the same similarity to each of these clusters.

  let maxSimilarity = 0;
  let indexesForMaxSimilarity: number[] = [];
  for (let i = 0; i < taxaTalliesByCluster.length; ++i) {
    const similarity = metricCalculator.calc(
      taxaTalliesByCluster[i],
      effortTallies,
      locationEffort
    );
    if (similarity == maxSimilarity) {
      indexesForMaxSimilarity.push(i);
    } else if (similarity > maxSimilarity) {
      indexesForMaxSimilarity = [i];
      maxSimilarity = similarity;
    }
    // console.log(
    //   '**** -- similarityCount',
    //   similarityCount,
    //   '\n        taxaInCluster',
    //   taxaInCluster,
    //   '\n        indexesForMaxSimilarityCount',
    //   indexesForMaxSimilarityCount,
    //   '\n        maxSimilarityCount',
    //   maxSimilarityCount
    // );
  }

  // Randomly assign the location assigned with the effort to one of the
  // clusters to which its taxa are equally similar. The assignment is
  // random to ensure that no cluster is incidentally biased. If the location
  // is already assigned to one of the possible clusters, keep it there to
  // prevent the algorithm for forever randomly reassigning locations.

  let nextClusterIndex: number;
  if (indexesForMaxSimilarity.length == 1) {
    nextClusterIndex = indexesForMaxSimilarity[0]; // small performance benefit
  } else if (indexesForMaxSimilarity.includes(currentClusterIndex)) {
    nextClusterIndex = currentClusterIndex;
  } else {
    nextClusterIndex = Math.floor(Math.random() * indexesForMaxSimilarity.length);
  }
  return nextClusterIndex;
}

async function _getNextBatchToCluster(
  db: DB,
  minSpecies: number,
  maxSpecies: number,
  skipCount: number
): Promise<LocationEffort[]> {
  return await LocationEffort.getNextBatch(
    db,
    minSpecies,
    maxSpecies,
    skipCount,
    EFFORT_BATCH_SIZE
  );
}

function _updateTaxonTallies(
  tallies: TaxonTallyMap,
  fromTallies: TaxonTallyMap
): TaxonTallyMap {
  for (const tally of Object.values(fromTallies)) {
    if (tallies[tally.taxonUnique] === undefined) {
      tallies[tally.taxonUnique] = Object.assign({}, tally);
    } else {
      tallies[tally.taxonUnique].count += 1;
    }
  }
  return tallies;
}
