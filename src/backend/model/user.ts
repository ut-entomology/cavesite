import * as crypto from 'crypto';
import { zxcvbn, zxcvbnOptions } from '@zxcvbn-ts/core';
import zxcvbnCommonPackage from '@zxcvbn-ts/language-common';
import zxcvbnEnPackage from '@zxcvbn-ts/language-en';

import type { DataOf } from '../../shared/data_of';
import { type DB, PostgresError, toCamelRow } from '../integrations/postgres';
import { Logs, LogType } from './logs';
import {
  VALID_EMAIL_REGEX,
  MIN_PASSWORD_STRENGTH,
  UserError,
  ValidationError
} from '../../shared/validation';
import { Permission, type UserInfo, type AdminUserInfo } from '../../shared/user_auth';

export const RESET_CODE_DURATION_MINS = 10; // 10 minutes

const PASSWORD_HASH_LENGTH = 64;
const RESET_CODE_LENGTH = 24;
let RESET_CODE_CHARSET = 'abcdefghijklmnopqrstuvwxyz';
RESET_CODE_CHARSET += RESET_CODE_CHARSET.toUpperCase() + '0123456789';
let resetCodeDurationMins = RESET_CODE_DURATION_MINS;

zxcvbnOptions.setOptions({
  translations: zxcvbnEnPackage.translations,
  graphs: zxcvbnCommonPackage.adjacencyGraphs,
  dictionary: {
    ...zxcvbnCommonPackage.dictionary,
    ...zxcvbnEnPackage.dictionary
  }
});

type UserData = Omit<DataOf<User>, 'createdOn'> & {
  createdOn?: Date; // make optional, leaving database to assign value
  passwordHash: string;
  passwordSalt: string;
};

export class User {
  userID: number;
  firstName: string;
  lastName: string;
  email: string;
  affiliation: string | null;
  permissions: number;
  createdOn: Date;
  createdBy: number | null;
  priorLoginDate: Date | null;
  priorLoginIP: string | null;
  lastLoginDate: Date | null;
  lastLoginIP: string | null;
  resetCode: string | null;
  resetExpiration: Date | null;

  createdByName?: string | null;

  private _passwordHash: string;
  private _passwordSalt: string;

  //// CONSTRUCTION //////////////////////////////////////////////////////////

  private constructor(data: UserData) {
    this.userID = data.userID;
    this.firstName = data.firstName;
    this.lastName = data.lastName;
    this.email = data.email;
    this.affiliation = data.affiliation;
    this.permissions = data.permissions;
    this.createdOn = data.createdOn!;
    this.createdBy = data.createdBy;
    this.priorLoginDate = data.priorLoginDate;
    this.priorLoginIP = data.priorLoginIP;
    this.lastLoginDate = data.lastLoginDate;
    this.lastLoginIP = data.lastLoginIP;
    this.resetCode = data.resetCode;
    this.resetExpiration = data.resetExpiration;
    this._passwordHash = data.passwordHash;
    this._passwordSalt = data.passwordSalt;
  }

  //// PUBLIC INSTANCE METHODS ///////////////////////////////////////////////

  async resetPassword(
    db: DB,
    resetCode: string,
    newPassword: string
  ): Promise<boolean> {
    if (!this.resetCode) return false;
    // Use hash lookup to reduce effectiveness of timing attacks.
    const expected: Record<string, boolean> = {};
    expected[this.resetCode] = true;
    if (
      !expected[resetCode] ||
      new Date().getTime() > this.resetExpiration!.getTime()
    ) {
      return false;
    }
    await this.setPassword(newPassword);
    this.resetCode = null;
    this.resetExpiration = null;
    await this.save(db);
    return true;
  }

  async generateResetCode(db: DB): Promise<string> {
    this.resetCode = User.generatePassword(RESET_CODE_CHARSET, RESET_CODE_LENGTH);
    this.resetExpiration = new Date(
      new Date().getTime() + resetCodeDurationMins * 60 * 1000
    );
    await this.save(db);
    return this.resetCode;
  }

  async save(db: DB): Promise<number> {
    if (this.userID === 0) {
      const result = await db.query(
        `insert into users(
            first_name, last_name, email, affiliation, password_hash, password_salt,
            permissions, created_by, prior_login_date, prior_login_ip,
            last_login_date, last_login_ip, reset_code, reset_expiration
          ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) 
            returning user_id, created_on`,
        [
          this.firstName,
          this.lastName,
          this.email,
          this.affiliation,
          this._passwordHash,
          this._passwordSalt,
          this.permissions,
          this.createdBy,
          // @ts-ignore
          this.priorLoginDate,
          this.priorLoginIP,
          // @ts-ignore
          this.lastLoginDate,
          this.lastLoginIP,
          this.resetCode,
          // @ts-ignore
          this.resetExpiration
        ]
      );
      const row = result.rows[0];
      this.userID = row.user_id;
      this.createdOn = row.created_on;
    } else {
      const result = await db.query(
        `update users set
            first_name=$1, last_name=$2, email=$3, affiliation=$4, password_hash=$5,
            password_salt=$6, permissions=$7, prior_login_date=$8, prior_login_ip=$9,
            last_login_date=$10, last_login_ip=$11, reset_code=$12, reset_expiration=$13
          where user_id=$14`,
        [
          this.firstName,
          this.lastName,
          this.email,
          this.affiliation,
          this._passwordHash,
          this._passwordSalt,
          this.permissions,
          // @ts-ignore
          this.priorLoginDate,
          this.priorLoginIP,
          // @ts-ignore
          this.lastLoginDate,
          this.lastLoginIP,
          this.resetCode,
          // @ts-ignore
          this.resetExpiration,
          this.userID
        ]
      );
      if (result.rowCount != 1) {
        throw Error(`Failed to update user ID ${this.userID}`);
      }
    }
    return this.userID;
  }

  async setPassword(password: string): Promise<void> {
    if (password != password.trim()) {
      throw new ValidationError("Password can't begin or end with spaces");
    }
    if (User.getPasswordStrength(password) < MIN_PASSWORD_STRENGTH) {
      throw new ValidationError('Password not strong enough');
    }
    return new Promise((resolve, reject) => {
      const salt = crypto.randomBytes(16).toString('hex');
      crypto.scrypt(password, salt, PASSWORD_HASH_LENGTH, (err, derivedKey) => {
        if (err) return reject(err);
        this._passwordSalt = salt;
        this._passwordHash = derivedKey.toString('hex');
        resolve();
      });
    });
  }

  // safe method for creating user information to client
  toAdminUserInfo(): AdminUserInfo {
    const userInfo = this.toUserInfo() as AdminUserInfo;
    userInfo.createdByName = this.createdByName || null;
    userInfo.createdOn = this.createdOn;
    return userInfo;
  }

  // safe method for creating user information to client
  toUserInfo(): UserInfo {
    return {
      userID: this.userID,
      firstName: this.firstName,
      lastName: this.lastName,
      email: this.email,
      affiliation: this.affiliation,
      permissions: this.permissions,
      priorLoginDate: this.priorLoginDate,
      priorLoginIP: this.priorLoginIP,
      lastLoginDate: this.lastLoginDate,
      lastLoginIP: this.lastLoginIP
    };
  }

  async verifyPassword(password: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      crypto.scrypt(
        password,
        this._passwordSalt,
        PASSWORD_HASH_LENGTH,
        (err, derivedKey) => {
          if (err) return reject(err);
          resolve(this._passwordHash == derivedKey.toString('hex'));
        }
      );
    });
  }

  //// PUBLIC CLASS METHODS //////////////////////////////////////////////////

  static async authenticate(
    db: DB,
    email: string,
    password: string,
    ipAddress: string
  ): Promise<User | null> {
    // Verify the credentials.

    const user = await this.getByEmail(db, this._normalizeEmail(email));
    if (!user) return null;
    const verified = await user.verifyPassword(password);
    if (!verified) return null;

    // Record the login.

    user.priorLoginDate = user.lastLoginDate;
    user.priorLoginIP = user.lastLoginIP;
    user.lastLoginDate = new Date();
    user.lastLoginIP = ipAddress;
    await user.save(db);
    await Logs.post(
      db,
      LogType.User,
      user.email,
      `${user.firstName} ${user.lastName} logged in from IP ${ipAddress}`
    );
    return user;
  }

  static async create(
    db: DB,
    firstName: string,
    lastName: string,
    email: string,
    affiliation: string | null,
    password: string,
    permissions: number,
    createdByID: number | null
  ): Promise<User> {
    // Validate and normalize user data.

    firstName = firstName.trim();
    if (firstName == '') {
      throw new ValidationError('No first name given');
    }
    lastName = lastName.trim();
    if (lastName == '') {
      throw new ValidationError('No last name given');
    }
    email = User._normalizeEmail(email);
    if (!VALID_EMAIL_REGEX.test(email)) {
      throw new ValidationError('Invalid email address');
    }
    if (affiliation) {
      affiliation = affiliation.trim();
      if (affiliation == '') {
        affiliation = null;
      }
    }
    if (permissions & Permission.Admin) {
      permissions |= Permission.Edit | Permission.Coords;
    } else if (permissions & Permission.Edit) {
      permissions |= Permission.Coords;
    }

    // Create the user, setting the password.

    const user = new User({
      userID: 0,
      firstName,
      lastName,
      email,
      affiliation,
      permissions,
      createdBy: createdByID,
      priorLoginDate: null,
      priorLoginIP: null,
      lastLoginDate: null,
      lastLoginIP: null,
      resetCode: null,
      resetExpiration: null,
      passwordHash: '', // temporary
      passwordSalt: '' // temporary
    });
    await user.setPassword(password);

    // Save the user to the database.

    try {
      await user.save(db);
    } catch (err: any) {
      if (err instanceof PostgresError && err.message.includes('duplicate')) {
        if (err.message.includes('name_key')) {
          throw new UserError('A user already exists with that name');
        }
        if (err.message.includes('email_key')) {
          throw new UserError('A user already exists for that email');
        }
      }
      throw err;
    }
    return user;
  }

  static async dropByID(db: DB, userID: number): Promise<void> {
    const result = await db.query(`delete from users where user_id=$1`, [userID]);
    if (result.rowCount != 1) {
      throw new UserError(`User not found`);
    }
  }

  static generatePassword(charset: string, length: number): string {
    let password;
    do {
      password = '';
      while (password.length < length) {
        password += charset[Math.floor(Math.random() * charset.length)];
      }
    } while (User.getPasswordStrength(password) < MIN_PASSWORD_STRENGTH);
    return password;
  }

  static async getByEmail(db: DB, email: string): Promise<User | null> {
    email = this._normalizeEmail(email);
    const result = await db.query(`select * from users where email=$1`, [email]);
    return result.rows.length > 0 ? new User(toCamelRow(result.rows[0])) : null;
  }

  static async getByID(db: DB, userID: number): Promise<User | null> {
    const result = await db.query(`select * from users where user_id=$1`, [userID]);
    return result.rows.length > 0 ? new User(toCamelRow(result.rows[0])) : null;
  }

  static getPasswordStrength(password: string): number {
    return zxcvbn(password).guessesLog10;
  }

  static async getUsers(db: DB): Promise<User[]> {
    const result = await db.query(
      `select x.*, c.first_name as creator_first_name, c.last_name as creator_last_name
        from users x left join users c on c.user_id = x.created_by
        order by x.last_name, x.first_name`
    );
    return result.rows.map((row) => {
      const data = new User(toCamelRow(row));
      if (row.creator_last_name) {
        data.createdByName =
          (row.creator_first_name ? row.creator_first_name + ' ' : '') +
          row.creator_last_name;
      } else {
        data.createdByName = null;
      }
      return data;
    });
  }

  // Used for testing.
  static setResetCodeDuration(minutes: number): void {
    resetCodeDurationMins = minutes;
  }

  //// PRIVATE CLASS METHODS /////////////////////////////////////////////////

  private static _normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }
}
