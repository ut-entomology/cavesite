import { Store, type SessionData } from 'express-session';

import { getDB } from '../integrations/postgres';
import { Session } from '../model/session';

export class SessionStore extends Store {
  get(
    sessionID: string,
    callback: (err: any, session?: SessionData | null) => void
  ): void {
    const session = Session.getByID(sessionID);
    if (!session) return callback(null, null);
    callback(null, session.sessionData);
  }

  set(
    sessionID: string,
    sessionData: SessionData,
    callback?: (err?: any) => void
  ): void {
    (async () => {
      await Session.upsert(getDB(), sessionID, sessionData);
      if (callback) callback(null);
    })().catch((err) => {
      if (callback) callback(err);
    });
  }

  destroy(sessionID: string, callback?: (err?: any) => void): void {
    (async () => {
      await Session.dropID(getDB(), sessionID);
      if (callback) callback(null);
    })().catch((err) => {
      if (callback) callback(err);
    });
  }
}
