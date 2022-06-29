import type { Point } from './point';
import {
  QueryColumnID,
  type QueryColumnSpec,
  type QueryLocationFilter,
  type QueryTaxonFilter,
  type GeneralQuery
} from './general_query';

export interface TimeGraphQuery {
  fromDateMillis: number;
  throughDateMillis: number;
  locationFilter: QueryLocationFilter | null;
  taxonFilter: QueryTaxonFilter | null;
}

export interface TimeGraphData {
  query: TimeGraphQuery;
  historyGraphSpec: TimeGraphSpec;
  seasonalityGraphSpec: TimeGraphSpec;
}

export interface TimeGraphSpec {
  graphTitle: string;
  lifeStageDataSet: LifeStageData[];
}

export interface LifeStageData {
  label: string;
  pairs: number[][]; // downloaded values
  points: Point[]; // converted for chart.js
}

export function convertTimeQuery(timeGraphQuery: TimeGraphQuery): GeneralQuery {
  const columnSpecs: QueryColumnSpec[] = [];
  columnSpecs.push({
    columnID: QueryColumnID.ResultCount,
    ascending: null,
    optionText: null
  });
  columnSpecs.push({
    columnID: QueryColumnID.CollectionStartDate,
    ascending: true,
    optionText: null
  });
  columnSpecs.push({
    columnID: QueryColumnID.CollectionEndDate,
    ascending: true,
    optionText: null
  });
  columnSpecs.push({
    columnID: QueryColumnID.Obligate,
    ascending: null,
    optionText: timeGraphQuery.taxonFilter == null ? 'Yes' : null
  });
  columnSpecs.push({
    columnID: QueryColumnID.LifeStage,
    ascending: null,
    optionText: null
  });
  columnSpecs.push({
    columnID: QueryColumnID.SpecimenCount,
    ascending: null,
    optionText: null
  });

  return {
    columnSpecs,
    dateFilter: {
      fromDateMillis: timeGraphQuery.fromDateMillis,
      throughDateMillis: timeGraphQuery.throughDateMillis
    },
    locationFilter: timeGraphQuery.locationFilter,
    taxonFilter: timeGraphQuery.taxonFilter
  };
}
