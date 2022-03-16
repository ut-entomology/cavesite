import type { Client } from 'pg';

import type { DataOf } from '../util/type_util';
import { toCamelRow } from '../util/db_util';

export interface TaxonomicPath {
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

export type TaxonData = DataOf<Taxon>;

interface AncestorInfo {
  rank: TaxonRank;
  name: string;
  uniqueName: string;
  scientificName: string | null; // null => not retrieved from GBIF
}

export class Taxon {
  taxonID = 0;
  taxonRank: TaxonRank;
  taxonName: string;
  authorlessUniqueName: string;
  scientificName: string | null; // null => not retrieved from GBIF
  parentID: number | null;

  //// CONSTRUCTION //////////////////////////////////////////////////////////

  constructor(row: TaxonData) {
    this.taxonID = row.taxonID;
    this.taxonRank = row.taxonRank;
    this.taxonName = row.taxonName;
    this.authorlessUniqueName = row.authorlessUniqueName;
    this.scientificName = row.scientificName;
    this.parentID = row.parentID;
  }

  async save(db: Client): Promise<number> {
    if (this.taxonID === 0) {
      const result = await db.query(
        `insert into taxa(
            taxon_name, authorless_unique_name, scientific_name, taxon_rank, parent_id
          ) values ($1, $2, $3, $4, $5) returning taxon_id`,
        [
          this.taxonName,
          this.authorlessUniqueName,
          this.scientificName,
          this.taxonRank,
          this.parentID
        ]
      );
      this.taxonID = result.rows[0].taxon_id;
    } else {
      const result = await db.query(
        `update taxa set taxon_name=$1, authorless_unique_name=$2, scientific_name=$3,
          taxon_rank=$4, parent_id=$5 where taxon_id=$6`,
        [
          this.taxonName,
          this.authorlessUniqueName,
          this.scientificName,
          this.taxonRank,
          this.parentID,
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
    uniqueName: string,
    data: Omit<TaxonData, 'taxonID' | 'authorlessUniqueName'>
  ): Promise<Taxon> {
    const taxon = new Taxon(
      Object.assign(
        {
          taxonID: 0 /* DB will assign a value */,
          authorlessUniqueName: uniqueName
        },
        data
      )
    );
    await taxon.save(db);
    return taxon;
  }

  static async getByID(db: Client, taxonID: number): Promise<Taxon | null> {
    const result = await db.query(`select * from taxa where taxon_id=$1`, [taxonID]);
    return result.rows.length > 0 ? new Taxon(toCamelRow(result.rows[0])) : null;
  }

  static async getByUniqueName(db: Client, uniqueName: string): Promise<Taxon | null> {
    const result = await db.query(
      `select * from taxa where authorless_unique_name=$1`,
      [uniqueName]
    );
    return result.rows.length > 0 ? new Taxon(toCamelRow(result.rows[0])) : null;
  }

  static async getOrCreate(db: Client, path: TaxonomicPath): Promise<Taxon> {
    // Return the taxon if it already exists.

    const uniqueName = Taxon._toAuthorlessUnique(path);
    let taxon = await Taxon.getByUniqueName(db, uniqueName);
    if (taxon) return taxon;

    // If the taxon doesn't exist yet, create its ancestors, highest ancestor
    // first, one by one, until reaching the present taxon and creating it too.

    const ancestors: AncestorInfo[] = [];
    ancestors.push({
      rank: TaxonRank.Kingdom,
      name: path.kingdom,
      uniqueName: path.kingdom,
      scientificName: path.phylum ? null : path.scientificName
    });
    if (path.phylum) {
      ancestors.push({
        rank: TaxonRank.Phylum,
        name: path.phylum,
        uniqueName: path.phylum,
        scientificName: path.class ? null : path.scientificName
      });
    }
    if (path.class) {
      ancestors.push({
        rank: TaxonRank.Class,
        name: path.class,
        uniqueName: path.class,
        scientificName: path.order ? null : path.scientificName
      });
    }
    if (path.order) {
      ancestors.push({
        rank: TaxonRank.Order,
        name: path.order,
        uniqueName: path.order,
        scientificName: path.family ? null : path.scientificName
      });
    }
    if (path.family) {
      ancestors.push({
        rank: TaxonRank.Family,
        name: path.family,
        uniqueName: path.family,
        scientificName: path.genus ? null : path.scientificName
      });
    }
    if (path.genus) {
      ancestors.push({
        rank: TaxonRank.Genus,
        name: path.genus,
        uniqueName: path.genus,
        scientificName: path.specificEpithet ? null : path.scientificName
      });
    }
    if (path.specificEpithet) {
      let speciesUnique = uniqueName;
      if (path.infraspecificEpithet) {
        speciesUnique = Taxon._toSpeciesUnique(path.genus!, path.specificEpithet);
      }
      ancestors.push({
        rank: TaxonRank.Species,
        name: path.specificEpithet,
        uniqueName: speciesUnique,
        scientificName: path.infraspecificEpithet ? null : path.scientificName
      });
    }
    if (path.infraspecificEpithet) {
      ancestors.push({
        rank: TaxonRank.Subspecies,
        name: path.infraspecificEpithet,
        uniqueName,
        scientificName: path.scientificName
      });
    }
    let [nearestAncestor, nearestAncestorIndex] = await Taxon._getNearestAncestor(
      db,
      ancestors,
      ancestors.length - 1
    );
    if (!nearestAncestor) {
      nearestAncestor = await Taxon.create(db, path.kingdom, {
        taxonName: path.kingdom,
        scientificName: path.kingdom,
        taxonRank: TaxonRank.Kingdom,
        parentID: null
      });
      nearestAncestorIndex = 0;
    }
    return await Taxon._createMissingTaxa(
      db,
      ancestors,
      nearestAncestor,
      nearestAncestorIndex
    );
  }

  //// PRIVATE CLASS METHDOS /////////////////////////////////////////////////

  static async _createMissingTaxa(
    db: Client,
    ancestors: AncestorInfo[],
    nearestAncestor: Taxon,
    nearestAncestorIndex: number
  ): Promise<Taxon> {
    while (++nearestAncestorIndex < ancestors.length) {
      const ancestorInfo = ancestors[nearestAncestorIndex];
      nearestAncestor = await Taxon.create(db, ancestorInfo.uniqueName, {
        taxonRank: ancestorInfo.rank,
        taxonName: ancestorInfo.name,
        scientificName: ancestorInfo.scientificName,
        parentID: nearestAncestor.taxonID
      });
    }
    return nearestAncestor;
  }

  private static async _getNearestAncestor(
    db: Client,
    ancestors: AncestorInfo[],
    ancestorIndex: number
  ): Promise<[Taxon | null, number]> {
    const ancestor = await Taxon.getByUniqueName(
      db,
      ancestors[ancestorIndex].uniqueName
    );
    if (ancestor) {
      return [ancestor, ancestorIndex];
    }
    if (ancestorIndex == 0) {
      return [null, -1];
    }
    return Taxon._getNearestAncestor(db, ancestors, ancestorIndex - 1);
  }

  private static _toAuthorlessUnique(path: TaxonomicPath): string {
    if (path.infraspecificEpithet) {
      return `${path.genus} ${path.specificEpithet} ${path.infraspecificEpithet}`;
    }
    if (path.specificEpithet) {
      return Taxon._toSpeciesUnique(path.genus!, path.specificEpithet);
    }
    if (path.genus) return path.genus;
    if (path.family) return path.family;
    if (path.order) return path.order;
    if (path.class) return path.class;
    if (path.phylum) return path.phylum;
    return path.kingdom;
  }

  private static _toSpeciesUnique(genus: string, specificEpithet: string): string {
    return `${genus} ${specificEpithet}`;
  }
}
