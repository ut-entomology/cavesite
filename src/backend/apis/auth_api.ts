import { Router, type Request } from 'express';
import { StatusCodes } from 'http-status-codes';

import { getDB } from '../integrations/postgres';
import { User } from '../model/user';
import { Session } from '../model/session';

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
  console.log('**** refresh');
  if (!req.session || !req.session.userInfo) {
    return res.status(StatusCodes.UNAUTHORIZED).send();
  }
  // @ts-ignore TS not recognizing that req.session.userInfo is set
  await Session.upsert(getDB(), req.session.id, req.session);
  req.session.touch();
  console.log('**** new expiration', req.session.cookie.expires);
  return res.status(StatusCodes.OK).send({ expiration: req.session.cookie.expires });
});

function toLoginInfo(req: Request<any, any, any>) {
  return { userInfo: req.session.userInfo, expiration: req.session.cookie.expires };
}
