# Source Code for Texas Underground

This repo holds the source code for the [Texas Underground](http://caves.tacc.utexas.edu) SPA website. The site is a platform that provides cave researchers with access to the data for the biospeleological collection at the University of Texas at Austin. The university keeps the data in a Specify6 database and periodically uploads the data to GBIF. This site periodically downloads the data from GBIF for presentation and querying. All of the data is public.

## Implementation

The site is written in TypeScript, Svelte, and PostgreSQL. TypeScript is a superset of JavaScript that provides static type checking. It is nearly identical to JavaScript, and any JavaScript developer who is already familiar with another statically typed language, such as Java or C++, should have no problem maintaining it.

Svelte is a simple template language for creating reactive user interfaces in JavaScript/TypeScript, HTML, and CSS. It is similar to REACT in that the developer designs the layout of the page as a function of state variables without having to write code that changes the page layout. When you change the variables, the layout changes automatically. It is touted as being much easier to learn than REACT, but it still has a learning curve, and there are idioms to master for properly handling state. (SvelteKit is not used.)

The PostgreSQL consists of simple tables and simple SQL statements. It takes advantage of the fact that the data is always imported and never locally maintained. The schemas are sometimes redundant and sometimes flat, making for simpler queries and faster responses. Stateful data includes users, sessions, key-lookup data files, and logs.

## Installation for Deployment

To install the site on a publicly available server, follow the instructions in the [installation manual](https://github.com/ut-entomology/cavesite/blob/main/setup/installation-manual.md).

## Installation for Development

To install the source locally for development, you'll need to first install the following:

- Node.js
- The NPM package manager
- The yarn package manager (dependencies are maintained via yarn)
- TypeScript
- PostgreSQL and psql

Then git clone this repo. I'll assume its directory name is 'cavesite'.

## Configuring the Server

The server relies on environment variables stored in `cavesite/.env`, which the repo does not provide. Create this file from the following template:

```
CAVESITE_BASE_URL=http://localhost
CAVESITE_PORT=3000
CAVESITE_LOG_DIR=path-to-API-log-dir
CAVESITE_HIDDEN_TABS=comma-delimited-names-of-tabs-you-want-to-hide
CAVESITE_SENDER_EMAIL=reply-address-for-emails

SENDGRID_API_KEY=sender-sendgrid-key
MAPBOX_ACCESS_TOKEN=your-mapbox-access-token

CAVESITE_DB_HOST=localhost
CAVESITE_DB_PORT=5432
CAVESITE_DB_NAME=caves
CAVESITE_DB_USER=postgres-user-name
CAVESITE_DB_PASSWORD=postgres-user-password
```

You'll need to get a SendGrid key and a MapBox access token.

You also need to start the PostgreSQL server, create the database, create the tables, and give a user permission to access the tables.

If your user is already setup with permission to access a database named 'caves', you can run the `bin/setup-db` command to create the tables and give the user access. Otherwise, you can create a database called 'dev_caves' with the SQL in `setup/sql/create_dev_db.sql`. After doing this, as well as after any change you make to the database schema, you can run the following commands to drop the tables, create new tables, and grant the user permissions:

```
psql caves -f ./setup/sql/drop_tables.sql
psql caves -f ./setup/sql/create_tables.sql
psql caves -f ./setup/sql/dev_permissions.sql
```

Note that `drop_tables.sql` does not drop the users, key_data, or logs tables. You can drop those manually when you need to, or else run `drop_all_tables.sql`.

I preferred to instead keep psql running and copy-paste SQL into it as needed.

## Building and Running Locally

Build and run the site with the following series of commands:

```
cd ~/cavesite
yarn
yarn run dev
```

You do have to build with yarn and not NPM because the version dependencies are in yarn.lock.

The site will then be running on http://localhost port 80. Nodemon will monitor the client source and rebuild/reload the page upon detecting changes.

`yarn run dev` builds the server, but if nodemon is already running (watching source code), you can both rebuild and rerun the server as follows:

```
cd ~/cavesite
tsc
```

While developing the site, I found that cached build client-side files were not always replaced upon being rebuilt. For this reason, I used the following commands every time I reran the client:

```
cd ~/cavesite
rm -rdf build
yarn run dev
```

## Running the Test Suites

Unit tests are written for `jest` and appear adjacent in the code to the modules they test with extension `.test.ts`. You'll find a list of them in `bin/test-all`. You can run them with the following command:

```
yarn run unit-tests
```

Browser-based web tests are written for `playwright` and appear in the directory `src/frontend/ui-tests`. They require that the server be running on localhost with valid data. You can run them with the following command:

```
yarn run web-tests
```
