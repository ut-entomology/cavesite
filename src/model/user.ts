import * as crypto from 'crypto';
import { zxcvbn, zxcvbnOptions } from '@zxcvbn-ts/core';
import zxcvbnCommonPackage from '@zxcvbn-ts/language-common';
import zxcvbnEnPackage from '@zxcvbn-ts/language-en';

import type { DataOf } from '../util/type_util';
import { DB, PostgresError, toCamelRow } from '../util/pg_util';
import { EMAIL_REGEX, MIN_PASSWORD_STRENGTH } from '../shared/constants';

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
  Admin = 1, // add/remove users and reset passwords; implies Edit/Coords
  Edit = 2, // modify data, such as the precise coordinates; implies Coords
  Coords = 4 // can see precise coordinates
}

export class UserError extends Error {
  constructor(message: string) {
    super(message);
  }
}

type UserData = Omit<DataOf<User>, 'createdOn'> & {
  passwordHash: string;
  passwordSalt: string;
  createdOn?: Date;
};

export class User {
  userID = 0;
  name: string;
  email: string;
  privileges: number;
  createdOn: Date;
  lastLogin: Date | null = null;

  private _passwordHash: string;
  private _passwordSalt: string;

  //// CONSTRUCTION //////////////////////////////////////////////////////////

  private constructor(data: UserData) {
    this.userID = data.userID;
    this.name = data.name;
    this.email = data.email;
    this.privileges = data.privileges;
    this.createdOn = data.createdOn!;
    this.lastLogin = data.lastLogin;
    this._passwordHash = data.passwordHash;
    this._passwordSalt = data.passwordSalt;
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
            privileges, last_login
          ) values ($1, $2, $3, $4, $5, $6) returning user_id, created_on`,
        [
          this.name,
          this.email,
          this._passwordHash,
          this._passwordSalt,
          this.privileges,
          // @ts-ignore
          this.lastLogin
        ]
      );
      const row = result.rows[0];
      this.userID = row.user_id;
      this.createdOn = row.created_on;
    } else {
      const result = await db.query(
        `update taxa set
            name=$1, email=$2, password_hash=$3, password_salt=$4,
            privileges=$5, last_login=$6
          where user_id=$7`,
        [
          this.name,
          this.email,
          this._passwordHash,
          this._passwordSalt,
          this.privileges,
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
    if (password != password.trim()) {
      throw new UserError("Password can't begin or end with spaces");
    }
    if (User.getPasswordStrength(password) < MIN_PASSWORD_STRENGTH) {
      throw new UserError('Password not strong enough');
    }
    return new Promise((resolve, reject) => {
      const salt = crypto.randomBytes(16).toString('hex');
      crypto.scrypt(password, salt, PASSWORD_HASH_LENGTH, (err, derivedKey) => {
        if (err) reject(err);
        this._passwordSalt = salt;
        this._passwordHash = derivedKey.toString('hex');
        resolve();
      });
    });
  }

  async verifyPassword(password: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      crypto.scrypt(
        password,
        this._passwordSalt,
        PASSWORD_HASH_LENGTH,
        (err, derivedKey) => {
          if (err) reject(err);
          resolve(this._passwordHash == derivedKey.toString('hex'));
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

  static async create(
    db: DB,
    name: string,
    email: string,
    password: string,
    privileges: number
  ): Promise<User> {
    // Validate and normalize user data.

    name = name.trim();
    if (name == '') {
      throw new UserError('No user name given');
    }
    email = User._normalizeEmail(email);
    if (!EMAIL_REGEX.test(email)) {
      throw new UserError('Invalid email address');
    }
    if (privileges & Privilege.Admin) {
      privileges |= Privilege.Edit | Privilege.Coords;
    } else if (privileges & Privilege.Edit) {
      privileges |= Privilege.Coords;
    }

    // Create the user, setting the password.

    const user = new User({
      userID: 0,
      name,
      email,
      privileges,
      lastLogin: null,
      passwordHash: '', // temporary
      passwordSalt: '' // temporary
    });
    await user.setPassword(password);

    // Save the user to the database.

    try {
      await user.save(db);
    } catch (err: any) {
      if (err instanceof PostgresError && err.message.includes('duplicate')) {
        if (err.message.includes('name')) {
          throw new UserError('A user already exists with that name');
        }
        if (err.message.includes('email')) {
          throw new UserError('A user already exists for that email');
        }
      }
      throw err;
    }
    return user;
  }

  static async getByEmail(db: DB, email: string): Promise<User | null> {
    email = this._normalizeEmail(email);
    const result = await db.query(`select * from users where email=$1`, [email]);
    return result.rows.length > 0 ? new User(toCamelRow(result.rows[0])) : null;
  }

  static getPasswordStrength(password: string): number {
    return zxcvbn(password).guessesLog10;
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
