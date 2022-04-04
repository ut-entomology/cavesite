-- PostgreSQL

-- Run this script to create the dev database. You'll want to
-- create the production database with different user credentials.

create database dev_caves;
create user dev_user with encrypted password 'dev_pass';
grant all privileges on database dev_caves to dev_user;
