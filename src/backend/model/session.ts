/**
 * Class representing active sessions, kept in memory but backed by a
 * database table. Using the database allows sessions to survive restarting
 * node, which is mainly important for testing and debugging. The design is
 * governed by the need for compatibility with express sessions, and by the
 * fact that only a few dozen users are expected to have login ability.
 */
import * as crypto from 'crypto';

import { toHeaderSafeBase64 } from '../util/http_util';
import { type DB, toCamelRow } from '../integrations/postgres';
import type { DataOf } from '../../shared/data_of';
import { User } from './user';
import { UserInfo } from '../../shared/user_auth';

export interface SessionOptions {
  sessionTimeoutMillis: number;
  expirationCheckMillis: number;
}

type SessionData = Omit<DataOf<Session>, 'userInfo'>;

const SESSION_ID_BYTES = 24; // byte length of random session ID
const MAX_ID_GEN_ATTEMPTS = 10; // maximum attempts to create a unique ID
const CSRF_TOKEN_LENGTH = 24;
let CSRF_TOKEN_CHARSET = 'abcdefghijklmnopqrstuvwxyz';
CSRF_TOKEN_CHARSET += CSRF_TOKEN_CHARSET.toUpperCase() + '0123456789';

const sessionsByID = new Map<string, Session>();
let expirationTimer: NodeJS.Timeout | null = null;
let config: SessionOptions;

export class Session {
  userID: number;
  sessionID: string;
  createdOn: Date;
  expiresAt!: Date;
  ipAddress: string;
  csrfToken: string;
  userInfo: UserInfo;

  //// CONSTRUCTION //////////////////////////////////////////////////////////

  private constructor(info: SessionData, userInfo: UserInfo) {
    this.userID = info.userID;
    this.sessionID = info.sessionID;
    this.createdOn = info.createdOn;
    this.expiresAt = info.expiresAt;
    this.ipAddress = info.ipAddress;
    this.csrfToken = info.csrfToken;
    this.userInfo = userInfo;
  }

  //// PUBLIC CLASS METHODS //////////////////////////////////////////////////

  /**
   * Initializes the in-memory session cache from the database. Users will
   * likely only number in the dozens, limiting the number of sessions.
   */
  static async init(db: DB, options: SessionOptions) {
    // Clear cache so that tests can repeatedly call init().

    sessionsByID.clear();
    config = Object.assign({}, options);

    // Load all users, so each session can reference its user.

    const users = await User.getUsers(db);
    const usersByID: Record<string, User> = {};
    for (const user of users) {
      usersByID[user.userID] = user;
    }

    // Load all sessions, referencing their users.

    const result = await db.query(`select * from sessions`);
    for (const row of result.rows) {
      const user = usersByID[row.user_id];
      if (user) {
        const session = new Session(toCamelRow(row), user.toUserInfo());
        sessionsByID.set(session.sessionID, session);
      }
    }

    // Begin handling session expirations.

    checkExpirations(db, config.expirationCheckMillis);
  }

  /**
   * Creates a session for the provided newly logged-in user.
   */
  static async create(db: DB, userInfo: UserInfo, ipAddress: string): Promise<Session> {
    const session = new Session(
      {
        userID: userInfo.userID,
        sessionID: await Session._createSessionID(MAX_ID_GEN_ATTEMPTS),
        createdOn: new Date(),
        expiresAt: Session._getNewExpiration(),
        ipAddress,
        csrfToken: User.generatePassword(CSRF_TOKEN_CHARSET, CSRF_TOKEN_LENGTH)
      },
      userInfo
    );
    const result = await db.query(
      `insert into sessions (
            session_id, user_id, created_on, expires_at, ip_address, csrf_token
          ) values($1, $2, $3, $4, $5, $6)`,
      [
        session.sessionID,
        session.userID,
        // @ts-ignore
        session.createdOn,
        // @ts-ignore
        session.expiresAt,
        ipAddress,
        session.csrfToken
      ]
    );
    if (result.rowCount != 1) {
      throw Error(`Failed to update session for user ID ${session.userID}`);
    }
    sessionsByID.set(session.sessionID, session);
    return session;
  }

  /**
   * Closes one session, logging the user out if that was the user's only session.
   */
  static async dropID(db: DB, sessionID: string) {
    if (sessionsByID.get(sessionID)) {
      sessionsByID.delete(sessionID);
    }
    await db.query(`delete from sessions where session_id=$1`, [sessionID]);
  }

  /**
   * Logs the user out, closing all sessions but the indicated on, if any
   * is indicated.
   */
  static async dropUser(db: DB, userID: number, exceptSessionID: string | null) {
    for (const session of Array.from(sessionsByID.values())) {
      if (session.userID == userID && session.sessionID != exceptSessionID) {
        sessionsByID.delete(session.sessionID);
      }
    }
    if (exceptSessionID) {
      await db.query(`delete from sessions where user_id=$1 and session_id!=$2`, [
        userID,
        exceptSessionID
      ]);
    } else {
      await db.query(`delete from sessions where user_id=$1`, [userID]);
    }
  }

  /**
   * Returns the session of the given ID or null if no such session exists.
   */
  static getByID(sessionID: string): Session | null {
    return sessionsByID.get(sessionID) || null;
  }

  /**
   * Returns all logged-in sessions, according to the in-memory cache.
   */
  static getSessions(): Session[] {
    return Array.from(sessionsByID.values());
  }

  /**
   * Refresh the session with the givne ID, returning the new expiration date.
   */
  static async refreshSession(db: DB, sessionID: string): Promise<Date | null> {
    const session = Session.getByID(sessionID);
    if (!session) return null;
    session.expiresAt = Session._getNewExpiration();
    await db.query(`update sessions set expires_at=$1 where session_id=$2`, [
      // @ts-ignore
      session.expiresAt,
      session.sessionID
    ]);
    return session.expiresAt;
  }

  /**
   * Refresh sessions for new user information.
   */
  static refreshUserInfo(user: User) {
    const userInfo = user.toUserInfo();
    for (const session of Array.from(sessionsByID.values())) {
      if (session.userID == user.userID) {
        session.userInfo = userInfo;
      }
    }
  }

  /**
   * Set timeout milliseconds to something other than the default. Mainly
   * useful for testing, given that this is also set from init().
   */
  static setTimeoutMillis(millis: number) {
    config.sessionTimeoutMillis = millis;
  }

  //// PRIVATE CLASS METHODS /////////////////////////////////////////////////

  /**
   * Creates a unique cryptographically-strong session ID.
   */
  private static async _createSessionID(attemptsLeft: number): Promise<string> {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(SESSION_ID_BYTES, function (err, buffer) {
        if (err) return reject(err);
        let headerSafeID = toHeaderSafeBase64(buffer.toString('base64'));
        if (sessionsByID.get(headerSafeID)) {
          if (--attemptsLeft == 0) {
            return reject(Error(`Unable to create a unique session ID`));
          }
          return Session._createSessionID(attemptsLeft);
        } else {
          resolve(headerSafeID);
        }
      });
    });
  }

  static _getNewExpiration() {
    return new Date(new Date().getTime() + config.sessionTimeoutMillis);
  }
}

/**
 * Drops expired sessions every `expirationCheckMillis`. Runs automatically
 * upon loading the module, but it's safe for tests to call again after
 * loading, so that tests don't have to behave differently at load time.
 * Each call replaces the prior `expirationCheckMillis`.
 */
export function checkExpirations(db: DB, expirationCheckMillis: number) {
  // Make it safe to repeatedly call this function.

  if (expirationTimer) {
    clearTimeout(expirationTimer);
  }

  // Drop expired sessions upon reaching timeout.

  expirationTimer = setTimeout(async () => {
    // Drop expired sessions from memory.

    const now = new Date().getTime();
    for (const session of Array.from(sessionsByID.values())) {
      if (session.expiresAt.getTime() <= now) {
        sessionsByID.delete(session.sessionID);
      }
    }

    // Drop expired sessions from the database. It's okay for the in-memory
    // list to get slightly out of sync with the database.

    await db.query(`delete from sessions where expires_at <= $1`, [
      // Provide the current date/time to be sure it agrees with the
      // provided date/times in the database.
      new Date().toISOString()
    ]);

    // Schedule next expiration check.

    expirationTimer = null; // release resource despite recursion
    checkExpirations(db, expirationCheckMillis);
  }, expirationCheckMillis);
}

/**
 * Clears the expiration timer.
 */
export function stopCheckingExpirations() {
  if (expirationTimer) {
    clearTimeout(expirationTimer);
    expirationTimer = null;
  }
}
