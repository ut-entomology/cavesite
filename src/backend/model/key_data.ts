/**
 * Class KeyData provides static methods for accessing serialized data stored
 * in the database by user and key. Keys at user_id null are available to users
 * having the indicated permissions. If not permissions are required for a null
 * user_id, the data is available even to users who are not logged in.
 */

import { Permission } from '../../shared/user_auth';
import { type DB } from '../integrations/postgres';

export class KeyData {
  static async write(
    db: DB,
    userID: number | null,
    key: string,
    permissionRequired: Permission,
    data: string
  ): Promise<void> {
    // Unable to do an update-on-conflict because user_id can be null; and
    // not two nulls are equal via '=', only via "is null".
    let result =
      userID === null
        ? await db.query(
            `update key_data set permission_required=$2, data_value=$3
              where user_id is null and data_key=$1`,
            [key, permissionRequired, data]
          )
        : await db.query(
            `update key_data set permission_required=$3, data_value=$4
              where user_id=$1 and data_key=$2`,
            [userID, key, permissionRequired, data]
          );
    if (result.rowCount == 0) {
      result = await db.query(
        `insert into key_data(user_id, data_key, permission_required, data_value)
            values ($1, $2, $3, $4)`,
        [userID, key, permissionRequired, data]
      );
      if (result.rowCount != 1) {
        throw Error(`Failed to update data at user ID ${userID} key '${key}'`);
      }
    }
  }

  static async read(
    db: DB,
    userID: number | null,
    userPermissions: Permission | null
  ): Promise<Record<string, string> | null> {
    const valuesByKey: Record<string, string> = {};
    if (userID === null) {
      const result = await db.query(`select * from key_data where user_id is null`);
      for (const row of result.rows) {
        if (
          row.permission_required == 0 ||
          (userPermissions !== null &&
            (row.permission_required & userPermissions) !== 0)
        ) {
          valuesByKey[row.data_key] = row.data_value;
        }
      }
    } else {
      const result = await db.query(`select * from key_data where user_id=$1`, [
        userID
      ]);
      result.rows.forEach((row) => (valuesByKey[row.data_key] = row.data_value));
    }
    return Object.keys(valuesByKey).length == 0 ? null : valuesByKey;
  }
}
