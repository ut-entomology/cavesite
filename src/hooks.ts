import * as cookie from 'cookie';
import type { GetSession, Handle } from '@sveltejs/kit';

import { connectedToDB, connectDB } from './integrations/postgres';
import { Session } from './model/session';

/** @type {import('@sveltejs/kit').GetSession} */
export const getSession: GetSession = (event) => {
  // TODO: handle CSRF token
  const user = event.locals.user;
  if (!user) return {};

  return {
    // data available within client
    user: {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      affiliation: user.affiliation,
      permissions: user.permissions,
      lastLoginDate: user.lastLoginDate,
      lastLoginIP: user.lastLoginIP
    }
  };
};

/** @type {import('@sveltejs/kit').Handle} */
export const handle: Handle = async (input) => {
  if (!connectedToDB()) {
    await connectDB({
      host: import.meta.env.VITE_DB_HOST,
      database: import.meta.env.VITE_DB_NAME,
      port: parseInt(import.meta.env.VITE_DB_PORT),
      user: import.meta.env.VITE_DB_USER,
      password: import.meta.env.VITE_DB_PW
    });
  }

  const cookieHeader = input.event.request.headers.get('cookie');
  if (cookieHeader) {
    const locals = input.event.locals;
    locals.sessionID = cookie.parse(cookieHeader)['sessionID'] || null;
    if (locals.sessionID) {
      const session = Session.getByID(locals.sessionID);
      if (session) {
        locals.user = session.user;
        session.refresh();
      } else {
        locals.user = null;
        locals.sessionID = null;
      }
    }
  }

  return input.resolve(input.event);
};
