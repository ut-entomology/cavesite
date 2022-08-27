/**
 * Class Taxon represents a taxon of the database taxa table and
 * provides access to the table. The purpose of this table is to
 * provide easy-access to the taxonomic hierarchy.
 */

// NOTE: There are similarities between this module and location.ts,
// so any correction made here should be investigated in location.ts.
// Not enough similarity to base both on a generic class, though.

import type { DataOf } from '../../shared/data_of';
import { type DB, toCamelRow } from '../integrations/postgres';
import {
  TaxonRank,
  TaxonSpec,
  createContainingTaxonSpecs,
  CAVE_OBLIGATE_FLAG,
  FEDERALLY_LISTED_FLAG
} from '../../shared/model';
import { parseFederalSpeciesStatus, TexasSpeciesStatus } from '../../shared/data_keys';
import { getCaveObligatesMap } from '../lib/cave_obligates';
import { ImportFailure } from './import_failure';
import { KeyData } from './key_data';
import { DataKey, parseStateSpeciesStatus } from '../../shared/data_keys';
import { Permission } from '../../shared/user_auth';

const childCountSql = `(select count(*) from taxa y where y.parent_id=x.taxon_id) as child_count`;
let federallyListedSpecies: Record<string, boolean> | null = null;
let texasStatusBySpecies: Record<string, TexasSpeciesStatus> | null = null;

export interface TaxonSource {
  // GBIF field names
  kingdom: string;
  phylum?: string;
  class?: string;
  order?: string;
  family?: string;
  genus?: string;
  specificEpithet?: string;
  infraspecificEpithet?: string;
  scientificName: string;
}

export type TaxonData = DataOf<Taxon>;

export class Taxon {
  taxonID = 0;
  taxonRank: TaxonRank;
  taxonName: string;
  uniqueName: string;
  author: string | null; // null => not retrieved from GBIF
  stateRank: string | null;
  tpwdStatus: string | null;
  flags: number;
  parentID: number | null;
  parentIDPath: string;
  parentNamePath: string;
  hasChildren: boolean | null; // null => unknown; not a DB column

  //// CONSTRUCTION //////////////////////////////////////////////////////////

  private constructor(data: TaxonData) {
    this.taxonID = data.taxonID;
    this.taxonRank = data.taxonRank;
    this.taxonName = data.taxonName;
    this.uniqueName = data.uniqueName;
    this.author = data.author;
    this.stateRank = data.stateRank;
    this.tpwdStatus = data.tpwdStatus;
    this.flags = data.flags;
    this.parentID = data.parentID;
    this.parentIDPath = data.parentIDPath;
    this.parentNamePath = data.parentNamePath;
    this.hasChildren = data.hasChildren;
  }

  //// PUBLIC INSTANCE METHODS ///////////////////////////////////////////////

  async save(db: DB): Promise<number> {
    if (this.taxonID === 0) {
      const result = await db.query(
        `insert into taxa(
            taxon_rank, taxon_name, unique_name, author, state_rank, tpwd_status,
            flags, parent_id, parent_id_path, parent_name_path
          ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) returning taxon_id`,
        [
          this.taxonRank,
          this.taxonName,
          this.uniqueName,
          this.author,
          this.stateRank,
          this.tpwdStatus,
          this.flags,
          this.parentID,
          this.parentIDPath,
          this.parentNamePath
        ]
      );
      this.taxonID = result.rows[0].taxon_id;
    } else {
      const result = await db.query(
        `update taxa set
            taxon_rank=$1, taxon_name=$2, unique_name=$3, author=$4,
            state_rank=$5, tpwd_status=$6, flags=$7,
            parent_id=$8, parent_id_path=$9, parent_name_path=$10
          where taxon_id=$11`,
        [
          this.taxonRank,
          this.taxonName,
          this.uniqueName,
          this.author,
          this.stateRank,
          this.tpwdStatus,
          this.flags,
          this.parentID,
          this.parentIDPath,
          this.parentNamePath,
          this.taxonID
        ]
      );
      if (result.rowCount != 1) {
        throw Error(`Failed to update taxon ID ${this.taxonID}`);
      }
    }
    return this.taxonID;
  }

  //// PUBLIC CLASS METHODS //////////////////////////////////////////////////

  static async commit(db: DB): Promise<void> {
    await db.query('delete from taxa where committed=true');
    await db.query('update taxa set committed=true');
  }

  static async create(
    db: DB,
    parentNamePath: string,
    parentIDPath: string,
    data: Omit<TaxonData, 'taxonID' | 'parentIDPath' | 'parentNamePath'>
  ): Promise<Taxon> {
    const taxon = new Taxon(
      Object.assign(
        {
          taxonID: 0 /* DB will assign a value */,
          parentNamePath,
          parentIDPath
        },
        data
      )
    );
    await taxon.save(db);
    return taxon;
  }

  // for use in testing
  static async dropAll(db: DB) {
    await db.query('delete from taxa');
    await db.query('alter sequence taxa_taxon_id_seq restart');
  }

  static async getByID(db: DB, taxonID: number): Promise<Taxon | null> {
    const result = await db.query(`select * from taxa where taxon_id=$1`, [taxonID]);
    return result.rows.length > 0 ? new Taxon(_toTaxonData(result.rows[0])) : null;
  }

  static async getByUniqueNames(db: DB, names: string[]): Promise<Taxon[]> {
    const result = await db.query(
      `select *, ${childCountSql} from taxa x where unique_name=any ($1) and committed=true`,
      [
        // @ts-ignore
        names
      ]
    );
    return result.rows.map((row) => new Taxon(_toTaxonData(row)));
  }

  static async getChildrenOf(db: DB, parentUniqueNames: string[]): Promise<Taxon[][]> {
    const childrenPerParent: Taxon[][] = [];
    for (const uniqueName of parentUniqueNames) {
      const result = await db.query(
        `select x.*, ${childCountSql} from taxa x
          join taxa p on x.parent_id = p.taxon_id and
          p.unique_name=$1 and p.committed=true order by x.unique_name`,
        [uniqueName]
      );
      childrenPerParent.push(result.rows.map((row) => new Taxon(_toTaxonData(row))));
    }
    return childrenPerParent;
  }

  static async getOrCreate(
    db: DB,
    source: TaxonSource,
    problems: string[]
  ): Promise<Taxon> {
    const [containingNames, taxonRank] = Taxon._extractTaxa(source, problems);
    const taxonName = containingNames.pop()!;
    const parentNamePath = containingNames.join('|');

    // Return the taxon if it already exists.

    let taxon = await Taxon._getByNamePath(db, parentNamePath, taxonName);
    if (taxon) {
      // If the taxon was previously created by virtue of being implied,
      // it won't have been assign an author, so assign it now.
      if (!taxon.author) {
        const author = Taxon._extractAuthor(source.scientificName);
        if (author) {
          taxon.author = author;
          await taxon.save(db);
        }
      }
      return taxon;
    }

    // Create specs for the taxon and all of its containing taxa.

    const spec: TaxonSpec = {
      taxonID: 0,
      rank: taxonRank,
      name: taxonName,
      unique: '',
      author: Taxon._extractAuthor(source.scientificName),
      stateRank: null, // no taxon unique, so can't determine yet
      tpwdStatus: null, // no taxon unique, so can't determine yet
      flags: 0, // no taxon unique, so can't determine yet
      parentNamePath,
      hasChildren: null
    };
    const specs = createContainingTaxonSpecs(spec);
    specs.push(spec);

    // Create all implied taxa.

    return await Taxon._createMissingTaxa(db, specs);
  }

  static async matchName(
    db: DB,
    partialName: string,
    maxMatches: number
  ): Promise<Taxon[]> {
    const result = await db.query(
      `select * from taxa where unique_name ilike $1 and committed=true
        order by taxon_name limit $2`,
      [`%${partialName}%`, maxMatches]
    );
    return result.rows.map((row) => new Taxon(_toTaxonData(row)));
  }

  //// PRIVATE CLASS METHDOS /////////////////////////////////////////////////

  private static async _createMissingTaxa(db: DB, specs: TaxonSpec[]): Promise<Taxon> {
    const caveObligatesMap = await getCaveObligatesMap(db);

    let [taxon, taxonIndex] = await Taxon._getClosestTaxon(
      db,
      specs,
      specs.length - 1 // nearest to the last specified taxon
    );
    let parentIDPath = taxon?.parentIDPath || '';
    while (++taxonIndex < specs.length) {
      if (taxon) {
        if (parentIDPath != '') parentIDPath += ',';
        parentIDPath += taxon.taxonID.toString();
      }
      const spec = specs[taxonIndex];
      let flags = 0;
      if (
        (taxon && taxon.flags & CAVE_OBLIGATE_FLAG) ||
        caveObligatesMap[spec.unique]
      ) {
        flags |= CAVE_OBLIGATE_FLAG;
      }
      if (await Taxon._isFederallyListed(db, spec)) {
        flags |= FEDERALLY_LISTED_FLAG;
      }
      const texasStatus = await Taxon._getSpeciesStatus(db, spec);

      taxon = await Taxon.create(db, spec.parentNamePath, parentIDPath, {
        taxonRank: spec.rank,
        taxonName: spec.name,
        uniqueName: spec.unique,
        author: spec.author,
        stateRank: texasStatus?.stateRank || null,
        tpwdStatus: texasStatus?.tpwdStatus || null,
        flags,
        parentID: taxon?.taxonID || null,
        hasChildren: spec.hasChildren || null
      });
    }
    return taxon!;
  }

  private static async _getByNamePath(
    db: DB,
    parentNamePath: string,
    taxonName: string
  ): Promise<Taxon | null> {
    const result = await db.query(
      `select * from taxa where parent_name_path=$1 and taxon_name=$2
        and committed=false`,
      [parentNamePath, taxonName]
    );
    return result.rows.length > 0 ? new Taxon(_toTaxonData(result.rows[0])) : null;
  }

  private static async _getClosestTaxon(
    db: DB,
    specs: TaxonSpec[],
    specIndex: number
  ): Promise<[Taxon | null, number]> {
    const spec = specs[specIndex];
    const taxon = await Taxon._getByNamePath(db, spec.parentNamePath, spec.name);
    if (taxon) {
      return [taxon, specIndex];
    }
    if (specIndex == 0) {
      return [null, -1];
    }
    return Taxon._getClosestTaxon(db, specs, specIndex - 1);
  }

  private static _extractAuthor(scientificName: string | null): string | null {
    if (scientificName) {
      if (scientificName.indexOf('n. sp') >= 0) return null;
      const matches = scientificName.match(/.[^(A-Z]+(.*)$/);
      if (matches) {
        return matches[1] == '' ? null : matches[1];
      }
    }
    return null;
  }

  private static _extractTaxa(
    source: TaxonSource,
    problems: string[]
  ): [string[], TaxonRank] {
    if (!source.kingdom) {
      source.kingdom = 'Animalia';
      problems.push(`Kingdom not given; assumed ${source.kingdom}`);
    }

    let taxonRank = TaxonRank.Kingdom;
    const taxonNames: string[] = [source.kingdom];

    if (source.phylum) {
      taxonRank = TaxonRank.Phylum;
      taxonNames.push(source.phylum);
    }
    if (source.class) {
      if (!source.phylum) {
        source.phylum = _toPatchedTaxon('Phylum', source.class);
        problems.push(`Class given without phylum; assumed ${source.phylum}`);
      }
      taxonRank = TaxonRank.Class;
      taxonNames.push(source.class);
    }
    if (source.order) {
      if (!source.class) {
        source.class = _toPatchedTaxon('Class', source.order);
        problems.push(`Order given without class; assumed ${source.class}`);
      }
      taxonRank = TaxonRank.Order;
      taxonNames.push(source.order);
    }
    if (source.family) {
      if (!source.order) {
        source.order = _toPatchedTaxon('Order', source.family);
        problems.push(`Family given without order; assumed ${source.order}`);
      }
      taxonRank = TaxonRank.Family;
      taxonNames.push(source.family);
    }
    if (source.genus) {
      if (!source.family) {
        source.family = _toPatchedTaxon('Family', source.genus);
        problems.push(`Genus given without family; assumed ${source.family}`);
      }
      taxonRank = TaxonRank.Genus;
      let genus = source.genus;
      taxonNames.push(genus);
    }
    if (source.specificEpithet) {
      if (!source.genus)
        throw new ImportFailure('Specific epithet given without genus');
      taxonRank = TaxonRank.Species;
      taxonNames.push(source.specificEpithet);
    }
    if (source.infraspecificEpithet) {
      if (!source.specificEpithet)
        throw new ImportFailure('Infraspecific epithet given without specific epithet');
      taxonRank = TaxonRank.Subspecies;
      taxonNames.push(source.infraspecificEpithet);
    }
    if (!source.scientificName) throw new ImportFailure('Scientific name not given');
    return [taxonNames, taxonRank];
  }

  private static async _getSpeciesStatus(
    db: DB,
    spec: TaxonSpec
  ): Promise<TexasSpeciesStatus | null> {
    if (spec.rank != TaxonRank.Species && spec.rank != TaxonRank.Subspecies) {
      return null;
    }

    if (texasStatusBySpecies === null) {
      const text = await KeyData.read(
        db,
        null,
        Permission.None,
        DataKey.TexasSpeciesStatus
      );
      if (text === null) return null;
      texasStatusBySpecies = {};
      const speciesStatuses = parseStateSpeciesStatus(text);
      for (const speciesStatus of speciesStatuses) {
        texasStatusBySpecies[speciesStatus.species] = speciesStatus;
      }
    }
    return texasStatusBySpecies[spec.unique];
  }

  private static async _isFederallyListed(db: DB, spec: TaxonSpec): Promise<boolean> {
    if (spec.rank != TaxonRank.Species && spec.rank != TaxonRank.Subspecies) {
      return false;
    }

    if (federallyListedSpecies === null) {
      const text = await KeyData.read(
        db,
        null,
        Permission.None,
        DataKey.FederalSpeciesStatus
      );
      if (text === null) return false;
      federallyListedSpecies = {};
      const speciesList = parseFederalSpeciesStatus(text);
      for (const species of speciesList) {
        federallyListedSpecies[species] = true;
      }
    }
    return federallyListedSpecies[spec.unique];
  }
}

function _toPatchedTaxon(missingTaxon: string, lowerTaxon: string): string {
  return `${missingTaxon}-of-${lowerTaxon}`;
}

function _toTaxonData(row: any): TaxonData {
  const childCount: number | null = row.child_count;
  if (childCount) delete row['child_count'];
  const data: any = toCamelRow(row);
  data.hasChildren = childCount ? childCount > 0 : null;
  return data;
}
