import { type Request } from 'express';

import { getDB } from '../integrations/postgres';
import { Router } from 'express';
import { StatusCodes } from 'http-status-codes';

import { Permission } from '../../shared/user_auth';
import { requirePermissions } from '../util/http_util';
import { User } from '../model/user';
import { AdminUserInfo, NewUserInfo } from '../../shared/user_auth';
import { Session } from '../model/session';

export const router = Router();

const GENERATED_PASSWORD_LENGTH = 10; // characters

router.use(requirePermissions(Permission.Admin));

router.post('/add', async (req: Request<void, any, { user: NewUserInfo }>, res) => {
  const userInfo = req.body.user;
  const password = User.generatePassword(GENERATED_PASSWORD_LENGTH);
  const user = await User.create(
    getDB(),
    userInfo.firstName,
    userInfo.lastName,
    userInfo.email,
    userInfo.affiliation,
    password,
    userInfo.permissions,
    null
  );
  // TODO: email credentials
  return res.status(StatusCodes.OK).send(user.toAdminUserInfo());
});

router.post('/drop', async (req: Request<void, any, { userID: number }>, res) => {
  const userID = req.body.userID;
  if (userID == req.session!.userInfo.userID) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .send({ message: `You can't delete yourself.` });
  }
  await User.dropByID(getDB(), userID);
  return res.status(StatusCodes.NO_CONTENT).send();
});

router.post('/get_all', async (_req: Request<void, any, void>, res) => {
  const users = await User.getUsers(getDB());
  const userData: AdminUserInfo[] = [];
  for (const user of users) {
    userData.push(user.toAdminUserInfo());
  }
  return res.status(StatusCodes.OK).send(userData);
});

router.post('/update', async (req: Request<void, any, NewUserInfo>, res) => {
  const body = req.body;
  if (
    body.userID == req.session!.userInfo.userID &&
    (body.permissions & Permission.Admin) == 0
  ) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .send({ message: `You can't remove your own admin permission.` });
  }
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
  return res.status(StatusCodes.OK).send(user.toAdminUserInfo());
});
