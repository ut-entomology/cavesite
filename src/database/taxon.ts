import type { Client } from 'pg';

import type { TaxaRow } from './schema';

export class Taxon implements TaxaRow {
	taxonID = 0;
	taxonName: string;
	scientificName: string | null;
	taxonRank: string;
	parentID: number | null;

	constructor(row: Omit<TaxaRow, 'taxonID'>) {
		this.taxonName = row.taxonName;
		this.scientificName = row.scientificName;
		this.taxonRank = row.taxonRank;
		this.parentID = row.parentID;
	}

	async save(db: Client): Promise<number> {
		const result = await db.query(
			`insert into taxa(taxonName, scientificName, taxonRank, parentID)
        values ($1, $2, $3, $4) returning taxonID`,
			[this.taxonName, this.scientificName, this.taxonRank, this.parentID]
		);
		this.taxonID = result.rows[0].taxonID;
		return this.taxonID;
	}
}
