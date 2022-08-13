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
import { IMPORT_SCHEDULE_KEY, type ImportSchedule } from '../../shared/data_keys';

export const router = Router();

// const MAX_DATA_BYTES = 8000;

router.post('/pull_data', async (req: Request, res) => {
  const loginUserID = req.session!.userID;
  const permissions = req.session ? req.session.userInfo.permissions : Permission.None;

  const mine: boolean = req.body.mine;
  const key: string = req.body.key;

  if (!checkBoolean(mine, false) || !checkString(key, false)) {
    return res.status(StatusCodes.BAD_REQUEST).send();
  }
  const data = await KeyData.read(
    getDB(),
    mine ? loginUserID : null,
    permissions, // the function checks the permissions
    key
  );
  return res.status(StatusCodes.OK).send({ data });
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

  await KeyData.write(getDB(), null, IMPORT_SCHEDULE_KEY, Permission.Admin, data);
  return res.status(StatusCodes.OK).send();
});
