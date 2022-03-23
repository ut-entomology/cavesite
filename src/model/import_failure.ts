/**
 * Error with GBIF date that prevents import.
 */

export class ImportFailure extends Error {
  constructor(message: string) {
    super(message);
  }
}
