-- PostgreSQL

-- Run this script to create the development database. You'll want
-- to create the production database with different user credentials.

create database caves;
create user dev_user with encrypted password 'dev_pass';
grant all privileges on database caves to dev_user;
