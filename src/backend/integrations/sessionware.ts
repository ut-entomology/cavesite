/**
 * Custom session middleware because express-session is to inflexible,
 * and given the simplicity of this solution, apparently unnecessary.
 * The session ID is cryptographically strong, so there's no need to
 * sign it -- might as well be guessing a signed session ID.
 */

import type { Request, Response } from 'express';

import { Session } from '../model/session';

const SESSION_COOKIE_NAME = 'sessionID';
const devMode = process.env.NODE_ENV !== 'production';

export function sessionware(req: Request, res: any, next: any) {
  const sessionID = req.cookies[SESSION_COOKIE_NAME];
  if (sessionID) {
    const session = Session.getByID(sessionID);
    if (!session) {
      res.clearCookie(SESSION_COOKIE_NAME);
    } else {
      req.session = session;
    }
  }
  req.setSession = (session: Session | null) => {
    if (!session) {
      res.clearCookie(SESSION_COOKIE_NAME);
      delete req.session;
    } else {
      setSessionCookie(res, session);
      req.session = session;
    }
  };
  next();
}

function setSessionCookie(res: Response, session: Session) {
  res.cookie(SESSION_COOKIE_NAME, session.sessionID, {
    secure: !devMode,
    sameSite: true,
    expires: session.expiresAt,
    path: '/',
    httpOnly: true
  });
}
