/**
 * Data keys and the structures found at them.
 */
import { Permission } from '../shared/user_auth';

export enum DataKey {
  CaveLocalities = 'cave_localities',
  CaveObligates = 'cave_obligates',
  ImportSchedule = 'import_schedule',
  KarstRegions = 'karst_regions',
  TexasSpeciesStatus = 'texas_status',
  FederalSpeciesStatus = 'federal_status'
}

export const daysOfWeek = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
];

export interface ImportSchedule {
  importDaysOfWeek: number[];
  importHourOfDay: number;
}

export interface MapRegionSource {
  isKFR: boolean;
  propertyName: string;
  layerName: string;
  mapboxCode: string;
}

export interface TexasSpeciesStatus {
  species: string;
  stateRank: string;
  tpwdStatus: string;
}

export const dataValidatorsByKey = {
  [DataKey.CaveLocalities]: (text: string) => {
    const errors: string[] = [];
    for (let line of text.split('\n')) {
      line = line.trim();
      if (line.length == 0 || line[0] == '#') continue;
      if (line[0] == '(') {
        addError(errors, line, 'cannot begin cave name with parentheses');
      }
      const lastLeftParenIndex = line.lastIndexOf('(');
      if (lastLeftParenIndex < 0) {
        addError(errors, line, 'is missing parenthesized county name');
      } else if (line[line.length - 1] != ')') {
        addError(errors, line, 'is missing trailing parenthesis');
      } else {
        const locality = line.substring(0, lastLeftParenIndex).trim();
        const county = line.substring(lastLeftParenIndex + 1, line.length - 1).trim();
        if (county == '') {
          addError(errors, line, 'has no county name');
        }
        if (locality.toLowerCase().includes('cave')) {
          addError(
            errors,
            line,
            "contains the text 'cave' and so need not be listed here"
          );
        }
      }
    }
    return errors;
  },
  [DataKey.CaveObligates]: (text: string) => {
    const regex = /^[-A-Za-z0-9 .]+$/;
    const errors: string[] = [];
    for (let line of text.split('\n')) {
      line = line.trim();
      if (line.length == 0 || line[0] == '#') continue;
      if (line[0] != line[0].toUpperCase()) {
        addError(errors, line, 'does not begin with an uppercase letter');
      }
      if (line[1] == '.') {
        addError(errors, line, 'appears to have an abbreviated genus');
      }
      if (!line.match(regex)) {
        addError(errors, line, 'contains dissallowed characters');
      }
      if (line.substring(1) != line.substring(1).toLowerCase()) {
        addError(errors, line, 'is not entirely lowercase after first letter');
      }
    }
    return errors;
  },
  [DataKey.KarstRegions]: (text: string) => {
    const errors: string[] = [];
    for (let line of text.split('\n')) {
      line = line.trim();
      if (line.length == 0 || line[0] == '#') continue;
      const colonOffset = line.indexOf(':');
      if (colonOffset <= 0) {
        addError(errors, line, "must begin with 'KR:' or 'KFR:'");
      }
      const regionType = line.substring(0, colonOffset);
      if (!['KR', 'KFR'].includes(regionType)) {
        addError(errors, line, "must begin with 'KR:' or 'KFR:'");
      }
      const params = line.substring(colonOffset + 1).split(',');
      if (params.length != 3) {
        addError(errors, line, 'must contain 3 comma-delimited parameters');
      }
      for (let param of params) {
        param = param.trim();
        if (param.includes(' ')) {
          addError(errors, line, `"${param}" cannot contain spaces`);
        }
      }
      if (!params[1].includes('-')) {
        addError(errors, line, `"${params[1]}" does not appear to be a tileset name`);
      }
      if (!params[2].includes('.')) {
        addError(errors, line, `"${params[2]}" does not appear to be a tileset ID`);
      }
    }
    return errors;
  },
  [DataKey.TexasSpeciesStatus]: (text: string) => {
    const errors: string[] = [];
    for (let line of text.split('\n')) {
      line = line.trim();
      if (line.length == 0 || line[0] == '#') continue;
      const values = line.split(',');
      if (values.length != 3) {
        addError(errors, line, 'must contain 3 comma-delimited values');
      }
      _checkSpeciesName(errors, values[0]);
      const stateRank = values[1].trim();
      if (stateRank.includes(' ') || (stateRank != '' && stateRank[0] != 'S')) {
        addError(
          errors,
          line,
          `does not appear to have a state rank (a single term starting with 'S')`
        );
      }
      if (stateRank == 'SGCN') {
        addError(
          errors,
          line,
          `appears to have reversed the state rank and TPWD columns`
        );
      }
    }
    return errors;
  }
};

function addError(errors: string[], line: string, message: string): void {
  errors.push(`"${line}" ${message}`);
}

export const readPermissionsByKey = {
  [DataKey.CaveLocalities]: Permission.None,
  [DataKey.CaveObligates]: Permission.None,
  [DataKey.ImportSchedule]: Permission.Admin,
  [DataKey.KarstRegions]: Permission.None,
  [DataKey.TexasSpeciesStatus]: Permission.None,
  [DataKey.FederalSpeciesStatus]: Permission.None
};

export function parseDataLines(text: string): string[] {
  const lines: string[] = [];
  for (let line of text.split('\n')) {
    line = line.trim();
    if (line != '' && line[0] != '#') {
      lines.push(line);
    }
  }
  return lines;
}

export function parseLocalities(text: string): [string, string][] {
  const localityCounties: [string, string][] = [];
  for (const line of parseDataLines(text)) {
    const lastLeftParenIndex = line.lastIndexOf('(');
    const locality = line.substring(0, lastLeftParenIndex).trim().toLowerCase();
    const county = line
      .substring(lastLeftParenIndex + 1, line.length - 1)
      .trim()
      .toLowerCase();
    localityCounties.push([locality, county]);
  }
  return localityCounties;
}

export function parseRegions(text: string): MapRegionSource[] {
  const regionSources: MapRegionSource[] = [];
  for (let line of parseDataLines(text)) {
    line = line.trim();
    const colonOffset = line.indexOf(':');
    const params = line.substring(colonOffset + 1).split(',');
    regionSources.push({
      isKFR: line.substring(0, colonOffset) == 'KFR',
      propertyName: params[0].trim(),
      layerName: params[1].trim(),
      mapboxCode: params[2].trim()
    });
  }
  return regionSources;
}

export function parseStateSpeciesStatus(text: string): TexasSpeciesStatus[] {
  const statuses: TexasSpeciesStatus[] = [];
  for (let line of parseDataLines(text)) {
    const values = line.split(',');
    statuses.push({
      species: values[0].trim(),
      stateRank: values[1].trim(),
      tpwdStatus: values[2].trim()
    });
  }
  return statuses;
}

function _checkSpeciesName(errors: string[], text: string): void {
  const regex = /^[-A-Za-z ]+$/;
  text = text.trim();
  if (text[0] != text[0].toUpperCase()) {
    addError(errors, text, 'does not begin with an uppercase letter');
  }
  if (!text.match(regex)) {
    addError(errors, text, 'contains dissallowed characters');
  }
  if (text.substring(1) != text.substring(1).toLowerCase()) {
    addError(errors, text, 'is not entirely lowercase after first letter');
  }
  const spaces = text.length - text.replace(' ', '').length;
  if (spaces < 1 || spaces > 2) {
    addError(errors, text, 'must consist of 2 or 3 words (3 for subspecies)');
  }
}
