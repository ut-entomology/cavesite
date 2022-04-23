import { Router, type Request } from 'express';
import { StatusCodes } from 'http-status-codes';
import sgMail from '@sendgrid/mail';

import { getDB } from '../integrations/postgres';
import { User } from '../model/user';
import { Session } from '../model/session';
import type { AppInfo, LoginInfo, PasswordChangeInfo } from '../../shared/user_auth';

type LoginParams = {
  email: string;
  password: string;
};

export const router = Router();

router.post('/connect', async (req, res) => {
  if (req.session && req.session.userInfo) {
    return res.status(StatusCodes.OK).send(getLoginInfo(req.session));
  }
  return res.status(StatusCodes.OK).send(getAppInfo());
});

router.post('/login', async (req: Request<void, any, LoginParams>, res) => {
  const body = req.body;
  if (!body.email || !body.password) {
    return res.status(StatusCodes.BAD_REQUEST).send();
  }
  const user = await User.authenticate(getDB(), body.email, body.password, req.ip);
  if (!user) {
    return res.status(StatusCodes.UNAUTHORIZED).send();
  }
  const session = await Session.create(getDB(), user, req.ip);
  req.setSession(session);
  return res.status(StatusCodes.OK).send(getLoginInfo(session));
});

router.get('/logout', async (req, res) => {
  const session = req.session;
  if (session) {
    req.setSession(null);
    await Session.dropID(getDB(), session.sessionID);
  }
  return res.status(StatusCodes.NO_CONTENT).send();
});

router.post('/refresh', async (req, res) => {
  if (!req.session) {
    return res.status(StatusCodes.UNAUTHORIZED).send();
  }
  const expiration = await Session.refreshSession(getDB(), req.session.sessionID);
  if (!expiration) {
    return res.status(StatusCodes.UNAUTHORIZED).send();
  }
  req.setSession(req.session);
  return res.status(StatusCodes.OK).send({ expiration: expiration.getTime() });
});

router.post('/request-reset', async (req, res) => {
  const body = req.body;
  if (!body.email) {
    return res.status(StatusCodes.BAD_REQUEST).send();
  }
  const user = await User.getByEmail(getDB(), body.email);
  if (!user) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .send({ message: `Email address not found` });
  }
  const resetCode = await user.generateResetCode(getDB());
  await sgMail.send({
    to: user.email,
    from: process.env.CAVESITE_SENDER_EMAIL!,
    subject: `Your password reset request`,
    text: `Hello ${user.firstName}!

A request was made to reset your ${process.env.CAVESITE_TITLE} password.

If this was not you, ignore this email to leave the password unchanged.

If you want to reset your password, click on the following link:

${process.env.CAVESITE_BASE_URL}/reset?email=${encodeURI(user.email)}&code=${resetCode}`
  });
  return res.status(StatusCodes.NO_CONTENT).send();
});

router.post('/change-password', async (req, res) => {
  const body = req.body as PasswordChangeInfo;
  if (!body.resetCode || !body.email || !body.password) {
    return res.status(StatusCodes.BAD_REQUEST).send();
  }
  const user = await User.getByEmail(getDB(), body.email);
  if (!user) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .send({ message: `Email address not found` });
  }
  if (!(await user.changePassword(getDB(), body.resetCode, body.password))) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .send({ message: `Reset request has expired` });
  }
  const sessionID = req.session ? req.session.sessionID : null;
  await Session.dropUser(getDB(), user.userID, sessionID);
  return res.status(StatusCodes.NO_CONTENT).send();
});

let appInfo: AppInfo;
function getAppInfo() {
  if (!appInfo) {
    appInfo = {
      appTitle: process.env.CAVESITE_TITLE!,
      appSubtitle: process.env.CAVESITE_SUBTITLE!
    };
  }
  return appInfo;
}

function getLoginInfo(session: Session): LoginInfo {
  return Object.assign(
    {
      userInfo: session.userInfo,
      expiration: session.expiresAt.getTime()
    },
    getAppInfo()
  );
}
