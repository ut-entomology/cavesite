import type { Client } from 'pg';

import type { PrivateCoordinatesRow } from './schema';

export class PrivateCoordinatePair implements PrivateCoordinatesRow {
	locationID: number;
	suppliedBy: number;
	preciseLatitude: number;
	preciseLongitude: number;
	uncertaintyMeters: number | null;

	constructor(row: PrivateCoordinatesRow) {
		this.locationID = row.locationID;
		this.suppliedBy = row.suppliedBy;
		this.preciseLatitude = row.preciseLatitude;
		this.preciseLongitude = row.preciseLongitude;
		this.uncertaintyMeters = row.uncertaintyMeters;
	}

	async save(db: Client): Promise<void> {
		await db.query(
			`insert into private_coordinates(
          locationID, suppliedBy,
          preciseLatitude, preciseLongitude, uncertaintyMeters
        ) values ($1, $2, $3, $4, $5)`,
			[
				this.locationID,
				this.suppliedBy,
				this.preciseLatitude,
				this.preciseLongitude,
				this.uncertaintyMeters
			]
		);
	}
}
