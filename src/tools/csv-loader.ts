import * as path from 'path';
import * as fs from 'fs';
import { parse as parseCSV } from '@fast-csv/parse';

import { loadAndCheckEnvVars } from '../backend/util/env_util';
import { connectDB, disconnectDB, getDB } from '../backend/integrations/postgres';
import { Specimen } from '../backend/model/specimen';
import { PersonName, CsvSpecimen } from './lib/csv_specimen';

const CSV_FILEPATH = path.join(
  __dirname,
  '../../../ut-cave-data/output/uploadable.csv'
);

const records: CsvSpecimen[] = [];

async function loadCSV() {
  return new Promise<void>((resolve, reject) => {
    fs.createReadStream(CSV_FILEPATH)
      .pipe(parseCSV({ headers: true }))
      .on('data', (row) => {
        const record = new CsvSpecimen(row);
        if (record.state == 'Texas') {
          records.push(record);
        }
      })
      .on('end', () => resolve())
      .on('error', (err) => {
        console.log('streaming error:', err);
        reject(err);
      });
  });
}

async function loadDB() {
  const db = getDB();
  let importFailureCount = 0;
  let partialStartDateCount = 0;
  for (const record of records) {
    const specimenSource = {
      catalogNumber: record.catalogNumber,
      occurrenceID: 'GBIF:' + record.catalogNumber,

      kingdom: 'Animalia',
      phylum: record.phylum,
      class: record.class,
      order: record.order,
      family: record.family,
      genus: record.genus,
      specificEpithet: record.species,
      infraspecificEpithet: record.subspecies,
      scientificName: toScientificName(record),

      continent: 'North America',
      country: 'United States',
      stateProvince: record.state,
      county: record.county,
      locality: record.localityName,
      decimalLatitude: record.latitude,
      decimalLongitude: record.longitude,

      startDate: record.startDate,
      collectors: toNameField(record.collectors),
      determinationDate: record.determinedDate,
      determiners: toNameField(record.determiners),
      collectionRemarks: record.localityAndHabitatNotes,
      occurrenceRemarks: record.coaRemarks,
      determinationRemarks: record.determinationRemarks,
      typeStatus: record.typeStatus,
      organismQuantity: record.count
    };
    try {
      const specimen = await Specimen.create(db, specimenSource);
      if (!specimen) {
        ++importFailureCount;
        console.log(
          `Cat# ${record.catalogNumber || 'UNSPECIFIED'}: logged import failure`
        );
      }
    } catch (err: any) {
      ++importFailureCount;
      if (
        err.message == 'Invalid time value' &&
        isNaN(new Date(specimenSource.startDate).getTime())
      ) {
        ++partialStartDateCount;
      } else {
        console.log(`Cat# ${record.catalogNumber}:`, err.message);
      }
    }
  }
  console.log(
    `\n${importFailureCount} import failures, ${partialStartDateCount} of which are partial start dates\n`
  );
}

function toNameField(names: PersonName[]): string {
  if (names.length == 0) return '';
  let nameField = '';
  for (const name of names) {
    if (nameField != '') nameField += ' | ';
    if (name.lastName) {
      if (name.firstName) {
        nameField += name.firstName;
        if (name.lastName) {
          nameField += ' ' + name.lastName;
        }
      }
    } else {
      nameField += name.firstName;
    }
  }
  return nameField;
}

function toScientificName(record: CsvSpecimen): string {
  if (record.genus) {
    let name = record.genus;
    if (record.species) {
      name += ' ' + record.species;
      if (record.subspecies) {
        name += ' ' + record.subspecies;
      }
    }
    return name + ' (Author-Date)';
  }
  if (record.family) return record.family;
  if (record.order) return record.order;
  if (record.class) return record.class;
  if (record.phylum) return record.phylum;
  return 'Animalia';
}

(async () => {
  loadAndCheckEnvVars(false);
  await loadCSV();
  await connectDB({
    host: process.env.CAVESITE_DB_HOST,
    database: process.env.CAVESITE_DB_NAME,
    port: parseInt(process.env.CAVESITE_DB_PORT!),
    user: process.env.CAVESITE_DB_USER,
    password: process.env.CAVESITE_DB_PASSWORD
  });
  await loadDB();
  await Specimen.commit(getDB());
  await disconnectDB();
})();
