import { type Request } from 'express';
import { type SessionData } from 'express-session';

import { getDB } from '../integrations/postgres';
import { Router } from 'express';

import { User } from '../model/user';
import { Session } from '../model/session';

type LoginParams = {
  email: string;
  password: string;
};

export const router = Router();

router.post('/connect', async (req: Request<void, any, LoginParams>, res) => {
  if (req.session && req.session.userInfo) {
    return res.status(200).send(req.session.userInfo);
  }
  return res.status(200).send();
});

router.post('/login', async (req: Request<void, any, LoginParams>, res) => {
  const body = req.body;
  const user = await User.authenticate(getDB(), body.email, body.password, req.ip);

  if (!user) {
    return res.status(401).json({ message: 'Incorrect email or password' });
  }

  Session.setUserInfo(req.session as SessionData, user);
  req.session.ipAddress = req.ip;
  return res.status(200).send(req.session.userInfo);
});

router.get('/logout', async (req, res) => {
  await new Promise<void>((resolve) => {
    req.session.destroy(() => resolve());
  });
  return res.status(204).send();
});
