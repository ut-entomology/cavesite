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

export function toDaysEpoch(date: Date): number {
  return Math.floor(date.getTime() / MILLIS_PER_DAY);
}
