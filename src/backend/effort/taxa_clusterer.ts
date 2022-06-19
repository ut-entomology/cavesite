import { Clusterer } from './clusterer';
import { type DB } from '../integrations/postgres';
import { LocationEffort } from '../effort/location_effort';
import {
  type TaxonPathsByUniqueMap,
  loadCaveObligateTaxonPathMap
} from '../effort/cave_obligates';
import {
  TaxonRankIndex,
  taxonRanks,
  type ClusterSpec,
  DissimilarityTransform,
  TaxonWeight
} from '../../shared/model';

export interface TaxonTally {
  taxonUnique: string;
  rankIndex: number;
  count: number;
}
export type TaxonTallyMap = Record<string, TaxonTally>;

const EFFORT_BATCH_SIZE = 100;

export abstract class TaxaClusterer extends Clusterer {
  protected _weights: number[];
  protected _transform: (from: number) => number;
  protected _sansSubgeneraMap: Record<string, string> = {};
  protected _caveTaxonPathsByUnique: TaxonPathsByUniqueMap = {};
  protected _taxonNamesByRankByLocationID: string[][][] = [];

  constructor(clusterSpec: ClusterSpec) {
    super(clusterSpec);

    switch (clusterSpec.metric.transform) {
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

    this._weights = [];
    for (let i = 0; i < taxonRanks.length; ++i) {
      switch (clusterSpec.metric.weight) {
        case TaxonWeight.unweighted:
          this._weights[i] = 1;
          break;
        case TaxonWeight.weighted:
          this._weights[i] = i;
          break;
        case TaxonWeight.halfAgainWeight:
          this._weights[i] = 1.5 * i;
          break;
        case TaxonWeight.doubleWeight:
          this._weights[i] = 2 * i;
          break;
        case TaxonWeight.onlySpecies:
          this._weights[i] = i >= taxonRanks.length - 2 ? 1 : 0;
          break;
        case TaxonWeight.onlyGenera:
          this._weights[i] = i == taxonRanks.length - 3 ? 1 : 0;
          break;
        case TaxonWeight.onlyGeneraAndSpecies:
          this._weights[i] = i >= taxonRanks.length - 3 ? 1 : 0;
          break;
        default:
          throw Error('TaxonWeight not specified');
      }
    }
  }

  protected _getGreatestLowerDissimilarity(_locationEffort: LocationEffort): number {
    return 0;
  }

  protected abstract _calculateDissimilarity(
    clusterTaxonMap: TaxonTallyMap,
    locationTaxonMap: TaxonTallyMap
  ): number;

  async getClusteredLocationIDs(
    db: DB,
    seedLocationIDs: number[]
  ): Promise<number[][]> {
    // Node.js's V8 engine should end up using sparse arrays of location IDs.
    const clusterByLocationID: Record<number, number> = [];
    let taxonTallyMapsByCluster: TaxonTallyMap[] = [];
    let nextTaxonTallyMapsByCluster: TaxonTallyMap[] = [];
    await this._prepareCaveTaxa(db);

    // Establish the initial clusters based on the seed locations.

    const seedEfforts = await LocationEffort.getByLocationIDs(db, seedLocationIDs);
    for (let i = 0; i < seedLocationIDs.length; ++i) {
      const seedEffort = seedEfforts[i];
      clusterByLocationID[seedEffort.locationID] = i;
      const taxonTallyMap = this._tallyTaxa(seedEffort);
      taxonTallyMapsByCluster.push(taxonTallyMap);
      nextTaxonTallyMapsByCluster.push(Object.assign({}, taxonTallyMap)); // copy
    }

    // Provide an initial assignment of each location to its nearest cluster,
    // all the while preparing nextTaxonTallyMapsByCluster for use in reassignment.

    let skipCount = 0;
    let locationEfforts = await this._getNextBatchToCluster(db, skipCount);
    while (locationEfforts.length > 0) {
      for (const locationEffort of locationEfforts) {
        if (!seedLocationIDs.includes(locationEffort.locationID)) {
          const effortTaxaTallies = this._tallyTaxa(locationEffort);
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
      locationEfforts = await this._getNextBatchToCluster(db, skipCount);
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
      let locationEfforts = await this._getNextBatchToCluster(db, skipCount);
      while (locationEfforts.length > 0) {
        for (const locationEffort of locationEfforts) {
          const effortTaxaTallies = this._tallyTaxa(locationEffort);
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
        locationEfforts = await this._getNextBatchToCluster(db, skipCount);
      }
    }

    // Convert sparse array to arrays of location IDs indexed by cluster index.

    const locationIDsByCluster: number[][] = taxonTallyMapsByCluster.map((_) => []);
    for (const [locationID, clusterIndex] of Object.entries(clusterByLocationID)) {
      locationIDsByCluster[clusterIndex].push(parseInt(locationID));
    }
    return locationIDsByCluster;
  }

  async getSeedLocationIDs(
    db: DB,
    maxClusters: number,
    useCumulativeTaxa: boolean
  ): Promise<number[]> {
    const seedLocationIDs: number[] = [];
    const seedLocationTallyMaps: TaxonTallyMap[] = [];
    const allSeedsTallyMap: TaxonTallyMap = {};
    await this._prepareCaveTaxa(db);

    // Find each seed location, up to the maximum seeds allowed.

    while (seedLocationIDs.length < maxClusters) {
      // Get the first batch of efforts for the search for the next seed location.

      // IMPORTANT: Efforts are sorted by total inferred number of species, most species
      // first. Ideally, I would sort by whichever dissimilarity metric is in use, so
      // that I can start with the most extreme value, but this is excessively complex.
      // Inferred species count is a good estimate of species diversity, so we're always
      // seeding the first cluster with the maximally diverse location.

      let skipCount = 0;
      let locationEfforts = await LocationEffort.getNextBatch(
        db,
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
        const taxonTallyMap = this._tallyTaxa(firstSeedLocation);
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
                this._tallyTaxa(locationEffort)
              );
            } else {
              const taxonTallyMap = this._tallyTaxa(locationEffort);
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
          db,
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
        const taxonTallyMap = this._tallyTaxa(effortForMaxDissimilarity!);
        seedLocationTallyMaps.push(taxonTallyMap);
        this._updateTaxonTallies(allSeedsTallyMap, taxonTallyMap);
      } else {
        break; // no more seed locations found meeting the criteria
      }
    }

    return seedLocationIDs;
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

  protected async _getNextBatchToCluster(
    db: DB,
    skipCount: number
  ): Promise<LocationEffort[]> {
    return await LocationEffort.getNextBatch(
      db,
      this._minSpecies,
      this._maxSpecies,
      skipCount,
      EFFORT_BATCH_SIZE
    );
  }

  protected async _prepareCaveTaxa(db: DB): Promise<void> {
    if (
      this._onlyCaveObligates &&
      Object.keys(this._caveTaxonPathsByUnique).length == 0
    ) {
      this._caveTaxonPathsByUnique = await loadCaveObligateTaxonPathMap(db);
    }
  }

  protected _updateTaxonTallies(
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

  protected _tallyTaxa(effort: LocationEffort): TaxonTallyMap {
    const tallies: TaxonTallyMap = {};
    if (this._onlyCaveObligates) {
      // TODO: If I want to keep this functionality, store this in the efforts table.
      const taxonNamesByRank = this._getTaxonNamesByRank(effort);
      for (let i = 0; i <= TaxonRankIndex.Subspecies; ++i) {
        this._tallySplitTaxonRank(tallies, i, taxonNamesByRank[i]);
      }
    } else {
      // TODO: I can speed this up by caching splits of per-effort taxa strings.
      this._tallyTaxonRank(tallies, TaxonRankIndex.Kingdom, effort.kingdomNames);
      this._tallyTaxonRank(tallies, TaxonRankIndex.Phylum, effort.phylumNames);
      this._tallyTaxonRank(tallies, TaxonRankIndex.Class, effort.classNames);
      this._tallyTaxonRank(tallies, TaxonRankIndex.Order, effort.orderNames);
      this._tallyTaxonRank(tallies, TaxonRankIndex.Family, effort.familyNames);
      this._tallyTaxonRank(tallies, TaxonRankIndex.Genus, effort.genusNames);
      this._tallyTaxonRank(tallies, TaxonRankIndex.Species, effort.speciesNames);
      this._tallyTaxonRank(tallies, TaxonRankIndex.Subspecies, effort.subspeciesNames);
    }
    return tallies;
  }

  protected _tallyTaxonRank(
    tallies: TaxonTallyMap,
    rankIndex: TaxonRankIndex,
    taxaString: string | null
  ): void {
    if (taxaString === null) return;
    return this._tallySplitTaxonRank(tallies, rankIndex, taxaString.split('|'));
  }

  protected _tallySplitTaxonRank(
    tallies: TaxonTallyMap,
    rankIndex: TaxonRankIndex,
    taxonNames: string[]
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

    for (const taxonUnique of taxonNames) {
      if (tallies[taxonUnique] === undefined) {
        tallies[taxonUnique] = { taxonUnique, rankIndex, count: 1 };
      } else {
        tallies[taxonUnique].count += 1;
      }
    }
  }

  private _getTaxonNamesByRank(effort: LocationEffort): string[][] {
    // TODO: If I want to keep this functionality, store this in the efforts table.

    let taxonNamesByRank = this._taxonNamesByRankByLocationID[effort.locationID];
    if (taxonNamesByRank !== undefined) return taxonNamesByRank;

    taxonNamesByRank = [];
    this._taxonNamesByRankByLocationID[effort.locationID] = taxonNamesByRank;

    // Collect the taxon paths for each cave obligate found in this effort.

    const retainedTaxonPaths: string[][] = [];
    if (effort.genusNames !== null) {
      const genusNames = effort.genusNames.split('|');
      for (const genusName of genusNames) {
        const taxonPath = this._caveTaxonPathsByUnique[genusName];
        if (taxonPath) retainedTaxonPaths.push(taxonPath);
      }
    }
    if (effort.speciesNames !== null) {
      const speciesNames = effort.speciesNames.split('|');
      for (const speciesName of speciesNames) {
        // TODO: look into includes taxon paths for all new species; probably
        // requires an async Taxon lookup.
        const taxonPath = this._caveTaxonPathsByUnique[speciesName];
        if (taxonPath) retainedTaxonPaths.push(taxonPath);
      }
    }

    // Collect the taxa of these taxon paths separately for each rank.

    taxonNamesByRank = new Array(TaxonRankIndex.Subspecies + 1);
    for (const taxonPath of retainedTaxonPaths) {
      let i = 0;
      while (i <= TaxonRankIndex.Subspecies) {
        let collectedTaxonNames = taxonNamesByRank[i];
        if (collectedTaxonNames === undefined) {
          collectedTaxonNames = [];
          taxonNamesByRank[i] = collectedTaxonNames;
        }
        const taxonName = taxonPath[i];
        if (!collectedTaxonNames.includes(taxonName)) {
          collectedTaxonNames.push(taxonName);
        }
        ++i;
      }
    }
    return taxonNamesByRank;
  }
}
