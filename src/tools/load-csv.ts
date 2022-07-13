import * as path from 'path';
import * as fs from 'fs';
import { parse as parseCSV } from '@fast-csv/parse';

import { loadAndCheckEnvVars } from '../backend/util/env_util';
import { connectDB, disconnectDB, getDB } from '../backend/integrations/postgres';
import { Taxon } from '../backend/model/taxon';
import { Location } from '../backend/model/location';
import { Specimen } from '../backend/model/specimen';
import { PersonName, CsvSpecimen } from './lib/csv_specimen';
import { ROOT_TAXON_UNIQUE } from '../shared/model';

if (process.argv.length != 3) {
  console.log('Please provide the path to the uploadable CSV');
  process.exit(1);
}
let csvFilepath = process.argv[2];
if (!'/~'.includes(csvFilepath[0])) {
  csvFilepath = path.join(process.cwd(), csvFilepath);
}

const records: CsvSpecimen[] = [];

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
        console.log('streaming error:', err);
        reject(err);
      });
  });
}

async function loadDB() {
  const db = getDB();
  let importFailureCount = 0;
  for (const record of records) {
    const specimenSource = {
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

      continent: 'North America',
      country: 'United States',
      stateProvince: record.state,
      county: record.county,
      locality: record.localityName,
      decimalLatitude: record.latitude,
      decimalLongitude: record.longitude,

      startDate: record.startDate,
      eventRemarks: toEventRemarks(record),
      collectors: toNameField(record.collectors),
      determinationDate: record.determinedDate,
      determiners: toNameField(record.determiners),
      collectionRemarks: record.localityAndHabitatNotes,
      occurrenceRemarks: record.coaRemarks,
      determinationRemarks: toDetRemarks(record),
      typeStatus: record.typeStatus,
      organismQuantity: record.count,
      lifeStage: record.lifeStage
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
      console.log(`Cat# ${record.catalogNumber}:`, err.message);
    }
  }
  console.log(`\n${importFailureCount} import failures\n`);
}

function toDetRemarks(record: CsvSpecimen): string {
  const species = record.species;
  if (species.includes('sp.') && !record.determinationRemarks.includes('sp.')) {
    if (record.determinationRemarks == '') return species;
    return record.determinationRemarks + '; ' + species;
  }
  return record.determinationRemarks;
}

function toEventRemarks(record: CsvSpecimen): string {
  const eventRemarks: string[] = [];
  const started = toPartialDate(record.startDate);
  if (started) eventRemarks.push('started: ' + started);
  const ended = toPartialDate(record.endDate);
  if (ended) eventRemarks.push('ended: ' + ended);
  return eventRemarks.join('; ');
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

function toPartialDate(csvDate: string): string | null {
  if (!csvDate.includes('00/')) return null;
  const parts = csvDate.split('/');
  if (parts[0] == '00') return parts[2];
  return `${parts[0]}/${parts[2]}`;
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
  await Location.commit(getDB());
  await Taxon.commit(getDB());
  await disconnectDB();
})();
