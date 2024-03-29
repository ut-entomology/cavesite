/**
 * This module provides the web API for retrieving information about
 * specimens from the database, including querying for specimens.
 */

import { Router, type Request } from 'express';
import { StatusCodes } from 'http-status-codes';

import { getDB } from '../integrations/postgres';
import {
  checkBoolean,
  checkInteger,
  checkIntegerList,
  checkString
} from '../util/http_util';
import { Specimen } from '../model/specimen';
import {
  columnInfoMap,
  type GeneralQuery,
  type QueryRow
} from '../../shared/general_query';

export const router = Router();

const MAX_BATCH_SIZE = 1000;

router.post('/query', async (req: Request, res) => {
  const query: GeneralQuery = req.body.query;
  const skip: number = req.body.skip;
  const limit: number = req.body.limit;

  if (!query || !Array.isArray(query.columnSpecs) || query.columnSpecs.length == 0) {
    return res.status(StatusCodes.BAD_REQUEST).send();
  }
  for (const columnSpec of query.columnSpecs) {
    if (
      !checkString(columnSpec.columnID, false) ||
      !columnInfoMap[columnSpec.columnID] ||
      !checkBoolean(columnSpec.ascending, true) ||
      !checkString(columnSpec.optionText, true)
    ) {
      return res.status(StatusCodes.BAD_REQUEST).send();
    }
  }
  if (query.dateFilter !== null) {
    if (
      !checkInteger(query.dateFilter.fromDateMillis, true) ||
      !checkInteger(query.dateFilter.throughDateMillis, true)
    ) {
      return res.status(StatusCodes.BAD_REQUEST).send();
    }
  }
  if (query.locationFilter !== null) {
    if (
      !checkIntegerList(query.locationFilter.countyIDs, true) ||
      !checkIntegerList(query.locationFilter.localityIDs, true)
    ) {
      return res.status(StatusCodes.BAD_REQUEST).send();
    }
  }
  if (query.taxonFilter !== null) {
    if (
      !checkIntegerList(query.taxonFilter.phylumIDs, true) ||
      !checkIntegerList(query.taxonFilter.classIDs, true) ||
      !checkIntegerList(query.taxonFilter.orderIDs, true) ||
      !checkIntegerList(query.taxonFilter.familyIDs, true) ||
      !checkIntegerList(query.taxonFilter.genusIDs, true) ||
      !checkIntegerList(query.taxonFilter.speciesIDs, true) ||
      !checkIntegerList(query.taxonFilter.subspeciesIDs, true)
    ) {
      return res.status(StatusCodes.BAD_REQUEST).send();
    }
  }
  if (
    !checkInteger(skip) ||
    !checkInteger(limit) ||
    limit < 1 ||
    limit > MAX_BATCH_SIZE
  ) {
    return res.status(StatusCodes.BAD_REQUEST).send();
  }

  const result: [QueryRow[], number | null] = await Specimen.generalQuery(
    getDB(),
    query.columnSpecs,
    query.dateFilter,
    query.locationFilter,
    query.taxonFilter,
    skip,
    limit
  );
  return res.status(StatusCodes.OK).send({ rows: result[0], totalRows: result[1] });
});
