import { type Request } from 'express';

import { getDB } from '../integrations/postgres';
import { Router } from 'express';
import { StatusCodes } from 'http-status-codes';

import { Permission } from '../../shared/user_auth';
import { requirePermissions } from '../util/http_util';
import { User } from '../model/user';
import { AdminUserInfo, UserInfo } from '../../shared/user_auth';
import { Session } from '../model/session';

export const router = Router();

router.use(requirePermissions(Permission.Admin));

router.post('/get_all', async (_req: Request<void, any, void>, res) => {
  const users = await User.getUsers(getDB());
  const userData: AdminUserInfo[] = [];
  for (const user of users) {
    userData.push(user.toAdminUserInfo());
  }
  return res.status(StatusCodes.OK).send(userData);
});

router.post('/update', async (req: Request<void, any, UserInfo>, res) => {
  const body = req.body;
  const user = await User.getByID(getDB(), body.userID);
  if (!user) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .send({ message: `User ID ${body.userID} not found` });
  }
  user.firstName = body.firstName;
  user.lastName = body.lastName;
  user.email = body.email;
  user.affiliation = body.affiliation;
  user.permissions = body.permissions;
  await user.save(getDB());
  Session.refreshUserInfo(user);
  return res.status(StatusCodes.NO_CONTENT).send();
});

router.post('/drop', async (req: Request<void, any, { userID: number }>, res) => {
  const userID = req.body.userID;
  if (req.session.userInfo!.userID == userID) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .send({ message: `Can't delete yourself` });
  }
  await User.dropByID(getDB(), userID);
  return res.status(StatusCodes.NO_CONTENT).send();
});
