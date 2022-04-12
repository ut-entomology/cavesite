import type { Store, SessionData } from 'express-session';

let sessionStore: Store;

export function setSessionStore(store: Store): void {
  sessionStore = store;
}

export function dropUserSessions(userID: number): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    sessionStore.all!((err, data) => {
      if (err) return reject(err);
      const sessions = data as Record<string, SessionData>;

      // This is fine, as there won't be that many registered users.
      for (const [sessionID, session] of Object.entries(sessions)) {
        if (session.user.userID == userID) {
          sessionStore.destroy(sessionID);
        }
      }
      resolve();
    });
  });
}
