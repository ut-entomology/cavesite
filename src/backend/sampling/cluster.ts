import { type DB } from '../integrations/postgres';
import { LocationEffort } from '../sampling/location_effort';
import { type SeedSpec } from '../../shared/model';

const EFFORT_BATCH_SIZE = 50;

type IncludedTaxa = Record<string, boolean>;

// export async function getClusters(db: DB, seedIDs: number[]): Promise<number[][]> {
//   //
// }

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
      _addSimilarTaxa(includedTaxa, _collectEffortTaxa(efforts[0]));
    }

    // Each subsequent seed location is the one with the largest number of
    // taxa different from those found in all previous seed locations.

    let maxDistinctTaxa = 0;
    let seedIDForMaxDistinctTaxa = 0;
    let taxaForMaxDistinctTaxa: string[] = [];
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
          const effortTaxa = _collectEffortTaxa(effort);
          let newTaxaCount = 0;
          for (const effortTaxon of effortTaxa) {
            if (!includedTaxa[effortTaxon]) ++newTaxaCount;
          }
          if (newTaxaCount > maxDistinctTaxa) {
            maxDistinctTaxa = newTaxaCount;
            seedIDForMaxDistinctTaxa = effort.locationID;
            taxaForMaxDistinctTaxa = effortTaxa;
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
      _addSimilarTaxa(includedTaxa, taxaForMaxDistinctTaxa);
    } else {
      break; // no more seed locations found meeting the criteria
    }
  }

  return seedIDs;
}

function _addSimilarTaxa(includedTaxa: IncludedTaxa, taxa: string[]): void {
  taxa.forEach((taxon) => (includedTaxa[taxon] = true));
}

function _collectEffortTaxa(effort: LocationEffort): string[] {
  const includedTaxa: string[] = [];
  _collectRankTaxa(includedTaxa, effort.kingdomNames);
  _collectRankTaxa(includedTaxa, effort.phylumNames);
  _collectRankTaxa(includedTaxa, effort.classNames);
  _collectRankTaxa(includedTaxa, effort.orderNames);
  _collectRankTaxa(includedTaxa, effort.familyNames);
  _collectRankTaxa(includedTaxa, effort.genusNames);
  _collectRankTaxa(includedTaxa, effort.speciesNames);
  _collectRankTaxa(includedTaxa, effort.subspeciesNames);
  return includedTaxa;
}

function _collectRankTaxa(collectedTaxa: string[], taxaString: string | null): void {
  if (taxaString === null) return;
  collectedTaxa.push(...taxaString.split('|'));
}
