/**
 * Data keys and the structures found at them.
 */

export enum DataKey {
  CaveObligates = 'cave_obligates',
  ImportSchedule = 'import_schedule'
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

export const dataValidatorsByKey = {
  [DataKey.CaveObligates]: (text: string) => {
    const regex = /^[-A-Za-z .]+$/;
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
};

function addError(errors: string[], line: string, message: string): void {
  errors.push(`"${line}" ${message}`);
}
