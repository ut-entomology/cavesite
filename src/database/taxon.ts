import type { Client } from 'pg';

import type { DataOf } from '../util/type_util';

export interface TaxonomicPath {
  kingdom: string;
  phylum: string | null;
  order: string | null;
  family: string | null;
  genus: string | null;
  specificEpithet: string | null;
  infraspecificEpithet: string | null;
  scientificName: string | null;
  typeStatus: string | null;
}

export enum TaxonRank {
  Kingdom = 'kingdom',
  Phylum = 'phylum',
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
  scientificName: string | null;
}

export class Taxon {
  taxonID = 0;
  taxonRank: TaxonRank;
  taxonName: string;
  authorlessUniqueName: string;
  scientificName: string | null;
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

  //// PUBLIC CLASS METHODS //////////////////////////////////////////////////

  static async create(
    db: Client,
    uniqueName: string,
    data: Omit<TaxonData, 'taxonID' | 'authorlessUniqueName'>
  ): Promise<Taxon> {
    const taxon = new Taxon(
      Object.assign(
        {
          taxonID: 0,
          authorlessUniqueName: uniqueName
        },
        data
      )
    );
    taxon.taxonID = await taxon._save(db);
    return taxon;
  }

  static async createMissingTaxa(
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

  static async getByID(db: Client, taxonID: number): Promise<Taxon | null> {
    const result = await db.query(`select * from taxa where taxonID=$1`, [taxonID]);
    return result.rows.length > 0 ? new Taxon(result.rows[0]) : null;
  }

  static async getByUniqueName(db: Client, uniqueName: string): Promise<Taxon | null> {
    const result = await db.query(`select * from taxa where authorlessUnique=$1`, [
      uniqueName
    ]);
    return result.rows.length > 0 ? new Taxon(result.rows[0]) : null;
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
    return await Taxon.createMissingTaxa(
      db,
      ancestors,
      nearestAncestor,
      nearestAncestorIndex
    );
  }

  //// PRIVATE CLASS METHDOS /////////////////////////////////////////////////

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

  private async _save(db: Client): Promise<number> {
    const result = await db.query(
      `insert into taxa(taxonName, scientificName, taxonRank, parentID)
        values ($1, $2, $3, $4) returning taxonID`,
      [this.taxonName, this.scientificName, this.taxonRank, this.parentID]
    );
    this.taxonID = result.rows[0].taxonID;
    return this.taxonID;
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
    if (path.phylum) return path.phylum;
    return path.kingdom;
  }

  private static _toSpeciesUnique(genus: string, specificEpithet: string): string {
    return `${genus} ${specificEpithet}`;
  }
}
