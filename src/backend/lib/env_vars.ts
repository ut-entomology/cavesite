/**
 * Provides the service of loading and checking the environment variables
 * that configure the server for operation.
 */

import * as path from 'path';
import dotenv from 'dotenv';

export function loadAndCheckEnvVars(forServer: boolean): void {
  const errors: string[] = [];

  // Load additional environment variables from '.env'.

  dotenv.config();

  // Check environment variables that the server uses.

  if (process.env.CAVESITE_BASE_URL) {
    if (
      !process.env.CAVESITE_BASE_URL.startsWith('http://') &&
      !process.env.CAVESITE_BASE_URL.startsWith('https://')
    ) {
      errors.push('CAVESITE_BASE_URL - must begin with http:// or https://');
    }
  } else {
    errors.push('CAVESITE_BASE_URL - missing');
  }

  if (forServer) {
    if (process.env.CAVESITE_PORT) {
      if (isNaN(parseInt(process.env.CAVESITE_PORT))) {
        errors.push(`CAVESITE_PORT - invalid`);
      }
    } else {
      process.env.CAVESITE_PORT = '80';
    }

    if (!process.env.CAVESITE_LOG_DIR) {
      errors.push('CAVESITE_LOG_DIR - missing');
    } else {
      if (!'/\\'.includes(process.env.CAVESITE_LOG_DIR[0])) {
        process.env.CAVESITE_LOG_DIR = path.join(
          process.cwd(),
          process.env.CAVESITE_LOG_DIR
        );
      }
    }

    const logRestart = process.env.CAVESITE_LOG_SERVER_RESTART;
    if (logRestart && !['on', 'off'].includes(logRestart)) {
      errors.push("CAVESITE_LOG_SERVER_RESTART - must be 'on' or 'off'");
    }
  }

  // Check environment variables that the server and tools require.

  if (!process.env.CAVESITE_DB_HOST) {
    errors.push('CAVESITE_DB_HOST - missing');
  }

  if (!process.env.CAVESITE_DB_PORT) {
    errors.push('CAVESITE_DB_PORT - missing');
  } else {
    if (isNaN(parseInt(process.env.CAVESITE_DB_PORT))) {
      errors.push(`CAVESITE_DB_PORT - invalid`);
    }
  }

  if (!process.env.CAVESITE_DB_NAME) {
    errors.push('CAVESITE_DB_NAME - missing');
  }

  if (!process.env.CAVESITE_DB_USER) {
    errors.push('CAVESITE_DB_USER - missing');
  }

  if (!process.env.CAVESITE_DB_PASSWORD) {
    errors.push('CAVESITE_DB_PASSWORD - missing');
  }

  // Show problems found with environment variables.

  if (errors && errors.length > 0) {
    const thisApp = forServer ? 'This server' : 'This tool';
    console.log(`
${thisApp} uses the following environment variables, which can be assigned in
a '.env' file found in the current directory at the time the server is run:`);

    if (forServer) {
      console.log(`
NODE_ENV - Must be set to 'production' (sans quotes) for the public website.

CAVESITE_BASE_URL* - Base URL of web site, starting with http:// or https://
CAVESITE_LOG_SERVER_RESTART - Set to 'on' to log server restarts.

CAVESITE_PORT - Port on which to run the website. Defaults to 80.
CAVESITE_LOG_DIR* - Directory for the website access log files.`);
    }

    console.log(`
CAVESITE_DB_HOST* - Host domain for the PostgreSQL database server.
CAVESITE_DB_PORT* - Port of the PostgreSQL database server.
CAVESITE_DB_NAME* - Name of the database to use within PostgreSQL.
CAVESITE_DB_USER* - Name of user having all privilates to the database.
CAVESITE_DB_PASSWORD* - Database password for the above user.

* = the environment variable is required
`);

    console.log('Please correct the following environment variable problems:\n');
    for (const error of errors) {
      console.log('-', error);
    }
    console.log();
    process.exit(1);
  }
}
