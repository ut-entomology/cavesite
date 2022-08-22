/**
 * This module provides the web API for retrieving information about taxa
 * stored in the database.
 */

import { Router, type Request } from 'express';
import { StatusCodes } from 'http-status-codes';

import { getDB } from '../integrations/postgres';
import { Taxon } from '../model/taxon';
import {
  TaxonSpec,
  MIN_LOOKUP_CHAR_LENGTH,
  MAX_LOOKUP_MATCHES
} from '../../shared/model';

export const router = Router();

router.post('/pull_children', async (req: Request, res) => {
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
    .send({ taxonSpecs: taxa.map((ts) => ts.map((t) => _toTaxonSpec(t))) });
});

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

router.post('/match_name', async (req: Request, res) => {
  const partialName = req.body.partialName;
  if (
    typeof partialName !== 'string' ||
    partialName.length < MIN_LOOKUP_CHAR_LENGTH ||
    partialName.length > 200
  ) {
    return res.status(StatusCodes.BAD_REQUEST).send();
  }
  const taxa = await Taxon.matchName(getDB(), partialName, MAX_LOOKUP_MATCHES);
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
    flags: taxon.flags,
    parentNamePath: taxon.parentNamePath,
    hasChildren: taxon.hasChildren
  };
}
