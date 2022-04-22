-- PostgreSQL Schema

-- The taxa, locations, and specimens tables are all imported read-only data, so
-- the schema optimizes them for search at the expense of not being modifiable.
-- The users and private_coordinates tables are maintained through the website.

-- The database requires each location specification to include a named locality
-- with which it can associate coordinates; otherwise it would need to associate
-- multiple different coordinates with the same county, state, etc. However, a
-- location need not have a county or state, only a country and continent.

-- The database allows for but does not require assigning GUIDs to locations.
-- A location must have a GUID to be assigned private coordinates. In order for
-- two different localities to have the same name in the same containing location,
-- both localities must have GUIDs; otherwise they are treated as the same.

-- TODO: We need to provide the following Specify-to-GBIF field mappings:
-- * accession.AccessionNumber "002022c" => GBIF collectionCode "Biospeleology"
-- * preparation.CountAmt => GBIF organismQuantity (if non-zero/non-null)
-- * "specimens" => GBIF organismQuantityType (if prep.CountAmt non-zero/non-null)
-- * locality.GUID => GBIF locationID

create table users (
    -- None of these fields are in GBIF.
    user_id serial primary key, -- locally generated, more stable than email
    first_name text not null,
    last_name text not null,
    email text unique not null,
    affiliation text,
    password_hash text not null,
    password_salt text not null,
    permissions integer,
    created_on timestamptz not null default now(),
    created_by integer references users,
    prior_login_date timestamptz,
    prior_login_ip text,
    last_login_date timestamptz,
    last_login_ip text,
    reset_code text,
    reset_expiration timestamptz
);
create index on users(last_name, first_name);

create table sessions (
    -- None of these fields are in GBIF.
    session_id text primary key,
    user_id integer references users,
    created_on timestamptz not null,
    expires_at timestamptz not null,
    ip_address text not null
);
create index on sessions(user_id);
create index on sessions(expires_at);

create table taxa (
    -- new data loads into the table prior to completely replacing old data
    committed boolean not null default false,

    taxon_id serial primary key, -- locally generated
    -- GBIF taxonRank, locally translated
    taxon_rank varchar (50) not null,
    -- GBIF kingdom/phylum/class/order/family/genus/specificEpithet/infraspecificEpithet
    taxon_name varchar (128) not null,
    -- GBIF scientificName
    scientific_name varchar (256),
    parent_id integer references taxa, -- locally generated

    -- these allow for fast non-recursive taxon queries/autocompletion:

    -- comma-delimited series of taxon IDs, kingdom-to-parent
    parent_id_series varchar (64) not null,
    -- |-delimited series of taxon names defining parent
    parent_name_series varchar (1024) not null
);
create index on taxa(parent_name_series);

create table locations (
    -- new data loads into the table prior to completely replacing old data
    committed boolean not null default false,

    location_id serial primary key, -- locally generated
    -- GBIF substring of georeferenceSources (Specify location.guid)
    location_guid varchar (128), -- can't enforce uniqueness due to import
    location_type varchar (50) not null, -- locally assigned
    -- GBIF continent/country/stateProvince/county/locality (Specify LocalityName)
    location_name varchar (512) not null,
    -- GBIF decimalLongitude
    public_latitude float8,
    -- GBIF decimalLatitude
    public_longitude float8,
    parent_id integer references locations, -- locally generated

    -- these allow for fast non-recursive location queries/autocompletion:

    -- comma-delimited series of location IDs, continent-to-parent
    parent_id_series varchar (64) not null,
    -- |-delimited series of location names defining parent
    parent_name_series varchar (1024) not null 
);
create index on locations(location_guid);
create index on locations(parent_name_series);

create table specimens (
    -- new data loads into the table prior to completely replacing old data
    committed boolean not null default false,

    -- GBIF catalogNumber
    catalog_number varchar (32) not null, -- can't enforce uniqueness due to import
    -- GBIF occurrenceID (specify co.GUID)
    occurrence_guid varchar (128), -- can't enforce uniqueness due to import

    -- all taxon and location IDs are locally generated...

    kingdom_id integer not null references taxa,
    phylum_id integer references taxa,
    class_id integer references taxa,
    order_id integer references taxa,
    family_id integer references taxa,
    genus_id integer references taxa,
    species_id integer references taxa,
    subspecies_id integer references taxa,
    -- most specific taxon ID available
    precise_taxon_id integer not null references taxa, 

    continent_id integer not null references locations,
    country_id integer references locations,
    state_province_id integer references locations,
    county_id integer references locations,
    locality_id integer references locations,
    -- most specific location ID available
    precise_location_id integer not null references locations,

    -- GBIF eventDate/year/month/day (specify ce.StartDate)
    collection_start_date timestamptz,
    collection_end_date timestamptz, -- not in GBIF
    -- GBIF recordedBy (|-delimited names, last name last)
    collectors text,
    -- GBIF dateIdentified
    determination_date timestamptz,
    -- GBIF identifiedBy (|-delimited names, last name last)
    determiners text,
    -- GBIF eventRemarks (collecting event/info/habitat/end date)
    collection_remarks text,
    -- GBIF occurrenceRemarks (collection object remarks)
    occurrence_remarks text,
    -- GBIF identificationRemarks
    determination_remarks text,
    -- GBIF typeStatus
    type_status varchar (50),
    -- GBIF organismQuantity
    specimen_count integer,

    -- generated at import
    problems text
);
create index on specimens(catalog_number);
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
    -- Users will be supplying this data, not GBIF
    location_guid varchar (128) unique not null,
    modified_by integer references users,
    modified_on timestamptz not null,
    latitude float8 not null,
    longitude float8 not null,
    uncertainty_meters float8
);

create table logs (
    -- column names must be identical in snakecase and camelcase
    id serial primary key,
    timestamp timestamptz not null default now(),
    type varchar (16) not null,
    tag varchar (64),
    line varchar (2048) not null
);
create index on logs(timestamp);
