import * as cookie from 'cookie';
import type { RequestHandler } from '@sveltejs/kit';

import { Session } from '../../model/session';

/** @type {import('@sveltejs/kit').RequestHandler} */
export const get: RequestHandler = async (request) => {
  const locals = request.locals;
  const sessionID = locals.sessionID;
  if (sessionID) {
    Session.dropID(sessionID);
    locals.user = null;
    locals.sessionID = null;
  }

  return {
    status: 200,
    headers: {
      'Set-Cookie': cookie.serialize('session_id', '[invalid]', {
        path: '/',
        expires: new Date(0)
      })
    },
    body: { message: 'Logged out' }
  };
};
