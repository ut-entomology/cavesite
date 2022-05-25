import { Router, type Request } from 'express';
import { StatusCodes } from 'http-status-codes';

import { getDB } from '../integrations/postgres';
import type { Location } from '../model/location';
import { LocationEffort } from '../sampling/location_effort';
import type { LocationSpec, EffortResult } from '../../shared/model';
//import { INTEGER_LIST_JSON_REGEX } from '../util/http_util';

export const router = Router();

router.post('/get_effort', async (req: Request, res) => {
  const locationIDs: number[] = req.body.locationIDs;
  // TODO: revisit validation
  // if (!INTEGER_LIST_JSON_REGEX.test(locationIDsString)) {
  //   return res.status(StatusCodes.BAD_REQUEST).send();
  // }
  const efforts = await LocationEffort.getByLocationIDs(getDB(), locationIDs);
  return res
    .status(StatusCodes.OK)
    .send({ efforts: efforts.map((effort) => _toEffortResult(effort)) });
});

export function toLocationSpec(location: Location): LocationSpec {
  return {
    locationID: location.locationID,
    rank: location.locationRank,
    name: location.locationName,
    guid: location.locationGuid,
    publicLatitude: location.publicLatitude,
    publicLongitude: location.publicLongitude,
    parentNamePath: location.parentNamePath
  };
}

function _toEffortResult(effort: LocationEffort): EffortResult {
  return {
    locationID: effort.locationID,
    startDate: effort.startDate,
    endDate: effort.endDate,
    perVisitPoints: effort.perVisitPoints,
    perPersonVisitPoints: effort.perPersonVisitPoints
  };
}
