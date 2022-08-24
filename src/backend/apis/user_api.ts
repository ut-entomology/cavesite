/**
 * This module provides the web API for managing user login accounts.
 */

import { Router, type Request } from 'express';
import { StatusCodes } from 'http-status-codes';

import { getDB } from '../integrations/postgres';
import { Permission } from '../../shared/user_auth';
import { requirePermissions } from '../util/http_util';
import { User } from '../model/user';
import { AdminUserInfo, NewUserInfo } from '../../shared/user_auth';
import { Session } from '../model/session';
import { EmailType, sendEmail } from '../util/email_util';
import { checkInteger, checkString } from '../util/http_util';

export const router = Router();

const MAX_STR_LENGTH = 80;
const GENERATED_PASSWORD_LENGTH = 10; // characters
let PASSWORD_CHARSET = 'abcdefghijklmnopqrstuvwxyz';
PASSWORD_CHARSET += PASSWORD_CHARSET.toUpperCase() + '0123456789!?#$%&+*';

router.use(requirePermissions(Permission.Admin));

router.post('/add', async (req: Request<void, any, NewUserInfo>, res) => {
  const userInfo = req.body;
  const userID = req.session!.userID;
  if (!_checkNewUserInfo(userInfo) || !checkInteger(userID)) {
    return res.status(StatusCodes.BAD_REQUEST).send();
  }

  const password = User.generatePassword(PASSWORD_CHARSET, GENERATED_PASSWORD_LENGTH);
  const user = await User.create(
    getDB(),
    userInfo.firstName,
    userInfo.lastName,
    userInfo.email,
    userInfo.affiliation,
    password,
    userInfo.permissions,
    userID
  );
  await sendEmail(EmailType.NewAccount, user, { password });
  const loginUserInfo = req.session!.userInfo;
  const newUserInfo = user.toAdminUserInfo();
  newUserInfo.createdByName = loginUserInfo.firstName
    ? loginUserInfo.firstName + ' ' + loginUserInfo.lastName
    : loginUserInfo.lastName;
  return res.status(StatusCodes.OK).send(newUserInfo);
});

router.post('/drop', async (req: Request<void, any, { userID: number }>, res) => {
  const userID = req.body.userID;
  if (!checkInteger(userID)) {
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

router.post('/pull_all', async (_req: Request<void, any, void>, res) => {
  const users = await User.getUsers(getDB());
  const userData: AdminUserInfo[] = [];
  for (const user of users) {
    userData.push(user.toAdminUserInfo());
  }
  return res.status(StatusCodes.OK).send(userData);
});

router.post('/reset-password', async (req, res) => {
  const email: string = req.body.email;
  if (!email || req.session!.userInfo.email.toLowerCase() == email.toLowerCase()) {
    return res.status(StatusCodes.BAD_REQUEST).send();
  }
  const user = await User.getByEmail(getDB(), email);
  if (!user) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .send({ message: `Email address not found` });
  }
  const password = User.generatePassword(PASSWORD_CHARSET, GENERATED_PASSWORD_LENGTH);
  await user.resetPassword(getDB(), null, password);
  await Session.dropUser(getDB(), user.userID, null);
  // TBD: Change email
  await sendEmail(EmailType.PasswordReset, user, { password });
  return res.status(StatusCodes.NO_CONTENT).send();
});

router.post('/update', async (req: Request<void, any, NewUserInfo>, res) => {
  const userInfo = req.body;
  if (!checkInteger(userInfo.userID) || !_checkNewUserInfo(userInfo)) {
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

function _checkNewUserInfo(userInfo?: NewUserInfo): boolean {
  return (
    !!userInfo &&
    checkInteger(userInfo.permissions) &&
    checkString(userInfo.firstName) &&
    userInfo.firstName.length <= MAX_STR_LENGTH &&
    checkString(userInfo.lastName) &&
    userInfo.lastName.length <= MAX_STR_LENGTH &&
    checkString(userInfo.email) &&
    userInfo.email.length <= MAX_STR_LENGTH &&
    !!userInfo.affiliation &&
    checkString(userInfo.affiliation) &&
    userInfo.affiliation.length <= MAX_STR_LENGTH
  );
}
