/**
 * Class representing private coordinates stored in the database.
 */

import type { DataOf } from '../util/type_util';
import { type DB, toCamelRow, PostgresError } from '../integrations/postgres';
import type { User } from './user';
import { UserError, ValidationError } from '../../shared/validation';

type PrivateCoordsData = DataOf<PrivateCoords>;

export class PrivateCoords {
  locationGuid: string;
  modifiedBy: number | null;
  modifiedOn: Date;
  latitude: number;
  longitude: number;
  uncertaintyMeters: number | null;

  private _isNew = true;

  //// CONSTRUCTION //////////////////////////////////////////////////////////

  private constructor(data: PrivateCoordsData) {
    this.locationGuid = data.locationGuid;
    this.modifiedBy = data.modifiedBy;
    this.modifiedOn = data.modifiedOn;
    this.latitude = data.latitude;
    this.longitude = data.longitude;
    this.uncertaintyMeters = data.uncertaintyMeters;
  }

  //// PUBLIC INSTANCE METHODS //////////////////////////////////////////////

  async save(db: DB): Promise<void> {
    try {
      if (this._isNew) {
        await db.query(
          `insert into private_coordinates(
              location_guid, modified_by, modified_on, latitude, longitude,
              uncertainty_meters
            ) values ($1, $2, $3, $4, $5, $6)`,
          [
            this.locationGuid,
            this.modifiedBy,
            // @ts-ignore
            this.modifiedOn,
            this.latitude,
            this.longitude,
            this.uncertaintyMeters
          ]
        );
        this._isNew = false;
      } else {
        const result = await db.query(
          `update private_coordinates set 
              modified_by=$1, modified_on=$2, latitude=$3, longitude=$4,
              uncertainty_meters=$5
            where location_guid=$6`,
          [
            this.modifiedBy,
            // @ts-ignore
            this.modifiedOn,
            this.latitude,
            this.longitude,
            this.uncertaintyMeters,
            this.locationGuid
          ]
        );
        if (result.rowCount != 1) {
          throw Error(
            `Failed to update private coordinate (location GUID ${this.locationGuid})`
          );
        }
      }
    } catch (err) {
      if (err instanceof PostgresError && err.message.includes('duplicate')) {
        if (err.message.includes('location_guid')) {
          throw new UserError(
            'Private coordinates already exist for GUID ' + this.locationGuid
          );
        }
      }
      throw err;
    }
  }

  //// PUBLIC CLASS METHODS //////////////////////////////////////////////////

  static async create(
    db: DB,
    locationGuid: string,
    modifiedBy: User,
    latitude: number,
    longitude: number,
    uncertaintyMeters: number | null
  ): Promise<PrivateCoords> {
    if (locationGuid.trim() == '') {
      throw new ValidationError('Invalid location GUID');
    }
    const coords = new PrivateCoords({
      locationGuid,
      modifiedBy: modifiedBy.userID,
      modifiedOn: new Date(),
      latitude,
      longitude,
      uncertaintyMeters
    });
    await coords.save(db);
    return coords;
  }

  static async dropGUID(db: DB, guid: string): Promise<void> {
    await db.query(`delete from private_coordinates where location_guid=$1`, [guid]);
  }

  static async getByGUID(db: DB, guid: string): Promise<PrivateCoords | null> {
    const result = await db.query(
      `select * from private_coordinates where location_guid=$1`,
      [guid]
    );
    return result.rows.length > 0
      ? new PrivateCoords(toCamelRow(result.rows[0]))
      : null;
  }
}
