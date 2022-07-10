export function hslStringToRGBA(hslStr: string, alpha: number): string {
  const regex = /\d+/g;

  const hsl = Array.from(hslStr.matchAll(regex)).map((entry) => parseInt(entry[0]));
  const rgb = hsl2rgb(hsl[0], hsl[1] / 100, hsl[2] / 100);
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
}

// inputs: h: [0, 360), s: [0, 1], l: [0, 1]
export function hsl2rgb(h: number, s: number, l: number) {
  // adapted from https://stackoverflow.com/a/64090995/650894
  let a = s * Math.min(l, 1 - l);
  let f = (n: number, k = (n + h / 30) % 12) =>
    l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}
