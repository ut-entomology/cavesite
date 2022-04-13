-- PostgreSQL

-- Run this script to create the dev database. You'll want to
-- create the production database with different user credentials.

create database dev_caves;
create user dev_user with encrypted password 'dev_pass';
grant all privileges on database dev_caves to dev_user;

create group dev_group;
grant connect on database dev_caves to dev_group;
grant usage on schema public to dev_group;
grant all on all tables in schema public to dev_group;
grant all on all sequences in schema public to dev_group;
grant dev_group to dev_user;