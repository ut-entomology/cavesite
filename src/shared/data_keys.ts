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
