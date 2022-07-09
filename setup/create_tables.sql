-- PostgreSQL Schema

-- The taxa, locations, and specimens tables are all imported read-only data, so
-- the schema optimizes them for search at the expense of not being modifiable.
-- The users and private_coordinates tables are maintained through the website.

-- The database requires each location specification to include a named locality
-- with which it can associate coordinates; otherwise it would need to associate
-- multiple different coordinates with the same county, state, etc. However, a
-- location need not have a county or state, only a country and continent.

-- The database allows for but does not require assigning GUIDs to locations.
-- A location must have a GUID to be assigned private coordinates. However,
-- GUIDs are not used to distinguish locations, but rather a normalization of
-- the three most specific location names provided for the location.

-- TODO: Revisit whether I should switch private coordinate GUIDs to location uniques.
-- TODO: We need to provide the following Specify-to-GBIF field mappings:
-- * Change map of collectionobject.Remarks => occurrenceRemarks to
--    collectionobject.(CollectionObjectAttributeID).Remarks => occurrenceRemarks;
--    Alex is not using the former field, only the latter
-- * accession.AccessionNumber "002022c" => GBIF collectionCode "Biospeleology"
-- * preparation.CountAmt => GBIF organismQuantity (if non-zero/non-null)
-- * "specimens" => GBIF organismQuantityType (if prep.CountAmt non-zero/non-null)
-- * locality.GUID => GBIF locationID
-- * collectionobject.(CollectionObjectAttributeID).Text4 => GBIF lifeStage

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
    taxon_rank text not null,
    -- GBIF kingdom/phylum/class/order/family/genus/specificEpithet/infraspecificEpithet
    taxon_name text not null, -- genus name optionally includes parenthesized subgenus
    -- Minimal unique scientific name sans author
    unique_name text not null, -- genus unique includes subgenus; species uniques do not
    -- extracted from GBIF scientificName
    author text,
    obligate text, -- 'cave', else null if not specified
    parent_id integer references taxa, -- locally generated

    -- these allow for fast non-recursive taxon queries/autocompletion:

    -- comma-delimited series of taxon IDs, kingdom-to-parent
    parent_id_path text not null,
    -- |-delimited series of taxon names for containing taxa
    parent_name_path text not null -- genus segment includes subgenus when provided
);
create index on taxa(taxon_name);
create index on taxa(unique_name);
create index on taxa(parent_name_path);

create table locations (
    -- new data loads into the table prior to completely replacing old data
    committed boolean not null default false,

    location_id serial primary key, -- locally generated
    -- GBIF substring of georeferenceSources (Specify location.guid)
    location_rank text not null, -- locally assigned
    -- GBIF continent/country/stateProvince/county/locality (Specify LocalityName)
    location_name text not null,
    -- unique identifier for location based only on location and containing names;
    -- GUID not used because it is specific to Specify installation and very long
    location_unique text not null,
    -- GBIF decimalLongitude
    public_latitude float8,
    -- GBIF decimalLatitude
    public_longitude float8,
    parent_id integer references locations, -- locally generated

    -- these allow for fast non-recursive location queries/autocompletion:

    -- comma-delimited series of location IDs, continent-to-parent
    parent_id_path text not null,
    -- |-delimited series of location names for containing locations
    parent_name_path text not null 
);
create index on locations(location_unique);
create index on locations(parent_name_path);

create table specimens (
    -- new data loads into the table prior to completely replacing old data
    committed boolean not null default false,

    -- GBIF catalogNumber
    catalog_number text not null, -- can't enforce uniqueness due to import
    -- GBIF occurrenceID (specify co.GUID)
    occurrence_guid text, -- can't enforce uniqueness due to import
    -- most specific taxon ID available, locally generated
    taxon_id integer not null references taxa,
    -- locally generated; non-null because all specimens have locality names
    locality_id integer not null references locations,
    -- GBIF eventDate/year/month/day (specify ce.StartDate)
    collection_start_date timestamptz,
    collection_end_date timestamptz, -- not in GBIF
    -- GBIF recordedBy (|-delimited names, last name last)
    collectors text,
    -- |-delimited lowercase last names, alphabetically sorted
    normalized_collectors text,
    -- from GBIF dateIdentified
    determination_year integer,
    -- GBIF identifiedBy (|-delimited names, last name last)
    determiners text,
    -- GBIF eventRemarks (collecting event/info/habitat/end date)
    collection_remarks text,
    -- GBIF occurrenceRemarks (collection object remarks)
    occurrence_remarks text,
    -- GBIF identificationRemarks
    determination_remarks text,
    -- GBIF typeStatus
    type_status text,
    -- GBIF organismQuantity
    specimen_count integer,
    -- GBIF lifeStage,
    life_stage text,
    -- generated at import
    problems text,

    -- values cached from taxa table

    kingdom_name text not null,
    kingdom_id integer not null references taxa,
    phylum_name text,
    phylum_id integer references taxa,
    class_name text,
    class_id integer references taxa,
    order_name text,
    order_id integer references taxa,
    family_name text,
    family_id integer references taxa,
    genus_name text, -- includes subgenus when provided
    genus_id integer references taxa,
    species_name text,
    species_id integer references taxa,
    subspecies_name text,
    subspecies_id integer references taxa,
    taxon_unique text not null, -- only genus uniques include the subgenus
    taxon_author text, -- author of taxon_unique
    obligate text, -- 'cave', else null if not specified

    -- values cached from locations table

    county_name text,
    county_id integer references locations,
    locality_name text not null,
    public_latitude float8,
    public_longitude float8
);
create index on specimens(catalog_number);
create index on specimens(collection_start_date);
create index on specimens(collection_end_date);
create index on specimens(collectors);
create index on specimens(determiners);
create index on specimens(determination_year);
create index on specimens(collection_remarks);
create index on specimens(occurrence_remarks);
create index on specimens(determination_remarks);
create index on specimens(type_status);
create index on specimens(specimen_count);
create index on specimens(problems);
create index on specimens(kingdom_name);
create index on specimens(kingdom_id);
create index on specimens(phylum_name);
create index on specimens(phylum_id);
create index on specimens(class_name);
create index on specimens(class_id);
create index on specimens(order_name);
create index on specimens(order_id);
create index on specimens(family_name);
create index on specimens(family_id);
create index on specimens(genus_name);
create index on specimens(genus_id);
create index on specimens(species_name);
create index on specimens(species_id);
create index on specimens(subspecies_name);
create index on specimens(subspecies_id);
create index on specimens(county_name);
create index on specimens(county_id);
create index on specimens(locality_name);
create index on specimens(public_latitude);
create index on specimens(public_longitude);

create table private_coordinates (
    -- Users will be supplying this data, not GBIF
    location_unique text unique not null,
    modified_by integer references users,
    modified_on timestamptz not null,
    latitude float8 not null,
    longitude float8 not null,
    uncertainty_meters float8
);

create table key_data (
    user_id integer references users,
    data_key text not null,
    permission_required integer not null, -- ignored when user_id non-null
    data_value text not null
);
create index on key_data(user_id, data_key);

create table logs (
    -- column names must be identical in snakecase and camelcase
    id serial primary key,
    timestamp timestamptz not null default now(),
    type text not null,
    tag text,
    line text not null
);
create index on logs(timestamp);

create table all_taxa_for_visits (
    location_id integer not null references locations,
    is_cave boolean not null,
    start_date timestamptz not null, -- to pass on to effort table with timezone
    start_epoch_day integer not null, -- days since 1/1/1970, for performance
    end_date timestamptz not null,
    end_epoch_day integer not null, -- days since 1/1/1970, for performance
    normalized_collectors text not null,
    collector_count integer not null,
    kingdom_names text, -- |-delimited taxon uniques collected on visit
    kingdom_counts text, -- /[01]+/ indicating count contributed by each taxon
    phylum_names text,
    phylum_counts text,
    class_names text,
    class_counts text,
    order_names text,
    order_counts text,
    family_names text,
    family_counts text,
    genus_names text,
    genus_counts text,
    species_names text,
    species_counts text,
    subspecies_names text,
    subspecies_counts text,
    primary key (location_id, end_epoch_day, normalized_collectors)
);

create table cave_genera_for_visits (
    location_id integer not null references locations,
    is_cave boolean not null,
    start_date timestamptz not null, -- to pass on to effort table with timezone
    start_epoch_day integer not null, -- days since 1/1/1970, for performance
    end_date timestamptz not null,
    end_epoch_day integer not null, -- days since 1/1/1970, for performance
    normalized_collectors text not null,
    collector_count integer not null,
    kingdom_names text, -- |-delimited taxon uniques collected on visit
    kingdom_counts text, -- /[01]+/ indicating count contributed by each taxon
    phylum_names text,
    phylum_counts text,
    class_names text,
    class_counts text,
    order_names text,
    order_counts text,
    family_names text,
    family_counts text,
    genus_names text,
    genus_counts text,
    species_names text,
    species_counts text,
    subspecies_names text,
    subspecies_counts text,
    primary key (location_id, end_epoch_day, normalized_collectors)
);

create table cave_obligates_for_visits (
    location_id integer not null references locations,
    is_cave boolean not null,
    start_date timestamptz not null, -- to pass on to effort table with timezone
    start_epoch_day integer not null, -- days since 1/1/1970, for performance
    end_date timestamptz not null,
    end_epoch_day integer not null, -- days since 1/1/1970, for performance
    normalized_collectors text not null,
    collector_count integer not null,
    kingdom_names text, -- |-delimited taxon uniques collected on visit
    kingdom_counts text, -- /[01]+/ indicating count contributed by each taxon
    phylum_names text,
    phylum_counts text,
    class_names text,
    class_counts text,
    order_names text,
    order_counts text,
    family_names text,
    family_counts text,
    genus_names text,
    genus_counts text,
    species_names text,
    species_counts text,
    subspecies_names text,
    subspecies_counts text,
    primary key (location_id, end_epoch_day, normalized_collectors)
);

create table all_taxa_for_effort (
    location_id integer not null references locations,
    is_cave boolean not null,
    start_date timestamptz not null,
    end_date timestamptz not null,
    total_days integer not null,
    total_visits integer not null,
    total_person_visits integer not null,
    total_species integer not null,
    kingdom_names text, -- |-delimited taxon uniques ever found
    kingdom_visits integer not null,
    phylum_names text,
    phylum_visits integer not null,
    class_names text,
    class_visits integer not null,
    order_names text,
    order_visits integer not null,
    family_names text,
    family_visits integer not null,
    genus_names text,
    genus_visits integer not null,
    species_names text,
    species_visits integer not null,
    subspecies_names text,
    subspecies_visits integer not null,
    per_day_points text not null,
    per_visit_points text not null,
    per_person_visit_points text not null,
    primary key (location_id)
);
create index on all_taxa_for_effort(total_days);
create index on all_taxa_for_effort(total_visits);
create index on all_taxa_for_effort(total_person_visits);
create index on all_taxa_for_effort(total_species);

create table cave_genera_for_effort (
    location_id integer not null references locations,
    is_cave boolean not null,
    start_date timestamptz not null,
    end_date timestamptz not null,
    total_days integer not null,
    total_visits integer not null,
    total_person_visits integer not null,
    total_species integer not null,
    kingdom_names text, -- |-delimited taxon uniques ever found
    kingdom_visits string not null,
    phylum_names text,
    phylum_visits string not null,
    class_names text,
    class_visits string not null,
    order_names text,
    order_visits string not null,
    family_names text,
    family_visits string not null,
    genus_names text,
    genus_visits string not null,
    species_names text,
    species_visits string not null,
    subspecies_names text,
    subspecies_visits string not null,
    per_day_points text not null,
    per_visit_points text not null,
    per_person_visit_points text not null,
    primary key (location_id)
);
create index on cave_genera_for_effort(total_days);
create index on cave_genera_for_effort(total_visits);
create index on cave_genera_for_effort(total_person_visits);
create index on cave_genera_for_effort(total_species);

create table cave_obligates_for_effort (
    location_id integer not null references locations,
    is_cave boolean not null,
    start_date timestamptz not null,
    end_date timestamptz not null,
    total_days integer not null,
    total_visits integer not null,
    total_person_visits integer not null,
    total_species integer not null,
    kingdom_names text, -- |-delimited taxon uniques ever found
    kingdom_visits integer not null,
    phylum_names text,
    phylum_visits integer not null,
    class_names text,
    class_visits integer not null,
    order_names text,
    order_visits integer not null,
    family_names text,
    family_visits integer not null,
    genus_names text,
    genus_visits integer not null,
    species_names text,
    species_visits integer not null,
    subspecies_names text,
    subspecies_visits integer not null,
    per_day_points text not null,
    per_visit_points text not null,
    per_person_visit_points text not null,
    primary key (location_id)
);
create index on cave_obligates_for_effort(total_days);
create index on cave_obligates_for_effort(total_visits);
create index on cave_obligates_for_effort(total_person_visits);
create index on cave_obligates_for_effort(total_species);
