/**
 * Loads the database from a CSV file formatted for uploading to Specify 6.
 */

import * as path from 'path';
import * as fs from 'fs';
import { parse as parseCSV } from '@fast-csv/parse';

import { connectDatabase, loadDatabase } from './lib/load_database';
import { disconnectDB } from '../backend/integrations/postgres';
import type { GbifRecord } from '../backend/model/specimen';
import { PersonName, CsvSpecimen } from './lib/csv_specimen';
import { ROOT_TAXON_UNIQUE, LogType } from '../shared/model';
import { Logs } from '../backend/model/logs';

const RECORDS_PER_TICK = 300;
const description = 'import from CSV via command line';

if (process.argv.length != 3) {
  console.log('Please provide the path to the uploadable CSV');
  process.exit(1);
}
let csvFilepath = process.argv[2];
if (!'/~'.includes(csvFilepath[0])) {
  csvFilepath = path.join(process.cwd(), csvFilepath);
}

const records: CsvSpecimen[] = [];
let recordIndex = 0;

async function loadCSV() {
  return new Promise<void>((resolve, reject) => {
    fs.createReadStream(csvFilepath)
      .pipe(parseCSV({ headers: true }))
      .on('data', (row) => {
        const record = new CsvSpecimen(row);
        if (record.state == 'Texas') {
          records.push(record);
        }
      })
      .on('end', () => resolve())
      .on('error', (err) => {
        console.log('\nstreaming error:', err);
        reject(err);
      });
  });
}

async function getNextGbifRecord(): Promise<GbifRecord | null> {
  if (recordIndex == records.length) return null;
  if ((recordIndex + 1) % RECORDS_PER_TICK == 0) {
    process.stdout.write('.');
  }
  return recordToGbifRecord(records[recordIndex++]);
}

function recordToGbifRecord(record: CsvSpecimen): GbifRecord {
  return {
    catalogNumber: record.catalogNumber,
    occurrenceID: 'GBIF:' + record.catalogNumber,

    kingdom: ROOT_TAXON_UNIQUE,
    phylum: record.phylum,
    class: record.class,
    order: record.order,
    family: record.family,
    genus: record.genus,
    specificEpithet: toSpeciesOrSubspecies(record.species),
    infraspecificEpithet: toSpeciesOrSubspecies(record.subspecies),
    scientificName: toScientificName(record),

    continent: 'NORTH_AMERICA', // value used by GBIF
    country: 'United States of America', // value used by GBIF
    stateProvince: record.state,
    county: record.county,
    locality: record.localityName,
    decimalLatitude: record.latitude,
    decimalLongitude: record.longitude,

    startDate: record.startDate,
    eventRemarks: toEventRemarks(record),
    recordedBy: toNameField(record.collectors),
    dateIdentified: record.determinedDate,
    identifiedBy: toNameField(record.determiners),
    occurrenceRemarks: record.coaRemarks,
    identificationRemarks: toDetRemarks(record),
    typeStatus: record.typeStatus,
    organismQuantity: record.count,
    lifeStage: record.lifeStage
  };
}

function toDetRemarks(record: CsvSpecimen): string {
  const species = record.species;
  if (species.includes('sp.')) {
    if (record.determinationRemarks == '') return species;
    return record.determinationRemarks + '; ' + species;
  }
  return record.determinationRemarks;
}

function toEventRemarks(record: CsvSpecimen): string {
  const eventRemarks: string[] =
    record.localityAndHabitatNotes == '' ? [] : [record.localityAndHabitatNotes];
  const started = toEventRemarksDate(record.startDate, true);
  const ended = toEventRemarksDate(record.endDate, false);
  if (!ended) {
    if (started) eventRemarks.push('dated ' + started);
  } else {
    if (started) eventRemarks.push('started ' + started);
    eventRemarks.push('ended ' + ended);
  }
  return eventRemarks.join('; ');
}

function toEventRemarksDate(csvDate: string, onlyIfPartial: boolean): string | null {
  if (csvDate == '' || (onlyIfPartial && !csvDate.includes('00/'))) {
    return null;
  }
  const parts = csvDate.split('/');
  if (parts[2].length == 2) {
    if (parseInt(parts[2]) < 24) {
      parts[2] = '20' + parts[2];
    } else {
      parts[2] = '19' + parts[2];
    }
  }
  if (parts[0] == '00') return parts[2];
  if (parts[1] == '00') return `${parts[2]}-${parts[0]}`;
  return `${parts[2]}-${parts[0]}-${parts[1]}`;
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
    if (record.authors) {
      name += ' ' + record.authors;
    }
    return name;
  }
  if (record.family) return record.family;
  if (record.order) return record.order;
  if (record.class) return record.class;
  if (record.phylum) return record.phylum;
  return ROOT_TAXON_UNIQUE;
}

function toSpeciesOrSubspecies(name: string): string {
  return name.includes('.') ? '' : name;
}

(async () => {
  process.stdout.write('\nLoading CSV...');
  await loadCSV();

  const db = await connectDatabase();
  await Logs.postNormal(db, LogType.ImportStarted, null, 'Began ' + description);

  process.stdout.write('\nImporting records...');
  const errors = await loadDatabase(
    db,
    getNextGbifRecord,
    () => process.stdout.write('\nCalculating effort...'),
    () => process.stdout.write('\nCommitting data... (working)')
  );
  await Logs.postNormal(db, LogType.ImportEnded, null, 'Completed ' + description);
  await disconnectDB();

  process.stdout.write('\n');
  if (errors.length > 0) {
    console.log();
    for (const failure of errors) {
      console.log('-', failure);
    }
    console.log(errors.length + ' import failures\n');
  }
})();
