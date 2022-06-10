import { type DB } from '../integrations/postgres';
import { LocationEffort } from '../effort/location_effort';
import { TaxonWeight, type SeedSpec } from '../../shared/model';

// TODO: Find a memory locate that occasionally bombs node.js, which
// I suspect started occurring after creating this module.

const EFFORT_BATCH_SIZE = 100;

type TaxonTallies = Record<string, number>; // accumulated weight for taxa

export async function getClusteredLocationIDs(
  db: DB,
  //similarityMetric: SimilarityMetric,
  taxonWeight: TaxonWeight | null,
  seedIDs: number[],
  minSpecies: number,
  maxSpecies: number
): Promise<number[][]> {
  // console.log(
  //   '**** #### starting getClusteredLocationIDs ###################################'
  // );
  let isSpeciesMetric = false;
  let toTaxonWeights = _toUnweightedValues;
  if (isSpeciesMetric) {
    switch (taxonWeight) {
      case TaxonWeight.weighted:
        toTaxonWeights = _toWeightedValues;
        break;
      case TaxonWeight.doubleWeight:
        toTaxonWeights = _toDoubleWeightedValues;
        break;
    }
  }

  // Node.js's V8 engine should end up using sparse arrays of location IDs.
  const clusterByLocationID: Record<number, number> = [];
  let taxaTalliesByCluster: TaxonTallies[] = [];
  let nextTaxonTalliesByCluster: TaxonTallies[] = [];

  // Establish the initial clusters based on the seed locations.

  const seedEfforts = await LocationEffort.getByLocationIDs(db, seedIDs);
  for (let i = 0; i < seedIDs.length; ++i) {
    const seedEffort = seedEfforts[i];
    clusterByLocationID[seedEffort.locationID] = i;
    taxaTalliesByCluster.push(toTaxonWeights(seedEffort));
  }

  // Provide an initial assignment of each location to its nearest cluster,
  // all the while preparing nextTaxonTalliesByCluster for use in reassignment.

  let skipCount = 0;
  let efforts = await _getNextBatchToCluster(db, minSpecies, maxSpecies, skipCount);
  for (const seedTaxa of taxaTalliesByCluster) {
    nextTaxonTalliesByCluster.push(Object.assign({}, seedTaxa)); // copy
  }
  while (efforts.length > 0) {
    for (const effort of efforts) {
      if (!seedIDs.includes(effort.locationID)) {
        const effortWeights = toTaxonWeights(effort);
        const nearestClusterIndex = _getNearestClusterIndex(
          taxaTalliesByCluster,
          effortWeights,
          -1 // force assignment to a cluster
        );
        clusterByLocationID[effort.locationID] = nearestClusterIndex;
        _updateTaxonTallies(
          nextTaxonTalliesByCluster[nearestClusterIndex],
          effortWeights
        );
      }
    }
    skipCount += efforts.length;
    efforts = await _getNextBatchToCluster(db, minSpecies, maxSpecies, skipCount);
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
    let efforts = await _getNextBatchToCluster(db, minSpecies, maxSpecies, skipCount);
    while (efforts.length > 0) {
      for (const effort of efforts) {
        const effortWeights = toTaxonWeights(effort);
        const currentClusterIndex = clusterByLocationID[effort.locationID];
        const nearestClusterIndex = _getNearestClusterIndex(
          taxaTalliesByCluster,
          effortWeights,
          currentClusterIndex
        );
        if (nearestClusterIndex != currentClusterIndex) {
          clusterByLocationID[effort.locationID] = nearestClusterIndex;

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
          effortWeights
        );
      }
      skipCount += efforts.length;
      efforts = await _getNextBatchToCluster(db, minSpecies, maxSpecies, skipCount);
    }
  }

  // Convert sparse array to arrays of location IDs indexed by cluster index.

  const locationIDsByCluster: number[][] = taxaTalliesByCluster.map((_) => []);
  for (const [locationID, clusterIndex] of Object.entries(clusterByLocationID)) {
    locationIDsByCluster[clusterIndex].push(parseInt(locationID));
  }
  return locationIDsByCluster;
}

export async function getDiverseSeeds(db: DB, seedSpec: SeedSpec): Promise<number[]> {
  const seedIDs: number[] = [];
  const taxonTallies: TaxonTallies = {};

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
      _updateTaxonTallies(taxonTallies, _toUnweightedValues(efforts[0]));
      if (seedSpec.maxClusters == 1) {
        // continuing from here could add a 2nd cluster within this loop iteration
        return seedIDs;
      }
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
          const effortTaxa = _toUnweightedValues(effort);
          let newTaxaCount = 0;
          for (const effortTaxon of Object.keys(effortTaxa)) {
            if (taxonTallies[effortTaxon] === undefined) ++newTaxaCount;
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
      _updateTaxonTallies(taxonTallies, _toUnweightedValues(effortForMaxDistinctTaxa!));
    } else {
      break; // no more seed locations found meeting the criteria
    }
  }

  return seedIDs;
}

function _addTaxonRank(
  tallies: TaxonTallies,
  rankValue: number,
  taxaString: string | null
): void {
  if (taxaString === null) return;
  for (const taxon of taxaString.split('|')) {
    if (tallies[taxon] === undefined) {
      tallies[taxon] = rankValue;
    } else {
      tallies[taxon] += rankValue;
    }
  }
}

function _getNearestClusterIndex(
  taxaTalliesByCluster: TaxonTallies[],
  effortWeights: TaxonTallies,
  currentClusterIndex: number
): number {
  //console.log('**** locationID', effort.locationID, 'effortTaxa', effortTaxa);
  const effortTaxa = Object.keys(effortWeights);

  // Collect into indexesForMaxSimilarityCount the indexes of all clusters
  // having the greatest similarity to the taxa of the provided effort,
  // with the taxa having the same similarity to each of these clusters.

  let maxSimilarityCount = 0;
  let indexesForMaxSimilarityCount: number[] = [];
  for (let i = 0; i < taxaTalliesByCluster.length; ++i) {
    const taxaInCluster = taxaTalliesByCluster[i];
    let similarityCount = 0;
    for (const taxon of effortTaxa) {
      if (taxaInCluster[taxon] === undefined) {
        similarityCount -= effortWeights[taxon];
      } else {
        similarityCount += effortWeights[taxon];
      }
    }
    if (similarityCount == maxSimilarityCount) {
      indexesForMaxSimilarityCount.push(i);
    } else if (similarityCount > maxSimilarityCount) {
      indexesForMaxSimilarityCount = [i];
      maxSimilarityCount = similarityCount;
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
  if (indexesForMaxSimilarityCount.length == 1) {
    nextClusterIndex = indexesForMaxSimilarityCount[0]; // small performance benefit
  } else if (indexesForMaxSimilarityCount.includes(currentClusterIndex)) {
    nextClusterIndex = currentClusterIndex;
  } else {
    nextClusterIndex = Math.floor(Math.random() * indexesForMaxSimilarityCount.length);
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

function _toWeightedValues(effort: LocationEffort): TaxonTallies {
  const tallies: TaxonTallies = {};
  _addTaxonRank(tallies, 0, effort.kingdomNames);
  _addTaxonRank(tallies, 1, effort.phylumNames);
  _addTaxonRank(tallies, 2, effort.classNames);
  _addTaxonRank(tallies, 3, effort.orderNames);
  _addTaxonRank(tallies, 4, effort.familyNames);
  _addTaxonRank(tallies, 5, effort.genusNames);
  _addTaxonRank(tallies, 6, effort.speciesNames);
  _addTaxonRank(tallies, 7, effort.subspeciesNames);
  return tallies;
}

function _toUnweightedValues(effort: LocationEffort): TaxonTallies {
  const tallies: TaxonTallies = {};
  _addTaxonRank(tallies, 1, effort.kingdomNames);
  _addTaxonRank(tallies, 1, effort.phylumNames);
  _addTaxonRank(tallies, 1, effort.classNames);
  _addTaxonRank(tallies, 1, effort.orderNames);
  _addTaxonRank(tallies, 1, effort.familyNames);
  _addTaxonRank(tallies, 1, effort.genusNames);
  _addTaxonRank(tallies, 1, effort.speciesNames);
  _addTaxonRank(tallies, 1, effort.subspeciesNames);
  return tallies;
}

function _toDoubleWeightedValues(effort: LocationEffort): TaxonTallies {
  const tallies: TaxonTallies = {};
  _addTaxonRank(tallies, 0 * 2, effort.kingdomNames);
  _addTaxonRank(tallies, 1 * 2, effort.phylumNames);
  _addTaxonRank(tallies, 2 * 2, effort.classNames);
  _addTaxonRank(tallies, 3 * 2, effort.orderNames);
  _addTaxonRank(tallies, 4 * 2, effort.familyNames);
  _addTaxonRank(tallies, 5 * 2, effort.genusNames);
  _addTaxonRank(tallies, 6 * 2, effort.speciesNames);
  _addTaxonRank(tallies, 7 * 2, effort.subspeciesNames);
  return tallies;
}

function _updateTaxonTallies(
  tallies: TaxonTallies,
  fromWeights: TaxonTallies
): TaxonTallies {
  for (const taxon of Object.keys(fromWeights)) {
    if (tallies[taxon] === undefined) {
      tallies[taxon] = 1;
    } else {
      tallies[taxon] += 1;
    }
  }
  return tallies;
}
