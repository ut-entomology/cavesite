-- PostgreSQL Schema

-- The taxa, locations, and specimens tables are all imported read-only data, so
-- the schema optimizes them for search at the expense of not being modifiable.

-- Requiers the following changes to Specify-to-GBIF field mappings:
-- * Change map of collectionobject.Remarks => occurrenceRemarks to
--    collectionobject.(CollectionObjectAttributeID).Remarks => occurrenceRemarks;
--    Alex is not using the former field, only the latter
-- * accession.AccessionNumber "002022c" => GBIF collectionCode "Biospeleology"
-- * preparation.CountAmt => GBIF organismQuantity (if non-zero/non-null)
-- * "specimens" => GBIF organismQuantityType (if prep.CountAmt non-zero/non-null)
-- * locality.GUID => GBIF locationID
-- * collectionobject.(CollectionObjectAttributeID).Text4 => GBIF lifeStage
-- * append to GBIF.eventRemarks = "started <PARTIAL>; ended <PARTIAL>" for date
-- *   precisions of 2 or 3, where <PARTIAL> is either YYYY or MM/YYYY.

-- The precision of the start and end dates are ONLY available in
-- collectingevent.StartDatePrecision and collectingevent.EndDatePrecision;
-- the values in the missing fields of StartDate and EndDate are arbitrary.
-- Precisions: 0 = no date; 1 = full date; 2 = year + month; 3 = only year

create table if not exists users (
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
create index if not exists users_last_name_first_name_idx on users(last_name, first_name);

create table sessions (
    -- None of these fields are in GBIF.
    session_id text primary key,
    user_id integer references users,
    created_on timestamptz not null,
    expires_at timestamptz not null,
    ip_address text not null,
    csrf_token text not null
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
    taxon_name text not null,
    -- Minimal unique scientific name sans author
    unique_name text not null,
    -- extracted from GBIF scientificName
    author text,
    state_rank text,
    tpwd_status text,
    flags integer not null,
    parent_id integer references taxa, -- locally generated

    -- these allow for fast non-recursive taxon queries/autocompletion:

    -- comma-delimited series of taxon IDs, kingdom-to-parent
    parent_id_path text not null,
    -- |-delimited series of taxon names for containing taxa
    parent_name_path text not null
);
create index on taxa(taxon_name);
create index on taxa(unique_name);
create index on taxa(parent_name_path);

create table locations (
    -- new data loads into the table prior to completely replacing old data
    committed boolean not null default false,

    location_id serial primary key, -- locally generated
    location_rank text not null, -- locally assigned
    -- GBIF continent/country/stateProvince/county/locality (Specify LocalityName)
    location_name text not null,
    -- unique identifier for location based only on location and containing names;
    -- GUID not used because it is specific to Specify installation and very long
    location_unique text not null,
    -- GBIF decimalLongitude
    latitude float8,
    -- GBIF decimalLatitude
    longitude float8,
    flags integer not null,
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
    -- GBIF year/month/day (specify ce.StartDate)
    collection_start_date date,
    -- extracted from GBIF eventRemarks
    partial_start_date text,
    -- both extracted from GBIF eventRemarks
    collection_end_date date, -- not in GBIF
    partial_end_date text,
    -- GBIF recordedBy (|-delimited names, last name last)
    collectors text,
    -- |-delimited lowercase last names, alphabetically sorted
    normalized_collectors text,
    -- from GBIF dateIdentified
    determination_year integer,
    -- GBIF identifiedBy (|-delimited names, last name last)
    determiners text,
    -- GBIF eventRemarks (collecting event/info/habitat/end date)
    locality_notes text,
    -- GBIF occurrenceRemarks (collection object remarks)
    specimen_notes text,
    -- GBIF identificationRemarks
    determination_notes text,
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
    genus_name text,
    genus_id integer references taxa,
    subgenus text, -- no associated ID, not in taxa table
    species_name text,
    species_id integer references taxa,
    subspecies_name text,
    subspecies_id integer references taxa,
    taxon_unique text not null,
    taxon_author text, -- author of taxon_unique
    karst_obligate text,
    is_federally_listed boolean not null,
    state_rank text,
    tpwd_status text,

    -- values cached from locations table

    county_name text,
    county_id integer references locations,
    locality_name text not null,
    latitude float8,
    longitude float8,
    is_aquatic_karst boolean not null,
    is_terrestrial_karst boolean not null
);
create index on specimens(catalog_number);
create index on specimens(collection_start_date);
create index on specimens(collection_end_date);
create index on specimens(collectors);
create index on specimens(determiners);
create index on specimens(determination_year);
create index on specimens(locality_notes);
create index on specimens(specimen_notes);
create index on specimens(determination_notes);
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
create index on specimens(karst_obligate);
create index on specimens(is_federally_listed);
create index on specimens(state_rank);
create index on specimens(tpwd_status);
create index on specimens(county_name);
create index on specimens(county_id);
create index on specimens(locality_name);
create index on specimens(latitude);
create index on specimens(longitude);
create index on specimens(is_aquatic_karst);
create index on specimens(is_terrestrial_karst);

create table if not exists key_data (
    user_id integer references users,
    data_key text not null,
    permission_required integer not null, -- ignored when user_id non-null
    data_value text not null
);
create index if not exists key_data_user_id_data_key_idx on key_data(user_id, data_key);

create table if not exists logs (
    -- column names must be identical in snakecase and camelcase
    id serial primary key,
    timestamp timestamptz not null default now(),
    type text not null,
    level text not null,
    tag text,
    line text not null
);
create index if not exists logs_timestamp_idx on logs(timestamp);

create table all_taxa_for_visits (
    -- new data loads into the table prior to completely replacing old data
    committed boolean not null default false,

    location_id integer not null references locations,
    is_terrestrial_karst boolean not null,
    start_date date, -- to pass on to effort table with timezone
    start_epoch_day integer, -- days since 1/1/1970, for performance
    end_date date,
    end_epoch_day integer not null, -- days since 1/1/1970, for performance
    flags integer not null,
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
create index on all_taxa_for_visits(is_terrestrial_karst);

create table cave_genera_for_visits (
    -- new data loads into the table prior to completely replacing old data
    committed boolean not null default false,

    location_id integer not null references locations,
    is_terrestrial_karst boolean not null,
    start_date date, -- to pass on to effort table with timezone
    start_epoch_day integer, -- days since 1/1/1970, for performance
    end_date date,
    end_epoch_day integer not null, -- days since 1/1/1970, for performance
    flags integer not null,
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
create index on cave_genera_for_visits(is_terrestrial_karst);

create table cave_obligates_for_visits (
    -- new data loads into the table prior to completely replacing old data
    committed boolean not null default false,

    location_id integer not null references locations,
    is_terrestrial_karst boolean not null,
    start_date date, -- to pass on to effort table with timezone
    start_epoch_day integer, -- days since 1/1/1970, for performance
    end_date date,
    end_epoch_day integer not null, -- days since 1/1/1970, for performance
    flags integer not null,
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
create index on cave_obligates_for_visits(is_terrestrial_karst);

create table all_taxa_for_effort (
    -- new data loads into the table prior to completely replacing old data
    committed boolean not null default false,

    location_id integer not null references locations,
    county_name text,
    locality_name text not null,
    is_terrestrial_karst boolean not null,
    latitude float8,
    longitude float8,
    flags integer not null,
    total_visits integer not null,
    total_person_visits integer not null,
    total_species integer not null,
    kingdom_names text, -- |-delimited taxon uniques ever found
    kingdom_visits text, -- ,-delimited counts of visits on which taxa were found
    phylum_names text,
    phylum_visits text,
    class_names text,
    class_visits text,
    order_names text,
    order_visits text,
    family_names text,
    family_visits text,
    genus_names text,
    genus_visits text,
    species_names text,
    species_visits text,
    subspecies_names text,
    subspecies_visits text,
    recent_taxa text not null,
    per_visit_points text not null,
    per_person_visit_points text not null,
    primary key (location_id)
);
create index on all_taxa_for_effort(total_visits);
create index on all_taxa_for_effort(total_person_visits);
create index on all_taxa_for_effort(total_species);

create table cave_genera_for_effort (
    -- new data loads into the table prior to completely replacing old data
    committed boolean not null default false,

    location_id integer not null references locations,
    county_name text,
    locality_name text not null,
    is_terrestrial_karst boolean not null,
    latitude float8,
    longitude float8,
    flags integer not null,
    total_visits integer not null,
    total_person_visits integer not null,
    total_species integer not null,
    kingdom_names text, -- |-delimited taxon uniques ever found
    kingdom_visits text, -- ,-delimited counts of visits on which taxa were found
    phylum_names text,
    phylum_visits text,
    class_names text,
    class_visits text,
    order_names text,
    order_visits text,
    family_names text,
    family_visits text,
    genus_names text,
    genus_visits text,
    species_names text,
    species_visits text,
    subspecies_names text,
    subspecies_visits text,
    recent_taxa text not null,
    per_visit_points text not null,
    per_person_visit_points text not null,
    primary key (location_id)
);
create index on cave_genera_for_effort(total_visits);
create index on cave_genera_for_effort(total_person_visits);
create index on cave_genera_for_effort(total_species);

create table cave_obligates_for_effort (
    -- new data loads into the table prior to completely replacing old data
    committed boolean not null default false,

    location_id integer not null references locations,
    county_name text,
    locality_name text not null,
    is_terrestrial_karst boolean not null,
    latitude float8,
    longitude float8,
    flags integer not null,
    total_visits integer not null,
    total_person_visits integer not null,
    total_species integer not null,
    kingdom_names text, -- |-delimited taxon uniques ever found
    kingdom_visits text, -- ,-delimited counts of visits on which taxa were found
    phylum_names text,
    phylum_visits text,
    class_names text,
    class_visits text,
    order_names text,
    order_visits text,
    family_names text,
    family_visits text,
    genus_names text,
    genus_visits text,
    species_names text,
    species_visits text,
    subspecies_names text,
    subspecies_visits text,
    recent_taxa text not null,
    per_visit_points text not null,
    per_person_visit_points text not null,
    primary key (location_id)
);
create index on cave_obligates_for_effort(total_visits);
create index on cave_obligates_for_effort(total_person_visits);
create index on cave_obligates_for_effort(total_species);
