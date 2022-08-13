/**
 * DataOf is a TypeScript type for public non-function properties.
 */

// Matches object properties not beginning with an underscore.
type PublicProperty<P> = P extends `_${string}` ? never : P;

// Matches objects that are functions.
type IsFunction<T> = T extends (...args: any[]) => any ? T : never;

/**
 * Provides a type consisting of all public non-function properties of T.
 */
export type DataOf<T> = Pick<
  T,
  {
    [K in keyof T]: K extends PublicProperty<K>
      ? T[K] extends IsFunction<T[K]>
        ? never
        : K
      : never;
  }[keyof T]
>;
