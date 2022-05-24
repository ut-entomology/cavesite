import { Router, type Request } from 'express';
import { StatusCodes } from 'http-status-codes';

import { getDB } from '../integrations/postgres';
import { LocationEffort } from '../sampling/location_effort';
import type { EffortResult } from '../../shared/model';
import { INTEGER_LIST_JSON_REGEX } from '../util/http_util';

export const router = Router();

router.post('/get_effort', async (req: Request, res) => {
  const locationIDsString = req.body.locationIDs;
  if (!INTEGER_LIST_JSON_REGEX.test(locationIDsString)) {
    return res.status(StatusCodes.BAD_REQUEST).send();
  }
  const efforts = await LocationEffort.getByLocationIDs(
    getDB(),
    JSON.parse(locationIDsString)
  );
  return res
    .status(StatusCodes.OK)
    .send({ efforts: efforts.map((effort) => _toEffortResult(effort)) });
});

function _toEffortResult(effort: LocationEffort): EffortResult {
  return {
    locationID: effort.locationID,
    startDate: effort.startDate,
    endDate: effort.endDate,
    perVisitPoints: effort.perVisitPoints,
    perPersonVisitPoints: effort.perPersonVisitPoints
  };
}
