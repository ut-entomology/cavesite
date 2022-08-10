import * as path from 'path';
import * as fs from 'fs';
import { parse as parseCSV } from '@fast-csv/parse';

import { loadDB } from './load-gbif';
import type { SpecimenSource } from '../backend/model/specimen';
import { PersonName, CsvSpecimen } from './lib/csv_specimen';
import { ROOT_TAXON_UNIQUE } from '../shared/model';

const RECORDS_PER_TICK = 500;
const VISITS_PER_TICK = 200;

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

async function getNextSpecimenSource(): Promise<SpecimenSource | null> {
  if (recordIndex == records.length) return null;
  if ((recordIndex + 1) % RECORDS_PER_TICK == 0) {
    process.stdout.write('.');
  }
  return recordToSpecimenSource(records[recordIndex++]);
}

function recordToSpecimenSource(record: CsvSpecimen): SpecimenSource {
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

    continent: 'North America',
    country: 'United States',
    stateProvince: record.state,
    county: record.county,
    locality: record.localityName,
    decimalLatitude: record.latitude,
    decimalLongitude: record.longitude,

    eventDate: record.startDate,
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

  process.stdout.write('\nImporting records...');
  let visitCount = 0;
  const failures = await loadDB(getNextSpecimenSource, (committing) => {
    if (!committing) {
      if (visitCount == 0) {
        process.stdout.write('\nCalculating effort...');
      }
      if (++visitCount % VISITS_PER_TICK == 0) {
        process.stdout.write('.');
      }
    } else {
      process.stdout.write('\nCommitting data... (working)');
    }
  });
  process.stdout.write('\n');

  if (failures.length > 0) {
    console.log('\nImport failures:');
    for (const failure of failures) {
      console.log('-', failure);
    }
    console.log(`Failed to import ${failures.length} records\n`);
  }
})();
