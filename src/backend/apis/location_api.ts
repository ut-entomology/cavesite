import { Router, type Request } from 'express';
import { StatusCodes } from 'http-status-codes';

import { getDB } from '../integrations/postgres';
import { checkIntegerList } from '../util/http_util';
import { Location } from '../model/location';
import { LocationEffort } from '../effort/location_effort';
import {
  type LocationSpec,
  type EffortResult,
  MIN_LOOKUP_CHAR_LENGTH
} from '../../shared/model';

const MAX_LOOKUP_MATCHES = 120;

export const router = Router();

router.post('/get_children', async (req: Request, res) => {
  const parentGUIDs = req.body.parentGUIDs;
  if (!Array.isArray(parentGUIDs) || parentGUIDs.length > 10) {
    return res.status(StatusCodes.BAD_REQUEST).send();
  }
  for (const parentGUID of parentGUIDs) {
    if (typeof parentGUID != 'string' || parentGUID.length > 100) {
      return res.status(StatusCodes.BAD_REQUEST).send();
    }
  }
  const locations = await Location.getChildrenOf(getDB(), parentGUIDs);
  return res.status(StatusCodes.OK).send({
    locationSpecs: locations.map((locs) => locs.map((loc) => toLocationSpec(loc)))
  });
});

router.post('/get_effort', async (req: Request, res) => {
  const locationIDs: number[] = req.body.locationIDs;
  if (!checkIntegerList(locationIDs)) {
    return res.status(StatusCodes.BAD_REQUEST).send();
  }
  const efforts = await LocationEffort.getByLocationIDs(getDB(), locationIDs);
  return res
    .status(StatusCodes.OK)
    .send({ efforts: efforts.map((effort) => _toEffortResult(effort)) });
});

router.post('/get_list', async (req: Request, res) => {
  const locationUniques = req.body.locationUniques;
  if (!Array.isArray(locationUniques)) {
    return res.status(StatusCodes.BAD_REQUEST).send();
  }
  for (const name of locationUniques) {
    if (typeof name !== 'string' || name.length > 100) {
      return res.status(StatusCodes.BAD_REQUEST).send();
    }
  }
  const locations = await Location.getByUniques(getDB(), locationUniques);
  return res
    .status(StatusCodes.OK)
    .send({ locationSpecs: locations.map((loc) => toLocationSpec(loc)) });
});

router.post('/match_name', async (req: Request, res) => {
  const partialName = req.body.partialName;
  if (
    typeof partialName !== 'string' ||
    partialName.length < MIN_LOOKUP_CHAR_LENGTH ||
    partialName.length > 200
  ) {
    return res.status(StatusCodes.BAD_REQUEST).send();
  }
  const locations = await Location.matchName(getDB(), partialName, MAX_LOOKUP_MATCHES);
  return res
    .status(StatusCodes.OK)
    .send({ locationSpecs: locations.map((loc) => toLocationSpec(loc)) });
});

export function toLocationSpec(location: Location): LocationSpec {
  return {
    locationID: location.locationID,
    rank: location.locationRank,
    name: location.locationName,
    unique: location.locationUnique,
    publicLatitude: location.publicLatitude,
    publicLongitude: location.publicLongitude,
    parentNamePath: location.parentNamePath,
    hasChildren: location.hasChildren
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
