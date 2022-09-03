/**
 * Data keys and the structures found at them.
 */
import { Permission } from '../shared/user_auth';
import { QueryColumnID } from '../shared/general_query';

export enum DataKey {
  // General admin

  ImportSchedule = 'import_schedule',
  DefaultQueryFields = 'default_query_fields',

  // Presentation

  SiteTitleAndSubtitle = 'title_and_subtitle',
  WelcomePage = 'welcome_page',

  // Locality characterization

  KarstRegions = 'karst_regions',
  TerrestrialKarstTerms = 'terrestrial_karst_terms',
  TerrestrialKarstLocalities = 'terrestrial_karst_localities',
  AquaticKarstTerms = 'aquatic_karst_terms',
  AquaticKarstLocalities = 'aquatic_karst_localities',

  // Species characterization

  Stygobites = 'stygobites',
  Troglobites = 'troglobites',
  TexasSpeciesStatus = 'texas_status',
  FederalSpeciesStatus = 'federal_status',

  // Email text

  NewAccountEmail = 'new_account_email',
  PasswordResetLinkEmail = 'reset_request_email',
  NewPasswordEmail = 'password_reset_email'
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

export const commonTemplateVars = ['website-title', 'website-subtitle'];

const commonEmailVars = [
  ...commonTemplateVars,
  'first-name',
  'full-name',
  'user-email',
  'sender-email'
];
export const credentialEmailVars = [...commonEmailVars, 'password'];
export const resetRequestEmailVars = [
  ...commonEmailVars,
  'reset-link',
  'reset-link-minutes'
];

export interface ImportSchedule {
  importDaysOfWeek: number[];
  importHourOfDay: number;
}

export interface MapRegionSource {
  switchName: string;
  propertyName: string;
  layerName: string;
  mapboxCode: string;
}

export interface TexasSpeciesStatus {
  species: string;
  stateRank: string;
  tpwdStatus: string;
}

export interface KeyDataInfo {
  readPermission: Permission;
  getErrors: ((text: string) => string[]) | null;
  checkTaxa: boolean;
}

export const keyDataInfoByKey: Record<DataKey, KeyDataInfo> = {
  [DataKey.SiteTitleAndSubtitle]: {
    readPermission: Permission.None,
    getErrors: getSiteTitleAndSubtitleErrors,
    checkTaxa: false
  },
  [DataKey.WelcomePage]: {
    readPermission: Permission.None,
    getErrors: getWelcomePageErrors,
    checkTaxa: false
  },
  [DataKey.DefaultQueryFields]: {
    readPermission: Permission.None,
    getErrors: getDefaultQueryFieldsErrors,
    checkTaxa: false
  },
  [DataKey.ImportSchedule]: {
    readPermission: Permission.Admin,
    getErrors: null,
    checkTaxa: false
  },
  [DataKey.KarstRegions]: {
    readPermission: Permission.None,
    getErrors: getKarstRegionsErrors,
    checkTaxa: false
  },
  [DataKey.TerrestrialKarstTerms]: {
    readPermission: Permission.None,
    getErrors: null,
    checkTaxa: false
  },
  [DataKey.TerrestrialKarstLocalities]: {
    readPermission: Permission.None,
    getErrors: getKarstLocalityErrors,
    checkTaxa: false
  },
  [DataKey.AquaticKarstTerms]: {
    readPermission: Permission.None,
    getErrors: null,
    checkTaxa: false
  },
  [DataKey.AquaticKarstLocalities]: {
    readPermission: Permission.None,
    getErrors: getKarstLocalityErrors,
    checkTaxa: false
  },
  [DataKey.Stygobites]: {
    readPermission: Permission.None,
    getErrors: getKarstObligatesErrors,
    checkTaxa: true
  },
  [DataKey.Troglobites]: {
    readPermission: Permission.None,
    getErrors: getKarstObligatesErrors,
    checkTaxa: true
  },
  [DataKey.TexasSpeciesStatus]: {
    readPermission: Permission.None,
    getErrors: getTexasSpeciesStatusErrors,
    checkTaxa: true
  },
  [DataKey.FederalSpeciesStatus]: {
    readPermission: Permission.None,
    getErrors: getFederalSpeciesStatusErrors,
    checkTaxa: true
  },
  [DataKey.NewAccountEmail]: {
    readPermission: Permission.None,
    getErrors: getCredentialEmailErrors,
    checkTaxa: false
  },
  [DataKey.PasswordResetLinkEmail]: {
    readPermission: Permission.Admin,
    getErrors: getPasswordResetLinkEmailErrors,
    checkTaxa: false
  },
  [DataKey.NewPasswordEmail]: {
    readPermission: Permission.Admin,
    getErrors: getCredentialEmailErrors,
    checkTaxa: false
  }
};

function getSiteTitleAndSubtitleErrors(text: string) {
  const errors: string[] = [];
  const lines = text.split('\n').map((line) => line.trim());
  if (lines.length == 0) {
    addError(errors, null, "this file can't be blank");
  } else {
    if (lines[0] == '') {
      addError(errors, null, 'you must provide a title on the first line');
    }
    if (lines.length == 1 || lines[1] == '') {
      addError(errors, null, 'you must provide a subtitle on the second line');
    }
    if (lines.length > 2) {
      addError(
        errors,
        null,
        'there must only be two lines, one for the title and one for the subtitle'
      );
    }
  }
  return errors;
}

function getWelcomePageErrors(text: string) {
  return checkTemplateVars(text, commonTemplateVars);
}

function getDefaultQueryFieldsErrors(text: string) {
  const lines = parseDataLines(text);
  const errors: string[] = [];
  for (const line of lines) {
    if (!Object.values(QueryColumnID).includes(line.trim() as QueryColumnID)) {
      addError(errors, line, 'is not a valid query field');
    }
  }
  return errors;
}

function getKarstLocalityErrors(text: string) {
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
}

function getKarstObligatesErrors(text: string) {
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
}

function getKarstRegionsErrors(text: string) {
  const errors: string[] = [];
  for (let line of text.split('\n')) {
    line = line.trim();
    if (line.length == 0 || line[0] == '#') continue;
    const colonOffset = line.indexOf(':');
    if (colonOffset <= 0 || line.substring(0, colonOffset).trim() == '') {
      addError(errors, line, 'must begin with a switch name followed by a colon');
    }
    const params = line.substring(colonOffset + 1).split(',');
    if (params.length != 3) {
      addError(errors, line, 'must contain 3 comma-delimited parameters');
    } else {
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
  }
  return errors;
}

function getTexasSpeciesStatusErrors(text: string) {
  const errors: string[] = [];
  for (let line of text.split('\n')) {
    line = line.trim();
    if (line.length == 0 || line[0] == '#') continue;
    const values = line.split(',');
    if (values.length != 3) {
      addError(errors, line, 'must contain 3 comma-delimited values');
    } else {
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
  }
  return errors;
}

function getFederalSpeciesStatusErrors(text: string) {
  const errors: string[] = [];
  for (let line of text.split('\n')) {
    line = line.trim();
    if (line.length == 0 || line[0] == '#') continue;
    _checkSpeciesName(errors, line);
  }
  return errors;
}

function getCredentialEmailErrors(text: string) {
  const errors = checkEmailTemplate(text, credentialEmailVars);
  const requiredVar = '{password}';
  if (!text.includes(requiredVar)) {
    addError(errors, requiredVar, 'missing from email template');
  }
  return errors;
}

function getPasswordResetLinkEmailErrors(text: string) {
  const errors = checkEmailTemplate(text, resetRequestEmailVars);
  const requiredVar = '{reset-link}';
  if (!text.includes(requiredVar)) {
    addError(errors, requiredVar, 'missing from email template');
  }
  return errors;
}

function checkEmailTemplate(text: string, varNames: string[]): string[] {
  const errors: string[] = [];
  if (text.trim() == '') {
    addError(errors, '', 'is empty');
  } else {
    if (!text.toLowerCase().startsWith('subject:')) {
      addError(errors, null, `first line must start with "Subject:"`);
    } else {
      const lines = text.split('\n');
      const subject = lines[0].substring('subject:'.length).trim();
      if (subject == '') {
        addError(errors, null, "subject can't be empty");
      }
      const body = lines.slice(1).join('\n').trim();
      if (body == '') {
        addError(errors, null, "body of email can't be empty");
      }
    }
    const varErrors = checkTemplateVars(text, varNames);
    if (varErrors.length > 0) errors.push(...varErrors);
  }
  return errors;
}

function checkTemplateVars(text: string, varNames: string[]): string[] {
  const errors: string[] = [];
  const BRACKET_REGEX = /[{]([^}]+)[}]/g;
  for (const match of text.matchAll(BRACKET_REGEX)) {
    const varName = match[1];
    if (!varNames.includes(varName)) {
      addError(errors, varName, ' is not a recognized variable');
    }
  }
  return errors;
}

function addError(errors: string[], line: string | null, message: string): void {
  if (line !== null) {
    message = `"${line}" ${message}`;
  }
  errors.push(message);
}

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
      switchName: line.substring(0, colonOffset).trim(),
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

export function parseFederalSpeciesStatus(text: string): string[] {
  return parseDataLines(text).map((sp) => sp.trim());
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
