/**
 * Class representing in-memory sessions, managing all active sessions.
 */

import * as crypto from 'crypto';

import type { DataOf } from '../util/type_util';
import { toHeaderSafeBase64 } from '../util/http_util';
import type { User } from './user';
import { UserError } from '../shared/validation';

export const MAX_SESSIONS_PER_USER = 20; // limits unused browser window pollution

const SESSION_TIMEOUT_MILLIS = 60 * 60 * 1000; // logs out after 1 hour unused
const EXPIRATION_CHECK_MILLIS = 1000; // check for session expiration every minute
const SESSION_ID_BYTES = 21; // byte length of random session ID
const CSRF_TOKEN_BYTES = 8; // byte length of CSRF token
const MAX_ID_GEN_ATTEMPTS = 5; // max tries to generate a unique session ID

type SessionData = Omit<DataOf<Session>, 'createdAt' | 'expiresAt'>;

const sessionsByID: Record<string, Session> = {};
let expirationTimer: NodeJS.Timeout | null = null;

export class Session {
  sessionID: string;
  user: User;
  createdAt: Date;
  expiresAt!: Date;
  ipAddress: string;
  csrfToken: string;

  //// CONSTRUCTION //////////////////////////////////////////////////////////

  private constructor(data: SessionData) {
    this.sessionID = data.sessionID;
    this.user = data.user;
    this.createdAt = new Date();
    this.refresh();
    this.ipAddress = data.ipAddress;
    this.csrfToken = data.csrfToken;
  }

  /// PUBLIC INSTANCE METHODS ////////////////////////////////////////////////

  /**
   * Called on user activity to restart the session timeout period. The timeout
   * period is an optional parameter in order to support testing.
   */
  refresh(sessionTimeoutMillis?: number) {
    sessionTimeoutMillis = sessionTimeoutMillis || SESSION_TIMEOUT_MILLIS;
    this.expiresAt = new Date(new Date().getTime() + sessionTimeoutMillis);
  }

  /**
   * Terminates all of user's sessions but the present one.
   */
  reset() {
    Session.dropUser(this.user.userID);
    sessionsByID[this.sessionID] = this;
  }

  /// PUBLIC CLASS METHODS ///////////////////////////////////////////////////

  /**
   * Creates a new session for a logged-in user.
   */
  static async create(user: User, ipAddress: string): Promise<Session> {
    // This simple approach is fine because there will be few users.

    let sessionCount = 0;
    for (const session of Object.values(sessionsByID)) {
      if (session.user.userID == user.userID) {
        if (++sessionCount == MAX_SESSIONS_PER_USER) {
          throw new UserError(
            `Exceeded max ${MAX_SESSIONS_PER_USER} open sessions per user`
          );
        }
      }
    }

    const sessionID = await Session._createSessionID(MAX_ID_GEN_ATTEMPTS);

    return new Promise((resolve, reject) => {
      crypto.randomBytes(CSRF_TOKEN_BYTES, (err, buffer) => {
        if (err) return reject(err);
        let session = new Session({
          sessionID,
          user,
          ipAddress,
          csrfToken: toHeaderSafeBase64(buffer.toString('base64'))
        });
        sessionsByID[sessionID] = session;
        resolve(session);
      });
    });
  }

  /**
   * Closes one session, logging the user out if that was the user's only session.
   */
  static dropID(sessionID: string) {
    if (sessionsByID[sessionID]) {
      delete sessionsByID[sessionID];
    }
  }

  /**
   * Logs the user out, closing all sessions.
   */
  static dropUser(userID: number) {
    for (const session of Object.values(sessionsByID)) {
      if (session.user.userID == userID) {
        delete sessionsByID[session.sessionID];
      }
    }
  }

  /**
   * Returns the session of the given ID or null if no such session exists.
   */
  static getByID(sessionID: string): Session | null {
    return sessionsByID[sessionID] || null;
  }

  /**
   * Returns all logged-in sessions.
   */
  static getSessions(): Session[] {
    return Object.values(sessionsByID);
  }

  //// PRIVATE INSTANCE METHODS //////////////////////////////////////////////

  /**
   * Creates a unique cryptographically-strong session ID.
   */
  private static async _createSessionID(attemptsLeft: number): Promise<string> {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(SESSION_ID_BYTES, function (err, buffer) {
        if (err) return reject(err);
        let headerSafeID = toHeaderSafeBase64(buffer.toString('base64'));
        if (sessionsByID[headerSafeID]) {
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
}

/**
 * Drops expired sessions every `expirationCheckMillis`. Runs automatically
 * upon loading the module, but it's safe for tests to call again after
 * loading, so that tests don't have to behave differently at load time.
 * Each call replaces the prior `expirationCheckMillis`.
 */
export function checkExpirations(expirationCheckMillis: number) {
  if (expirationTimer) {
    clearTimeout(expirationTimer);
  }
  expirationTimer = setTimeout(() => {
    const now = new Date().getTime();
    for (const session of Object.values(sessionsByID)) {
      if (session.expiresAt.getTime() <= now) {
        delete sessionsByID[session.sessionID];
      }
    }
    expirationTimer = null;
    checkExpirations(expirationCheckMillis);
  }, expirationCheckMillis);
}
checkExpirations(EXPIRATION_CHECK_MILLIS);

/**
 * Clears the expiration timer.
 */
export function stopCheckingExpirations() {
  if (expirationTimer) {
    clearTimeout(expirationTimer);
    expirationTimer = null;
  }
}
