import type { DB } from '../integrations/postgres';
import { DatabaseMutex } from '../util/test_util';
import { Location } from '../model/location';
import { type TaxonCounterData } from './../../shared/taxon_counter';
import { type EffortData, LocationEffort } from './location_effort';
import {
  LocationRank,
  DissimilarityBasis,
  DissimilarityMetric,
  DissimilarityTransform,
  TaxonWeight,
  ComparedTaxa
} from '../../shared/model';
import { Clusterer } from './clusterer';
import { createClusterer } from './create_clusterer';

// NOTE: Can't reuse location IDs across tests, because clustering clears
// effort cache based on whether it has cached for a location ID.

jest.setTimeout(20 * 60 * 1000); // debuggin timeout

const mutex = new DatabaseMutex();
let db: DB;

const minusDiffMetric1: DissimilarityMetric = {
  basis: DissimilarityBasis.diffTaxa,
  transform: DissimilarityTransform.none,
  weight: TaxonWeight.unweighted
};
const commonMinusDiffMetric1: DissimilarityMetric = {
  basis: DissimilarityBasis.diffMinusCommonTaxa,
  transform: DissimilarityTransform.none,
  weight: TaxonWeight.unweighted
};

beforeAll(async () => {
  db = await mutex.lock();
  // Create dummy locations to satisfy referential integrity.
  for (let i = 1; i < 20; ++i) {
    await _createLocation(i);
  }
});

test('selecting seed locations by taxon diversity', async () => {
  await LocationEffort.dropAll(db, ComparedTaxa.all);
  const clusterer = createClusterer(db, {
    metric: minusDiffMetric1,
    comparedTaxa: ComparedTaxa.all
  });

  // Select the most diverse seed location.

  await _addEffort(1, 1, {
    kingdomNames: 'k1',
    phylumNames: 'p1'
  });
  let seedIDs = await clusterer.getSeedLocationIDs(1, true);
  expect(seedIDs).toEqual([1]);

  await _addEffort(2, 5, {
    kingdomNames: 'k1',
    phylumNames: 'p1',
    familyNames: 'f1|f2',
    genusNames: 'f1g1|f1g2|f1g3|f2g4|f2g5'
  });
  seedIDs = await clusterer.getSeedLocationIDs(1, true);
  expect(seedIDs).toEqual([2]);

  await _addEffort(3, 3, {
    kingdomNames: 'k1',
    phylumNames: 'p1',
    familyNames: 'f1',
    genusNames: 'f1g1|f1g2|f1g3'
  });
  seedIDs = await clusterer.getSeedLocationIDs(1, true);
  expect(seedIDs).toEqual([2]);

  // Attempt to select 2 seeds when all are subsets of one of them.

  seedIDs = await clusterer.getSeedLocationIDs(2, true);
  expect(seedIDs).toEqual([2]);

  // Add 2nd- and 3rd-most diverse locations.

  await _addEffort(4, 5, {
    kingdomNames: 'k1',
    phylumNames: 'p1|p2',
    familyNames: 'f1|f2',
    genusNames: 'f1g1|f1g2|f1g3'
  });
  await _addEffort(5, 5, {
    kingdomNames: 'k1',
    phylumNames: 'p1|p2|p3',
    familyNames: 'f1|f2',
    genusNames: 'f1g1|f1g2|f1g3|f2g1'
  });
  await _addEffort(6, 4, {
    kingdomNames: 'k1',
    phylumNames: 'p1',
    familyNames: 'f1|f3',
    genusNames: 'f1g1|f1g2|f3g1'
  });
  seedIDs = await clusterer.getSeedLocationIDs(2, true);
  expect(seedIDs).toEqual([2, 5]);

  // Selection order changes with adding a late most-diverse effort.

  await _addEffort(7, 7, {
    kingdomNames: 'k1',
    phylumNames: 'p1|p2',
    familyNames: 'f1|f2|f3|f4',
    genusNames: 'f1g1|f1g2|f2g1|f4g1|f4g2'
  });
  seedIDs = await clusterer.getSeedLocationIDs(3, true);
  expect(seedIDs).toEqual([7, 2, 5]);
});

test('clustering', async () => {
  await LocationEffort.dropAll(db, ComparedTaxa.all);
  const clusterer = createClusterer(db, {
    metric: commonMinusDiffMetric1,
    comparedTaxa: ComparedTaxa.all
  });

  await _addEffort(11, 1, {
    kingdomNames: 'k1',
    phylumNames: 'p1'
  });
  await _addEffort(12, 2, {
    kingdomNames: 'k1',
    phylumNames: 'p1|p2'
  });
  await _addEffort(13, 3, {
    kingdomNames: 'k1',
    phylumNames: 'p1|p2|p3'
  });
  let clusters = await _getClusters(clusterer, [11]);
  _checkClusters(clusters, [[11, 12, 13]]);

  await _addEffort(14, 1, {
    kingdomNames: 'k1',
    phylumNames: 'p4'
  });
  await _addEffort(15, 2, {
    kingdomNames: 'k1',
    phylumNames: 'p4|p5'
  });
  await _addEffort(16, 3, {
    kingdomNames: 'k1',
    phylumNames: 'p4|p5|p6'
  });
  clusters = await _getClusters(clusterer, [13, 16]);
  _checkClusters(clusters, [
    [11, 12, 13],
    [14, 15, 16]
  ]);
  clusters = await _getClusters(clusterer, [11, 14]);
  _checkClusters(clusters, [
    [11, 12, 13],
    [14, 15, 16]
  ]);
  // clusters = await _getClusters(TaxonWeight.weighted, [1, 2]);
  // _checkClusters(clusters, [
  //   [1, 2, 3],
  //   [4, 5, 6]
  // ]);
  // clusters = await _getClusters(TaxonWeight.unweighted, [5, 6]);
  // _checkClusters(clusters, [
  //   [1, 2, 3],
  //   [4, 5, 6]
  // ]);
});

afterAll(async () => {
  await mutex.unlock();
});

async function _addEffort(
  locationID: number,
  totalSpecies: number,
  partialTallies: Partial<TaxonCounterData>
): Promise<void> {
  await LocationEffort.create(
    db,
    ComparedTaxa.all,
    locationID,
    true,
    _toEffortData({ totalSpecies }),
    _toTallies(partialTallies)
  );
}

function _checkClusters(
  actualClusters: number[][],
  expectedClusters: number[][]
): void {
  actualClusters.forEach((cluster) => cluster.sort());
  actualClusters.sort((a, b) => a[0] - b[0]);
  expectedClusters.forEach((cluster) => cluster.sort());
  expectedClusters.sort((a, b) => a[0] - b[0]);
  // console.log(
  //   '**** actual/expected clusters\n    ',
  //   actualClusters,
  //   '\n    ',
  //   expectedClusters
  // );
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
): Promise<number[][]> {
  return await clusterer.getClusteredLocationIDs(seedLocationIDs);
}

function _toEffortData(data: Partial<EffortData>): EffortData {
  return Object.assign(
    {
      startDate: new Date(),
      endDate: new Date(),
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

function _toTallies(data: Partial<TaxonCounterData>): TaxonCounterData {
  return Object.assign(
    {
      kingdomNames: '',
      kingdomCounts: '',
      phylumNames: null,
      phylumCounts: null,
      classNames: null,
      classCounts: null,
      orderNames: null,
      orderCounts: null,
      familyNames: null,
      familyCounts: null,
      genusNames: null,
      genusCounts: null,
      speciesNames: null,
      speciesCounts: null,
      subspeciesNames: null,
      subspeciesCounts: null
    },
    data
  );
}
