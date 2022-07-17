/**
 * Point structured required by chart.js, kept in /shared so that the same
 * structures can be generated client-side or server-side, although
 * converstion from number[] pairs to points occurs client-side.
 */

export interface Point {
  x: number;
  y: number;
}

export function pairsToPoints(pairs: number[][]) {
  return pairs.map((pair) => _pairToPoint(pair));
}

function _pairToPoint(pair: number[]) {
  return { x: pair[0], y: pair[1] };
}
