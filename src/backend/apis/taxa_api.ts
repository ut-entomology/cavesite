/**
 * This module provides the web API for retrieving information about taxa
 * stored in the database.
 */

import { Router, type Request } from 'express';
import { StatusCodes } from 'http-status-codes';

import { getDB } from '../integrations/postgres';
import { Taxon } from '../model/taxon';
import { TaxonSpec } from '../../shared/model';

export const router = Router();

router.post('/pull_list', async (req: Request, res) => {
  const taxaNames = req.body.taxonUniques;
  if (!Array.isArray(taxaNames)) {
    return res.status(StatusCodes.BAD_REQUEST).send();
  }
  for (const name of taxaNames) {
    if (typeof name !== 'string' || name.length > 100) {
      return res.status(StatusCodes.BAD_REQUEST).send();
    }
  }
  const taxa = await Taxon.getByUniqueNames(getDB(), taxaNames);
  return res
    .status(StatusCodes.OK)
    .send({ taxonSpecs: taxa.map((t) => _toTaxonSpec(t)) });
});

function _toTaxonSpec(taxon: Taxon): TaxonSpec {
  return {
    taxonID: taxon.taxonID,
    rank: taxon.taxonRank,
    name: taxon.taxonName,
    unique: taxon.uniqueName,
    author: taxon.author,
    obligate: taxon.obligate,
    parentNamePath: taxon.parentNamePath,
    hasChildren: taxon.hasChildren
  };
}
