/**
 * Class LocationVisit represents a visit by a particular
 * group of people to a specific location on a single day.
 */

import type { DataOf } from '../../shared/data_of';
import { type DB, toCamelRow } from '../integrations/postgres';
import { Specimen } from '../model/specimen';

const MILLIS_PER_DAY = 24 * 60 * 60 * 1000;

type LocationVisitData = DataOf<LocationVisit>;

export class LocationVisit {
  locationID: number;
  isCave: boolean;
  startEpochDay: number;
  endEpochDay: number | null;
  normaliziedCollectors: string;
  phylumNames: string | null;
  phylumIDs: string | null;
  classNames: string | null;
  classIDs: string | null;
  orderNames: string | null;
  orderIDs: string | null;
  familyNames: string | null;
  familyIDs: string | null;
  genusNames: string | null;
  genusIDs: string | null;
  speciesNames: string | null;
  speciesIDs: string | null;
  subspeciesNames: string | null;
  subspeciesIDs: string | null;

  //// CONSTRUCTION //////////////////////////////////////////////////////////

  private constructor(data: LocationVisitData) {
    this.locationID = data.locationID;
    this.isCave = data.isCave;
    this.startEpochDay = data.startEpochDay;
    this.endEpochDay = data.endEpochDay;
    this.normaliziedCollectors = data.normaliziedCollectors;
    this.phylumNames = data.phylumNames;
    this.phylumIDs = data.phylumIDs;
    this.classNames = data.classNames;
    this.classIDs = data.classIDs;
    this.orderNames = data.orderNames;
    this.orderIDs = data.orderIDs;
    this.familyNames = data.familyNames;
    this.familyIDs = data.familyIDs;
    this.genusNames = data.genusNames;
    this.genusIDs = data.genusIDs;
    this.speciesNames = data.speciesNames;
    this.speciesIDs = data.speciesIDs;
    this.subspeciesNames = data.subspeciesNames;
    this.subspeciesIDs = data.subspeciesIDs;
  }

  //// PUBLIC INSTANCE METHODS //////////////////////////////////////////////

  async save(db: DB): Promise<number> {
    if (this.locationID === 0) {
      const result = await db.query(
        `insert into visits(
            location_id, is_cave, start_date, end_date, normalized_collectors,
            phylum_names, phylum_ids, class_names, class_ids, order_names, order_ids,
            family_names, family_ids, genus_names, genus_ids, species_names, species_ids,
            subspecies_names, subspecies_ids
					) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
              $16, $17, $18, $19)`,
        [
          this.locationID,
          // @ts-ignore
          this.isCave,
          this.startEpochDay,
          this.endEpochDay,
          this.normaliziedCollectors,
          this.phylumNames,
          this.phylumIDs,
          this.classNames,
          this.classIDs,
          this.orderNames,
          this.orderIDs,
          this.familyNames,
          this.familyIDs,
          this.genusNames,
          this.genusIDs,
          this.speciesNames,
          this.speciesIDs,
          this.subspeciesNames,
          this.subspeciesIDs
        ]
      );
      this.locationID = result.rows[0].location_id;
    } else {
      const result = await db.query(
        `update locations set 
            is_cave=$1, end_date=$2, phylum_names=$3, phylum_ids=$4, class_names=$5,
            class_ids=$6, order_names=$7, order_ids=$8, family_names=$9, family_ids=$10,
            genus_names=$11, genus_ids=$12, species_names=$13, species_ids=$14,
            subspecies_names=$15, subspecies_ids=$16
          where location_id=$17 and start_date=$18 and normalized_collectors=$19`,
        [
          // @ts-ignore
          this.isCave,
          this.endEpochDay,
          this.phylumNames,
          this.phylumIDs,
          this.classNames,
          this.classIDs,
          this.orderNames,
          this.orderIDs,
          this.familyNames,
          this.familyIDs,
          this.genusNames,
          this.genusIDs,
          this.speciesNames,
          this.speciesIDs,
          this.subspeciesNames,
          this.subspeciesIDs,
          this.locationID,
          this.startEpochDay,
          this.normaliziedCollectors
        ]
      );
      if (result.rowCount != 1) {
        throw Error(
          `Failed to update visit location ID ${this.locationID}, ` +
            `day ${this.startEpochDay}, collectors ${this.normaliziedCollectors}`
        );
      }
    }
    return this.locationID;
  }

  //// PUBLIC CLASS METHODS //////////////////////////////////////////////////

  static async create(db: DB, data: LocationVisitData): Promise<LocationVisit> {
    const visit = new LocationVisit(data);
    await visit.save(db);
    return visit;
  }

  static async addSpecimen(db: DB, specimen: Specimen): Promise<void> {
    if (specimen.collectionStartDate === null) {
      throw Error("Can't add visits for a specimen with no start date");
    }
    if (specimen.collectionEndDate !== null) {
      throw Error("Can't add visits for a specimen having an end date");
    }
    if (specimen.normalizedCollectors === null) {
      throw Error("Can't add visits for a specimen with no collectors");
    }

    const startEpochDay = Math.floor(
      specimen.collectionStartDate.getTime() / MILLIS_PER_DAY
    );
    const visit = await LocationVisit.getByKey(
      db,
      specimen.localityID,
      startEpochDay,
      specimen.normalizedCollectors
    );

    if (visit === null) {
      await this.create(db, {
        locationID: specimen.localityID,
        isCave: specimen.localityName.toLowerCase().includes('cave'),
        startEpochDay,
        endEpochDay: null,
        normaliziedCollectors: specimen.normalizedCollectors,
        phylumNames: specimen.phylumName,
        phylumIDs: specimen.phylumID?.toString() || null,
        classNames: specimen.className,
        classIDs: specimen.classID?.toString() || null,
        orderNames: specimen.orderName,
        orderIDs: specimen.orderID?.toString() || null,
        familyNames: specimen.familyName,
        familyIDs: specimen.familyID?.toString() || null,
        genusNames: specimen.genusName,
        genusIDs: specimen.genusID?.toString() || null,
        speciesNames: specimen.speciesName,
        speciesIDs: specimen.speciesID?.toString() || null,
        subspeciesNames: specimen.subspeciesName,
        subspeciesIDs: specimen.subspeciesID?.toString() || null
      });
    } else {
      let ids = this._addID(visit.phylumIDs, specimen.phylumID);
      if (ids !== null) {
        visit.phylumIDs = ids;
        visit.phylumNames = this._appendName(visit.phylumNames, specimen.phylumName!);
      }
      ids = this._addID(visit.classIDs, specimen.classID);
      if (ids !== null) {
        visit.classIDs = ids;
        visit.classNames = this._appendName(visit.classNames, specimen.className!);
      }
      ids = this._addID(visit.orderIDs, specimen.orderID);
      if (ids !== null) {
        visit.orderIDs = ids;
        visit.orderNames = this._appendName(visit.orderNames, specimen.orderName!);
      }
      ids = this._addID(visit.familyIDs, specimen.familyID);
      if (ids !== null) {
        visit.familyIDs = ids;
        visit.familyNames = this._appendName(visit.familyNames, specimen.familyName!);
      }
      ids = this._addID(visit.genusIDs, specimen.genusID);
      if (ids !== null) {
        visit.genusIDs = ids;
        visit.genusNames = this._appendName(visit.genusNames, specimen.genusName!);
      }
      ids = this._addID(visit.speciesIDs, specimen.speciesID);
      if (ids !== null) {
        visit.speciesIDs = ids;
        visit.speciesNames = this._appendName(
          visit.speciesNames,
          specimen.speciesName!
        );
      }
      ids = this._addID(visit.subspeciesIDs, specimen.subspeciesID);
      if (ids !== null) {
        visit.subspeciesIDs = ids;
        visit.subspeciesNames = this._appendName(
          visit.subspeciesNames,
          specimen.subspeciesName!
        );
      }
      await visit.save(db);
    }
  }

  static async getByKey(
    db: DB,
    locationID: number,
    startEpochDay: number,
    normalizedCollectors: string
  ): Promise<LocationVisit | null> {
    const result = await db.query(
      `select * from locations where location_id=$1 and start_epoch_day=$2
        and normalized_collectors=$3`,
      [locationID, startEpochDay, normalizedCollectors]
    );
    return result.rows.length > 0
      ? new LocationVisit(toCamelRow(result.rows[0]))
      : null;
  }

  //// PRIVATE CLASS METHDOS /////////////////////////////////////////////////

  // Returns new ID series if changed. Otherwise returns null.
  private static _addID(idSeries: string | null, id: number | null): string | null {
    if (idSeries === null) {
      if (id === null) return null;
      return id.toString();
    }
    if (id === null) return null;
    const ids = idSeries.split(',');
    const idString = id.toString();
    if (ids.includes(idString)) return null;
    ids.push(idString);
    return ids.join('|');
  }

  private static _appendName(nameSeries: string | null, name: string): string {
    return nameSeries === null ? name : `${nameSeries}|${name}`;
  }
}
