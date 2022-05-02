import { Router, type Request } from 'express';
import { StatusCodes } from 'http-status-codes';

import { getDB } from '../integrations/postgres';
import { Taxon, TaxonData } from '../model/taxon';

export type TaxonInfo = TaxonData;

export const router = Router();

router.post('/get_children', async (req: Request<void, any, string>, res) => {
  const taxaName = req.body;
  if (typeof taxaName != 'string' || taxaName.length > 100) {
    return res.status(StatusCodes.BAD_REQUEST).send();
  }
  const taxa = await Taxon.getChildrenOf(getDB(), taxaName);
  return res.status(StatusCodes.OK).send(taxa as TaxonInfo[]);
});

router.post('/get_list', async (req: Request<void, any, string[]>, res) => {
  const taxaNames = req.body;
  if (!Array.isArray(taxaNames)) {
    return res.status(StatusCodes.BAD_REQUEST).send();
  }
  for (const name of taxaNames) {
    if (typeof name !== 'string' || name.length > 100) {
      return res.status(StatusCodes.BAD_REQUEST).send();
    }
  }
  const taxa = await Taxon.getByName(getDB(), taxaNames);
  return res.status(StatusCodes.OK).send(taxa as TaxonInfo[]);
});
