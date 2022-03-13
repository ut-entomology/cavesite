-- PostgreSQL
-- fields ending in `_id` are server-scoped IDs

create table if not exists site_users (
    -- None of these fields are in GBIF.
    user_id serial primary key,
    username varchar (50) unique not null,
    password_hash varchar (50) not null,
    privileges varchar (50) not null,
    email varchar (255) unique not null,
    created_on timestamp not null,
    created_by integer,
    last_login timestamp,
    foreign key(created_by) references site_users(user_id)
);

create table if not exists public_locations (
    location_id serial primary key, -- locally generated
    state_name varchar (128) not null, -- GBIF stateProvince
    continent varchar (64) not null, -- GBIF continent
    country varchar (128) not null, -- GBIF country
    county_name varchar (128), -- GBIF county
    location_name varchar (512), -- GBIF locality (specify LocalityName)
    imprecise_latitude decimal not null, -- GBIF decimalLongitude
    imprecise_longitude decimal not null -- GBIF decimalLatitude
);

create table if not exists taxa (
    -- TBD: I could use ID uniques values from GBIF
    taxon_id serial primary key, -- locally generated
     -- GBIF kingdom, phylum, class, order, family, genus, specificEpithet, infraspecificEpithet
    taxon_name varchar (128) not null, 
    scientific_name varchar (256), -- GBIF scientificName
    taxon_rank varchar (50) not null, -- GBIF taxonRank
    parent_id integer, -- locally generated
    foreign key(parent_id) references taxa(taxon_id)
);

create table if not exists specimen_records (
    catalog_number varchar (32) unique not null, -- GBIF catalogNumber
    occurrence_guid varchar (128) unique, -- GBIF occurrenceID (specify co.GUID)
    taxon_id integer, -- locally generated
    collection_start_date date, -- GBIF eventDate, year, month, day (specify ce.StartDate)
    collection_end_date date, -- not in GBIF
    verbatim_date varchar(128), -- not in GBIF
    location_id integer, -- locally generated
    collectors text, -- GBIF recordedBy
    determination_date date, -- GBIF dateIdentified
    determiners text, -- GBIF identifiedBy
    collection_remarks text, -- GBIF eventRemarks (collecting event/info remarks/habitat notes)
    occurrence_remarks text, -- collection object remarks
    determination_remarks text, -- GBIF identificationRemarks
    type_status varchar (50), -- GBIF typeStatus
    station_field_number varchar (50), -- GBIF fieldNumber
    foreign key(taxon_id) references taxa(taxon_id),
    foreign key(location_id) references public_locations(location_id)
);

create table if not exists private_coordinates (
    -- Users will be supplying this data, not GBIF.
    location_id integer primary key,
    supplied_by integer,
    precise_latitude decimal not null,
    precise_longitude decimal not null,
    uncertainty_meters decimal,
    foreign key(location_id) references public_locations(location_id),
    foreign key(supplied_by) references site_users(user_id)
);
