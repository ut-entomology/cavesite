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

export enum LocationType {
  Continent = 'continent',
  Country = 'country',
  StateProvince = 'stateProvince',
  County = 'county',
  Locality = 'locality'
}

export const locationTypes = [
  LocationType.Continent,
  LocationType.Country,
  LocationType.StateProvince,
  LocationType.County,
  LocationType.Locality
];

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

interface LocationSpec {
  locationType: LocationType;
  locationName: string;
  locationGuid: string | null;
  publicLatitude: number | null;
  publicLongitude: number | null;
  containingNames: string;
}

type LocationData = DataOf<Location>;

export class Location {
  locationID = 0;
  locationType: LocationType;
  locationName: string;
  locationGuid: string | null;
  publicLatitude: number | null;
  publicLongitude: number | null;
  parentID: number | null;
  containingIDs: string;
  containingNames: string;

  //// CONSTRUCTION //////////////////////////////////////////////////////////

  private constructor(data: LocationData) {
    this.locationID = data.locationID;
    this.locationType = data.locationType;
    this.locationName = data.locationName;
    this.locationGuid = data.locationGuid;
    this.publicLatitude = data.publicLatitude;
    this.publicLongitude = data.publicLongitude;
    this.parentID = data.parentID;
    this.containingIDs = data.containingIDs;
    this.containingNames = data.containingNames;
  }

  //// PUBLIC INSTANCE METHODS //////////////////////////////////////////////

  async save(db: DB): Promise<number> {
    if (this.locationID === 0) {
      const result = await db.query(
        `insert into locations(
						location_type, location_name, location_guid,
            public_latitude, public_longitude,
						parent_id, containing_ids, containing_names
					) values ($1, $2, $3, $4, $5, $6, $7, $8)
					returning location_id`,
        [
          this.locationType,
          this.locationName,
          this.locationGuid,
          this.publicLatitude,
          this.publicLongitude,
          this.parentID,
          this.containingIDs,
          this.containingNames
        ]
      );
      this.locationID = result.rows[0].location_id;
    } else {
      const result = await db.query(
        `update locations set 
						location_type=$1, location_name=$2, location_guid=$3,
            public_latitude=$4, public_longitude=$5,
						parent_id=$6, containing_ids=$7, containing_names=$8
					where location_id=$9`,
        [
          this.locationType,
          this.locationName,
          this.locationGuid,
          this.publicLatitude,
          this.publicLongitude,
          this.parentID,
          this.containingIDs,
          this.containingNames,
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
    containingNames: string,
    containingIDs: string,
    data: Omit<LocationData, 'locationID' | 'containingIDs' | 'containingNames'>
  ): Promise<Location> {
    const location = new Location(
      Object.assign(
        {
          locationID: 0 /* DB will assign a value */,
          containingIDs,
          containingNames
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

  static async getByID(db: DB, locationID: number): Promise<Location | null> {
    const result = await db.query(`select * from locations where location_id=$1`, [
      locationID
    ]);
    return result.rows.length > 0 ? new Location(toCamelRow(result.rows[0])) : null;
  }

  static async getOrCreate(db: DB, source: LocationSource): Promise<Location> {
    // Return the location if it already exists.

    if (source.locationID) {
      const location = await Location.getByGUID(db, source.locationID, false);
      if (location) return location;
    }
    const [containingNamesList, locationName] = Location._parseLocationSpec(source);
    if (!source.locationID) {
      let location = await Location._getByNameSeries(
        db,
        containingNamesList.join('|'),
        locationName
      );
      if (location) return location;
    }

    // If the location doesn't exist yet, create specs for all its
    // containing locations.

    const specs: LocationSpec[] = [];
    let containingNames = '';
    for (let i = 0; i < containingNamesList.length; ++i) {
      const containingName = containingNamesList[i];
      if (containingName) {
        specs.push({
          locationType: locationTypes[i],
          locationName: containingName,
          locationGuid: null, // not needed above locality
          publicLatitude: null,
          publicLongitude: null,
          containingNames
        });
      }
      if (containingNames == '') {
        containingNames = containingName!; // necessarily continent
      } else {
        // Name for a missing containing Name is represented as '-'
        containingNames += '|' + (containingName ? containingName : '-');
      }
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

    // Create a spec for the particular requested location.

    specs.push({
      locationType: locationTypes[containingNamesList.length],
      locationName,
      locationGuid: source.locationID || null,
      publicLatitude: latitude,
      publicLongitude: longitude,
      containingNames
    });

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
    let containingIDs = location?.containingIDs || '';
    while (++locationIndex < specs.length) {
      const spec = specs[locationIndex];
      if (location) {
        if (containingIDs == '') {
          containingIDs = location.locationID.toString(); // necessarily continent
        } else {
          containingIDs += ',' + location.locationID.toString();
          for (let i = locationIndex; locationTypes[i] != spec.locationType; ++i) {
            containingIDs += ',-'; // '-' for ID of missing intermediate location
          }
        }
      }
      location = await Location.create(db, spec.containingNames, containingIDs, {
        locationType: spec.locationType,
        locationName: spec.locationName,
        locationGuid: spec.locationGuid,
        publicLatitude: spec.publicLatitude,
        publicLongitude: spec.publicLongitude,
        parentID: location?.locationID || null
      });
    }
    return location!;
  }

  private static async _getByNameSeries(
    db: DB,
    containingNames: string,
    locationName: string
  ): Promise<Location | null> {
    const result = await db.query(
      `select * from locations where containing_names=$1 and location_name=$2
        and committed=false`,
      [containingNames, locationName]
    );
    return result.rows.length > 0 ? new Location(toCamelRow(result.rows[0])) : null;
  }

  private static async _getClosestLocation(
    db: DB,
    specs: LocationSpec[],
    specIndex: number
  ): Promise<[Location | null, number]> {
    const spec = specs[specIndex];
    let location: Location | null;
    if (spec.locationGuid) {
      location = await Location.getByGUID(db, spec.locationGuid, false);
    } else {
      location = await Location._getByNameSeries(
        db,
        spec.containingNames,
        spec.locationName
      );
    }
    if (location) {
      return [location, specIndex];
    }
    if (specIndex == 0) {
      return [null, -1];
    }
    return Location._getClosestLocation(db, specs, specIndex - 1);
  }

  private static _parseLocationSpec(
    source: LocationSource
  ): [(string | null)[], string] {
    if (!source.continent) throw new ImportFailure('Continent not given');
    const containingNamesList: (string | null)[] = [source.continent];
    containingNamesList.push(source.country || null);
    if (source.stateProvince && !source.country)
      throw new ImportFailure('State/province given without country');
    containingNamesList.push(source.stateProvince || null);
    if (source.county && !source.stateProvince)
      throw new ImportFailure('County given without state/province');
    containingNamesList.push(source.county || null);
    if (!source.locality) throw new ImportFailure('Locality name not given');

    if (source.decimalLatitude && !source.decimalLongitude)
      throw new ImportFailure('Latitude given without longitude');
    if (source.decimalLongitude && !source.decimalLatitude)
      throw new ImportFailure('Longitude given without latitude');

    return [containingNamesList, source.locality];
  }
}
