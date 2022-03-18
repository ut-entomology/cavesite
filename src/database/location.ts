/**
 * Class Location represents a location of the database locations table
 * and provides access to the table. The purpose of this table is to
 * provide easy-access to the location hierarchy.
 */

// NOTE: This module is analogous to taxon.ts, but I did not create a
// generic type for them because it would be a complicated type, and I
// wanted to be sure the code was accessible to TypeScript newbies. Hence,
// any logic you change here many need to change in taxon.ts.

import type { DataOf } from '../util/type_util';
import { DB, toCamelRow } from '../util/pg_util';

export type LocationData = DataOf<Location>;

export enum LocationType {
  Continent = 'continent',
  Country = 'country',
  StateProvince = 'stateProvince',
  County = 'county',
  Locality = 'locality'
}

const orderedTypes = [
  LocationType.Continent,
  LocationType.Country,
  LocationType.StateProvince,
  LocationType.County,
  LocationType.Locality
];

export interface LocationSource {
  // GBIF field names
  continent: string;
  country?: string;
  stateProvince?: string;
  county?: string;
  locality?: string;
  publicLatitude?: number;
  publicLongitude?: number;
  parentNameSeries?: string;
}

interface LocationSpec {
  locationType: LocationType;
  locationName: string;
  publicLatitude: number | null;
  publicLongitude: number | null;
  parentNameSeries: string;
}

export class Location {
  locationID = 0;
  locationType: LocationType;
  locationName: string;
  publicLatitude: number | null;
  publicLongitude: number | null;
  parentID: number | null;
  parentIDSeries: string;
  parentNameSeries: string;

  //// CONSTRUCTION //////////////////////////////////////////////////////////

  constructor(row: LocationData) {
    this.locationID = row.locationID;
    this.locationType = row.locationType;
    this.locationName = row.locationName;
    this.publicLatitude = row.publicLatitude;
    this.publicLongitude = row.publicLongitude;
    this.parentID = row.parentID;
    this.parentIDSeries = row.parentIDSeries;
    this.parentNameSeries = row.parentNameSeries;
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
