import { Router, type Request } from 'express';
import { StatusCodes } from 'http-status-codes';

import { getDB } from '../integrations/postgres';
import { Taxon } from '../model/taxon';
import { TaxonSpec } from '../../shared/taxa';

export const router = Router();

router.post('/get_children', async (req: Request, res) => {
  const parentUniques = req.body.parentUniques;
  if (!Array.isArray(parentUniques) || parentUniques.length > 10) {
    return res.status(StatusCodes.BAD_REQUEST).send();
  }
  for (const parentUnique of parentUniques) {
    if (typeof parentUnique != 'string' || parentUnique.length > 100) {
      return res.status(StatusCodes.BAD_REQUEST).send();
    }
  }
  const taxa = await Taxon.getChildrenOf(getDB(), parentUniques);
  return res
    .status(StatusCodes.OK)
    .send({ taxonSpecs: taxa.map((ts) => ts.map((t) => _toTaxonInfo(t))) });
});

router.post('/get_list', async (req: Request, res) => {
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
    .send({ taxonSpecs: taxa.map((t) => _toTaxonInfo(t)) });
});

function _toTaxonInfo(taxon: Taxon): TaxonSpec {
  return {
    rank: taxon.taxonRank,
    name: taxon.taxonName,
    unique: taxon.uniqueName,
    author: taxon.author,
    containingNames: taxon.containingNames,
    hasChildren: taxon.hasChildren
  };
}
