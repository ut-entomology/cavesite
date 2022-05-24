/**
 * Class Location represents a location of the database locations table
 * and provides access to the table. The purpose of this table is to
 * provide easy-access to the location hierarchy.
 */

// NOTE: There are similarities between this module and taxon.ts,
// so any correction made here should be investigated in taxon.ts.
// Not enough similarity to base both on a generic class, though.

import type { DataOf } from '../../shared/data_of';
import { type DB, toCamelRow } from '../integrations/postgres';
import { ImportFailure } from './import_failure';
import {
  LocationRank,
  LocationSpec,
  createContainingLocationSpecs
} from '../../shared/model';

export interface LocationSource {
  // GBIF field names
  locationID?: string; // actually a GUID
  continent: string;
  country?: string;
  stateProvince?: string;
  county?: string;
  locality?: string; // required on getOrCreate()
  decimalLatitude?: string;
  decimalLongitude?: string;
}

type LocationData = DataOf<Location>;

export class Location {
  locationID = 0;
  locationRank: LocationRank;
  locationName: string;
  locationGuid: string | null;
  publicLatitude: number | null;
  publicLongitude: number | null;
  parentID: number | null;
  parentIDPath: string;
  parentNamePath: string;

  //// CONSTRUCTION //////////////////////////////////////////////////////////

  private constructor(data: LocationData) {
    this.locationID = data.locationID;
    this.locationRank = data.locationRank;
    this.locationName = data.locationName;
    this.locationGuid = data.locationGuid;
    this.publicLatitude = data.publicLatitude;
    this.publicLongitude = data.publicLongitude;
    this.parentID = data.parentID;
    this.parentIDPath = data.parentIDPath;
    this.parentNamePath = data.parentNamePath;
  }

  //// PUBLIC INSTANCE METHODS //////////////////////////////////////////////

  async save(db: DB): Promise<number> {
    if (this.locationID === 0) {
      const result = await db.query(
        `insert into locations(
						location_rank, location_name, location_guid,
            public_latitude, public_longitude,
						parent_id, parent_id_path, parent_name_path
					) values ($1, $2, $3, $4, $5, $6, $7, $8)
					returning location_id`,
        [
          this.locationRank,
          this.locationName,
          this.locationGuid,
          this.publicLatitude,
          this.publicLongitude,
          this.parentID,
          this.parentIDPath,
          this.parentNamePath
        ]
      );
      this.locationID = result.rows[0].location_id;
    } else {
      const result = await db.query(
        `update locations set 
						location_rank=$1, location_name=$2, location_guid=$3,
            public_latitude=$4, public_longitude=$5,
						parent_id=$6, parent_id_path=$7, parent_name_path=$8
					where location_id=$9`,
        [
          this.locationRank,
          this.locationName,
          this.locationGuid,
          this.publicLatitude,
          this.publicLongitude,
          this.parentID,
          this.parentIDPath,
          this.parentNamePath,
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

  static async commit(db: DB): Promise<void> {
    await db.query('delete from locations where committed=true');
    await db.query('update locations set committed=true');
  }

  static async create(
    db: DB,
    parentNamePath: string,
    parentIDPath: string,
    data: Omit<LocationData, 'locationID' | 'parentIDPath' | 'parentNamePath'>
  ): Promise<Location> {
    const location = new Location(
      Object.assign(
        {
          locationID: 0 /* DB will assign a value */,
          parentIDPath,
          parentNamePath
        },
        data
      )
    );
    await location.save(db);
    return location;
  }

  static async getByGUID(
    db: DB,
    locationGUID: string,
    committed: boolean
  ): Promise<Location | null> {
    const result = await db.query(
      `select * from locations where location_guid=$1 and committed=$2`,
      [
        locationGUID,
        // @ts-ignore
        committed
      ]
    );
    return result.rows.length > 0 ? new Location(toCamelRow(result.rows[0])) : null;
  }

  static async getByIDs(db: DB, locationIDs: number[]): Promise<Location[]> {
    const result = await db.query(
      `select * from locations where location_id=any ($1)`,
      // @ts-ignore
      [locationIDs]
    );
    return result.rows.map((row) => new Location(toCamelRow(row)));
  }

  static async getOrCreate(db: DB, source: LocationSource): Promise<Location> {
    // Return the location if it already exists.

    if (source.locationID) {
      const location = await Location.getByGUID(db, source.locationID, false);
      if (location) return location;
    }
    const containingNames = Location._extractLocations(source);
    const locationName = containingNames.pop()!;
    const parentNamePath = containingNames.join('|');

    if (!source.locationID) {
      let location = await Location._getByNamePath(db, parentNamePath, locationName);
      if (location) return location;
    }

    // Parse the coordinates.

    let latitude: number | null = null;
    if (source.decimalLatitude) {
      latitude = parseFloat(source.decimalLatitude);
      if (isNaN(latitude)) throw new ImportFailure('Invalid latitude');
    }
    let longitude: number | null = null;
    if (source.decimalLongitude) {
      longitude = parseFloat(source.decimalLongitude);
      if (isNaN(longitude)) throw new ImportFailure('Invalid longitude');
    }

    // Create specs for the location and all of its containing locations.

    const spec: LocationSpec = {
      locationID: 0,
      rank: LocationRank.Locality,
      name: locationName,
      guid: source.locationID || null,
      publicLatitude: latitude,
      publicLongitude: longitude,
      parentNamePath
    };
    const specs = createContainingLocationSpecs(spec);
    specs.push(spec);

    // Create all implied locations.

    return await Location._createMissingLocations(db, specs);
  }

  static async matchName(db: DB, partialName: string): Promise<Location[]> {
    const result = await db.query(
      `select * from locations where location_name like $1 and committed=true
        order by location_name`,
      [`%${partialName}%`]
    );
    return result.rows.map((row) => toCamelRow(row));
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
    let parentIDPath = location?.parentIDPath || '';
    while (++locationIndex < specs.length) {
      const spec = specs[locationIndex];
      if (location) {
        if (parentIDPath != '') parentIDPath += ',';
        parentIDPath += location.locationID.toString();
      }
      location = await Location.create(db, spec.parentNamePath, parentIDPath, {
        locationRank: spec.rank,
        locationName: spec.name,
        locationGuid: spec.guid,
        publicLatitude: spec.publicLatitude,
        publicLongitude: spec.publicLongitude,
        parentID: location?.locationID || null
      });
    }
    return location!;
  }

  private static async _getByNamePath(
    db: DB,
    parentNamePath: string,
    locationName: string
  ): Promise<Location | null> {
    const result = await db.query(
      `select * from locations where parent_name_path=$1 and location_name=$2
        and committed=false`,
      [parentNamePath, locationName]
    );
    return result.rows.length > 0 ? new Location(toCamelRow(result.rows[0])) : null;
  }

  private static async _getClosestLocation(
    db: DB,
    specs: LocationSpec[],
    specIndex: number
  ): Promise<[Location | null, number]> {
    const spec = specs[specIndex]!;
    let location: Location | null;
    if (spec.guid) {
      location = await Location.getByGUID(db, spec.guid, false);
    } else {
      location = await Location._getByNamePath(db, spec.parentNamePath, spec.name);
    }
    if (location) {
      return [location, specIndex];
    }
    if (specIndex == 0) {
      return [null, -1];
    }
    return Location._getClosestLocation(db, specs, specIndex - 1);
  }

  private static _extractLocations(source: LocationSource): string[] {
    if (!source.continent) throw new ImportFailure('Continent not given');

    const locationNames: string[] = [source.continent];

    if (source.country) {
      locationNames.push(source.country);
    }

    if (source.stateProvince) {
      if (!source.country)
        throw new ImportFailure('State/province given without country');
      locationNames.push(source.stateProvince);
    }

    if (source.county) {
      if (!source.stateProvince)
        throw new ImportFailure('County given without state/province');
      locationNames.push(source.county);
    }

    if (!source.locality) throw new ImportFailure('Locality name not given');
    locationNames.push(source.locality);

    if (source.decimalLatitude && !source.decimalLongitude)
      throw new ImportFailure('Latitude given without longitude');
    if (source.decimalLongitude && !source.decimalLatitude)
      throw new ImportFailure('Longitude given without latitude');

    return locationNames;
  }
}
