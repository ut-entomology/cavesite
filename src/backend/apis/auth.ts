import { type Request } from 'express';

import { getDB } from '../integrations/postgres';
import { Router } from 'express';

import { User } from '../model/user';

type LoginParams = {
  email: string;
  password: string;
};

export const router = Router();

router.post('/login', async (req: Request<void, any, LoginParams>, res) => {
  const body = req.body;
  console.log(body);
  const user = await User.authenticate(getDB(), body.email, body.password, req.ip);

  if (!user) {
    return res.status(401).json({ message: 'Incorrect email or password' });
  }

  req.session.user = {
    userID: user.userID,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    affiliation: user.affiliation,
    permissions: user.permissions,
    lastLoginDate: user.lastLoginDate,
    lastLoginIP: user.lastLoginIP
  };
  return res.status(200).send(req.session.user);
});

router.get('/logout', async (req, res) => {
  await new Promise<void>((resolve) => {
    req.session.destroy(() => resolve());
  });
  return res.status(204).send();
});
