import {
  MILLIS_PER_DAY,
  LifeStage,
  type HistoryStageTallies,
  type SeasonalityStageTallies
} from '../../shared/time_query';

const FILL_OPACITY = 0.2;
const TOTAL_SPECIES_LABEL = 'min. species';
const TOTAL_SPECIMENS_LABEL = 'total specimens';

const labelByLifeStage = ['Unspecified', 'Immatures', 'Adults', 'All life stages'];
const hexColors = ['ee00e9', '00a0ee', '7d46eb', 'b0b0b0'];
// prettier-ignore
const monthLabels = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];
const seasonLabels = ['Spring', 'Summer', 'Fall', 'Winter'];
const weeklyLabels = _makeWeeklyLabels();

export interface LifeStageTrend {
  label: string;
  plotColor: string;
  fillColor: string;
  yValues: number[];
}

export interface TimeGraphSpec {
  graphTitle: string;
  xAxisLabel: string;
  yAxisLabel: string;
  isAdditive: boolean;
  xValues: (string | number)[];
  trendsByLifeStage: LifeStageTrend[];
}

interface BarPoint {
  y: number;
  xLabel: string | number;
}

export function createHistoryGraphSpec(
  stageTallySet: HistoryStageTallies[],
  totalsProperty: keyof HistoryStageTallies
): TimeGraphSpec {
  const trendsByLifeStage: LifeStageTrend[] = [];
  let barPoints: BarPoint[] = [];
  let initialBarPoints: BarPoint[] | null = null;
  let yAxisLabel = TOTAL_SPECIMENS_LABEL;
  let xAxisLabel = 'BLANK';

  for (let i = 0; i <= LifeStage.All; ++i) {
    switch (totalsProperty) {
      // @ts-ignore
      case 'monthlySpeciesTotals':
        yAxisLabel = TOTAL_SPECIES_LABEL;
      case 'monthlySpecimenTotals':
        xAxisLabel = 'year and month';
        barPoints = _createMonthlyHistoryPoints(stageTallySet[i], totalsProperty);
        break;
      // @ts-ignore
      case 'seasonalSpeciesTotals':
        yAxisLabel = TOTAL_SPECIES_LABEL;
      case 'seasonalSpecimenTotals':
        xAxisLabel = 'year and season';
        barPoints = _createSeasonalHistoryPoints(stageTallySet[i], totalsProperty);
        break;
      // @ts-ignore
      case 'yearlySpeciesTotals':
        yAxisLabel = TOTAL_SPECIES_LABEL;
      case 'yearlySpecimenTotals':
        xAxisLabel = 'year';
        barPoints = _createYearlyHistoryPoints(stageTallySet[i], totalsProperty);
        break;
    }

    if (i != LifeStage.All || yAxisLabel != TOTAL_SPECIMENS_LABEL) {
      trendsByLifeStage.push({
        label: labelByLifeStage[i],
        plotColor: _hexToRGBAColor(hexColors[i], 4, 1),
        fillColor: 'unused',
        yValues: barPoints.map((p) => p.y)
      });
      if (initialBarPoints === null) initialBarPoints = barPoints;
    }
  }

  return {
    graphTitle: _toGraphTitle(yAxisLabel, xAxisLabel),
    xAxisLabel,
    yAxisLabel,
    isAdditive: yAxisLabel == TOTAL_SPECIMENS_LABEL,
    xValues: initialBarPoints!.map((p) => p.xLabel), // same labels for all life stages
    trendsByLifeStage
  };
}

export function createSeasonalityGraphSpec(
  stageTallySet: SeasonalityStageTallies[],
  totalsProperty: keyof SeasonalityStageTallies
): TimeGraphSpec {
  const trendsByLifeStage: LifeStageTrend[] = [];
  let barPoints: BarPoint[] = [];
  let initialBarPoints: BarPoint[] | null = null;
  let yAxisLabel = TOTAL_SPECIMENS_LABEL;
  let xAxisLabel = 'BLANK';

  for (let i = 0; i <= LifeStage.All; ++i) {
    switch (totalsProperty) {
      // @ts-ignore
      case 'weeklySpeciesTotals':
        yAxisLabel = TOTAL_SPECIES_LABEL;
      case 'weeklySpecimenTotals':
        xAxisLabel = 'week of year';
        barPoints = _createWeeklySeasonalityPoints(stageTallySet[i], totalsProperty);
        break;
      // @ts-ignore
      case 'biweeklySpeciesTotals':
        yAxisLabel = TOTAL_SPECIES_LABEL;
      case 'biweeklySpecimenTotals':
        xAxisLabel = 'fortnight of year';
        barPoints = _createBiweeklySeasonalityPoints(stageTallySet[i], totalsProperty);
        break;
      // @ts-ignore
      case 'monthlySpeciesTotals':
        yAxisLabel = TOTAL_SPECIES_LABEL;
      case 'monthlySpecimenTotals':
        xAxisLabel = 'month';
        barPoints = _createMonthlySeasonalityPoints(stageTallySet[i], totalsProperty);
        break;
      // @ts-ignore
      case 'seasonalSpeciesTotals':
        yAxisLabel = TOTAL_SPECIES_LABEL;
      case 'seasonalSpecimenTotals':
        xAxisLabel = 'season';
        barPoints = _createSeasonalSeasonalityPoints(stageTallySet[i], totalsProperty);
        break;
    }

    if (i != LifeStage.All || yAxisLabel != TOTAL_SPECIMENS_LABEL) {
      trendsByLifeStage.push({
        label: labelByLifeStage[i],
        plotColor: _hexToRGBAColor(hexColors[i], 8, 1),
        fillColor: _hexToRGBAColor(hexColors[i], 0, FILL_OPACITY),
        yValues: barPoints.map((p) => p.y)
      });
      if (initialBarPoints === null) initialBarPoints = barPoints;
    }
  }

  return {
    graphTitle: _toGraphTitle(yAxisLabel, xAxisLabel),
    xAxisLabel,
    yAxisLabel,
    isAdditive: yAxisLabel == TOTAL_SPECIMENS_LABEL,
    xValues: initialBarPoints!.map((p) => p.xLabel), // same labels for all life stages
    trendsByLifeStage
  };
}

function _createMonthlyHistoryPoints(
  tallies: HistoryStageTallies,
  totalsProperty: keyof Pick<
    HistoryStageTallies,
    'monthlySpeciesTotals' | 'monthlySpecimenTotals'
  >
): BarPoint[] {
  const points: BarPoint[] = [];
  const totalsByDateCode = tallies[totalsProperty];
  const dateCodeStrings = Object.keys(totalsByDateCode);
  let dateCode = parseInt(dateCodeStrings[0]);
  const lastDateCode = parseInt(dateCodeStrings[dateCodeStrings.length - 1]);

  while (dateCode <= lastDateCode) {
    const total = totalsByDateCode[dateCode];
    let year = Math.floor(dateCode / 100);
    let month = dateCode % 100;
    points.push({ y: total || 0, xLabel: `${monthLabels[month - 1]} ${year}` });
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
): BarPoint[] {
  const points: BarPoint[] = [];
  const totalsByDateCode = tallies[totalsProperty];
  const dateCodeStrings = Object.keys(totalsByDateCode);
  let dateCode = parseInt(dateCodeStrings[0]);
  const lastDateCode = parseInt(dateCodeStrings[dateCodeStrings.length - 1]);

  while (dateCode <= lastDateCode) {
    const total = totalsByDateCode[dateCode];
    let year = Math.floor(dateCode / 10);
    let season = dateCode % 10;
    points.push({ y: total || 0, xLabel: `${seasonLabels[season]} ${year}` });
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
): BarPoint[] {
  const points: BarPoint[] = [];
  const totalsByYear = tallies[totalsProperty];
  const yearStrings = Object.keys(totalsByYear);
  let year = parseInt(yearStrings[0]);
  const lastYear = parseInt(yearStrings[yearStrings.length - 1]);

  while (year <= lastYear) {
    const total = totalsByYear[year];
    points.push({ y: total || 0, xLabel: year });
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
): BarPoint[] {
  const points: BarPoint[] = [];
  for (let i = 0; i < 52; ++i) {
    points.push({ y: tallies[totalsProperty][i + 1] || 0, xLabel: weeklyLabels[i] });
  }
  return points;
}

function _createBiweeklySeasonalityPoints(
  tallies: SeasonalityStageTallies,
  totalsProperty: keyof Pick<
    SeasonalityStageTallies,
    'biweeklySpeciesTotals' | 'biweeklySpecimenTotals'
  >
): BarPoint[] {
  const points: BarPoint[] = [];
  for (let i = 0; i < 26; ++i) {
    points.push({
      y: tallies[totalsProperty][i + 1] || 0,
      xLabel: weeklyLabels[i * 2]
    });
  }
  return points;
}

function _createMonthlySeasonalityPoints(
  tallies: SeasonalityStageTallies,
  totalsProperty: keyof Pick<
    SeasonalityStageTallies,
    'monthlySpeciesTotals' | 'monthlySpecimenTotals'
  >
): BarPoint[] {
  const points: BarPoint[] = [];
  for (let i = 0; i < 12; ++i) {
    points.push({ y: tallies[totalsProperty][i + 1] || 0, xLabel: monthLabels[i] });
  }
  return points;
}

function _createSeasonalSeasonalityPoints(
  tallies: SeasonalityStageTallies,
  totalsProperty: keyof Pick<
    SeasonalityStageTallies,
    'seasonalSpeciesTotals' | 'seasonalSpecimenTotals'
  >
): BarPoint[] {
  const points: BarPoint[] = [];
  for (let i = 0; i < 4; ++i) {
    points.push({ y: tallies[totalsProperty][i] || 0, xLabel: seasonLabels[i] });
  }
  return points;
}

function _hexToRGBAColor(hexColor: string, delta: number, opacity: number): string {
  return `rgba(${Number('0x' + hexColor.substring(0, 2)) + delta},${
    Number('0x' + hexColor.substring(2, 4)) + delta
  },${Number('0x' + hexColor.substring(4)) + delta}, ${opacity})`;
}

function _makeWeeklyLabels(): string[] {
  const labels: string[] = [];
  const anyNonLeapYear = new Date(2021, 0, 1);
  const dateMillies = anyNonLeapYear.getTime();
  for (let i = 0; i < 356; i += 7) {
    const date = new Date(dateMillies + i * MILLIS_PER_DAY);
    labels.push(`${monthLabels[date.getMonth()]} ${date.getDate()}`);
  }
  return labels;
}

function _toGraphTitle(yAxisLabel: string, xAxisLabel: string): string {
  const yAxisName = yAxisLabel.replace('min.', 'minimum');
  return yAxisName[0].toUpperCase() + yAxisName.substring(1) + ' by ' + xAxisLabel;
}
