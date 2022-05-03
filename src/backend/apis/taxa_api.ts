import { Router, type Request } from 'express';
import { StatusCodes } from 'http-status-codes';

import { getDB } from '../integrations/postgres';
import { Taxon } from '../model/taxon';
import { TaxonInfo } from '../../shared/client_model';

export const router = Router();

router.post('/get_children', async (req: Request<void, any, string>, res) => {
  const taxaName = req.body;
  if (typeof taxaName != 'string' || taxaName.length > 100) {
    return res.status(StatusCodes.BAD_REQUEST).send();
  }
  const taxa = await Taxon.getChildrenOf(getDB(), taxaName);
  return res.status(StatusCodes.OK).send(taxa.map((t) => _toTaxonInfo(t)));
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
  const taxa = await Taxon.getByUniqueName(getDB(), taxaNames);
  return res.status(StatusCodes.OK).send(taxa.map((t) => _toTaxonInfo(t)));
});

function _toTaxonInfo(taxon: Taxon): TaxonInfo {
  return {
    rank: taxon.taxonRank,
    name: taxon.taxonName,
    unique: taxon.uniqueName,
    author: taxon.author,
    ancestors: taxon.parentNameSeries
  };
}
