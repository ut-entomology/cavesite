import { Client } from 'pg';

import { Taxon } from '../src/database/taxon';
import { Location } from '../src/database/location';
import { SpecimenRecord } from '../src/database/specimen_record';
import { PrivateCoordinatePair } from '../src/database/private_coord_pair';

export interface GbifRecord {
  catalogNumber: string;
  occurrenceID: string;

  eventDate: Date | null;
  year: number | null;
  month: number | null;
  day: number | null;

  kingdom: string;
  phylum: string | null;
  order: string | null;
  family: string | null;
  genus: string | null;
  specificEpithet: string | null;
  infraspecificEpithet: string | null;
  scientificName: string | null;
  typeStatus: string | null;

  continent: string;
  country: string;
  stateOrProvince: string;
  county: string | null;
  locality: string | null;
  decimalLatitude: number;
  decimalLongitude: number;
  fieldNumber: string | null;
  eventRemarks: string | null;
  occurrenceRemarks: string | null;

  recordedBy: string | null;
  dateIdentified: string | null;
  identifiedBy: string | null;
  identificationRemarks: string | null;
}

export class RecordLoader {
  db: Client = new Client();

  async init(): Promise<void> {
    this.db.connect();
  }

  async addRecord(record: GbifRecord): Promise<void> {
    // Normalize the GBIF record.

    if (record.phylum == '') record.phylum = null;
    if (record.order == '') record.order = null;
    if (record.family == '') record.family = null;
    if (record.genus == '') record.genus = null;
    if (record.specificEpithet == '') record.specificEpithet = null;
    if (record.scientificName == '') record.scientificName = null;
    if (record.typeStatus == '') record.typeStatus = null;
  }

  async close(): Promise<void> {
    await this.db.end();
  }
}
