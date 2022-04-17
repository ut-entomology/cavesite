/**
 * Class representing active sessions, kept in memory but backed by a
 * database table. Using the database allows sessions to survive restarting
 * node, which is mainly important for testing and debugging. The design is
 * governed by the need for compatibility with express sessions, and by the
 * fact that only a few dozen users are expected to have login ability.
 */
import type { SessionData as ExpressSessionData } from 'express-session';

import { type DB, toCamelRow } from '../integrations/postgres';
import type { DataOf } from '../util/type_util';
import { User } from './user';

const SESSION_TIMEOUT_MILLIS = 2 * 60 * 60 * 1000; // logs out after 2 hours unused
const EXPIRATION_CHECK_MILLIS = 5 * 60 * 1000; // check for expiration every 5 mins

type SessionData = Omit<DataOf<Session>, 'sessionData'>;

const sessionsByID = new Map<string, Session>();
let sessionTimeoutMillis = SESSION_TIMEOUT_MILLIS;
let expirationTimer: NodeJS.Timeout | null = null;

export class Session {
  userID: number;
  sessionID: string;
  createdOn: Date;
  expiresAt!: Date;
  ipAddress: string;
  sessionData: ExpressSessionData; // includes userInfo

  //// CONSTRUCTION //////////////////////////////////////////////////////////

  private constructor(info: SessionData, sessionData: ExpressSessionData) {
    this.userID = info.userID;
    this.sessionID = info.sessionID;
    this.createdOn = info.createdOn;
    this.expiresAt = info.expiresAt;
    this.ipAddress = info.ipAddress;
    this.sessionData = sessionData;
  }

  //// PUBLIC CLASS METHODS //////////////////////////////////////////////////

  /**
   * Initializes the in-memory session cache from the database. Users will
   * likely only number in the dozens, limiting the number of sessions.
   */
  static async init(db: DB) {
    // Clear cache so that tests can repeatedly call init().

    sessionsByID.clear();

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
        const expressSessionData = JSON.parse(row.session_data);
        Session.setUserInfo(expressSessionData, user);
        const session = new Session(toCamelRow(row), expressSessionData);
        sessionsByID.set(session.sessionID, session);
      }
    }

    // Begin handling session expirations.

    checkExpirations(db, EXPIRATION_CHECK_MILLIS);
  }

  /**
   * Creates or refresh a session for a logged-in user. `expressSessionData`
   * must contain a populated `userInfo` property, along with any properties
   * assigned by express middleware.
   */
  static async upsert(
    db: DB,
    sessionID: string,
    expressSessionData: ExpressSessionData
  ): Promise<Session> {
    // Remove userInfo from a copy of expressSessionData so we don't store it.
    const userInfo = expressSessionData.userInfo;
    const userlessSessionData = Object.assign({}, expressSessionData) as any;
    delete userlessSessionData['userInfo'];

    let session = Session.getByID(sessionID);
    if (session) {
      session.expiresAt = Session._getNewExpiration();
      await db.query(
        `update sessions set expires_at=$1, session_data=$2 where session_id=$3`,
        [
          // @ts-ignore
          session.expiresAt,
          JSON.stringify(userlessSessionData),
          sessionID
        ]
      );
    } else {
      session = new Session(
        {
          userID: userInfo.userID,
          sessionID,
          createdOn: new Date(),
          expiresAt: Session._getNewExpiration(),
          ipAddress: expressSessionData.ipAddress
        },
        expressSessionData
      );
      const result = await db.query(
        `insert into sessions (
            session_id, user_id, created_on, expires_at, ip_address, session_data
          ) values($1, $2, $3, $4, $5, $6)`,
        [
          sessionID,
          userInfo.userID,
          // @ts-ignore
          session.createdOn,
          // @ts-ignore
          session.expiresAt,
          expressSessionData.ipAddress,
          JSON.stringify(userlessSessionData)
        ]
      );
      if (result.rowCount != 1) {
        throw Error(`Failed to update session for user ID ${userInfo.userID}`);
      }
      sessionsByID.set(sessionID, session);
    }
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
   * Logs the user out, closing all sessions.
   */
  static async dropUser(db: DB, userID: number) {
    for (const session of Array.from(sessionsByID.values())) {
      if (session.userID == userID) {
        sessionsByID.delete(session.sessionID);
      }
    }
    await db.query(`delete from sessions where user_id=$1`, [userID]);
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
   * Refresh sessions for new user information.
   */
  static refreshUserInfo(user: User) {
    for (const session of Array.from(sessionsByID.values())) {
      if (session.userID == user.userID) {
        Session.setUserInfo(session.sessionData, user);
      }
    }
  }

  /**
   * Set timeout milliseconds to something other than the default.
   */
  static setTimeoutMillis(millis: number) {
    sessionTimeoutMillis = millis;
  }

  /**
   * Assign user information to the provide express session data.
   */
  static setUserInfo(expressSessionData: ExpressSessionData, user: User): void {
    expressSessionData.userInfo = {
      userID: user.userID,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      affiliation: user.affiliation,
      permissions: user.permissions,
      lastLoginDate: user.lastLoginDate,
      lastLoginIP: user.lastLoginIP
    };
  }

  //// PRIVATE CLASS METHODS /////////////////////////////////////////////////

  static _getNewExpiration() {
    return new Date(new Date().getTime() + sessionTimeoutMillis);
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
