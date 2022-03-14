import type { Client } from 'pg';

import type { SpecimenRecordsRow } from './schema';

export class SpecimenRecord implements SpecimenRecordsRow {
	catalogNumber: string;
	occurrenceGUID: string;
	taxonID: number | null;
	collectionStartDate: Date | null;
	collectionEndDate: Date | null;
	verbatimDate: string | null;
	locationID: number | null;
	collectors: string | null;
	determinationDate: Date | null;
	determiners: string | null;
	collectionRemarks: string | null;
	occurrenceRemarks: string | null;
	determinationRemarks: string | null;
	typeStatus: string | null;
	stationFieldNumber: string | null;

	constructor(row: SpecimenRecordsRow) {
		this.catalogNumber = row.catalogNumber;
		this.occurrenceGUID = row.occurrenceGUID;
		this.taxonID = row.taxonID;
		this.collectionStartDate = row.collectionStartDate;
		this.collectionEndDate = row.collectionEndDate;
		this.verbatimDate = row.verbatimDate;
		this.locationID = row.locationID;
		this.collectors = row.collectors;
		this.determinationDate = row.determinationDate;
		this.determiners = row.determiners;
		this.collectionRemarks = row.collectionRemarks;
		this.occurrenceRemarks = row.occurrenceRemarks;
		this.determinationRemarks = row.determinationRemarks;
		this.typeStatus = row.typeStatus;
		this.stationFieldNumber = row.stationFieldNumber;
	}

	async save(db: Client): Promise<void> {
		await db.query(
			`insert into speciment_records(
				catalogNumber, occurrenceGUID, taxonID,
				collectionStartDate, collectionEndDate, verbatimDate,
				locationID, collectors, determinationDate, determiners,
				collectionRemarks, occurrenceRemarks, determinationRemarks,
				typeStatus, stationFieldNumber
        ) values (
					$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14 $15
        ) returning locationID`,
			[
				this.catalogNumber,
				this.occurrenceGUID,
				this.taxonID,
				this.collectionStartDate,
				this.collectionEndDate,
				this.verbatimDate,
				this.locationID,
				this.collectors,
				this.determinationDate,
				this.determiners,
				this.collectionRemarks,
				this.occurrenceRemarks,
				this.determinationRemarks,
				this.typeStatus,
				this.stationFieldNumber
			]
		);
	}
}
