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
import {
  DataKey,
  type ImportSchedule,
  readPermissionsByKey,
  dataValidatorsByKey
} from '../../shared/data_keys';

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
  // @ts-ignore fact that not all keys are present in dataValidatorsByKey
  const validator = dataValidatorsByKey[key];
  if (validator && validator(data).length > 0) {
    return res.status(StatusCodes.BAD_REQUEST).send();
  }

  await KeyData.write(
    getDB(),
    mine ? loginUserID : null,
    key,
    readPermissionsByKey[key],
    data
  );
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
