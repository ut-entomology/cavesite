/**
 * Interfaces representing rows of the database tables.
 *
 * Shared with the data importer tool.
 */

export interface SiteUsersRow {
	userID: number;
	username: string;
	passwordHash: string;
	privileges: string;
	email: string;
	createdOn: Date;
	createdBy: number | null;
	lastLogin: Date | null;
}

export interface PublicLocationsRow {
	locationID: number;
	continentName: string;
	countryName: string;
	stateName: string;
	countyName: string | null;
	locationName: string | null;
	impreciseLatitude: number;
	impreciseLongitude: number;
}

export interface TaxaRow {
	taxonID: number;
	taxonName: string;
	scientificName: string | null;
	taxonRank: string;
	parentID: number | null;
}

export interface SpecimenRecordsRow {
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
}

export interface PrivateCoordinatesRow {
	locationID: number;
	suppliedBy: number;
	preciseLatitude: number;
	preciseLongitude: number;
	uncertaintyMeters: number | null;
}
