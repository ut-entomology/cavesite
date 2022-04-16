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
    console.log('**** got session for user', session.userInfo);
    callback(null, JSON.parse(session.expressData));
  }

  set(
    sessionID: string,
    sessionData: SessionData,
    callback?: (err?: any) => void
  ): void {
    console.log('**** setting session');
    (async () => {
      await Session.upsert(
        getDB(),
        sessionID,
        sessionData.userInfo,
        sessionData.ipAddress,
        JSON.stringify(sessionData)
      );
      console.log('**** set session');
      if (callback) callback(null);
    })().catch((err) => {
      console.log('**** error setting session', err.message);
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
