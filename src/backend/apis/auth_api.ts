/**
 * This module provides the web API for initially connecting to the server,
 * for logging users in and out, and for resetting passwords.
 */

import { Router, type Request } from 'express';
import { StatusCodes } from 'http-status-codes';

import { getDB } from '../integrations/postgres';
import { User, RESET_CODE_DURATION_MINS } from '../model/user';
import { Session } from '../model/session';
import type {
  AppInfo,
  LoginInfo,
  PasswordChangeInfo,
  PasswordResetInfo
} from '../../shared/user_auth';
import { toResetQueryStr } from '../../shared/user_auth';
import { sendEmail } from '../util/email_util';
import { DataKey } from '../../shared/data_keys';
import { ValidationError } from '../../shared/validation';
import { siteTitle, siteSubtitle, getWelcomeHTML } from '../lib/site_info';

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
  const ipAddress = req.header('X-Forwarded-For') || 'NO Forwarded HEADER';
  const user = await User.authenticate(getDB(), body.email, body.password, ipAddress);
  if (!user) {
    return res.status(StatusCodes.UNAUTHORIZED).send();
  }
  const session = await Session.create(getDB(), user, 'dummy' /*TBD*/);
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

router.post('/change-password', async (req, res) => {
  if (!req.session) {
    return res.status(StatusCodes.UNAUTHORIZED).send();
  }
  const body = req.body as PasswordChangeInfo;
  if (!body.oldPassword || !body.newPassword) {
    return res.status(StatusCodes.BAD_REQUEST).send();
  }
  const user = await User.getByID(getDB(), req.session.userID);
  if (!user) {
    return res.status(StatusCodes.BAD_REQUEST).send({ message: `User ID not found` });
  }
  if (!(await user.verifyPassword(body.oldPassword))) {
    return res.status(StatusCodes.UNAUTHORIZED).send();
  }
  try {
    await user.setPassword(body.newPassword);
    await user.save(getDB());
  } catch (err: any) {
    if (err instanceof ValidationError) {
      return res.status(StatusCodes.BAD_REQUEST).send({ message: err.message });
    }
  }
  const sessionID = req.session.sessionID;
  await Session.dropUser(getDB(), user.userID, sessionID);
  return res.status(StatusCodes.NO_CONTENT).send();
});

router.post('/request-reset', async (req, res) => {
  const body = req.body;
  if (!body.email) {
    return res.status(StatusCodes.BAD_REQUEST).send();
  }
  const user = await User.getByEmail(getDB(), body.email);
  if (!user) {
    return res.status(StatusCodes.NO_CONTENT).send();
  }
  const resetCode = await user.generateResetCode(getDB());
  await sendEmail(getDB(), DataKey.PasswordResetLinkEmail, user, {
    'reset-link': `${process.env.CAVESITE_BASE_URL}/${toResetQueryStr(
      user.email,
      resetCode
    )}`,
    'reset-link-minutes': RESET_CODE_DURATION_MINS
  });
  return res.status(StatusCodes.NO_CONTENT).send();
});

router.post('/reset-password', async (req, res) => {
  const body = req.body as PasswordResetInfo;
  if (!body.resetCode || !body.email || !body.password) {
    return res.status(StatusCodes.BAD_REQUEST).send();
  }
  const user = await User.getByEmail(getDB(), body.email);
  if (!user) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .send({ message: `Email address not found` });
  }
  if (!(await user.resetPassword(getDB(), body.resetCode, body.password))) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .send({ message: `Reset request has expired` });
  }
  const sessionID = req.session ? req.session.sessionID : null;
  await Session.dropUser(getDB(), user.userID, sessionID);
  return res.status(StatusCodes.NO_CONTENT).send();
});

let hiddenRoutes: string[] = [];
function getAppInfo(): AppInfo {
  if (hiddenRoutes.length == 0) {
    if (process.env.CAVESITE_HIDDEN_TABS) {
      const rawHiddenTabs = process.env.CAVESITE_HIDDEN_TABS.split(',');
      for (const hiddenTab of rawHiddenTabs) {
        hiddenRoutes.push('/' + hiddenTab.trim().toLowerCase());
      }
    }
  }
  return {
    appTitle: siteTitle,
    appSubtitle: siteSubtitle,
    welcomeHTML: getWelcomeHTML(),
    hiddenRoutes,
    mapToken: process.env.MAPBOX_ACCESS_TOKEN!
  };
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
