/**
 * User input validation common to frontend and backend.
 */

export const VALID_EMAIL_REGEX = /^[^\s@]+@([^\s@.,]+\.)+[^\s@.,]{2,}$/;

export const MIN_PASSWORD_STRENGTH = 10;

const LATITUDE_REGEX = /^([-]?\d+[.]?\d*) *[NS]?$/i;
const LONGITUDE_REGEX = /^([-]?\d+[.]?\d*) *[EW]?$/i;

export class UserError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class ValidationError extends UserError {
  constructor(message: string) {
    super(message);
  }
}

export function parseLatitude(latitudeStr: string): number {
  const latitude = _parseCoordinate('latitude', latitudeStr, LATITUDE_REGEX, 'NS');
  if (latitude < -90 || latitude > 90) {
    throw new ValidationError('Latitude out of range');
  }
  return latitude;
}

export function parseLongitude(longitudeStr: string): number {
  const longitude = _parseCoordinate('longitude', longitudeStr, LONGITUDE_REGEX, 'EW');
  if (longitude < -180 || longitude > 180) {
    throw new ValidationError('Longitude out of range');
  }
  return longitude;
}

export function parseUncertaintyMeters(uncertaintyStr: string): number | null {
  if (uncertaintyStr.endsWith('m')) {
    uncertaintyStr = uncertaintyStr.substring(0, uncertaintyStr.length - 1).trim();
  } else if (uncertaintyStr.includes('meter')) {
    uncertaintyStr = uncertaintyStr
      .substring(0, uncertaintyStr.indexOf('meter'))
      .trim();
  }
  if (!uncertaintyStr.match(/^(?:\d+[.]?\d*|[.]\d+)$/)) {
    throw new ValidationError('Invalid uncertainty');
  }
  let uncertainty: number | null = parseFloat(uncertaintyStr);
  if (isNaN(uncertainty) || uncertainty < 0) {
    throw new ValidationError('Invalid uncertainty');
  }
  return uncertainty || null;
}

function _parseCoordinate(
  type: string,
  coordStr: string,
  regex: RegExp,
  suffixes: string
): number {
  const throwError: () => never = () => {
    throw new ValidationError('Invalid ' + type);
  };
  const match = coordStr.match(regex);
  if (!match) throwError();
  let sign = 1;
  const lastChar = coordStr[coordStr.length - 1].toUpperCase();
  if (suffixes.indexOf(lastChar) >= 0) {
    if (coordStr[0] == '-') throwError();
    if (lastChar == suffixes[1]) sign = -1;
    coordStr = coordStr.substring(0, coordStr.length - 1);
  }
  const coord = parseFloat(match[1]);
  if (isNaN(coord)) throwError();
  return sign * coord;
}
