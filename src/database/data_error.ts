/**
 * Error reporting a problem with data imported from GBIF.
 */

export class DataError extends Error {
  constructor(message: string) {
    super(message);
  }
}
