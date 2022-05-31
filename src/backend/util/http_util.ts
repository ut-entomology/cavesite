import { type Request } from 'express';

import { Permission } from '../../shared/user_auth';

/**
 * Used for validating received lists of integers.
 */
export const INTEGER_LIST_CHARS_REGEX = /^[\d,]+$/;

/**
 * Express middleware limiting access to logged in users with all of
 * the provided permissions.
 */
export function requirePermissions(permissions: Permission) {
  return (req: Request<void, any, void>, res: any, next: any) => {
    if (
      !req.session ||
      (req.session.userInfo.permissions & permissions) != permissions
    ) {
      return res.status(403).send();
    }
    next();
  };
}

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
export function checkInteger(value: number, nullable = false): boolean {
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
