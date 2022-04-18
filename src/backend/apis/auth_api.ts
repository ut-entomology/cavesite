import { type Request } from 'express';

import { getDB } from '../integrations/postgres';
import { Router } from 'express';
import { StatusCodes } from 'http-status-codes';

import { User } from '../model/user';

type LoginParams = {
  email: string;
  password: string;
};

export const router = Router();

router.post('/connect', async (req: Request<void, any, LoginParams>, res) => {
  if (req.session && req.session.userInfo) {
    return res.status(StatusCodes.OK).send(req.session.userInfo);
  }
  return res.status(StatusCodes.OK).send();
});

router.post('/login', async (req: Request<void, any, LoginParams>, res) => {
  const body = req.body;
  const user = await User.authenticate(getDB(), body.email, body.password, req.ip);

  if (!user) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ message: 'Incorrect email or password' });
  }

  req.session.userInfo = user.toUserInfo();
  req.session.ipAddress = req.ip;
  return res.status(StatusCodes.OK).send(req.session.userInfo);
});

router.get('/logout', async (req, res) => {
  await new Promise<void>((resolve) => {
    req.session.destroy(() => resolve());
  });
  return res.status(StatusCodes.NO_CONTENT).send();
});
