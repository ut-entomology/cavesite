# Source for the Texas Underground Website

Created by the University of Texas at Austin to make data from the biospeleology collection available online.

## Installation

- Install and run a PostgreSQL database server.
- Create development and production databases, as appropriate, using SQL given in the `setup/` directory.
- Create `.env.development` and `.env.production` files, as appropriate, providing the following environment variables, with appropriate values:

VITE_DB_HOST=localhost
VITE_DB_PORT=5432
VITE_DB_NAME=dev_caves
VITE_DB_USER=dev_user
VITE_DB_PASSWORD=dev_pass

- Run `yarn` from the top-level directory to install dependencies.
- Create the first adminstrator using the tool `tools/create-admin`.

## Development

To run the site locally in development mode:

`yarn run dev`

To run the site locally in development mode and open a browser window:

`yarn run dev -- --open`

## Production

To preview the production version:

`yarn run preview`

To create a production version:

`yarn run build`
