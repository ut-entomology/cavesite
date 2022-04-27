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
  subclass: string;
  order: string;
  suborder: string;
  infraorder: string;
  family: string;
  subfamily: string;
  genus: string;
  species: string;
  subspecies: string;
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
    this.accessionNumber = row['Accession Number'];
    this.catalogNumber = row['Catalog Number'];
    this.catalogerFirstName = row['Cataloger First Name'];
    this.catalogerLastName = row['Cataloger Last Name'];
    this.catalogedDate = row['Cataloged Date'];
    this.phylum = row['Phylum'];
    this.class = row['Class'];
    this.subclass = row['Subclass'];
    this.order = row['Order'];
    this.suborder = row['Suborder'];
    this.infraorder = row['Infraorder'];
    this.family = row['Family'];
    this.subfamily = row['Subfamily'];
    this.genus = row['Genus'];
    this.species = row['Species'];
    this.subspecies = row['Subspecies'];
    this.country = row['Country'];
    this.state = row['State'];
    this.county = row['County'];
    this.localityName = row['Locality Name'];
    this.latitude = row['Latitude'];
    this.longitude = row['Longitude'];
    this.localityAndHabitatNotes = row['Locality and Habitat Notes'];
    this.startDate = row['Start Date'];
    this.endDate = row['End Date'];
    this.verbatimDate = row['Verbatim Date'];
    this.prepType = row['prepType'];
    this.count = row['Count'];
    this.determinedDate = row['Determined Date'];
    this.determinationRemarks = row['Determination Remarks'];
    this.typeStatus = row['Type Status'];
    this.sex = row['Sex'];
    this.stage = row['Stage'];
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
