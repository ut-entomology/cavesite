export const ADMIN_CONFIG_KEY = 'admin_config';

export const daysOfWeek = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
];

export interface AdminConfig {
  importDaysOfWeek: number[];
  importHourOfDay: number;
}
