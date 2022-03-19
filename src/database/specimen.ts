/**
 * Class representing a vial of specimens all of the same taxon.
 */

import type { DataOf } from '../util/type_util';
import { DB, toCamelRow } from '../util/pg_util';
import { Taxon } from './taxon';
import { Location } from './location';

export type SpecimenData = DataOf<Specimen>;

export interface SpecimenSource {
  // GBIF field names

  catalogNumber: string;
  occurrenceID: string;

  kingdom: string;
  phylum?: string;
  class?: string;
  order?: string;
  family?: string;
  genus?: string;
  specificEpithet?: string;
  infraspecificEpithet?: string;
  scientificName: string;

  continent: string;
  country?: string;
  stateProvince?: string;
  county?: string;
  locality?: string;
  decimalLatitude?: number;
  decimalLongitude?: number;

  startDate?: Date;
  collectors?: string; // |-delimited names, last name last
  determinationDate?: Date;
  determiners?: string; // |-delimited names, last name last
  collectionRemarks?: string;
  occurrenceRemarks?: string;
  determinationRemarks?: string;
  typeStatus?: string;
  organismQuantity?: number;
}

export class Specimen {
  catalogNumber: string;
  occurrenceGuid: string; // GBIF occurrenceID (specify co.GUID)
  kingdomID: number;
  phylumID: number | null;
  classID: number | null;
  orderID: number | null;
  familyID: number | null;
  genusID: number | null;
  speciesID: number | null;
  subspeciesID: number | null;
  preciseTaxonID: number; // ID of most specific taxon

  continentID: string;
  countryID: number | null;
  stateProvinceID: number | null;
  countyID: number | null;
  localityID: number | null;
  preciseLocationID: number; // ID of most specific location

  collectionStartDate: Date | null;
  collectionEndDate: Date | null;
  collectors: string | null; // |-delimited names, last name last
  determinationDate: Date | null;
  determiners: string | null; // |-delimited names, last name last
  collectionRemarks: string | null;
  occurrenceRemarks: string | null;
  determinationRemarks: string | null;
  typeStatus: string | null;
  specimenCount: number | null;

  //// CONSTRUCTION //////////////////////////////////////////////////////////

  constructor(row: SpecimenData) {
    this.catalogNumber = row.catalogNumber;
    this.occurrenceGuid = row.occurrenceGuid; // GBIF occurrenceID (Specify co.GUID)

    this.kingdomID = row.kingdomID;
    this.phylumID = row.phylumID;
    this.classID = row.classID;
    this.orderID = row.orderID;
    this.familyID = row.familyID;
    this.genusID = row.genusID;
    this.speciesID = row.speciesID;
    this.subspeciesID = row.subspeciesID;
    this.preciseTaxonID = row.preciseTaxonID; // ID of most specific taxon

    this.continentID = row.continentID;
    this.countryID = row.countryID;
    this.stateProvinceID = row.stateProvinceID;
    this.countyID = row.countyID;
    this.localityID = row.localityID;
    this.preciseLocationID = row.preciseLocationID; // ID of most specific location

    this.collectionStartDate = row.collectionStartDate;
    this.collectionEndDate = row.collectionEndDate;
    this.collectors = row.collectors; // |-delimited names, last name last
    this.determinationDate = row.determinationDate;
    this.determiners = row.determiners; // |-delimited names, last name last
    this.collectionRemarks = row.collectionRemarks;
    this.occurrenceRemarks = row.occurrenceRemarks;
    this.determinationRemarks = row.determinationRemarks;
    this.typeStatus = row.typeStatus;
    this.specimenCount = row.specimenCount;
  }

  //// PUBLIC INSTANCE METHODS //////////////////////////////////////////////

  async save(db: DB): Promise<number> {
    if (this.locationID === 0) {
      const result = await db.query(
        `insert into locations(
						location_type, location_name, public_latitude, public_longitude,
						parent_id, parent_id_series, parent_name_series
					) values ($1, $2, $3, $4, $5, $6, $7)
					returning location_id`,
        [
          this.locationType,
          this.locationName,
          this.publicLatitude,
          this.publicLongitude,
          this.parentID,
          this.parentIDSeries,
          this.parentNameSeries
        ]
      );
      this.locationID = result.rows[0].location_id;
    } else {
      const result = await db.query(
        `update locations set 
						location_type=$1, location_name=$2, public_latitude=$3, public_longitude=$4,
						parent_id=$5, parent_id_series=$6, parent_name_series=$7
					where location_id=$8`,
        [
          this.locationType,
          this.locationName,
          this.publicLatitude,
          this.publicLongitude,
          this.parentID,
          this.parentIDSeries,
          this.parentNameSeries,
          this.locationID
        ]
      );
      if (result.rowCount != 1) {
        throw Error(`Failed to update locality ID ${this.locationID}`);
      }
    }
    return this.locationID;
  }

  //// PUBLIC CLASS METHODS //////////////////////////////////////////////////

  static async create(
    db: DB,
    parentNameSeries: string,
    parentIDSeries: string,
    data: Omit<LocationData, 'locationID' | 'parentIDSeries' | 'parentNameSeries'>
  ): Promise<Location> {
    const location = new Location(
      Object.assign(
        {
          locationID: 0 /* DB will assign a value */,
          parentIDSeries,
          parentNameSeries
        },
        data
      )
    );
    await location.save(db);
    return location;
  }

  static async getByID(db: DB, locationID: number): Promise<Location | null> {
    const result = await db.query(`select * from locations where location_id=$1`, [
      locationID
    ]);
    return result.rows.length > 0 ? new Location(toCamelRow(result.rows[0])) : null;
  }

  static async getOrCreate(db: DB, source: LocationSource): Promise<Location> {
    // Return the location if it already exists.

    const [parentLocations, locationName] = Location._parseLocationSpec(source);
    let location = await Location._getByNameSeries(
      db,
      parentLocations.join('|'),
      locationName
    );
    if (location) return location;

    // If the location doesn't exist yet, create specs for all its ancestors.

    const specs: LocationSpec[] = [];
    let parentNameSeries = '';
    for (let i = 0; i < parentLocations.length; ++i) {
      const ancestorName = parentLocations[i];
      specs.push({
        locationType: orderedTypes[i],
        locationName: ancestorName,
        publicLatitude: null,
        publicLongitude: null,
        parentNameSeries
      });
      if (parentNameSeries == '') {
        parentNameSeries = ancestorName; // necessarily continent
      } else {
        parentNameSeries += '|' + ancestorName;
      }
    }

    // Create a spec for the particular requested location.

    specs.push({
      locationType: orderedTypes[parentLocations.length],
      locationName,
      publicLatitude: source.publicLatitude || null,
      publicLongitude: source.publicLongitude || null,
      parentNameSeries
    });

    // Create all implied locations.

    return await Location._createMissingLocations(db, specs);
  }

  //// PRIVATE CLASS METHDOS /////////////////////////////////////////////////

  private static async _createMissingLocations(
    db: DB,
    specs: LocationSpec[]
  ): Promise<Location> {
    let [location, locationIndex] = await Location._getClosestLocation(
      db,
      specs,
      specs.length - 1 // nearest to the last specified location
    );
    let parentIDSeries = location?.parentIDSeries || '';
    while (++locationIndex < specs.length) {
      if (location) {
        if (parentIDSeries == '') {
          parentIDSeries = location.locationID.toString();
        } else {
          parentIDSeries += ',' + location.locationID.toString();
        }
      }
      const spec = specs[locationIndex];
      location = await Location.create(db, spec.parentNameSeries, parentIDSeries, {
        locationType: spec.locationType,
        locationName: spec.locationName,
        publicLatitude: spec.publicLatitude,
        publicLongitude: spec.publicLongitude,
        parentID: location?.locationID || null
      });
    }
    return location!;
  }

  private static async _getByNameSeries(
    db: DB,
    parentNameSeries: string,
    locationName: string
  ): Promise<Location | null> {
    const result = await db.query(
      `select * from locations where parent_name_series=$1 and location_name=$2`,
      [parentNameSeries, locationName]
    );
    return result.rows.length > 0 ? new Location(toCamelRow(result.rows[0])) : null;
  }

  private static async _getClosestLocation(
    db: DB,
    specs: LocationSpec[],
    specIndex: number
  ): Promise<[Location | null, number]> {
    const spec = specs[specIndex];
    const location = await Location._getByNameSeries(
      db,
      spec.parentNameSeries,
      spec.locationName
    );
    if (location) {
      return [location, specIndex];
    }
    if (specIndex == 0) {
      return [null, -1];
    }
    return Location._getClosestLocation(db, specs, specIndex - 1);
  }

  private static _parseLocationSpec(source: LocationSource): [string[], string] {
    const parentLocations: string[] = [source.continent];
    if (source.country) parentLocations.push(source.country);
    if (source.stateProvince) parentLocations.push(source.stateProvince);
    if (source.county) parentLocations.push(source.county);
    if (source.locality) parentLocations.push(source.locality);
    const locationName = parentLocations.pop();
    return [parentLocations, locationName!];
  }
}
