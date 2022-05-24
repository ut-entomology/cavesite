import { type DB } from '../integrations/postgres';
import { LocationEffort } from '../sampling/location_effort';
import { type SeedSpec } from '../../shared/model';

const EFFORT_BATCH_SIZE = 50;

type SimilarTaxa = Record<string, boolean>;

export async function getDiverseSeeds(db: DB, seedSpec: SeedSpec): Promise<number[]> {
  const seedIDs: number[] = [];
  const similarTaxa: SimilarTaxa = {};

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
      _addSimilarTaxa(similarTaxa, _collectEffortTaxa(efforts[0]));
    }

    // Each subsequent seed location is the one with the largest number of
    // taxa different from those found in all previous seed locations.

    let maxDistinctTaxa = 0;
    let seedIDForMaxDistinctTaxa = 0;
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
            if (!similarTaxa[effortTaxon]) ++newTaxaCount;
          }
          if (newTaxaCount > maxDistinctTaxa) {
            maxDistinctTaxa = newTaxaCount;
            seedIDForMaxDistinctTaxa = effort.locationID;
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

    // If we found another seed location, add it to the list.

    if (seedIDForMaxDistinctTaxa != 0) {
      seedIDs.push(seedIDForMaxDistinctTaxa);
    } else {
      break; // no more seed locations found meeting the criteria
    }
  }

  return seedIDs;
}

function _addSimilarTaxa(similarTaxa: SimilarTaxa, taxa: string[]): void {
  taxa.forEach((taxon) => (similarTaxa[taxon] = true));
}

function _collectEffortTaxa(effort: LocationEffort): string[] {
  const similarTaxa: string[] = [];
  _collectRankTaxa(similarTaxa, effort.kingdomNames);
  _collectRankTaxa(similarTaxa, effort.phylumNames);
  _collectRankTaxa(similarTaxa, effort.classNames);
  _collectRankTaxa(similarTaxa, effort.orderNames);
  _collectRankTaxa(similarTaxa, effort.familyNames);
  _collectRankTaxa(similarTaxa, effort.genusNames);
  _collectRankTaxa(similarTaxa, effort.speciesNames);
  _collectRankTaxa(similarTaxa, effort.subspeciesNames);
  return similarTaxa;
}

function _collectRankTaxa(collectedTaxa: string[], taxaString: string | null): void {
  if (taxaString === null) return;
  collectedTaxa.push(...taxaString.split('|'));
}
