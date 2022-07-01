/**
 * Point structured required by chart.js, kept in /shared so that the same
 * structures can be generated client-side or server-side, although
 * converstion from number[] pairs to points occurs client-side.
 */

export interface Point {
  x: number;
  y: number;
}
