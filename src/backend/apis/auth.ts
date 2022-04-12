import { type Request } from 'express';

import { getDB } from '../integrations/postgres';
import { Router } from 'express';

import { User } from '../model/user';

type LoginParams = {
  email: string;
  password: string;
};

export const router = Router();

router.post('/login', async (req: Request<LoginParams>, res) => {
  const params = req.params;
  const user = await User.authenticate(getDB(), params.email, params.password, req.ip);

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
  return res.status(200).json({ csrfToken: req.csrfToken });
});

router.get('/logout', async (req, res) => {
  await new Promise<void>((resolve) => {
    req.session.destroy(() => resolve());
  });
  return res.status(204);
});
