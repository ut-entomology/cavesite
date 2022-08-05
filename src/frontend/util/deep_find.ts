// I wrote this to see if Mapbox was even returning the data I needed.
// It wasn't, so this remains potentially useful but unused.

export function deepFind(
  objToSearch: any,
  check: (obj: any) => boolean,
  excludedProperties: string[] = []
): string[] | null {
  return _findFirst(new Set(), [], objToSearch, check, excludedProperties);
}

function _findFirst(
  checked: Set<any>,
  path: string[],
  object: any,
  check: (obj: any) => boolean,
  excludedProperties: string[]
): string[] | null {
  for (const property in object) {
    try {
      const value = object[property];
      if (!excludedProperties.includes(property)) {
        path.push(property);
        if (check(value)) return path;

        const type = typeof value;
        if ((type == 'object' && value !== null) || type == 'function') {
          if (!checked.has(value)) {
            checked.add(value);
            const found = _findFirst(checked, path, value, check, []);
            if (found !== null) return found;
          }
        }

        path.pop();
      }
    } catch (_err) {
      // ignore values that cannot be read
    }
  }
  return null;
}
