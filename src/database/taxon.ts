/**
 * Class Taxon represents a taxon of the database taxa table and
 * provides access to the table. The purpose of this table is to
 * provide easy-access to the taxonomic hierarchy.
 */

import type { Client } from 'pg';

import type { DataOf } from '../util/type_util';
import { pgQuery, toCamelRow } from '../util/pg_util';

export type TaxonData = DataOf<Taxon>;

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

const orderedRanks = [
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
  parentNameSeries: string | null;
}

export class Taxon {
  taxonID = 0;
  taxonRank: TaxonRank;
  taxonName: string;
  scientificName: string | null; // null => not retrieved from GBIF
  parentID: number | null;
  parentIDSeries: string | null;
  parentNameSeries: string | null;

  //// CONSTRUCTION //////////////////////////////////////////////////////////

  constructor(row: TaxonData) {
    this.taxonID = row.taxonID;
    this.taxonRank = row.taxonRank;
    this.taxonName = row.taxonName;
    this.scientificName = row.scientificName;
    this.parentID = row.parentID;
    this.parentIDSeries = row.parentIDSeries;
    this.parentNameSeries = row.parentNameSeries;
  }

  //// PUBLIC INSTANCE METHODS ///////////////////////////////////////////////

  async save(db: Client): Promise<number> {
    if (this.taxonID === 0) {
      const result = await pgQuery(
        db,
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
      const result = await pgQuery(
        db,
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

  static async create(
    db: Client,
    parentNameSeries: string | null,
    parentIDSeries: string | null,
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

  static async getByID(db: Client, taxonID: number): Promise<Taxon | null> {
    const result = await pgQuery(db, `select * from taxa where taxon_id=$1`, [taxonID]);
    return result.rows.length > 0 ? new Taxon(toCamelRow(result.rows[0])) : null;
  }

  static async getOrCreate(db: Client, source: TaxonSource): Promise<Taxon> {
    // Return the taxon if it already exists.

    const [parentTaxa, taxonName] = Taxon._parseTaxonSpec(source);
    let taxon = await Taxon._getByNameSeries(db, parentTaxa.join('|'), taxonName);
    if (taxon) return taxon;

    // If the taxon doesn't exist yet, create specs for it and all its
    // ancestor taxa, highest ancestor taxon first.

    const specs: TaxonSpec[] = [];
    let parentNameSeries: string | null = null;
    for (let i = 0; i < parentTaxa.length; ++i) {
      const ancestorName = parentTaxa[i];
      specs.push({
        taxonRank: orderedRanks[i],
        taxonName: ancestorName,
        scientificName: null,
        parentNameSeries
      });
      if (parentNameSeries == null) {
        parentNameSeries = ancestorName; // necessarily kingdom
      } else {
        parentNameSeries += '|' + ancestorName;
      }
    }
    specs.push({
      taxonRank: orderedRanks[parentTaxa.length],
      taxonName,
      scientificName: source.scientificName,
      parentNameSeries
    });

    // Create all implied taxa.

    return await Taxon._createMissingTaxa(db, specs);
  }

  //// PRIVATE CLASS METHDOS /////////////////////////////////////////////////

  private static async _createMissingTaxa(
    db: Client,
    specs: TaxonSpec[]
  ): Promise<Taxon> {
    let [taxon, taxonIndex] = await Taxon._getClosestTaxon(
      db,
      specs,
      specs.length - 1 // nearest to the last specified taxon
    );
    let parentIDSeries = taxon?.parentIDSeries || null;
    while (++taxonIndex < specs.length) {
      if (taxon) {
        if (parentIDSeries == null) {
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
    db: Client,
    parentNameSeries: string | null,
    taxonName: string
  ): Promise<Taxon | null> {
    const result = await pgQuery(
      db,
      `select * from taxa where parent_name_series=$1 and taxon_name=$2`,
      [parentNameSeries, taxonName]
    );
    return result.rows.length > 0 ? new Taxon(toCamelRow(result.rows[0])) : null;
  }

  private static async _getClosestTaxon(
    db: Client,
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
    const parentTaxa: string[] = [source.kingdom];
    if (source.phylum) parentTaxa.push(source.phylum);
    if (source.class) parentTaxa.push(source.class);
    if (source.order) parentTaxa.push(source.order);
    if (source.family) parentTaxa.push(source.family);
    if (source.genus) parentTaxa.push(source.genus);
    if (source.specificEpithet) parentTaxa.push(source.specificEpithet);
    if (source.infraspecificEpithet) parentTaxa.push(source.infraspecificEpithet);
    const taxonName = parentTaxa.pop();
    return [parentTaxa, taxonName!];
  }
}
