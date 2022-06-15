/**
 * Class representing private coordinates stored in the database.
 */

import type { DataOf } from '../../shared/data_of';
import { type DB, toCamelRow, PostgresError } from '../integrations/postgres';
import type { User } from './user';
import { UserError } from '../../shared/validation';

type PrivateCoordsData = DataOf<PrivateCoords>;

export class PrivateCoords {
  locationUnique: string;
  modifiedBy: number | null;
  modifiedOn: Date;
  latitude: number;
  longitude: number;
  uncertaintyMeters: number | null;

  private _isNew = true;

  //// CONSTRUCTION //////////////////////////////////////////////////////////

  private constructor(data: PrivateCoordsData) {
    this.locationUnique = data.locationUnique;
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
              location_unique, modified_by, modified_on, latitude, longitude,
              uncertainty_meters
            ) values ($1, $2, $3, $4, $5, $6)`,
          [
            this.locationUnique,
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
            where location_unique=$6`,
          [
            this.modifiedBy,
            // @ts-ignore
            this.modifiedOn,
            this.latitude,
            this.longitude,
            this.uncertaintyMeters,
            this.locationUnique
          ]
        );
        if (result.rowCount != 1) {
          throw Error(
            `Failed to update private coordinate (location unique ${this.locationUnique})`
          );
        }
      }
    } catch (err) {
      if (err instanceof PostgresError && err.message.includes('duplicate')) {
        if (err.message.includes('location_unique')) {
          throw new UserError(
            'Private coordinates already exist for location unique ' +
              this.locationUnique
          );
        }
      }
      throw err;
    }
  }

  //// PUBLIC CLASS METHODS //////////////////////////////////////////////////

  static async create(
    db: DB,
    locationUnique: string,
    modifiedBy: User,
    latitude: number,
    longitude: number,
    uncertaintyMeters: number | null
  ): Promise<PrivateCoords> {
    const coords = new PrivateCoords({
      locationUnique,
      modifiedBy: modifiedBy.userID,
      modifiedOn: new Date(),
      latitude,
      longitude,
      uncertaintyMeters
    });
    await coords.save(db);
    return coords;
  }

  static async dropLocation(db: DB, locationUnique: string): Promise<void> {
    await db.query(`delete from private_coordinates where location_unique=$1`, [
      locationUnique
    ]);
  }

  static async getByUnique(
    db: DB,
    locationUnique: string
  ): Promise<PrivateCoords | null> {
    const result = await db.query(
      `select * from private_coordinates where location_unique=$1`,
      [locationUnique]
    );
    return result.rows.length > 0
      ? new PrivateCoords(toCamelRow(result.rows[0]))
      : null;
  }
}
