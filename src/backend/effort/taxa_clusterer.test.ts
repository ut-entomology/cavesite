import type { DB } from '../integrations/postgres';
import { DatabaseMutex } from '../util/test_util';
import { Location } from '../model/location';
import { type TaxonVisitCounterData } from './taxon_visit_counter';
import { type LocationEffortData, LocationEffort } from './location_effort';
import {
  TaxonRank,
  LocationRank,
  DissimilarityBasis,
  DissimilarityMetric,
  DissimilarityTransform,
  TaxonWeight,
  ComparedTaxa,
  type TaxaCluster
} from '../../shared/model';
import { Clusterer } from './clusterer';
import { createClusterer } from './create_clusterer';

// NOTE: Can't reuse location IDs across tests, because clustering clears
// effort cache based on whether it has cached for a location ID.

// jest.setTimeout(20 * 60 * 1000); // debugging timeout

interface EffortSpec {
  locationID: number;
  latitude?: number;
  longitude?: number;
  totalSpecies: number;
  partialTallies: Partial<TaxonVisitCounterData>;
}

const mutex = new DatabaseMutex();
let db: DB;

const minusDiffMetric1: DissimilarityMetric = {
  basis: DissimilarityBasis.diffTaxa,
  transform: DissimilarityTransform.none,
  highestComparedRank: TaxonRank.Kingdom,
  weight: TaxonWeight.unweighted
};
const commonMinusDiffMetric1: DissimilarityMetric = {
  basis: DissimilarityBasis.diffMinusCommonTaxa,
  transform: DissimilarityTransform.none,
  highestComparedRank: TaxonRank.Kingdom,
  weight: TaxonWeight.unweighted
};
// const commonMinusDiffFamilyMetric1: DissimilarityMetric = {
//   basis: DissimilarityBasis.diffMinusCommonTaxa,
//   transform: DissimilarityTransform.none,
//   highestComparedRank: TaxonRank.Family,
//   weight: TaxonWeight.unweighted
// };

beforeAll(async () => {
  db = await mutex.lock();
  // Create dummy locations to satisfy referential integrity.
  for (let i = 1; i <= 22; ++i) {
    await _createLocation(i);
  }
});

test('selecting seed locations comparing all taxa', async () => {
  const clusterer = createClusterer(db, {
    metric: minusDiffMetric1,
    comparedTaxa: ComparedTaxa.all
  });
  const effortSpecs: EffortSpec[] = [];

  // Select the most diverse seed location.

  effortSpecs.push({
    locationID: 1,
    totalSpecies: 1,
    partialTallies: {
      kingdomNames: 'k1',
      kingdomVisits: [1],
      phylumNames: 'p1',
      phylumVisits: [1]
    }
  });
  await _addEfforts(effortSpecs);
  let seedIDs = await clusterer.getSeedLocationIDs(1, true);
  expect(seedIDs).toEqual([1]);

  effortSpecs.push({
    locationID: 2,
    totalSpecies: 5,
    partialTallies: {
      kingdomNames: 'k1',
      kingdomVisits: [1],
      phylumNames: 'p1',
      phylumVisits: [1],
      familyNames: 'f1|f2',
      familyVisits: [1, 1],
      genusNames: 'f1g1|f1g2|f1g3|f2g4|f2g5',
      genusVisits: [1, 1, 1, 1, 1]
    }
  });
  await _addEfforts(effortSpecs);
  seedIDs = await clusterer.getSeedLocationIDs(1, true);
  expect(seedIDs).toEqual([2]);

  effortSpecs.push({
    locationID: 3,
    totalSpecies: 3,
    partialTallies: {
      kingdomNames: 'k1',
      kingdomVisits: [1],
      phylumNames: 'p1',
      phylumVisits: [1],
      familyNames: 'f1',
      familyVisits: [1],
      genusNames: 'f1g1|f1g2|f1g3',
      genusVisits: [1, 1, 1]
    }
  });
  await _addEfforts(effortSpecs);
  seedIDs = await clusterer.getSeedLocationIDs(1, true);
  expect(seedIDs).toEqual([2]);

  // Attempt to select 2 seeds when all are subsets of one of them.

  seedIDs = await clusterer.getSeedLocationIDs(2, true);
  expect(seedIDs).toEqual([2]);

  // Add 2nd- and 3rd-most diverse locations.

  effortSpecs.push({
    locationID: 4,
    totalSpecies: 5,
    partialTallies: {
      kingdomNames: 'k1',
      kingdomVisits: [1],
      phylumNames: 'p1|p2',
      phylumVisits: [1, 1],
      familyNames: 'f1|f2',
      familyVisits: [1, 1],
      genusNames: 'f1g1|f1g2|f1g3',
      genusVisits: [1, 1, 1]
    }
  });
  effortSpecs.push({
    locationID: 5,
    totalSpecies: 5,
    partialTallies: {
      kingdomNames: 'k1',
      kingdomVisits: [1],
      phylumNames: 'p1|p2|p3',
      phylumVisits: [1, 1, 1],
      familyNames: 'f1|f2',
      familyVisits: [1, 1],
      genusNames: 'f1g1|f1g2|f1g3|f2g1',
      genusVisits: [1, 1, 1, 1]
    }
  });
  effortSpecs.push({
    locationID: 6,
    totalSpecies: 4,
    partialTallies: {
      kingdomNames: 'k1',
      kingdomVisits: [1],
      phylumNames: 'p1',
      phylumVisits: [1],
      familyNames: 'f1|f3',
      familyVisits: [1, 1],
      genusNames: 'f1g1|f1g2|f3g1',
      genusVisits: [1, 1, 1]
    }
  });
  await _addEfforts(effortSpecs);
  seedIDs = await clusterer.getSeedLocationIDs(2, true);
  expect(seedIDs).toEqual([2, 5]);

  // Selection order changes with adding a late most-diverse effort.

  effortSpecs.push({
    locationID: 7,
    totalSpecies: 7,
    partialTallies: {
      kingdomNames: 'k1',
      kingdomVisits: [1],
      phylumNames: 'p1|p2',
      phylumVisits: [1, 1],
      familyNames: 'f1|f2|f3|f4',
      familyVisits: [1, 1, 1, 1],
      genusNames: 'f1g1|f1g2|f2g1|f4g1|f4g2',
      genusVisits: [1, 1, 1, 1, 1]
    }
  });
  await _addEfforts(effortSpecs);
  seedIDs = await clusterer.getSeedLocationIDs(3, true);
  expect(seedIDs).toEqual([7, 2, 5]);
});

test('clustering at all taxonomic ranks', async () => {
  const clusterer = createClusterer(db, {
    metric: commonMinusDiffMetric1,
    comparedTaxa: ComparedTaxa.all
  });
  const effortSpecs: EffortSpec[] = [];

  effortSpecs.push({
    locationID: 11,
    totalSpecies: 1,
    partialTallies: {
      kingdomNames: 'k1',
      kingdomVisits: [1],
      phylumNames: 'p1',
      phylumVisits: [1]
    }
  });
  effortSpecs.push({
    locationID: 12,
    totalSpecies: 2,
    partialTallies: {
      kingdomNames: 'k1',
      kingdomVisits: [2],
      phylumNames: 'p1|p2',
      phylumVisits: [1, 2]
    }
  });
  effortSpecs.push({
    locationID: 13,
    totalSpecies: 3,
    partialTallies: {
      kingdomNames: 'k1',
      kingdomVisits: [3],
      phylumNames: 'p1|p2|p3',
      phylumVisits: [3, 2, 1]
    }
  });
  await _addEfforts(effortSpecs);
  let clusters = await _getClusters(clusterer, [11]);
  _checkClusters(clusters, [
    { visitsByTaxonUnique: { k1: 6, p1: 5, p2: 4, p3: 1 }, locationIDs: [11, 12, 13] }
  ]);

  effortSpecs.push({
    locationID: 14,
    totalSpecies: 1,
    partialTallies: {
      kingdomNames: 'k1',
      kingdomVisits: [1],
      phylumNames: 'p4',
      phylumVisits: [1]
    }
  });
  effortSpecs.push({
    locationID: 15,
    totalSpecies: 2,
    partialTallies: {
      kingdomNames: 'k1',
      kingdomVisits: [3],
      phylumNames: 'p4|p5',
      phylumVisits: [1, 1]
    }
  });
  effortSpecs.push({
    locationID: 16,
    totalSpecies: 3,
    partialTallies: {
      kingdomNames: 'k1',
      kingdomVisits: [5],
      phylumNames: 'p4|p5|p6',
      phylumVisits: [1, 5, 1]
    }
  });
  await _addEfforts(effortSpecs);
  clusters = await _getClusters(clusterer, [13, 16]);
  _checkClusters(clusters, [
    { visitsByTaxonUnique: { k1: 6, p1: 5, p2: 4, p3: 1 }, locationIDs: [11, 12, 13] },
    { visitsByTaxonUnique: { k1: 9, p4: 3, p5: 6, p6: 1 }, locationIDs: [14, 15, 16] }
  ]);
  clusters = await _getClusters(clusterer, [11, 14]);
  _checkClusters(clusters, [
    { visitsByTaxonUnique: { k1: 6, p1: 5, p2: 4, p3: 1 }, locationIDs: [11, 12, 13] },
    { visitsByTaxonUnique: { k1: 9, p4: 3, p5: 6, p6: 1 }, locationIDs: [14, 15, 16] }
  ]);
});

test('clustering identical taxa by physical proxomity', async () => {
  const clusterer = createClusterer(db, {
    metric: commonMinusDiffMetric1,
    comparedTaxa: ComparedTaxa.all
  });
  const effortSpecs: EffortSpec[] = [];
  const partialTallies = {
    kingdomNames: 'k1',
    kingdomVisits: [1],
    phylumNames: 'p1|p2|p3',
    phylumVisits: [1, 1, 1]
  };

  effortSpecs.push({
    locationID: 17,
    latitude: 10,
    longitude: 10,
    totalSpecies: 3,
    partialTallies
  });
  effortSpecs.push({
    locationID: 18,
    latitude: 20,
    longitude: 20,
    totalSpecies: 3,
    partialTallies
  });
  effortSpecs.push({
    locationID: 19,
    latitude: 30,
    longitude: 30,
    totalSpecies: 3,
    partialTallies
  });
  effortSpecs.push({
    locationID: 20,
    latitude: 21,
    longitude: 21,
    totalSpecies: 3,
    partialTallies
  });
  effortSpecs.push({
    locationID: 21,
    latitude: 11,
    longitude: 11,
    totalSpecies: 3,
    partialTallies
  });
  effortSpecs.push({
    locationID: 22,
    latitude: 31,
    longitude: 31,
    totalSpecies: 3,
    partialTallies
  });
  await _addEfforts(effortSpecs);
  let clusters = await _getClusters(clusterer, [17, 18, 19]);
  _checkClusters(clusters, [
    { visitsByTaxonUnique: { k1: 2, p1: 2, p2: 2, p3: 2 }, locationIDs: [17, 21] },
    { visitsByTaxonUnique: { k1: 2, p1: 2, p2: 2, p3: 2 }, locationIDs: [18, 20] },
    { visitsByTaxonUnique: { k1: 2, p1: 2, p2: 2, p3: 2 }, locationIDs: [19, 22] }
  ]);
  clusters = await _getClusters(clusterer, [20, 21, 22]);
  _checkClusters(clusters, [
    { visitsByTaxonUnique: { k1: 2, p1: 2, p2: 2, p3: 2 }, locationIDs: [17, 21] },
    { visitsByTaxonUnique: { k1: 2, p1: 2, p2: 2, p3: 2 }, locationIDs: [18, 20] },
    { visitsByTaxonUnique: { k1: 2, p1: 2, p2: 2, p3: 2 }, locationIDs: [19, 22] }
  ]);
  clusters = await _getClusters(clusterer, [20, 17, 22]);
  _checkClusters(clusters, [
    { visitsByTaxonUnique: { k1: 2, p1: 2, p2: 2, p3: 2 }, locationIDs: [17, 21] },
    { visitsByTaxonUnique: { k1: 2, p1: 2, p2: 2, p3: 2 }, locationIDs: [18, 20] },
    { visitsByTaxonUnique: { k1: 2, p1: 2, p2: 2, p3: 2 }, locationIDs: [19, 22] }
  ]);
});

afterAll(async () => {
  await mutex.unlock();
});

async function _addEfforts(effortSpecs: EffortSpec[]): Promise<void> {
  await LocationEffort.dropAll(db, ComparedTaxa.all);
  for (const effortSpec of effortSpecs) {
    await LocationEffort.create(
      db,
      ComparedTaxa.all,
      {
        locationID: effortSpec.locationID,
        countyName: 'Dummy County',
        localityName: 'Dummy Locality',
        isCave: true,
        latitude: effortSpec.latitude || null,
        longitude: effortSpec.longitude || null
      },
      _toEffortData({ totalSpecies: effortSpec.totalSpecies }),
      _toTallies(effortSpec.partialTallies)
    );
  }
  await LocationEffort.commit(db, ComparedTaxa.all);
}

function _checkClusters(
  actualClusters: TaxaCluster[],
  expectedClusters: TaxaCluster[]
): void {
  actualClusters.forEach((cluster) => cluster.locationIDs.sort());
  actualClusters.sort((a, b) => a.locationIDs[0] - b.locationIDs[0]);
  expectedClusters.forEach((cluster) => cluster.locationIDs.sort());
  expectedClusters.sort((a, b) => a.locationIDs[0] - b.locationIDs[0]);
  expect(actualClusters).toEqual(expectedClusters);
}

async function _createLocation(locationID: number) {
  const sourceLocation = {
    locationRank: LocationRank.Continent,
    locationName: 'Continent ' + locationID,
    publicLatitude: null,
    publicLongitude: null,
    parentID: null,
    hasChildren: null
  };
  await Location.create(db, '', '', sourceLocation);
}

async function _getClusters(
  clusterer: Clusterer,
  seedLocationIDs: number[]
): Promise<TaxaCluster[]> {
  return await clusterer.getTaxaClusters(seedLocationIDs);
}

function _toEffortData(data: Partial<LocationEffortData>): LocationEffortData {
  return Object.assign(
    {
      startDate: new Date(),
      endDate: new Date(),
      flags: 0,
      totalDays: 1,
      totalVisits: 1,
      totalPersonVisits: 1,
      totalSpecies: 1,
      perDayPoints: '',
      perVisitPoints: '',
      perPersonVisitPoints: ''
    },
    data
  );
}

function _toTallies(data: Partial<TaxonVisitCounterData>): TaxonVisitCounterData {
  return Object.assign(
    {
      kingdomNames: '',
      kingdomCounts: '',
      kingdomVisits: null,
      phylumNames: null,
      phylumCounts: null,
      phylumVisits: null,
      classNames: null,
      classCounts: null,
      classVisits: null,
      orderNames: null,
      orderCounts: null,
      orderVisits: null,
      familyNames: null,
      familyCounts: null,
      familyVisits: null,
      genusNames: null,
      genusCounts: null,
      genusVisits: null,
      speciesNames: null,
      speciesCounts: null,
      speciesVisits: null,
      subspeciesNames: null,
      subspeciesCounts: null,
      subspeciesVisits: null
    },
    data
  );
}
