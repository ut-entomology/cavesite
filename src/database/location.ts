import type { Client } from 'pg';

import type { PublicLocationsRow } from './schema';

export class Location implements PublicLocationsRow {
	locationID = 0;
	continentName: string;
	countryName: string;
	stateName: string;
	countyName: string | null;
	locationName: string | null;
	impreciseLatitude: number;
	impreciseLongitude: number;

	constructor(row: Omit<PublicLocationsRow, 'locationID'>) {
		this.continentName = row.continentName;
		this.countryName = row.countryName;
		this.stateName = row.stateName;
		this.countyName = row.countyName;
		this.locationName = row.locationName;
		this.impreciseLatitude = row.impreciseLatitude;
		this.impreciseLongitude = row.impreciseLongitude;
	}

	async save(db: Client): Promise<number> {
		const result = await db.query(
			`insert into public_locations(
          continentName, countryName,
          stateName, countyName, locationName,
          impreciseLatitude, impreciseLongitude
        ) values ($1, $2, $3, $4, $5, $6, $7)
        returning locationID`,
			[
				this.continentName,
				this.countryName,
				this.stateName,
				this.countyName,
				this.locationName,
				this.impreciseLatitude,
				this.impreciseLongitude
			]
		);
		this.locationID = result.rows[0].locationID;
		return this.locationID;
	}
}
