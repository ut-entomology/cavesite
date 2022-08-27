/**
 * Specialized tools for working with dates.
 */

export const MILLIS_PER_DAY = 24 * 60 * 60 * 1000;

// Place the date midday in the CST/CDT timezone (5 + 12 = 17). Putting it in the
// CST/CDT timezone is correct for Texas specimens. Not having it on midnight of
// that day (T00:00:00) prevents problems intepreting the date of the day.
const UTC_TIME = 'T17:00:00.000Z';

export function partialDateHasMonth(partialDate: string): boolean {
  return partialDate.indexOf('-') > 0;
}

export function fromDaysEpoch(daysEpoch: number): Date {
  // +1 is needed because toDaysEpoch calls Math.floor()
  return new Date((daysEpoch + 1) * MILLIS_PER_DAY);
}

export function toDaysEpoch(date: Date): number {
  return Math.floor(date.getTime() / MILLIS_PER_DAY);
}

export function toDateFromNumbers(year: number, month: number, day: number): Date {
  return new Date(
    `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(
      2,
      '0'
    )}${UTC_TIME}`
  );
}

export function toDateFromString(dateStr: string): Date {
  // Texas CST/CDT dates are loading into GBIF as GMT. This function
  // extracts the date and interprets it as CDT regardless of time zone.
  let parts: string[];
  if (dateStr.includes('/')) {
    parts = dateStr.split('/');
    if (parts[2].length == 2) {
      if (parseInt(parts[2]) >= 30) {
        parts[2] = '19' + parts[2];
      } else {
        parts[2] = '20' + parts[2];
      }
    }
    parts = [parts[2], parts[0], parts[1]]; // assume U.S. date
  } else {
    const tOffset = dateStr.indexOf('T');
    if (tOffset > 0) dateStr = dateStr.substring(0, tOffset);
    parts = dateStr.split('-');
    if (parts[0].length < 4) {
      parts = [parts[2], parts[0], parts[1]]; // assume U.S. date
    }
  }
  return new Date(
    `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}${UTC_TIME}`
  );
}

export function toExpectedTZ(date: Date): Date {
  return toDateFromString(date.toISOString());
}
