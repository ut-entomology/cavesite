import * as path from 'path';
import dotenv from 'dotenv';

const MIN_SESSION_KEY_CHARS = 40;

export function loadAndCheckEnvVars(forServer: boolean): void {
  const errors: string[] = [];

  // Load additional environment variables from '.env'.

  dotenv.config();

  // Check environment variables that the server uses.

  if (forServer) {
    if (!process.env.CAVESITE_BASE_URL) {
      errors.push('CAVESITE_BASE_URL - missing');
    } else if (!process.env.CAVESITE_BASE_URL.startsWith('https://')) {
      errors.push(`CAVESITE_BASE_URL - invalid`);
    }

    if (process.env.CAVESITE_PORT) {
      if (isNaN(parseInt(process.env.CAVESITE_PORT))) {
        errors.push(`CAVESITE_PORT - invalid`);
      }
    }

    if (!process.env.CAVESITE_SESSION_KEY) {
      errors.push(`CAVESITE_SESSION_KEY - missing`);
    } else if (process.env.CAVESITE_SESSION_KEY.trim().length < MIN_SESSION_KEY_CHARS) {
      errors.push(`CAVESITE_SESSION_KEY - invalid`);
    } else {
      process.env.CAVESITE_SESSION_KEY = process.env.CAVESITE_SESSION_KEY.trim();
    }

    if (!process.env.CAVESITE_LOG_DIRECTORY) {
      errors.push('CAVESITE_LOG_DIRECTORY - missing');
    } else {
      if (!'/\\'.includes(process.env.CAVESITE_LOG_DIRECTORY[0])) {
        process.env.CAVESITE_LOG_DIRECTORY = path.join(
          process.cwd(),
          process.env.CAVESITE_LOG_DIRECTORY
        );
      }
    }
  }

  // Check environment variables that the server and tools require.

  if (!process.env.CAVESITE_DB_HOST) {
    errors.push('CAVESITE_DB_HOST - missing');
  }

  if (process.env.CAVESITE_DB_PORT) {
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

  console.log(`
The server uses the following environment variables, which can be assigned in
a '.env' file found in the current directory at the time the server is run:`);

  if (forServer) {
    console.log(`
NODE_ENV - Must be set to 'production' (sans quotes) for the public website.

CAVESITE_BASE_URL* - Base URL of the website. Must start with 'https://'.
CAVESITE_PORT - Port on which to run the website. Defaults to 80.
CAVESITE_SESSION_KEY* - Secret key for signing sessions. At least ${MIN_SESSION_KEY_CHARS} characters.
CAVESITE_LOG_DIRECTORY* - Directory for the website access log files.`);
  }

  console.log(`
CAVESITE_DB_HOST* - Host domain for the PostgreSQL database server.
CAVESITE_DB_PORT* - Port of the PostgreSQL database server.
CAVESITE_DB_NAME* - Name of the database to use within PostgreSQL.
CAVESITE_DB_USER* - Name of user having all privilates to the database.
CAVESITE_DB_PASSWORD* - Database password for the above user.

* = the environment variable is required
`);

  if (errors && errors.length > 0) {
    console.log('\nPlease correct the following environment variable problems:\n');
    for (const error of errors) {
      console.log('-', error);
    }
    console.log();
    process.exit(1);
  }
}
