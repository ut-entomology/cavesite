import * as cookie from 'cookie';
import type { RequestHandler } from '@sveltejs/kit';

import { User } from '../../model/user';
import { Session } from '../../model/session';

type LoginParams = {
  email: string;
  password: string;
};

/** @type {import('@sveltejs/kit').RequestHandler} */
export const post: RequestHandler<LoginParams> = async (request) => {
  const params = request.params;
  const user = await User.authenticate(
    db,
    params.email,
    params.password,
    request.clientAddress
  );

  if (!user) {
    return {
      status: 401,
      body: { message: 'Incorrect email or password' }
    };
  }

  const session = await Session.create(user, request.clientAddress);
  return {
    status: 200,
    headers: {
      'Set-Cookie': cookie.serialize('session_id', session.sessionID, {
        path: '/',
        httpOnly: true,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production'
      })
    },
    body: { message: 'Logged in' }
  };
};
