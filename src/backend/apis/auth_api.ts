import { Router, type Request } from 'express';
import { StatusCodes } from 'http-status-codes';

import { getDB } from '../integrations/postgres';
import { User } from '../model/user';

type LoginParams = {
  email: string;
  password: string;
};

export const router = Router();

router.post('/connect', async (req, res) => {
  if (req.session && req.session.userInfo) {
    return res.status(StatusCodes.OK).send(toLoginInfo(req));
  }
  return res.status(StatusCodes.OK).send();
});

router.post('/login', async (req: Request<void, any, LoginParams>, res) => {
  const body = req.body;
  const user = await User.authenticate(getDB(), body.email, body.password, req.ip);

  if (!user) {
    return res.status(StatusCodes.UNAUTHORIZED).send();
  }

  req.session.userInfo = user.toUserInfo();
  req.session.ipAddress = req.ip;
  return res.status(StatusCodes.OK).send(toLoginInfo(req));
});

router.get('/logout', async (req, res) => {
  await new Promise<void>((resolve) => {
    req.session.destroy(() => resolve());
  });
  return res.status(StatusCodes.NO_CONTENT).send();
});

router.post('/refresh', async (req, res) => {
  if (!req.session || !req.session.userInfo) {
    return res.status(StatusCodes.UNAUTHORIZED).send();
  }
  req.session.touch();
  req.session.save();
  req.session.cookie.expires = new Date(Date.now() + req.session.cookie.maxAge!);
  const devMode = process.env.NODE_ENV !== 'production';
  res.cookie('connect.sid', req.sessionID, {
    secure: !devMode,
    sameSite: true,
    expires: req.session.cookie.expires,
    path: '/',
    httpOnly: true
  });
  return res.status(StatusCodes.OK).send({ expiration: toExpirationTime(req) });
});

function toLoginInfo(req: Request<any, any, any>) {
  return {
    userInfo: req.session.userInfo,
    expiration: toExpirationTime(req)
  };
}

function toExpirationTime(req: Request<any, any, any>) {
  return req.session.cookie.expires?.getTime() || 0;
}
