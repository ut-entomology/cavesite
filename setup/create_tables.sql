-- PostgreSQL Schema

-- The taxa, locations, and specimens tables are all imported read-only data, so
-- the schema optimizes them for search at the expense of not being modifiable.
-- The users and private_coordinates tables are maintained through the website.

create table users (
    -- None of these fields are in GBIF.
    user_id serial primary key, -- locally generated
    username varchar (50) unique not null,
    password_hash varchar (50) not null,
    privileges varchar (50) not null,
    email varchar (255) unique not null,
    created_on timestamp not null,
    created_by integer references users,
    last_login timestamp
);

create table taxa (
    taxon_id serial primary key, -- locally generated
     -- GBIF kingdom, phylum, class, order, family, genus, specificEpithet, infraspecificEpithet
    taxon_rank varchar (50) not null, -- GBIF taxonRank, locally translated
    taxon_name varchar (128) not null, 
    scientific_name varchar (256), -- GBIF scientificName
    parent_id integer references taxa, -- locally generated
    -- the following allow for fast non-recursive taxon autocompletion
    parent_id_series varchar (64), -- comma-delimited series of taxon IDs, kingdom-to-parent
    parent_name_series varchar (1024) -- |-delimited series of taxon names defining parent
);
create index on taxa(parent_name_series);

create table locations (
    location_id serial primary key, -- locally generated
    location_type varchar (50) not null, -- locally assigned
    -- GBIF continent, country, stateProvince, county, or locality (Specify LocalityName)
    location_name varchar (512) not null,
    public_latitude float8, -- GBIF decimalLongitude
    public_longitude float8, -- GBIF decimalLatitude
    parent_id integer references locations, -- locally generated
    -- the following allow for fast non-recursive location autocompletion
    parent_id_series varchar (64), -- comma-delimited series of location IDs, continent-to-parent
    parent_name_series varchar (1024) -- |-delimited series of location names defining parent
);
create index on locations(parent_name_series);

create table specimens (
    catalog_number varchar (32) unique not null, -- GBIF catalogNumber
    occurrence_guid varchar (128) unique, -- GBIF occurrenceID (specify co.GUID)

    kingdom_id integer not null references taxa, -- all taxon IDs are locally generated
    phylum_id integer references taxa,
    class_id integer references taxa,
    order_id integer references taxa,
    family_id integer references taxa,
    genus_id integer references taxa,
    species_id integer references taxa,
    subspecies_id integer references taxa,
    precise_taxon_id integer not null references taxa, -- most specific taxon ID available

    continent_id integer not null references locations, -- all location IDs are locally generated
    country_id integer references locations,
    state_province_id integer references locations,
    county_id integer references locations,
    locality_id integer references locations,
    precise_location_id integer not null references locations, -- most specific location ID available

    collection_start_date date, -- GBIF eventDate, year, month, day (specify ce.StartDate)
    collection_end_date date, -- not in GBIF
    verbatim_date varchar(128), -- not in GBIF
    collectors text, -- GBIF recordedBy
    determination_date date, -- GBIF dateIdentified
    determiners text, -- GBIF identifiedBy
    collection_remarks text, -- GBIF eventRemarks (collecting event/info remarks/habitat notes)
    occurrence_remarks text, -- GBIF occurrenceRemarks (collection object remarks)
    determination_remarks text, -- GBIF identificationRemarks
    type_status varchar (50), -- GBIF typeStatus
    station_field_number varchar (50) -- GBIF fieldNumber
);
create index on specimens(kingdom_id);
create index on specimens(phylum_id);
create index on specimens(class_id);
create index on specimens(order_id);
create index on specimens(family_id);
create index on specimens(genus_id);
create index on specimens(species_id);
create index on specimens(subspecies_id);
create index on specimens(continent_id);
create index on specimens(country_id);
create index on specimens(state_province_id);
create index on specimens(county_id);
create index on specimens(locality_id);

create table private_coordinates (
    -- Users will be supplying this data, not GBIF.
    location_id integer primary key references locations,
    supplied_by integer references users,
    precise_latitude float8 not null,
    precise_longitude float8 not null,
    uncertainty_meters float8
);
