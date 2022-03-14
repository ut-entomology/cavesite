/**
 * Interfaces representing rows of the database tables.
 *
 * Shared with the data importer tool.
 */

export interface UserRow {
	user_id: number;
	username: string;
	password_hash: string;
	privileges: string;
	email: string;
	created_on: Date;
	created_by: number | null;
	last_login: Date | null;
}

export interface LocationRow {
	location_id: number;
	state_name: string;
	continent: string;
	country: string;
	county_name: string | null;
	location_name: string | null;
	imprecise_latitude: number;
	imprecise_longitude: number;
}

export interface TaxaRow {
	taxon_id: number;
	taxon_name: string;
	scientific_name: string | null;
	taxon_rank: string;
	parent_id: number | null;
}

export interface SpecimenRecordRow {
	catalog_number: string;
	occurrence_guid: string;
	taxon_id: number | null;
	collection_start_date: Date | null;
	collection_end_date: Date | null;
	verbatim_date: string | null;
	location_id: number | null;
	collectors: string | null;
	determination_date: Date | null;
	determiners: string | null;
	collection_remarks: string | null;
	occurrence_remarks: string | null;
	determination_remarks: string | null;
	type_status: string | null;
	station_field_number: string | null;
}

export interface CoordinatesRow {
	location_id: number;
	supplied_by: number;
	precise_latitude: number;
	precise_longitude: number;
	uncertainty_meters: number | null;
}
