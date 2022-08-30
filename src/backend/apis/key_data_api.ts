/**
 * This module provides the web API for storing and retrieving named datasets.
 */

import { Router, type Request } from 'express';
import { StatusCodes } from 'http-status-codes';

import { getDB } from '../integrations/postgres';
import { KeyData } from '../model/key_data';
import {
  checkBoolean,
  checkIntegerList,
  checkInteger,
  checkString,
  checkPermissions
} from '../util/http_util';
import { Permission } from '../../shared/user_auth';
import { DataKey, type ImportSchedule, keyDataInfoByKey } from '../../shared/data_keys';
import { setSiteTitles, setWelcomeHTML } from '../lib/site_info';
import { aquaticKarstData, terrestrialKarstData } from '../lib/karst_localities';

export const router = Router();

const MAX_DATA_BYTES = 8000;

router.post('/pull', async (req: Request, res) => {
  const loginUserID = req.session ? req.session!.userID : null;
  const permissions = req.session ? req.session.userInfo.permissions : Permission.None;

  const mine: boolean = req.body.mine;
  const key: string = req.body.key;

  if (
    !checkInteger(loginUserID, true) ||
    !checkBoolean(mine, false) ||
    !checkString(key, false) ||
    !Object.values(DataKey).includes(key as any)
  ) {
    return res.status(StatusCodes.BAD_REQUEST).send();
  }
  const value = await KeyData.read(
    getDB(),
    mine ? loginUserID : null,
    permissions, // the function checks the permissions
    key
  );
  return res.status(StatusCodes.OK).send({ value });
});

router.post('/save', async (req: Request, res) => {
  // Require admin permission until supports saving per-user data.
  if (!checkPermissions(req.session, Permission.Admin)) {
    return res.status(StatusCodes.FORBIDDEN).send();
  }
  const loginUserID = req.session!.userID;

  const mine: boolean = req.body.mine;
  const key: DataKey = req.body.key;
  const data: string = req.body.data;
  if (
    !checkInteger(loginUserID, true) ||
    !checkBoolean(mine) ||
    !checkString(key, false) ||
    !checkString(data, false) ||
    data.length > MAX_DATA_BYTES
  ) {
    return res.status(StatusCodes.BAD_REQUEST).send();
  }

  const dataKeyInfo = keyDataInfoByKey[key];
  if (dataKeyInfo.getErrors && dataKeyInfo.getErrors(data).length > 0) {
    return res.status(StatusCodes.BAD_REQUEST).send();
  }

  await KeyData.write(
    getDB(),
    mine ? loginUserID : null,
    key,
    dataKeyInfo.readPermission,
    data
  );
  switch (key) {
    case DataKey.SiteTitleAndSubtitle:
      // A bit of a hack, but keeps things simple.
      setSiteTitles(data);
      break;
    case DataKey.WelcomePage:
      setWelcomeHTML(data);
      break;
    case DataKey.AquaticKarstTerms:
    case DataKey.AquaticKarstLocalities:
      aquaticKarstData.reset();
      break;
    case DataKey.TerrestrialKarstTerms:
    case DataKey.TerrestrialKarstLocalities:
      terrestrialKarstData.reset();
      break;
  }

  return res.status(StatusCodes.OK).send();
});

router.post('/set_schedule', async (req: Request, res) => {
  if (!checkPermissions(req.session, Permission.Admin)) {
    return res.status(StatusCodes.FORBIDDEN).send();
  }

  const schedule: ImportSchedule | null = req.body.schedule;
  let data = '';
  if (schedule) {
    if (
      !checkIntegerList(schedule.importDaysOfWeek, false) ||
      !checkInteger(schedule.importHourOfDay, false) ||
      schedule.importHourOfDay < 0 ||
      schedule.importHourOfDay > 23
    ) {
      return res.status(StatusCodes.BAD_REQUEST).send();
    }
    for (const dayOfWeek of schedule.importDaysOfWeek) {
      if (dayOfWeek < 0 || dayOfWeek > 6) {
        return res.status(StatusCodes.BAD_REQUEST).send();
      }
    }
    data = JSON.stringify(schedule);
  }

  await KeyData.write(getDB(), null, DataKey.ImportSchedule, Permission.Admin, data);
  return res.status(StatusCodes.OK).send();
});
