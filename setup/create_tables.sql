-- PostgreSQL

create table site_users (
    -- None of these fields are in GBIF.
    userID serial primary key, -- locally generated
    username varchar (50) unique not null,
    passwordHash varchar (50) not null,
    privileges varchar (50) not null,
    email varchar (255) unique not null,
    createdOn timestamp not null,
    createdBy integer,
    lastLogin timestamp,
    foreign key(createdBy) references site_users(userID)
);

create table taxa (
    taxonID serial primary key, -- locally generated
     -- GBIF kingdom, phylum, class, order, family, genus, specificEpithet, infraspecificEpithet
    taxonName varchar (128) not null, 
    scientificName varchar (256), -- GBIF scientificName
    taxonRank varchar (50) not null, -- GBIF taxonRank
    parentID integer, -- locally generated
    foreign key(parentID) references taxa(taxonID)
);

create table public_locations (
    locationID serial primary key, -- locally generated
    continentName varchar (64) not null, -- GBIF continent
    countryName varchar (128) not null, -- GBIF country
    stateName varchar (128) not null, -- GBIF stateProvince
    countyName varchar (128), -- GBIF county
    locationName varchar (512), -- GBIF locality (specify LocalityName)
    impreciseLatitude decimal not null, -- GBIF decimalLongitude
    impreciseLongitude decimal not null -- GBIF decimalLatitude
);

create table specimen_records (
    catalogNumber varchar (32) unique not null, -- GBIF catalogNumber
    occurrenceGUID varchar (128) unique, -- GBIF occurrenceID (specify co.GUID)
    taxonID integer, -- locally generated
    collectionStartDate date, -- GBIF eventDate, year, month, day (specify ce.StartDate)
    collectionEndDate date, -- not in GBIF
    verbatimDate varchar(128), -- not in GBIF
    locationID integer, -- locally generated
    collectors text, -- GBIF recordedBy
    determinationDate date, -- GBIF dateIdentified
    determiners text, -- GBIF identifiedBy
    collectionRemarks text, -- GBIF eventRemarks (collecting event/info remarks/habitat notes)
    occurrenceRemarks text, -- collection object remarks
    determinationRemarks text, -- GBIF identificationRemarks
    typeStatus varchar (50), -- GBIF typeStatus
    stationFieldNumber varchar (50), -- GBIF fieldNumber
    foreign key(taxonID) references taxa(taxonID),
    foreign key(locationID) references public_locations(locationID)
);

create table private_coordinates (
    -- Users will be supplying this data, not GBIF.
    locationID integer primary key,
    suppliedBy integer,
    preciseLatitude decimal not null,
    preciseLongitude decimal not null,
    uncertaintyMeters decimal,
    foreign key(locationID) references public_locations(locationID),
    foreign key(suppliedBy) references site_users(userID)
);
