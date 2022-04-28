/**
 * Class Taxon represents a taxon of the database taxa table and
 * provides access to the table. The purpose of this table is to
 * provide easy-access to the taxonomic hierarchy.
 */

// NOTE: There are similarities between this module and location.ts,
// so any correction made here should be investigated in location.ts.
// Not enough similarity to base both on a generic class, though.

import type { DataOf } from '../util/type_util';
import { type DB, toCamelRow } from '../integrations/postgres';
import { ImportFailure } from './import_failure';

export enum TaxonRank {
  Kingdom = 'kingdom',
  Phylum = 'phylum',
  Class = 'class',
  Order = 'order',
  Family = 'family',
  Genus = 'genus',
  Species = 'species',
  Subspecies = 'subspecies'
}

export const taxonRanks = [
  TaxonRank.Kingdom,
  TaxonRank.Phylum,
  TaxonRank.Class,
  TaxonRank.Order,
  TaxonRank.Family,
  TaxonRank.Genus,
  TaxonRank.Species,
  TaxonRank.Subspecies
];

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

interface TaxonSpec {
  taxonRank: TaxonRank;
  taxonName: string;
  scientificName: string | null; // null => not retrieved from GBIF
  parentNameSeries: string;
}

type TaxonData = DataOf<Taxon>;

export class Taxon {
  taxonID = 0;
  taxonRank: TaxonRank;
  taxonName: string;
  scientificName: string | null; // null => not retrieved from GBIF
  parentID: number | null;
  parentIDSeries: string;
  parentNameSeries: string;

  //// CONSTRUCTION //////////////////////////////////////////////////////////

  private constructor(data: TaxonData) {
    this.taxonID = data.taxonID;
    this.taxonRank = data.taxonRank;
    this.taxonName = data.taxonName;
    this.scientificName = data.scientificName;
    this.parentID = data.parentID;
    this.parentIDSeries = data.parentIDSeries;
    this.parentNameSeries = data.parentNameSeries;
  }

  //// PUBLIC INSTANCE METHODS ///////////////////////////////////////////////

  async save(db: DB): Promise<number> {
    if (this.taxonID === 0) {
      const result = await db.query(
        `insert into taxa(
            taxon_rank, taxon_name, scientific_name,
            parent_id, parent_id_series, parent_name_series
          ) values ($1, $2, $3, $4, $5, $6) returning taxon_id`,
        [
          this.taxonRank,
          this.taxonName,
          this.scientificName,
          this.parentID,
          this.parentIDSeries,
          this.parentNameSeries
        ]
      );
      this.taxonID = result.rows[0].taxon_id;
    } else {
      const result = await db.query(
        `update taxa set
            taxon_rank=$1, taxon_name=$2, scientific_name=$3,
            parent_id=$4, parent_id_series=$5, parent_name_series=$6
          where taxon_id=$7`,
        [
          this.taxonRank,
          this.taxonName,
          this.scientificName,
          this.parentID,
          this.parentIDSeries,
          this.parentNameSeries,
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
    parentNameSeries: string,
    parentIDSeries: string,
    data: Omit<TaxonData, 'taxonID' | 'parentIDSeries' | 'parentNameSeries'>
  ): Promise<Taxon> {
    const taxon = new Taxon(
      Object.assign(
        {
          taxonID: 0 /* DB will assign a value */,
          parentNameSeries,
          parentIDSeries
        },
        data
      )
    );
    await taxon.save(db);
    return taxon;
  }

  static async getByID(db: DB, taxonID: number): Promise<Taxon | null> {
    const result = await db.query(`select * from taxa where taxon_id=$1`, [taxonID]);
    return result.rows.length > 0 ? new Taxon(toCamelRow(result.rows[0])) : null;
  }

  static async getByName(db: DB, names: string[]): Promise<Taxon[]> {
    const result = await db.query(
      `select * from taxa where taxon_name=any ($1) or scientific_name=any ($1)`,
      [
        // @ts-ignore
        names
      ]
    );
    return result.rows.map((row) => new Taxon(toCamelRow(row)));
  }

  static async getOrCreate(db: DB, source: TaxonSource): Promise<Taxon> {
    // Return the taxon if it already exists.

    const [parentTaxa, taxonName] = Taxon._parseTaxonSpec(source);
    let taxon = await Taxon._getByNameSeries(db, parentTaxa.join('|'), taxonName);
    if (taxon) {
      // If the taxon was previously created by virtue of being implied,
      // it won't have a scientific name, so assign it now.
      if (!taxon.scientificName) {
        taxon.scientificName = source.scientificName;
        await taxon.save(db);
      }
      return taxon;
    }

    // If the taxon doesn't exist yet, create specs for all its ancestors.

    const specs: TaxonSpec[] = [];
    let parentNameSeries = '';
    for (let i = 0; i < parentTaxa.length; ++i) {
      const ancestorName = parentTaxa[i];
      specs.push({
        taxonRank: taxonRanks[i],
        taxonName: ancestorName,
        scientificName: null,
        parentNameSeries
      });
      if (parentNameSeries == '') {
        parentNameSeries = ancestorName; // necessarily kingdom
      } else {
        parentNameSeries += '|' + ancestorName;
      }
    }

    // Create a spec for the particular requested taxon.

    specs.push({
      taxonRank: taxonRanks[parentTaxa.length],
      taxonName,
      scientificName: source.scientificName,
      parentNameSeries
    });

    // Create all implied taxa.

    return await Taxon._createMissingTaxa(db, specs);
  }

  static async matchName(db: DB, partialName: string): Promise<Taxon[]> {
    const result = await db.query(
      `select * from taxa where taxon_name like $1 and committed=true
        order by taxon_name`,
      [`%${partialName}%`]
    );
    return result.rows.map((row) => toCamelRow(row));
  }

  //// PRIVATE CLASS METHDOS /////////////////////////////////////////////////

  private static async _createMissingTaxa(db: DB, specs: TaxonSpec[]): Promise<Taxon> {
    let [taxon, taxonIndex] = await Taxon._getClosestTaxon(
      db,
      specs,
      specs.length - 1 // nearest to the last specified taxon
    );
    let parentIDSeries = taxon?.parentIDSeries || '';
    while (++taxonIndex < specs.length) {
      if (taxon) {
        if (parentIDSeries == '') {
          parentIDSeries = taxon.taxonID.toString();
        } else {
          parentIDSeries += ',' + taxon.taxonID.toString();
        }
      }
      const spec = specs[taxonIndex];
      taxon = await Taxon.create(db, spec.parentNameSeries, parentIDSeries, {
        taxonRank: spec.taxonRank,
        taxonName: spec.taxonName,
        scientificName: spec.scientificName,
        parentID: taxon?.taxonID || null
      });
    }
    return taxon!;
  }

  private static async _getByNameSeries(
    db: DB,
    parentNameSeries: string,
    taxonName: string
  ): Promise<Taxon | null> {
    const result = await db.query(
      `select * from taxa where parent_name_series=$1 and taxon_name=$2
        and committed=false`,
      [parentNameSeries, taxonName]
    );
    return result.rows.length > 0 ? new Taxon(toCamelRow(result.rows[0])) : null;
  }

  private static async _getClosestTaxon(
    db: DB,
    specs: TaxonSpec[],
    specIndex: number
  ): Promise<[Taxon | null, number]> {
    const spec = specs[specIndex];
    const taxon = await Taxon._getByNameSeries(
      db,
      spec.parentNameSeries,
      spec.taxonName
    );
    if (taxon) {
      return [taxon, specIndex];
    }
    if (specIndex == 0) {
      return [null, -1];
    }
    return Taxon._getClosestTaxon(db, specs, specIndex - 1);
  }

  private static _parseTaxonSpec(source: TaxonSource): [string[], string] {
    if (!source.kingdom) throw new ImportFailure('Kingdom not given');
    const parentTaxa: string[] = [source.kingdom];
    if (source.phylum) {
      parentTaxa.push(source.phylum);
    }
    if (source.class) {
      if (!source.phylum) throw new ImportFailure('Class given without phylum');
      parentTaxa.push(source.class);
    }
    if (source.order) {
      if (!source.class) throw new ImportFailure('Order given without class');
      parentTaxa.push(source.order);
    }
    if (source.family) {
      if (!source.order) throw new ImportFailure('Family given without order');
      parentTaxa.push(source.family);
    }
    if (source.genus) {
      if (!source.family) throw new ImportFailure('Genus given without family');
      parentTaxa.push(source.genus);
    }
    if (source.specificEpithet) {
      if (!source.genus)
        throw new ImportFailure('Specific epithet given without genus');
      parentTaxa.push(source.specificEpithet);
    }
    if (source.infraspecificEpithet) {
      if (!source.specificEpithet)
        throw new ImportFailure('Infraspecific epithet given without specific epithet');
      parentTaxa.push(source.infraspecificEpithet);
    }
    if (!source.scientificName) throw new ImportFailure('Scientific name not given');
    const taxonName = parentTaxa.pop();
    return [parentTaxa, taxonName!];
  }
}
