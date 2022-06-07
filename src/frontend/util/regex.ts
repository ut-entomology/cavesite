// from https://stackoverflow.com/a/3561711/650894
export function escapeRegex(s: string) {
  return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}
