import * as crypto from 'crypto';
import { zxcvbn, zxcvbnOptions } from '@zxcvbn-ts/core';
import zxcvbnCommonPackage from '@zxcvbn-ts/language-common';
import zxcvbnEnPackage from '@zxcvbn-ts/language-en';

import type { DataOf } from '../util/type_util';
import { DB, toCamelRow } from '../util/pg_util';
import { MIN_PASSWORD_STRENGTH } from '../shared/constants';

const PASSWORD_HASH_LENGTH = 64;

zxcvbnOptions.setOptions({
  translations: zxcvbnEnPackage.translations,
  graphs: zxcvbnCommonPackage.adjacencyGraphs,
  dictionary: {
    ...zxcvbnCommonPackage.dictionary,
    ...zxcvbnEnPackage.dictionary
  }
});

export enum Privilege {
  // values are bit flags and therefore powers of 2
  Admin = 1, // add/remove users and reset passwords
  Edit = 2 // modify data, such as the precise coordinates
}

export class UserError extends Error {
  constructor(message: string) {
    super(message);
  }
}

type UserSpec = {
  name: string;
  email: string;
  password: string;
  privileges: number;
};

type UserData = DataOf<User>;

export class User {
  userID = 0;
  name: string;
  email: string;
  passwordHash!: string;
  passwordSalt!: string;
  privileges: number;
  createdOn!: Date;
  lastLogin: Date | null = null;

  //// CONSTRUCTION //////////////////////////////////////////////////////////

  // TODO: Look at making all model constructors private
  private constructor(data: UserSpec | UserData) {
    if ((data as UserData).userID) {
      const row = data as UserData;
      this.userID = row.userID;
      this.name = row.name;
      this.email = row.email;
      this.passwordHash = row.passwordHash;
      this.passwordSalt = row.passwordSalt;
      this.privileges = row.privileges;
      this.createdOn = row.createdOn;
      this.lastLogin = row.lastLogin;
    } else {
      const spec = data as UserSpec;
      this.name = spec.name.trim();
      this.email = User._normalizeEmail(spec.email);
      this.setPassword(spec.password);
      this.privileges = spec.privileges;
    }
  }

  //// PUBLIC INSTANCE METHODS ///////////////////////////////////////////////

  async drop(db: DB): Promise<void> {
    const result = await db.query(`delete from users where email=$1`, [this.email]);
    if (result.rowCount != 1) {
      throw Error(`Failed to drop user ID ${this.userID}`);
    }
  }

  async save(db: DB): Promise<number> {
    if (this.userID === 0) {
      const result = await db.query(
        `insert into users(
            name, email, password_hash, password_salt,
            privileges, created_on, last_login
          ) values ($1, $2, $3, $4, $5, $6, $7) returning user_id, created_on`,
        [
          this.name,
          this.email,
          this.passwordHash,
          this.passwordSalt,
          this.privileges,
          // @ts-ignore
          this.createdOn,
          // @ts-ignore
          this.lastLogin
        ]
      );
      const row = result.rows[0];
      this.userID = row.taxon_id;
      this.createdOn = row.created_on;
    } else {
      const result = await db.query(
        `update taxa set
            name=$1, email=$2, password_hash=$3, password_salt=$4,
            privileges=$5, created_on=$7, last_login=$7
          where user_id=$8`,
        [
          this.name,
          this.email,
          this.passwordHash,
          this.passwordSalt,
          this.privileges,
          // @ts-ignore
          this.createdOn,
          // @ts-ignore
          this.lastLogin,
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
    password = password.trim();
    if (User.checkPassword(password) < MIN_PASSWORD_STRENGTH) {
      throw new UserError('Password not strong enough');
    }
    return new Promise((resolve, reject) => {
      const salt = crypto.randomBytes(16).toString('hex');
      crypto.scrypt(password, salt, PASSWORD_HASH_LENGTH, (err, derivedKey) => {
        if (err) reject(err);
        this.passwordSalt = salt;
        this.passwordHash = derivedKey.toString('hex');
        resolve();
      });
    });
  }

  async verifyPassword(password: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      crypto.scrypt(
        password,
        this.passwordSalt,
        PASSWORD_HASH_LENGTH,
        (err, derivedKey) => {
          if (err) reject(err);
          resolve(this.passwordHash == derivedKey.toString('hex'));
        }
      );
    });
  }

  //// PUBLIC CLASS METHODS //////////////////////////////////////////////////

  static async authenticate(
    db: DB,
    email: string,
    password: string
  ): Promise<User | null> {
    const user = await this.getByEmail(db, this._normalizeEmail(email));
    if (!user) return null;
    const verified = await user.verifyPassword(password);
    if (!verified) return null;
    user.lastLogin = new Date();
    await user.save(db);
    return user;
  }

  static checkPassword(password: string): number {
    return zxcvbn(password).guessesLog10;
  }

  static async create(
    db: DB,
    name: string,
    email: string,
    password: string,
    privileges: number
  ): Promise<User> {
    const user = new User({ name, email, password, privileges });
    try {
      await user.save(db);
      return user;
    } catch (err: any) {
      if (err.message.includes('duplicate')) {
        if (err.message.includes('name')) {
          throw new UserError('A user already exists with that name');
        }
        if (err.message.includes('email')) {
          throw new UserError('A user already exists for that email');
        }
      }
      throw err;
    }
  }

  static async getByEmail(db: DB, email: string): Promise<User | null> {
    email = this._normalizeEmail(email);
    const result = await db.query(`select * from users where email=$1`, [email]);
    return result.rows.length > 0 ? new User(toCamelRow(result.rows[0])) : null;
  }

  static async getUsers(db: DB): Promise<User[]> {
    const result = await db.query(`select * from users`);
    return result.rows.map((row) => new User(toCamelRow(row)));
  }

  //// PRIVATE CLASS METHODS /////////////////////////////////////////////////

  private static _normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }
}
