import { Router, type Request } from 'express';
import { StatusCodes } from 'http-status-codes';
import sgMail from '@sendgrid/mail';

import { getDB } from '../integrations/postgres';
import { Permission } from '../../shared/user_auth';
import { requirePermissions } from '../util/http_util';
import { User } from '../model/user';
import { AdminUserInfo, NewUserInfo } from '../../shared/user_auth';
import { Session } from '../model/session';

export const router = Router();

const GENERATED_PASSWORD_LENGTH = 10; // characters

router.use(requirePermissions(Permission.Admin));

router.post('/add', async (req: Request<void, any, NewUserInfo>, res) => {
  const userInfo = req.body;
  if (
    !userInfo ||
    !userInfo.firstName ||
    !userInfo.lastName ||
    !userInfo.email ||
    !userInfo.permissions
  ) {
    return res.status(StatusCodes.BAD_REQUEST).send();
  }
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
  await sgMail.send({
    to: userInfo.email,
    from: process.env.CAVESITE_SENDER_EMAIL!,
    subject: `Your new ${process.env.CAVESITE_TITLE} account`,
    text: `Hello ${userInfo.firstName}!

    Here are your login credentials for ${process.env.CAVESITE_TITLE}:

    - email: ${userInfo.email}
    - password: ${password}

    Thank you for working on the conservation of cave invertebrates.

    ${process.env.CAVESITE_SENDER_EMAIL}`
  });
  return res.status(StatusCodes.OK).send(user.toAdminUserInfo());
});

router.post('/drop', async (req: Request<void, any, { userID: number }>, res) => {
  const userID = req.body.userID;
  if (!userID) {
    return res.status(StatusCodes.BAD_REQUEST).send();
  }
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
  const userInfo = req.body;
  if (
    !userInfo ||
    !userInfo.userID ||
    !userInfo.firstName ||
    !userInfo.lastName ||
    !userInfo.email ||
    !userInfo.permissions
  ) {
    return res.status(StatusCodes.BAD_REQUEST).send();
  }
  if (
    userInfo.userID == req.session!.userInfo.userID &&
    (userInfo.permissions & Permission.Admin) == 0
  ) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .send({ message: `You can't remove your own admin permission.` });
  }
  const user = await User.getByID(getDB(), userInfo.userID);
  if (!user) {
    return res.status(StatusCodes.BAD_REQUEST).send({ message: `User ID not found` });
  }
  user.firstName = userInfo.firstName;
  user.lastName = userInfo.lastName;
  user.email = userInfo.email;
  user.affiliation = userInfo.affiliation;
  user.permissions = userInfo.permissions;
  await user.save(getDB());
  Session.refreshUserInfo(user);
  return res.status(StatusCodes.OK).send(user.toAdminUserInfo());
});
