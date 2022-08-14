-- PostgreSQL

-- Run this script to create the caves database.

create database caves;
create user caves_user with encrypted password 'caves_pass';
grant all privileges on database caves to caves_user;

-- Run this script once for the website admin user.

create group caves_group;
grant connect on database caves to caves_group;
grant usage on schema public to caves_group;
grant caves_group to caves_user;

-- Run this each time you create the tables.

grant all on all tables in schema public to caves_group;
grant all on all sequences in schema public to caves_group;
