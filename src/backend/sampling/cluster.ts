import { type DB } from '../integrations/postgres';
import { LocationEffort } from '../sampling/location_effort';
import { DistanceMeasure, type SeedSpec } from '../../shared/model';

const EFFORT_BATCH_SIZE = 100;
const HARD_UPPER_BOUND_SPECIES_COUNT = 50000; // assumes no cave has more

type IncludedTaxa = Record<string, number>;

export async function getClusteredLocationIDs(
  db: DB,
  distanceMeasure: DistanceMeasure,
  seedIDs: number[]
): Promise<number[][]> {
  console.log(
    '**** #### starting getClusteredLocationIDs ###################################'
  );
  // Node.js's V8 engine should end up using sparse arrays of location IDs.
  const clusterByLocationID: Record<number, number> = [];
  let includedTaxaByCluster: IncludedTaxa[] = [];
  let nextIncludedTaxaByCluster: IncludedTaxa[] = [];

  // Establish the initial clusters based on the seed locations.

  const seedEfforts = await LocationEffort.getByLocationIDs(db, seedIDs);
  for (let i = 0; i < seedIDs.length; ++i) {
    const seedEffort = seedEfforts[i];
    clusterByLocationID[seedEffort.locationID] = i;
    includedTaxaByCluster.push(_includeTaxa({}, seedEffort));
  }

  // Provide an initial assignment of each location to its nearest cluster,
  // all the while preparing nextIncludedTaxaByCluster for use in reassignment.

  let skipCount = 0;
  let efforts = await _getNextBatchToCluster(db, skipCount);
  for (const seedTaxa of includedTaxaByCluster) {
    nextIncludedTaxaByCluster.push(Object.assign({}, seedTaxa));
  }
  while (efforts.length > 0) {
    for (const effort of efforts) {
      if (!seedIDs.includes(effort.locationID)) {
        const [nearestClusterIndex, effortTaxa] = _getNearestClusterIndex(
          distanceMeasure,
          includedTaxaByCluster,
          effort,
          -1 // force assignment to a cluster
        );
        clusterByLocationID[effort.locationID] = nearestClusterIndex;
        Object.assign(nextIncludedTaxaByCluster[nearestClusterIndex], effortTaxa);
      }
    }
    skipCount += efforts.length;
    efforts = await _getNextBatchToCluster(db, skipCount);
  }
  console.log('**** initial clusters', clusterByLocationID);

  // Loop reassigning the clusters of locations until none are reassigned.

  let firstPass = true; // first pass is required to evaluate initial assignments
  let reassigned = false;
  while (reassigned || firstPass) {
    firstPass = false;
    includedTaxaByCluster = nextIncludedTaxaByCluster;
    nextIncludedTaxaByCluster = [];
    includedTaxaByCluster.forEach((_) => nextIncludedTaxaByCluster.push({}));
    console.log('**** initial cluster taxa', includedTaxaByCluster);

    // Examine every location for possible assignment to a different cluster, all
    // the while preparing nextIncludedTaxaByCluster for use in the next pass.

    let skipCount = 0;
    let efforts = await _getNextBatchToCluster(db, skipCount);
    while (efforts.length > 0) {
      for (const effort of efforts) {
        const currentClusterIndex = clusterByLocationID[effort.locationID];
        const [nearestClusterIndex, effortTaxa] = _getNearestClusterIndex(
          distanceMeasure,
          includedTaxaByCluster,
          effort,
          currentClusterIndex
        );
        if (nearestClusterIndex != currentClusterIndex) {
          clusterByLocationID[effort.locationID] = nearestClusterIndex;
          Object.assign(nextIncludedTaxaByCluster[nearestClusterIndex], effortTaxa);
          reassigned = true;
          console.log(
            '****',
            effort.locationID,
            'changed cluster',
            clusterByLocationID
          );
        }
      }
      skipCount += efforts.length;
      efforts = await _getNextBatchToCluster(db, skipCount);
    }
  }

  // Convert sparse array to arrays of location IDs indexed by cluster index.

  const locationIDsByCluster: number[][] = includedTaxaByCluster.map((_) => []);
  for (const [locationID, clusterIndex] of Object.entries(clusterByLocationID)) {
    locationIDsByCluster[clusterIndex].push(parseInt(locationID));
  }
  return locationIDsByCluster;
}

export async function getDiverseSeeds(db: DB, seedSpec: SeedSpec): Promise<number[]> {
  const seedIDs: number[] = [];
  const includedTaxa: IncludedTaxa = {};

  // Find each seed location, up to the maximum seeds allowed.

  while (seedIDs.length < seedSpec.maxClusters) {
    // Get the first batch of efforts for the search for the next seed location.
    // Efforts are sorted by total number of species, most species found first.

    let skipCount = 0;
    let efforts = await LocationEffort.getNextBatch(
      db,
      seedSpec.minSpecies,
      seedSpec.maxSpecies,
      skipCount,
      EFFORT_BATCH_SIZE
    );
    if (efforts.length == 0) return []; // no efforts in which to find seeds

    // The very first seed location is the one with the most species.

    if (seedIDs.length == 0) {
      seedIDs.push(efforts[0].locationID);
      _includeTaxa(includedTaxa, efforts[0]);
    }

    // Each subsequent seed location is the one with the largest number of
    // taxa different from those found in all previous seed locations.

    let maxDistinctTaxa = 0;
    let seedIDForMaxDistinctTaxa = 0;
    let effortForMaxDistinctTaxa: LocationEffort;
    while (efforts.length > 0) {
      // Process efforts of the batch, looking for the next seed location
      // that is most differently diverse from prior seed locations.

      for (const effort of efforts) {
        if (effort.totalSpecies <= maxDistinctTaxa) {
          // Short-circuit the search when not possible to beat maxDistinctTaxa.
          // Efforts are retrieved ordered most-diverse first to allow this.
          skipCount = Infinity;
          break;
        }
        if (!seedIDs.includes(effort.locationID)) {
          const effortTaxa = _includeTaxa({}, effort);
          let newTaxaCount = 0;
          for (const effortTaxon of Object.keys(effortTaxa)) {
            if (includedTaxa[effortTaxon] === undefined) ++newTaxaCount;
          }
          if (newTaxaCount > maxDistinctTaxa) {
            maxDistinctTaxa = newTaxaCount;
            seedIDForMaxDistinctTaxa = effort.locationID;
            effortForMaxDistinctTaxa = effort;
          }
        }
      }

      // Retrieve the next batch of efforts to examine for seed locations,
      // if we're not short-circuiting the present search.

      if (skipCount === Infinity) {
        efforts = []; // end the search for this next seed location
      } else {
        skipCount += efforts.length;
        efforts = await LocationEffort.getNextBatch(
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

    if (seedIDForMaxDistinctTaxa != 0) {
      seedIDs.push(seedIDForMaxDistinctTaxa);
      _includeTaxa(includedTaxa, effortForMaxDistinctTaxa!);
    } else {
      break; // no more seed locations found meeting the criteria
    }
  }

  return seedIDs;
}

function _collectRankTaxa(
  includedTaxa: IncludedTaxa,
  rankValue: number,
  taxaString: string | null
): void {
  if (taxaString === null) return;
  taxaString.split('|').forEach((taxon) => (includedTaxa[taxon] = rankValue));
}

function _getNearestClusterIndex(
  distanceMeasure: DistanceMeasure,
  includedTaxaByCluster: IncludedTaxa[],
  effort: LocationEffort,
  currentClusterIndex: number
): [number, IncludedTaxa] {
  const effortTaxa = _includeTaxa({}, effort);
  console.log('**** locationID', effort.locationID, 'effortTaxa', effortTaxa);
  const taxa = Object.keys(effortTaxa);

  // Collect into indexesForMaxSimilarityCount the indexes of all clusters
  // having the greatest similarity to the taxa of the provided effort,
  // with the taxa having the same similarity to each of these clusters.

  let maxSimilarityCount = 0;
  let indexesForMaxSimilarityCount: number[] = [];
  for (let i = 0; i < includedTaxaByCluster.length; ++i) {
    const taxaInCluster = includedTaxaByCluster[i];
    let similarityCount = 0;
    for (const taxon of taxa) {
      const weight = taxaInCluster[taxon];
      if (weight !== undefined) {
        similarityCount +=
          distanceMeasure == DistanceMeasure.weightedCommonTaxa ? weight : 1;
      }
    }
    if (similarityCount == maxSimilarityCount) {
      indexesForMaxSimilarityCount.push(i);
    } else if (similarityCount > maxSimilarityCount) {
      indexesForMaxSimilarityCount = [i];
      maxSimilarityCount = similarityCount;
    }
    console.log(
      '**** -- similarityCount',
      similarityCount,
      '\n        taxaInCluster',
      taxaInCluster,
      '\n        indexesForMaxSimilarityCount',
      indexesForMaxSimilarityCount,
      '\n        maxSimilarityCount',
      maxSimilarityCount
    );
  }

  // Randomly assign the location assigned with the effort to one of the
  // clusters to which its taxa are equally similar. The assignment is
  // random to ensure that no cluster is incidentally biased. If the location
  // is already assigned to one of the possible clusters, keep it there to
  // prevent the algorithm for forever randomly reassigning locations.

  let nextClusterIndex: number;
  if (indexesForMaxSimilarityCount.length == 1) {
    nextClusterIndex = indexesForMaxSimilarityCount[0]; // small performance benefit
  } else if (indexesForMaxSimilarityCount.includes(currentClusterIndex)) {
    nextClusterIndex = currentClusterIndex;
  } else {
    nextClusterIndex = Math.floor(Math.random() * indexesForMaxSimilarityCount.length);
  }
  return [nextClusterIndex, effortTaxa];
}

async function _getNextBatchToCluster(
  db: DB,
  skipCount: number
): Promise<LocationEffort[]> {
  return await LocationEffort.getNextBatch(
    db,
    0, // don't restrict by species count
    HARD_UPPER_BOUND_SPECIES_COUNT,
    skipCount,
    EFFORT_BATCH_SIZE
  );
}

function _includeTaxa(
  includedTaxa: IncludedTaxa,
  effort: LocationEffort
): IncludedTaxa {
  _collectRankTaxa(includedTaxa, 0, effort.kingdomNames);
  _collectRankTaxa(includedTaxa, 1, effort.phylumNames);
  _collectRankTaxa(includedTaxa, 2, effort.classNames);
  _collectRankTaxa(includedTaxa, 3, effort.orderNames);
  _collectRankTaxa(includedTaxa, 4, effort.familyNames);
  _collectRankTaxa(includedTaxa, 5, effort.genusNames);
  _collectRankTaxa(includedTaxa, 6, effort.speciesNames);
  _collectRankTaxa(includedTaxa, 7, effort.subspeciesNames);
  return includedTaxa;
}
