import { Router, type Request } from 'express';
import { StatusCodes } from 'http-status-codes';

import { getDB } from '../integrations/postgres';
import { checkBoolean, checkInteger, checkIntegerList } from '../util/http_util';
import { Specimen } from '../model/specimen';
import {
  QueryColumnID,
  type GeneralQuery,
  type QueryRow
} from '../../shared/user_query';

export const router = Router();

router.post('/query', async (req: Request, res) => {
  const query: GeneralQuery = req.body.query;
  const skip: number = req.body.skip;
  const limit: number = req.body.limit;

  if (!query || !Array.isArray(query.columnSpecs) || query.columnSpecs.length == 0) {
    return res.status(StatusCodes.BAD_REQUEST).send();
  }
  for (const columnSpec of query.columnSpecs) {
    if (
      columnSpec.columnID < 0 ||
      columnSpec.columnID >= QueryColumnID._LENGTH ||
      !checkBoolean(columnSpec.ascending, true) ||
      !checkBoolean(columnSpec.nullValues, true)
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
  if (!checkInteger(skip) || !checkInteger(limit)) {
    return res.status(StatusCodes.BAD_REQUEST).send();
  }

  const result: [QueryRow[], number] = await Specimen.generalQuery(
    getDB(),
    query.columnSpecs,
    query.taxonFilter,
    skip,
    limit
  );
  return res.status(StatusCodes.OK).send({ rows: result[0], totalRows: result[1] });
});
