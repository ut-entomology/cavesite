/**
 * Generally useful utilities for managing HTTP on the server.
 */

/**
 * Used for validating received lists of integers.
 */
export const INTEGER_LIST_CHARS_REGEX = /^[\d,]+$/;

/**
 * Translates a base64 string into a string that is safe for HTTP headers.
 * In particular, it strips any trailing equals signs, which only serve as
 * padding, and it changes all slashes ('/') to dashes ('-').
 *
 * @param base64 Base64 string to make safe for HTTP headers
 * @return Returns an HTTP header-safe version of the string
 */
export function toHeaderSafeBase64(base64: string): string {
  return base64.replace(/\=+$/, '').replace(/\//g, '-');
}

/**
 * Checks whether a vlue is boolean. May be null if nullable is true.
 */
export function checkBoolean(value: boolean | null, nullable = false): boolean {
  if (nullable && value === null) return true;
  return typeof value == 'boolean';
}

/**
 * Checks whether the value is an integer. May be null if nullable is true.
 */
export function checkInteger(value: number | null, nullable = false): boolean {
  if (nullable && value === null) return true;
  return typeof value == 'number' && Math.floor(value) == value;
}

/**
 * Checks whether value is a list of integers. May be null if nullable is true.
 */
export function checkIntegerList(value: number[] | null, nullable = false): boolean {
  if (nullable && value === null) return true;
  if (!Array.isArray(value)) return false;
  return INTEGER_LIST_CHARS_REGEX.test(value.join(','));
}

/**
 * Checks whether a vlue is a string. May be null if nullable is true.
 */
export function checkString(value: string | null, nullable = false): boolean {
  if (nullable && value === null) return true;
  return typeof value == 'string';
}
