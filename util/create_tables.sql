-- PostgreSQL
-- fields ending in `_id` are server-scoped IDs

create table if not exists site_users (
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
    location_id serial primary key,
    state_name varchar (128) not null,
    continent varchar (64) not null,
    country varchar (128) not null,
    county_name varchar (128),
    location_name varchar (512),
    imprecise_latitude decimal not null,
    imprecise_longitude decimal not null
);

create table if not exists taxa (
    taxon_id serial primary key,
    taxon_name varchar (128) not null,
    taxon_author varchar (256),
    taxon_rank varchar (50) not null,
    parent_id integer,
    foreign key(parent_id) references taxa(taxon_id)
);

create table if not exists specimen_records (
    catalog_number varchar (32) unique not null,
    occurrence_guid varchar (128) unique,
    taxon_id integer,
    collection_start_date date,
    collection_end_date date,
    verbatim_date varchar(128),
    location_id integer,
    collectors text,
    determination_date date,
    determiners text,
    collection_remarks text, -- collecting event/info remarks (habitat notes)
    occurrence_remarks text, -- collection object remarks
    determination_remarks text,
    type_status varchar (50),
    station_field_number varchar (50),
    foreign key(taxon_id) references taxa(taxon_id),
    foreign key(location_id) references public_locations(location_id)
);

create table if not exists private_coordinates (
    location_id integer primary key,
    supplied_by integer,
    precise_latitude decimal not null,
    precise_longitude decimal not null,
    uncertainty_meters decimal,
    foreign key(location_id) references public_locations(location_id),
    foreign key(supplied_by) references site_users(user_id)
);
