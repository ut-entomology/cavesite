import { type DB } from '../integrations/postgres';
import { LocationEffort } from '../effort/location_effort';
import { type SeedSpec, DissimilarityMetric } from '../../shared/model';
import {
  type TaxonTallyMap,
  type ClusterInfo,
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
  let clusterInfos: ClusterInfo[] = [];
  let nextTaxonTalliesByCluster: TaxonTallyMap[] = [];

  // Establish the initial clusters based on the seed locations.

  const seedEfforts = await LocationEffort.getByLocationIDs(db, seedIDs);
  for (let i = 0; i < seedIDs.length; ++i) {
    const seedEffort = seedEfforts[i];
    clusterByLocationID[seedEffort.locationID] = i;
    const taxonTallyMap = tallyTaxa(seedEffort);
    clusterInfos.push({
      taxonTallyMap,
      initialScore: metricCalculator.initialClusterScore(seedEffort)
    });
    nextTaxonTalliesByCluster.push(Object.assign({}, taxonTallyMap)); // copy
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
  while (locationEfforts.length > 0) {
    for (const locationEffort of locationEfforts) {
      if (!seedIDs.includes(locationEffort.locationID)) {
        const effortTaxaTallies = tallyTaxa(locationEffort);
        const nearestClusterIndex = _getNearestClusterIndex(
          clusterInfos,
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
    for (let i = 0; i < clusterInfos.length; ++i) {
      clusterInfos[i].taxonTallyMap = nextTaxonTalliesByCluster[i];
    }
    nextTaxonTalliesByCluster = [];
    clusterInfos.forEach((_) => nextTaxonTalliesByCluster.push({}));
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
          clusterInfos,
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

  const locationIDsByCluster: number[][] = clusterInfos.map((_) => []);
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
  const allSeedsTallyMap: TaxonTallyMap = {};

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
      _updateTaxonTallies(allSeedsTallyMap, tallyTaxa(firstSeedLocation));
      if (seedSpec.maxClusters == 1) {
        // continuing from here could add a 2nd cluster within this loop iteration
        return seedIDs;
      }
    }

    // Each subsequent seed location is the one with the greated dissimilarity
    // from all previously selected seed locations.

    const metricCalculator = DissimilarityCalculator.create(seedSpec.metric);
    let maxDissimilaritySoFar =
      metricCalculator.greatestLowerDissimilarity(firstSeedLocation);
    let seedIDForMaxDissimilarity = 0;
    let effortForMaxDissimilarity: LocationEffort;

    const _TEMP_clusterInfo: ClusterInfo = {
      taxonTallyMap: allSeedsTallyMap,
      initialScore: 0
    };
    while (locationEfforts.length > 0) {
      // Process efforts of the batch, looking for the next seed location
      // that is most dissimilar to prior seed locations.

      for (const locationEffort of locationEfforts) {
        if (!seedIDs.includes(locationEffort.locationID)) {
          const locationTaxonMap = tallyTaxa(locationEffort);
          const dissimilarity = metricCalculator.calc(
            _TEMP_clusterInfo,
            locationTaxonMap,
            locationEffort
          );
          if (dissimilarity > maxDissimilaritySoFar) {
            maxDissimilaritySoFar = dissimilarity;
            seedIDForMaxDissimilarity = locationEffort.locationID;
            effortForMaxDissimilarity = locationEffort;
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

    if (seedIDForMaxDissimilarity != 0) {
      seedIDs.push(seedIDForMaxDissimilarity);
      _updateTaxonTallies(allSeedsTallyMap, tallyTaxa(effortForMaxDissimilarity!));
    } else {
      break; // no more seed locations found meeting the criteria
    }
  }

  return seedIDs;
}

function _getNearestClusterIndex(
  clusterInfos: ClusterInfo[],
  taxonTallyMap: TaxonTallyMap,
  locationEffort: LocationEffort,
  currentClusterIndex: number,
  metricCalculator: DissimilarityCalculator
): number {
  //console.log('**** locationID', effort.locationID, 'effortTaxa', effortTaxa);

  // Collect into indexesForMinDissimilarity the indexes of all clusters
  // having the least dissimilarity to the taxa of the provided effort,
  // with the taxa having the same dissimilarity wrt each of these clusters.

  let minDissimilaritySoFar = 0;
  let indexesForMinDissimilarity: number[] = [];
  for (let i = 0; i < clusterInfos.length; ++i) {
    const dissimilarity = metricCalculator.calc(
      clusterInfos[i],
      taxonTallyMap,
      locationEffort
    );
    if (dissimilarity == minDissimilaritySoFar) {
      indexesForMinDissimilarity.push(i);
    } else if (dissimilarity < minDissimilaritySoFar) {
      indexesForMinDissimilarity = [i];
      minDissimilaritySoFar = dissimilarity;
    }
    // console.log(
    //   '**** -- similarityCount',
    //   similarityCount,
    //   '\n        taxaInCluster',
    //   taxaInCluster,
    //   '\n        indexesForMinDissimilarityCount',
    //   indexesForMinDissimilarityCount,
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
  if (indexesForMinDissimilarity.length == 1) {
    nextClusterIndex = indexesForMinDissimilarity[0]; // small performance benefit
  } else if (indexesForMinDissimilarity.includes(currentClusterIndex)) {
    nextClusterIndex = currentClusterIndex;
  } else {
    nextClusterIndex = Math.floor(Math.random() * indexesForMinDissimilarity.length);
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
