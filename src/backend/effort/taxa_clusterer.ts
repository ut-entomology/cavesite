import { Clusterer } from './clusterer';
import { type DB } from '../integrations/postgres';
import { LocationEffort } from '../effort/location_effort';
import { type TaxonPathsByUniqueMap } from '../effort/cave_obligates';
import { Location } from '../model/location';
import {
  TaxonRankIndex,
  taxonRanks,
  type ClusterSpec,
  DissimilarityTransform,
  TaxonWeight,
  type TaxaCluster
} from '../../shared/model';
import { TaxonVisitCounter } from './taxon_visit_counter';

export interface TaxonTally {
  taxonUnique: string;
  rankIndex: number;
  localities: number;
  visits: number; // number of visits in cluster with this taxon
}
export type TaxonTallyMap = Record<string, TaxonTally>;

const EFFORT_BATCH_SIZE = 100;
const sampleLocationIDByComparedTaxa: Record<string, number> = {};
const cachedTaxonNamesByRankByLocationIDByComparedTaxa: Record<
  string,
  (string[] | null)[][]
> = {};
const cachedTaxonVisitsByRankByLocationIDByComparedTaxa: Record<
  string,
  (number[] | null)[][]
> = {};

export abstract class TaxaClusterer extends Clusterer {
  protected _highestRankIndex: number;
  protected _weights: number[];
  protected _transform: (from: number) => number;
  protected _sansSubgeneraMap: Record<string, string> = {};
  protected _caveTaxonPathsByUnique: TaxonPathsByUniqueMap = {};
  protected _taxonNamesByRankByLocationID: (string[] | null)[][];
  protected _taxonVisitsByRankByLocationID: (number[] | null)[][];

  constructor(db: DB, clusterSpec: ClusterSpec) {
    super(db, clusterSpec);
    const metric = clusterSpec.metric;

    switch (metric.transform) {
      case DissimilarityTransform.none:
        this._transform = (from: number) => from;
        break;
      case DissimilarityTransform.ln:
        this._transform = (from: number) => (from <= 0 ? 0 : Math.log(from));
        break;
      case DissimilarityTransform.sqrt:
        this._transform = (from: number) => (from <= 0 ? 0 : Math.sqrt(from));
        break;
      case DissimilarityTransform.to1_5:
        this._transform = (from: number) => Math.pow(from, 1.5);
        break;
      default:
        throw Error('DissimilarityTransform not specified');
    }

    this._highestRankIndex = taxonRanks.indexOf(metric.highestComparedRank);

    this._weights = new Array(taxonRanks.length).fill(0);
    for (
      let rankIndex = this._highestRankIndex;
      rankIndex < taxonRanks.length;
      ++rankIndex
    ) {
      const baseWeight = rankIndex - this._highestRankIndex + 1;
      switch (metric.weight) {
        case TaxonWeight.unweighted:
          this._weights[rankIndex] = 1;
          break;
        case TaxonWeight.equalWeighted:
          this._weights[rankIndex] = baseWeight;
          break;
        case TaxonWeight.halfAgainWeight:
          this._weights[rankIndex] = 1.5 * baseWeight;
          break;
        case TaxonWeight.doubleWeight:
          this._weights[rankIndex] = 2 * baseWeight;
          break;
        case TaxonWeight.weightTo1_5:
          this._weights[rankIndex] = Math.pow(baseWeight, 1.5);
          break;
        case TaxonWeight.squaredWeight:
          this._weights[rankIndex] = Math.pow(baseWeight, 2);
          break;
        default:
          throw Error('TaxonWeight not specified');
      }
    }

    if (!clusterSpec.comparedTaxa) throw 'ComparedTaxa not specified';

    this._taxonNamesByRankByLocationID =
      cachedTaxonNamesByRankByLocationIDByComparedTaxa[clusterSpec.comparedTaxa];
    if (this._taxonNamesByRankByLocationID === undefined) {
      this._taxonNamesByRankByLocationID = [];
      cachedTaxonNamesByRankByLocationIDByComparedTaxa[clusterSpec.comparedTaxa] =
        this._taxonNamesByRankByLocationID;
    }

    this._taxonVisitsByRankByLocationID =
      cachedTaxonVisitsByRankByLocationIDByComparedTaxa[clusterSpec.comparedTaxa];
    if (this._taxonVisitsByRankByLocationID === undefined) {
      this._taxonVisitsByRankByLocationID = [];
      cachedTaxonVisitsByRankByLocationIDByComparedTaxa[clusterSpec.comparedTaxa] =
        this._taxonVisitsByRankByLocationID;
    }
  }

  protected _getGreatestLowerDissimilarity(_locationEffort: LocationEffort): number {
    return 0;
  }

  protected abstract _calculateDissimilarity(
    clusterTaxonMap: TaxonTallyMap,
    locationTaxonMap: TaxonTallyMap
  ): number;

  async getSeedLocationIDs(
    maxClusters: number,
    useCumulativeTaxa: boolean
  ): Promise<number[]> {
    const seedLocationIDs: number[] = [];
    const seedLocationTallyMaps: TaxonTallyMap[] = [];
    const allSeedsTallyMap: TaxonTallyMap = {};

    // Find each seed location, up to the maximum seeds allowed.

    while (seedLocationIDs.length < maxClusters) {
      // Get the first batch of efforts for the search for the next seed location.

      // IMPORTANT: Efforts are sorted by total inferred number of species, most species
      // first. Ideally, I would sort by whichever dissimilarity metric is in use, so
      // that I can start with the most extreme value, but this is excessively complex.
      // Inferred species locations is a good estimate of species diversity, so we're always
      // seeding the first cluster with the maximally diverse location.

      let skipCount = 0;
      let locationEfforts = await LocationEffort.getNextBatch(
        this._db,
        this._comparedTaxa,
        this._minSpecies,
        this._maxSpecies,
        skipCount,
        EFFORT_BATCH_SIZE
      );
      if (locationEfforts.length == 0) return []; // no efforts in which to find seeds

      // The very first seed location is the one with the most species.

      const firstSeedLocation = locationEfforts[0];
      if (seedLocationIDs.length == 0) {
        seedLocationIDs.push(firstSeedLocation.locationID);
        const taxonTallyMap = await this._tallyTaxa(firstSeedLocation);
        seedLocationTallyMaps.push(taxonTallyMap);
        this._updateTaxonTallies(allSeedsTallyMap, taxonTallyMap);
        if (maxClusters == 1) {
          // continuing from here could add a 2nd cluster within this loop iteration
          return seedLocationIDs;
        }
      }

      // Each subsequent seed location is the one with the greated dissimilarity
      // from all previously selected seed locations.

      let maxDissimilaritySoFar =
        this._getGreatestLowerDissimilarity(firstSeedLocation);
      let seedIDForMaxDissimilarity = 0;
      let effortForMaxDissimilarity: LocationEffort;

      while (locationEfforts.length > 0) {
        // Process efforts of the batch, looking for the next seed location
        // that is most dissimilar from prior seed locations.

        for (const locationEffort of locationEfforts) {
          if (!seedLocationIDs.includes(locationEffort.locationID)) {
            let dissimilarity = -Infinity;

            // When using cumulative taxa, each next seed location is the one that
            // is most different from an imaginary cluster containing all prior
            // seed locations. This is fast but less accurate than choosing the
            // next seed location as one most different from all established seed
            // location, as determined by comparisons with these locations.

            if (useCumulativeTaxa) {
              dissimilarity = this._calculateDissimilarity(
                allSeedsTallyMap,
                await this._tallyTaxa(locationEffort)
              );
            } else {
              const taxonTallyMap = await this._tallyTaxa(locationEffort);
              let minDissimilaritySoFar = Infinity;
              for (let i = 0; i < seedLocationIDs.length; ++i) {
                dissimilarity = this._calculateDissimilarity(
                  seedLocationTallyMaps[i],
                  taxonTallyMap
                );
                if (dissimilarity < minDissimilaritySoFar) {
                  minDissimilaritySoFar = dissimilarity;
                }
              }
              dissimilarity = minDissimilaritySoFar;
            }

            // Keep track of the most dissimilar seed location found so far.

            if (dissimilarity > maxDissimilaritySoFar) {
              maxDissimilaritySoFar = dissimilarity;
              seedIDForMaxDissimilarity = locationEffort.locationID;
              effortForMaxDissimilarity = locationEffort;
            }
          }
        }

        // Retrieve the next batch of efforts to examine for seed locations.

        skipCount += locationEfforts.length;
        locationEfforts = await LocationEffort.getNextBatch(
          this._db,
          this._comparedTaxa,
          this._minSpecies,
          this._maxSpecies,
          skipCount,
          EFFORT_BATCH_SIZE
        );
      }

      // If we found another seed location, add it to the list and update the
      // set of all taxa against which to compare subsequent potential seeds.

      if (seedIDForMaxDissimilarity != 0) {
        seedLocationIDs.push(seedIDForMaxDissimilarity);
        const taxonTallyMap = await this._tallyTaxa(effortForMaxDissimilarity!);
        seedLocationTallyMaps.push(taxonTallyMap);
        this._updateTaxonTallies(allSeedsTallyMap, taxonTallyMap);
      } else {
        break; // no more seed locations found meeting the criteria
      }
    }

    return seedLocationIDs;
  }

  async getClusteredLocationIDs(seedLocationIDs: number[]): Promise<TaxaCluster[]> {
    // Node.js's V8 engine should end up using sparse arrays of location IDs.
    const clusterByLocationID: Record<number, number> = [];
    let taxonTallyMapsByCluster: TaxonTallyMap[] = [];
    let nextTaxonTallyMapsByCluster: TaxonTallyMap[] = [];

    // Establish the initial clusters based on the seed locations.

    const seedEfforts = await LocationEffort.getByLocationIDs(
      this._db,
      this._comparedTaxa,
      seedLocationIDs
    );
    for (let i = 0; i < seedLocationIDs.length; ++i) {
      const seedEffort = seedEfforts[i];
      clusterByLocationID[seedEffort.locationID] = i;
      const taxonTallyMap = await this._tallyTaxa(seedEffort);
      taxonTallyMapsByCluster.push(taxonTallyMap);
      // Shallow copy, as dynamic tally data not altered in taxonTallyMapsByCluster.
      nextTaxonTallyMapsByCluster.push(Object.assign({}, taxonTallyMap));
    }

    // Provide an initial assignment of each location to its nearest cluster,
    // all the while preparing nextTaxonTallyMapsByCluster for use in reassignment.

    let skipCount = 0;
    let locationEfforts = await this._getNextBatchToCluster(skipCount);
    while (locationEfforts.length > 0) {
      for (const locationEffort of locationEfforts) {
        if (!seedLocationIDs.includes(locationEffort.locationID)) {
          const effortTaxaTallies = await this._tallyTaxa(locationEffort);
          const nearestClusterIndex = this._getNearestClusterIndex(
            taxonTallyMapsByCluster,
            effortTaxaTallies,
            -1 // force assignment to a cluster
          );
          clusterByLocationID[locationEffort.locationID] = nearestClusterIndex;
          this._updateTaxonTallies(
            nextTaxonTallyMapsByCluster[nearestClusterIndex],
            effortTaxaTallies
          );
        }
      }
      skipCount += locationEfforts.length;
      locationEfforts = await this._getNextBatchToCluster(skipCount);
    }

    // Loop reassigning the clusters of locations until none are reassigned.

    let firstPass = true; // first pass is required to evaluate initial assignments
    let reassigned = false;
    while (reassigned || firstPass) {
      firstPass = false;
      reassigned = false;
      taxonTallyMapsByCluster = nextTaxonTallyMapsByCluster;
      nextTaxonTallyMapsByCluster = [];
      taxonTallyMapsByCluster.forEach((_) => nextTaxonTallyMapsByCluster.push({}));

      // Examine every location for possible assignment to a different cluster, all
      // the while preparing nextTaxonTallyMapsByCluster for use in the next pass.

      let skipCount = 0;
      let locationEfforts = await this._getNextBatchToCluster(skipCount);
      while (locationEfforts.length > 0) {
        for (const locationEffort of locationEfforts) {
          const effortTaxaTallies = await this._tallyTaxa(locationEffort);
          const currentClusterIndex = clusterByLocationID[locationEffort.locationID];
          const nearestClusterIndex = this._getNearestClusterIndex(
            taxonTallyMapsByCluster,
            effortTaxaTallies,
            currentClusterIndex
          );
          if (nearestClusterIndex != currentClusterIndex) {
            clusterByLocationID[locationEffort.locationID] = nearestClusterIndex;

            reassigned = true;
          }
          this._updateTaxonTallies(
            nextTaxonTallyMapsByCluster[nearestClusterIndex],
            effortTaxaTallies
          );
        }
        skipCount += locationEfforts.length;
        locationEfforts = await this._getNextBatchToCluster(skipCount);
      }
    }

    // Convert sparse array to arrays of location IDs indexed by cluster index.

    const locationIDsByCluster: number[][] = taxonTallyMapsByCluster.map((_) => []);
    for (const [locationID, clusterIndex] of Object.entries(clusterByLocationID)) {
      locationIDsByCluster[clusterIndex].push(parseInt(locationID));
    }

    // Generate and return the taxa clusters.

    const taxaClusters: TaxaCluster[] = [];
    for (let i = 0; i < taxonTallyMapsByCluster.length; ++i) {
      const taxonTallyMap = taxonTallyMapsByCluster[i];
      const visitsByTaxonUnique: Record<string, number> = {};
      for (const [taxonUnique, tally] of Object.entries(taxonTallyMap)) {
        // higher ranks have lower indexes
        if (tally.rankIndex >= this._highestRankIndex) {
          visitsByTaxonUnique[taxonUnique] = tally.visits;
        }
      }
      taxaClusters.push({
        visitsByTaxonUnique,
        locationIDs: locationIDsByCluster[i]
      });
    }
    return taxaClusters;
  }

  protected _getNearestClusterIndex(
    taxonTallyMapsByCluster: TaxonTallyMap[],
    taxonTallyMap: TaxonTallyMap,
    currentClusterIndex: number
  ): number {
    // Collect into indexesForMinDissimilarity the indexes of all clusters
    // having the least dissimilarity to the taxa of the provided effort,
    // with the taxa having the same dissimilarity wrt each of these clusters.

    let minDissimilaritySoFar = 0;
    let indexesForMinDissimilarity: number[] = [];
    for (let i = 0; i < taxonTallyMapsByCluster.length; ++i) {
      const dissimilarity = this._calculateDissimilarity(
        taxonTallyMapsByCluster[i],
        taxonTallyMap
      );
      if (dissimilarity == minDissimilaritySoFar) {
        indexesForMinDissimilarity.push(i);
      } else if (dissimilarity < minDissimilaritySoFar) {
        indexesForMinDissimilarity = [i];
        minDissimilaritySoFar = dissimilarity;
      }
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

  protected async _getNextBatchToCluster(skipCount: number): Promise<LocationEffort[]> {
    return await LocationEffort.getNextBatch(
      this._db,
      this._comparedTaxa,
      this._minSpecies,
      this._maxSpecies,
      skipCount,
      EFFORT_BATCH_SIZE
    );
  }

  protected _updateTaxonTallies(
    tallies: TaxonTallyMap,
    fromTallies: TaxonTallyMap
  ): TaxonTallyMap {
    for (const fromTally of Object.values(fromTallies)) {
      const thisTally = tallies[fromTally.taxonUnique];
      if (thisTally === undefined) {
        tallies[fromTally.taxonUnique] = Object.assign({}, fromTally);
      } else {
        thisTally.localities += 1;
        thisTally.visits += fromTally.visits;
      }
    }
    return tallies;
  }

  protected async _tallyTaxa(effort: LocationEffort): Promise<TaxonTallyMap> {
    const tallies: TaxonTallyMap = {};
    const [taxonNamesByRank, taxonVisitsByRank] =
      await this._getTaxonNamesAndVisitsByRank(effort);
    for (let i = 0; i <= TaxonRankIndex.Subspecies; ++i) {
      const taxonNames = taxonNamesByRank[i];
      if (taxonNames !== null) {
        this._tallyTaxonRank(tallies, i, taxonNames, taxonVisitsByRank[i]!);
      }
    }
    return tallies;
  }

  protected _tallyTaxonRank(
    tallies: TaxonTallyMap,
    rankIndex: TaxonRankIndex,
    taxonNames: string[],
    taxonVisits: number[]
  ): void {
    if (taxonNames.length == 0) return;
    if (rankIndex == TaxonRankIndex.Genus && this._ignoreSubgenera) {
      const sansSubgenera: Record<string, boolean> = {};
      for (const originalGenus of taxonNames) {
        let sansSubgenus = this._sansSubgeneraMap[originalGenus];
        if (!sansSubgenus) {
          const leftParenOffset = originalGenus.indexOf('(');
          if (leftParenOffset > 0) {
            // Don't presume to know whether a space precedes subgenus paren.
            sansSubgenus = originalGenus.substring(0, leftParenOffset).trimEnd();
          } else {
            sansSubgenus = originalGenus;
          }
          this._sansSubgeneraMap[originalGenus] = sansSubgenus;
        }
        sansSubgenera[sansSubgenus] = true;
      }
      // Eliminate duplicate occurrences of each genus.
      taxonNames = Object.keys(sansSubgenera);
    }

    for (let i = 0; i < taxonNames.length; ++i) {
      const taxonUnique = taxonNames[i];
      const taxonTally = tallies[taxonUnique];
      if (taxonTally === undefined) {
        tallies[taxonUnique] = {
          taxonUnique,
          rankIndex,
          localities: 1,
          visits: taxonVisits[i]
        };
      } else {
        taxonTally.localities += 1;
        taxonTally.visits += taxonVisits[i];
      }
    }
  }

  private async _getTaxonNamesAndVisitsByRank(
    effort: LocationEffort
  ): Promise<[(string[] | null)[], (number[] | null)[]]> {
    // Return cached taxon names for the effort, when available.

    let taxonNamesByRank = this._taxonNamesByRankByLocationID[effort.locationID];
    let taxonVisitsByRank = this._taxonVisitsByRankByLocationID[effort.locationID];
    if (taxonNamesByRank !== undefined) return [taxonNamesByRank, taxonVisitsByRank];

    // Clear the cache if the effort data has since been updated.

    let sampleLocationID: number | undefined =
      sampleLocationIDByComparedTaxa[this._comparedTaxa];
    if (sampleLocationID !== undefined) {
      const location = await Location.getByIDs(this._db, [sampleLocationID]);
      if (location === null) sampleLocationID = undefined;
    }
    if (sampleLocationID === undefined) {
      // Clear the existing map because it's shared by all clients.
      this._taxonNamesByRankByLocationID.length = 0;
      this._taxonVisitsByRankByLocationID.length = 0;
      sampleLocationIDByComparedTaxa[this._comparedTaxa] = effort.locationID;
    }

    // Compute the taxon names by rank for this effort.

    taxonNamesByRank = new Array(TaxonRankIndex.Subspecies + 1);
    taxonNamesByRank[TaxonRankIndex.Kingdom] = TaxonVisitCounter.toNamesList(
      effort.kingdomNames
    );
    taxonNamesByRank[TaxonRankIndex.Phylum] = TaxonVisitCounter.toNamesList(
      effort.phylumNames
    );
    taxonNamesByRank[TaxonRankIndex.Class] = TaxonVisitCounter.toNamesList(
      effort.classNames
    );
    taxonNamesByRank[TaxonRankIndex.Order] = TaxonVisitCounter.toNamesList(
      effort.orderNames
    );
    taxonNamesByRank[TaxonRankIndex.Family] = TaxonVisitCounter.toNamesList(
      effort.familyNames
    );
    taxonNamesByRank[TaxonRankIndex.Genus] = TaxonVisitCounter.toNamesList(
      effort.genusNames
    );
    taxonNamesByRank[TaxonRankIndex.Species] = TaxonVisitCounter.toNamesList(
      effort.speciesNames
    );
    taxonNamesByRank[TaxonRankIndex.Subspecies] = TaxonVisitCounter.toNamesList(
      effort.subspeciesNames
    );

    // Compute the taxon visit counts by rank for this effort.

    taxonVisitsByRank = new Array(TaxonRankIndex.Subspecies + 1);
    taxonVisitsByRank[TaxonRankIndex.Kingdom] = TaxonVisitCounter.toVisitsList(
      effort.kingdomVisits
    );
    taxonVisitsByRank[TaxonRankIndex.Phylum] = TaxonVisitCounter.toVisitsList(
      effort.phylumVisits
    );
    taxonVisitsByRank[TaxonRankIndex.Class] = TaxonVisitCounter.toVisitsList(
      effort.classVisits
    );
    taxonVisitsByRank[TaxonRankIndex.Order] = TaxonVisitCounter.toVisitsList(
      effort.orderVisits
    );
    taxonVisitsByRank[TaxonRankIndex.Family] = TaxonVisitCounter.toVisitsList(
      effort.familyVisits
    );
    taxonVisitsByRank[TaxonRankIndex.Genus] = TaxonVisitCounter.toVisitsList(
      effort.genusVisits
    );
    taxonVisitsByRank[TaxonRankIndex.Species] = TaxonVisitCounter.toVisitsList(
      effort.speciesVisits
    );
    taxonVisitsByRank[TaxonRankIndex.Subspecies] = TaxonVisitCounter.toVisitsList(
      effort.subspeciesVisits
    );

    // Cache and return the computed taxon names and visit counts.

    this._taxonNamesByRankByLocationID[effort.locationID] = taxonNamesByRank;
    this._taxonVisitsByRankByLocationID[effort.locationID] = taxonVisitsByRank;
    return [taxonNamesByRank, taxonVisitsByRank];
  }
}
