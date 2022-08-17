/**
 * This module provides the web API for retrieving server logs.
 */

import { Router, type Request } from 'express';
import { StatusCodes } from 'http-status-codes';

import { getDB } from '../integrations/postgres';
import { checkInteger } from '../util/http_util';
import { Logs } from '../model/logs';
import { type Log } from '../../shared/model';

export const router = Router();

const MAX_BATCH_SIZE = 500;

router.post('/pull_logs', async (req: Request, res) => {
  const skip: number = req.body.skip;
  const limit: number = req.body.limit;
  if (
    !checkInteger(skip) ||
    !checkInteger(limit) ||
    limit < 1 ||
    limit > MAX_BATCH_SIZE
  ) {
    return res.status(StatusCodes.BAD_REQUEST).send();
  }

  const logs: Log[] = await Logs.getLogs(getDB(), skip, limit);
  const totalLogs = await Logs.getTotalLogs(getDB());
  return res.status(StatusCodes.OK).send({ totalLogs, logs });
});

router.post('/pull_total', async (_req: Request, res) => {
  const totalLogs = await Logs.getTotalLogs(getDB());
  return res.status(StatusCodes.OK).send({ totalLogs });
});

router.post('/delete', async (req: Request, res) => {
  const throughUnixTime = req.body.throughUnixTime;
  if (!checkInteger(throughUnixTime)) {
    return res.status(StatusCodes.BAD_REQUEST).send();
  }

  await Logs.clear(getDB(), new Date(throughUnixTime));
  return res.status(StatusCodes.OK).send();
});
