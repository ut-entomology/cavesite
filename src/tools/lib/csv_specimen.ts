export const HEADER_REGEX = /^([^\d]+)(\d+)?$/;

export interface PersonName {
  firstName?: string;
  lastName?: string;
}

export class CsvSpecimen {
  accessionNumber: string;
  catalogNumber: string;
  catalogerFirstName: string;
  catalogerLastName: string;
  catalogedDate: string;
  phylum: string;
  class: string;
  order: string;
  family: string;
  genus: string;
  species: string;
  subspecies: string;
  authors: string;
  country: string;
  state: string;
  county: string;
  localityName: string;
  latitude: string;
  longitude: string;
  localityAndHabitatNotes: string;
  collectors: PersonName[] = [];
  startDate: string;
  endDate: string;
  verbatimDate: string;
  prepType: string;
  count: string;
  determiners: PersonName[] = [];
  determinedDate: string;
  determinationRemarks: string;
  typeStatus: string;
  sex: string;
  stage: string;
  coaRemarks: string;
  storageLocation: string;

  constructor(row: Record<string, string>) {
    this.accessionNumber = row['Accession Accession Number'];
    this.catalogNumber = row['Catalog Number'];
    this.catalogerFirstName = row['Cataloger First Name'];
    this.catalogerLastName = row['Cataloger Last Name'];
    this.catalogedDate = row['Cataloged Date'];
    this.phylum = removeAnnotations(row['Phylum1']);
    this.class = removeAnnotations(row['Class1']);
    this.order = removeAnnotations(row['Order1']);
    this.family = removeAnnotations(row['Family1']);
    this.genus = removeAnnotations(row['Genus1']);
    this.species = removeAnnotations(row['Species1']);
    this.subspecies = removeAnnotations(row['Subspecies1']);
    this.authors = row['Author1'];
    this.country = row['Country'];
    this.state = row['State'];
    this.county = row['County'];
    this.localityName = row['Locality Name'];
    this.latitude = row['Latitude'];
    this.longitude = row['Longitude'];
    this.localityAndHabitatNotes = row['CI Locality and Habitat Notes'];
    this.startDate = row['Start Date'];
    this.endDate = row['End Date'];
    this.verbatimDate = row['CI Verbatim Date'];
    this.prepType = row['Prep Type'];
    this.count = row['Count 1'];
    this.determinedDate = row['Determined Date'];
    this.determinationRemarks = row['Determination Remarks'];
    this.typeStatus = row['Type Status'];
    this.sex = row['CoA Sex'];
    this.stage = row['CoA Stage'];
    this.coaRemarks = row['CoA Remarks'];
    this.storageLocation = row['Storage Location'];

    // Collect person names into PersonName arrays, placing each name
    // into the array at the index given for the name in the CSV header.

    const collectors: PersonName[] = [];
    const determiners: PersonName[] = [];
    for (const [header, value] of Object.entries(row)) {
      const matches = header.match(HEADER_REGEX);
      if (matches && matches[2] !== undefined) {
        const index = parseInt(matches[2]) - 1;
        switch (matches[1].trimEnd()) {
          case 'Collector First Name':
            addPersonName(collectors, index, value, true);
            break;
          case 'Collector Last Name':
            addPersonName(collectors, index, value, false);
            break;
          case 'Determiner First Name':
            addPersonName(determiners, index, value, true);
            break;
          case 'Determiner Last Name':
            addPersonName(determiners, index, value, false);
            break;
        }
      }
    }

    // It's possible that some numbers were skipped in the CSV header,
    // so eliminate empty person name indexes.

    for (const collector of collectors) {
      if (collector !== undefined) {
        this.collectors.push(collector);
      }
    }
    for (const determiner of determiners) {
      if (determiner !== undefined) {
        this.determiners.push(determiner);
      }
    }
  }
}

function addPersonName(
  names: PersonName[],
  index: number,
  name: string,
  isFirst: boolean
) {
  if (name != '') {
    if (names.length <= index) {
      names.length = index + 1;
    }
    if (names[index] === undefined) {
      names[index] = {};
    }
    if (isFirst) {
      names[index].firstName = name;
    } else {
      names[index].lastName = name;
    }
  }
}

function removeAnnotations(term: string): string {
  if (term == '') return '';
  const substrings = term.split(/[(][^)]*[)]/);
  return substrings.join(' ').replace('?', '').replace('  ', ' ').trim();
}
