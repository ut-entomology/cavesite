/**
 * Specialized tools for working with dates.
 */

export const MILLIS_PER_DAY = 24 * 60 * 60 * 1000;

export function partialDateHasMonth(partialDate: string): boolean {
  return partialDate.indexOf('-') > 0;
}

export function fromDaysEpoch(daysEpoch: number): Date {
  // +1 is needed because toDaysEpoch calls Math.floor()
  return new Date((daysEpoch + 1) * MILLIS_PER_DAY);
}

export function stripTimeZone(date: Date): Date {
  return toDateFromString(date.toISOString());
}

export function stripTimeZoneOrNull(date: Date | null): Date | null {
  return date === null ? null : stripTimeZone(date);
}

export function toDaysEpoch(date: Date): number {
  return Math.floor(date.getTime() / MILLIS_PER_DAY);
}

export function toDateFromNumbers(year: number, month: number, day: number): Date {
  return new Date(
    `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  );
}

// Extract the date and interprets it as GMT regardless of timezone.
export function toDateFromString(dateStr: string): Date {
  let parts: string[];
  if (dateStr.includes('/')) {
    parts = dateStr.split('/');
    if (parts[2].length == 2) {
      if (parseInt(parts[2]) >= 25) {
        parts[2] = '19' + parts[2];
      } else {
        parts[2] = '20' + parts[2];
      }
    }
    parts = [parts[2], parts[0], parts[1]]; // assume U.S. date format
  } else {
    const tOffset = dateStr.indexOf('T');
    if (tOffset > 0) dateStr = dateStr.substring(0, tOffset);
    parts = dateStr.split('-');
    if (parts[0].length < 4) {
      parts = [parts[2], parts[0], parts[1]]; // assume U.S. date format
    }
  }
  return new Date(
    `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`
  );
}

const sampleLocalDate = new Date('2022-10-16').toLocaleDateString();
const dateDelimiter = sampleLocalDate.includes('/') ? '/' : '-';
const sampleLocalDateParts = sampleLocalDate.split(dateDelimiter);
const yearFirst = sampleLocalDateParts[0].length == 4;
const monthFirst = !yearFirst && parseInt(sampleLocalDateParts[0]) <= 12;

// Locally format date without drawing on local timezone.
export function toLocalDate(date: Date): string {
  const parts = toZonelessDateString(date).split('-');
  if (parts[1][0] == '0') parts[1] = parts[1][1];
  if (parts[2][0] == '0') parts[2] = parts[2][1];
  if (yearFirst) return parts.join(dateDelimiter);
  if (!monthFirst) parts.reverse().join(dateDelimiter);
  return `${parts[1]}${dateDelimiter}${parts[2]}${dateDelimiter}${parts[0]}`;
}

export function toZonelessDateString(date: Date): string {
  return date.toISOString().substring(0, 'YYYY-MM-DD'.length);
}

export function toZonelessMonthAndYear(date: Date): [number, number] {
  const iso = date.toISOString();
  return [parseInt(iso.substring(5, 7)), parseInt(iso.substring(0, 4))];
}

export function toZonelessYear(date: Date): number {
  return parseInt(date.toISOString().substring(0, 4));
}
