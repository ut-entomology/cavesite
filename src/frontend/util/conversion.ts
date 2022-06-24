import dayjs from 'dayjs';

const INPUT_DATE_FORMAT = 'YYYY-MM-DD';

// from https://stackoverflow.com/a/3561711/650894
export function escapeRegex(s: string) {
  return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}

export function localToInputDate(date: Date): string {
  return dayjs(date).format(INPUT_DATE_FORMAT);
}

export function inputToLocalDate(dateStr: string): Date {
  return dayjs(dateStr, INPUT_DATE_FORMAT).toDate();
}
