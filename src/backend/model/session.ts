/**
 * Class representing active sessions, kept in memory but backed by a
 * database table. Using the database allows sessions to survive restarting
 * node, which is mainly important for testing and debugging. The design is
 * governed by the need for compatibility with express sessions, and by the
 * fact that only a few users are expected to have login ability.
 */
import { type DB, toCamelRow } from '../integrations/postgres';
import type { DataOf } from '../util/type_util';
import { User } from './user';
import { type UserInfo } from '../../shared/user_auth';

const SESSION_TIMEOUT_MILLIS = 2 * 60 * 60 * 1000; // logs out after 2 hours unused
const EXPIRATION_CHECK_MILLIS = 5 * 60 * 1000; // check for expiration every 5 mins

type SessionData = Omit<DataOf<Session>, 'userInfo'>;

const sessionsByID = new Map<string, Session>();
let sessionTimeoutMillis = SESSION_TIMEOUT_MILLIS;
let expirationTimer: NodeJS.Timeout | null = null;

export class Session {
  sessionID: string;
  userInfo: UserInfo;
  createdOn: Date;
  expiresAt!: Date;
  ipAddress: string;
  // TODO: store this parsed to make session lookups more efficient
  expressData: string;

  //// CONSTRUCTION //////////////////////////////////////////////////////////

  private constructor(data: SessionData, userInfo: UserInfo) {
    this.sessionID = data.sessionID;
    this.userInfo = userInfo;
    this.createdOn = data.createdOn;
    this.expiresAt = data.expiresAt;
    this.ipAddress = data.ipAddress;
    this.expressData = data.expressData;
  }

  /// PUBLIC CLASS METHODS ///////////////////////////////////////////////////

  /**
   * Initializes the in-memory session cache from the database.
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
        const session = new Session(toCamelRow(row), user);
        sessionsByID.set(session.sessionID, session);
      } else {
        console.log('dropped session ID', row.session_id);
      }
    }

    // Begin handling session expirations.

    checkExpirations(db, EXPIRATION_CHECK_MILLIS);
  }

  /**
   * Creates or refresh a session for a logged-in user.
   */
  static async upsert(
    db: DB,
    sessionID: string,
    userInfo: UserInfo,
    ipAddress: string,
    expressData: string
  ): Promise<Session> {
    let session = Session.getByID(sessionID);
    if (session) {
      session.expiresAt = Session._getNewExpiration();
      await db.query(
        `update sessions set expires_at=$1, express_data=$2 where session_id=$3`,
        [
          // @ts-ignore
          session.expiresAt,
          session.expressData,
          sessionID
        ]
      );
    } else {
      session = new Session(
        {
          sessionID,
          createdOn: new Date(),
          expiresAt: Session._getNewExpiration(),
          ipAddress,
          expressData
        },
        userInfo
      );
      const result = await db.query(
        `insert into sessions (
            session_id, user_id, created_on, expires_at, ip_address, express_data
          ) values($1, $2, $3, $4, $5, $6)`,
        [
          sessionID,
          userInfo.userID,
          // @ts-ignore
          session.createdOn,
          // @ts-ignore
          session.expiresAt,
          ipAddress,
          expressData
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
      if (session.userInfo.userID == userID) {
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
   * Set timeout milliseconds to something other than the default.
   */
  static setTimeoutMillis(millis: number) {
    sessionTimeoutMillis = millis;
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
