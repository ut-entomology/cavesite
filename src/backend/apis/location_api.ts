/**
 * This module provides the web API for retrieving locations from the
 * database, as well as for retrieving per-location effort summary data.
 */

import { Router, type Request } from 'express';
import { StatusCodes } from 'http-status-codes';

import { getDB } from '../integrations/postgres';
import { checkIntegerList } from '../util/http_util';
import { Location } from '../model/location';
import { LocationEffort } from '../effort/location_effort';
import {
  type LocationSpec,
  type RawLocationEffort,
  ComparedFauna,
  checkComparedFauna
} from '../../shared/model';

export const router = Router();

router.post('/pull_effort', async (req: Request, res) => {
  const locationIDs: number[] = req.body.locationIDs;
  const comparedFauna: ComparedFauna = req.body.comparedFauna;
  if (!checkComparedFauna(comparedFauna) || !checkIntegerList(locationIDs)) {
    return res.status(StatusCodes.BAD_REQUEST).send();
  }
  const efforts = await LocationEffort.getByLocationIDs(
    getDB(),
    comparedFauna,
    locationIDs
  );
  return res
    .status(StatusCodes.OK)
    .send({ efforts: efforts.map((effort) => _toRawEffortData(effort)) });
});

export function toLocationSpec(location: Location): LocationSpec {
  return {
    locationID: location.locationID,
    rank: location.locationRank,
    name: location.locationName,
    unique: location.locationUnique,
    latitude: location.latitude,
    longitude: location.longitude,
    parentNamePath: location.parentNamePath,
    hasChildren: location.hasChildren
  };
}

function _toRawEffortData(effort: LocationEffort): RawLocationEffort {
  const visitsByTaxonUnique: Record<string, number> = {};
  _addTaxonGroup(visitsByTaxonUnique, effort, 'phylumNames', 'phylumVisits');
  _addTaxonGroup(visitsByTaxonUnique, effort, 'classNames', 'classVisits');
  _addTaxonGroup(visitsByTaxonUnique, effort, 'orderNames', 'orderVisits');
  _addTaxonGroup(visitsByTaxonUnique, effort, 'familyNames', 'familyVisits');
  _addTaxonGroup(visitsByTaxonUnique, effort, 'genusNames', 'genusVisits');
  _addTaxonGroup(visitsByTaxonUnique, effort, 'speciesNames', 'speciesVisits');
  _addTaxonGroup(visitsByTaxonUnique, effort, 'subspeciesNames', 'subspeciesVisits');

  return {
    locationID: effort.locationID,
    countyName: effort.countyName,
    localityName: effort.localityName,
    flags: effort.flags,
    perVisitPoints: effort.perVisitPoints,
    perPersonVisitPoints: effort.perPersonVisitPoints,
    visitsByTaxonUnique,
    recentTaxa: effort.recentTaxa
  };
}

function _addTaxonGroup(
  visitsByTaxonUnique: Record<string, number>,
  effort: LocationEffort,
  namesFieldName: string,
  visitsFieldName: string
): void {
  // @ts-ignore quick and dirty for now
  const namesStr = effort[namesFieldName];
  // @ts-ignore quick and dirty for now
  const visitsStr = effort[visitsFieldName];
  if (namesStr !== null) {
    const names = namesStr.split('|');
    const visits = visitsStr!.split(',');
    for (let i = 0; i < names.length; ++i) {
      visitsByTaxonUnique[names[i]] = parseInt(visits[i]);
    }
  }
}
