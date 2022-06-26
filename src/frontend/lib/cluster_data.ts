import type { EffortData } from './effort_data';
import {
  type EffortGraphSpec,
  SpeciesByDaysGraphSpec,
  PercentChangeByDaysGraphSpec,
  CumuPercentChangeByDaysGraphSpec,
  SpeciesByVisitsGraphSpec,
  PercentChangeByVisitsGraphSpec,
  CumuPercentChangeByVisitsGraphSpec,
  SpeciesByPersonVisitsGraphSpec,
  PercentChangeByPersonVisitsGraphSpec,
  CumuPercentChangeByPersonVisitsGraphSpec
} from '../lib/effort_graphs';

export enum YAxisType {
  totalSpecies = 'total species',
  percentChange = '% change',
  cumuPercentChange = 'cumulative % change'
}

export interface ClusterData {
  locationCount: number;
  perDayTotalsGraph: EffortGraphSpec;
  perVisitTotalsGraph: EffortGraphSpec;
  perPersonVisitTotalsGraph: EffortGraphSpec;
}

export function toClusterData(
  yAxisType: YAxisType,
  effortData: EffortData[],
  lowerBoundX: number,
  upperBoundX: number,
  minUnchangedY: number,
  zeroYBaseline: boolean
): ClusterData {
  switch (yAxisType) {
    case YAxisType.totalSpecies:
      return {
        locationCount: effortData.length,
        perDayTotalsGraph: new SpeciesByDaysGraphSpec(
          effortData,
          lowerBoundX,
          upperBoundX,
          minUnchangedY,
          zeroYBaseline
        ),
        perVisitTotalsGraph: new SpeciesByVisitsGraphSpec(
          effortData,
          lowerBoundX,
          upperBoundX,
          minUnchangedY,
          zeroYBaseline
        ),
        perPersonVisitTotalsGraph: new SpeciesByPersonVisitsGraphSpec(
          effortData,
          lowerBoundX,
          upperBoundX,
          minUnchangedY,
          zeroYBaseline
        )
      };
      break;
    case YAxisType.percentChange:
      return {
        locationCount: effortData.length,
        perDayTotalsGraph: new PercentChangeByDaysGraphSpec(
          effortData,
          lowerBoundX,
          upperBoundX,
          minUnchangedY,
          zeroYBaseline
        ),
        perVisitTotalsGraph: new PercentChangeByVisitsGraphSpec(
          effortData,
          lowerBoundX,
          upperBoundX,
          minUnchangedY,
          zeroYBaseline
        ),
        perPersonVisitTotalsGraph: new PercentChangeByPersonVisitsGraphSpec(
          effortData,
          lowerBoundX,
          upperBoundX,
          minUnchangedY,
          zeroYBaseline
        )
      };
      break;
    case YAxisType.cumuPercentChange:
      return {
        locationCount: effortData.length,
        perDayTotalsGraph: new CumuPercentChangeByDaysGraphSpec(
          effortData,
          lowerBoundX,
          upperBoundX,
          minUnchangedY,
          zeroYBaseline
        ),
        perVisitTotalsGraph: new CumuPercentChangeByVisitsGraphSpec(
          effortData,
          lowerBoundX,
          upperBoundX,
          minUnchangedY,
          zeroYBaseline
        ),
        perPersonVisitTotalsGraph: new CumuPercentChangeByPersonVisitsGraphSpec(
          effortData,
          lowerBoundX,
          upperBoundX,
          minUnchangedY,
          zeroYBaseline
        )
      };
      break;
  }
}
