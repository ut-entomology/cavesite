import {
  MILLIS_PER_DAY,
  LifeStage,
  type HistoryStageTallies,
  type SeasonalityStageTallies
} from '../../shared/time_query';

const labelByLifeStage = ['Adults', 'Immatures', 'Unspecified', 'All'];
const hexColors = ['00D40E', '00DCD8', 'FF0088', 'A95CFF'];
// prettier-ignore
const monthLabels = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];
const seasonLabels = ['Spring', 'Summer', 'Fall', 'Winter'];
const weeklyLabels = _makeWeeklyLabels();

export interface LifeStageTrend {
  label: string;
  hexColor: string;
  yValues: number[];
}

export interface TimeGraphSpec {
  graphTitle: string;
  xAxisLabel: string;
  yAxisLabel: string;
  xValues: (string | number)[];
  trendsByLifeStage: LifeStageTrend[];
}

interface LinePoint {
  y: number;
  xLabel: string | number;
}

export function createHistoryGraphSpec(
  stageTallySet: HistoryStageTallies[],
  totalsProperty: keyof HistoryStageTallies
): TimeGraphSpec {
  const trendsByLifeStage: LifeStageTrend[] = [];
  let linePoints: LinePoint[] = [];
  let yAxisLabel = 'total specimens';
  let xAxisLabel = 'BLANK';

  for (let i = 0; i < LifeStage._LENGTH; ++i) {
    switch (totalsProperty) {
      // @ts-ignore
      case 'monthlySpeciesTotals':
        yAxisLabel = 'total species';
      case 'monthlySpecimenTotals':
        xAxisLabel = 'year and month';
        linePoints = _createMonthlyHistoryPoints(stageTallySet[i], totalsProperty);
        break;
      // @ts-ignore
      case 'seasonalSpeciesTotals':
        yAxisLabel = 'total species';
      case 'seasonalSpecimenTotals':
        xAxisLabel = 'year and season';
        linePoints = _createSeasonalHistoryPoints(stageTallySet[i], totalsProperty);
        break;
      // @ts-ignore
      case 'yearlySpeciesTotals':
        yAxisLabel = 'total species';
      case 'yearlySpecimenTotals':
        xAxisLabel = 'year';
        linePoints = _createYearlyHistoryPoints(stageTallySet[i], totalsProperty);
        break;
    }

    trendsByLifeStage.push({
      label: labelByLifeStage[i],
      hexColor: hexColors[i],
      yValues: linePoints.map((p) => p.y)
    });
  }

  return {
    graphTitle:
      yAxisLabel[0].toUpperCase() + yAxisLabel.substring(1) + ' by ' + xAxisLabel,
    xAxisLabel,
    yAxisLabel,
    xValues: linePoints.map((p) => p.xLabel), // same labels for all sets of points
    trendsByLifeStage
  };
}

export function createSeasonalityGraphSpec(
  stageTallySet: SeasonalityStageTallies[],
  totalsProperty: keyof SeasonalityStageTallies
): TimeGraphSpec {
  const trendsByLifeStage: LifeStageTrend[] = [];
  let linePoints: LinePoint[] = [];
  let yAxisLabel = 'total specimens';
  let xAxisLabel = 'BLANK';

  for (let i = 0; i < LifeStage._LENGTH; ++i) {
    switch (totalsProperty) {
      // @ts-ignore
      case 'weeklySpeciesTotals':
        yAxisLabel = 'total species';
      case 'weeklySpecimenTotals':
        xAxisLabel = 'week of year';
        linePoints = _createWeeklySeasonalityPoints(stageTallySet[i], totalsProperty);
        break;
      // @ts-ignore
      case 'biweeklySpeciesTotals':
        yAxisLabel = 'total species';
      case 'biweeklySpecimenTotals':
        xAxisLabel = 'fortnight of year';
        linePoints = _createBiweeklySeasonalityPoints(stageTallySet[i], totalsProperty);
        break;
      // @ts-ignore
      case 'monthlySpeciesTotals':
        yAxisLabel = 'total species';
      case 'monthlySpecimenTotals':
        xAxisLabel = 'month of year';
        linePoints = _createMonthlySeasonalityPoints(stageTallySet[i], totalsProperty);
        break;
      // @ts-ignore
      case 'seasonalSpeciesTotals':
        yAxisLabel = 'total species';
      case 'seasonalSpecimenTotals':
        xAxisLabel = 'season of year';
        linePoints = _createSeasonalSeasonalityPoints(stageTallySet[i], totalsProperty);
        break;
    }

    trendsByLifeStage.push({
      label: labelByLifeStage[i],
      hexColor: hexColors[i],
      yValues: linePoints.map((p) => p.y)
    });
  }

  return {
    graphTitle:
      yAxisLabel[0].toUpperCase() + yAxisLabel.substring(1) + ' by ' + xAxisLabel,
    xAxisLabel,
    yAxisLabel,
    xValues: linePoints.map((p) => p.xLabel), // same labels for all sets of points
    trendsByLifeStage
  };
}

function _createMonthlyHistoryPoints(
  tallies: HistoryStageTallies,
  totalsProperty: keyof Pick<
    HistoryStageTallies,
    'monthlySpeciesTotals' | 'monthlySpecimenTotals'
  >
): LinePoint[] {
  const points: LinePoint[] = [];
  const totalsByDateCode = tallies[totalsProperty];
  const dateCodeStrings = Object.keys(totalsByDateCode);
  let dateCode = parseInt(dateCodeStrings[0]);
  const lastDateCode = parseInt(dateCodeStrings[dateCodeStrings.length - 1]);

  while (dateCode <= lastDateCode) {
    const total = totalsByDateCode[dateCode];
    let year = Math.floor(dateCode / 100);
    let month = dateCode % 100;
    points.push({ y: total ? total : 0, xLabel: `${monthLabels[month - 1]} ${year}` });
    if (++month == 13) {
      ++year;
      month = 1;
    }
    dateCode = year * 100 + month;
  }
  return points;
}

function _createSeasonalHistoryPoints(
  tallies: HistoryStageTallies,
  totalsProperty: keyof Pick<
    HistoryStageTallies,
    'seasonalSpeciesTotals' | 'seasonalSpecimenTotals'
  >
): LinePoint[] {
  const points: LinePoint[] = [];
  const totalsByDateCode = tallies[totalsProperty];
  const dateCodeStrings = Object.keys(totalsByDateCode);
  let dateCode = parseInt(dateCodeStrings[0]);
  const lastDateCode = parseInt(dateCodeStrings[dateCodeStrings.length - 1]);

  while (dateCode <= lastDateCode) {
    const total = totalsByDateCode[dateCode];
    let year = Math.floor(dateCode / 10);
    let season = dateCode % 10;
    points.push({ y: total ? total : 0, xLabel: `${seasonLabels[season]} ${year}` });
    if (++season == 4) {
      ++year;
      season = 0;
    }
    dateCode = year * 10 + season;
  }
  return points;
}

function _createYearlyHistoryPoints(
  tallies: HistoryStageTallies,
  totalsProperty: keyof Pick<
    HistoryStageTallies,
    'yearlySpeciesTotals' | 'yearlySpecimenTotals'
  >
): LinePoint[] {
  const points: LinePoint[] = [];
  const totalsByYear = tallies[totalsProperty];
  const yearStrings = Object.keys(totalsByYear);
  let year = parseInt(yearStrings[0]);
  const lastYear = parseInt(yearStrings[yearStrings.length - 1]);

  while (year <= lastYear) {
    const total = totalsByYear[year];
    points.push({ y: total ? total : 0, xLabel: year });
    ++year;
  }
  return points;
}

function _createWeeklySeasonalityPoints(
  tallies: SeasonalityStageTallies,
  totalsProperty: keyof Pick<
    SeasonalityStageTallies,
    'weeklySpeciesTotals' | 'weeklySpecimenTotals'
  >
): LinePoint[] {
  const points: LinePoint[] = [];
  for (let i = 0; i < 52; ++i) {
    points.push({ y: tallies[totalsProperty][i + 1], xLabel: weeklyLabels[i] });
  }
  return points;
}

function _createBiweeklySeasonalityPoints(
  tallies: SeasonalityStageTallies,
  totalsProperty: keyof Pick<
    SeasonalityStageTallies,
    'biweeklySpeciesTotals' | 'biweeklySpecimenTotals'
  >
): LinePoint[] {
  const points: LinePoint[] = [];
  for (let i = 0; i < 26; ++i) {
    points.push({ y: tallies[totalsProperty][i + 1], xLabel: weeklyLabels[i * 2] });
  }
  return points;
}

function _createMonthlySeasonalityPoints(
  tallies: SeasonalityStageTallies,
  totalsProperty: keyof Pick<
    SeasonalityStageTallies,
    'monthlySpeciesTotals' | 'monthlySpecimenTotals'
  >
): LinePoint[] {
  const points: LinePoint[] = [];
  for (let i = 0; i < 12; ++i) {
    points.push({ y: tallies[totalsProperty][i + 1], xLabel: monthLabels[i] });
  }
  return points;
}

function _createSeasonalSeasonalityPoints(
  tallies: SeasonalityStageTallies,
  totalsProperty: keyof Pick<
    SeasonalityStageTallies,
    'seasonalSpeciesTotals' | 'seasonalSpecimenTotals'
  >
): LinePoint[] {
  const points: LinePoint[] = [];
  for (let i = 0; i < 4; ++i) {
    points.push({ y: tallies[totalsProperty][i], xLabel: seasonLabels[i] });
  }
  return points;
}

function _makeWeeklyLabels(): string[] {
  const labels: string[] = [];
  const anyNonLeapYear = new Date(2021, 1, 1);
  const dateMillies = anyNonLeapYear.getTime();
  for (let i = 0; i < 356; i += 7) {
    const date = new Date(dateMillies + i * MILLIS_PER_DAY);
    labels.push(`${monthLabels[date.getMonth()]} ${date.getDate()}`);
  }
  return labels;
}
