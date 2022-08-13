/**
 * Command line tool for creating an admin user.
 */

import * as readlineSync from 'readline-sync';

import { loadAndCheckEnvVars } from '../backend/lib/env_vars';
import { getDB, connectDB, disconnectDB } from '../backend/integrations/postgres';
import { User } from '../backend/model/user';
import { Permission } from '../shared/user_auth';

loadAndCheckEnvVars(false);

console.log(`\nCreating an admin for ${process.env.CAVESITE_TITLE}...\n`);

let firstName = readlineSync.question(`User first name: `).trim();
let lastName = readlineSync.question(`User last name: `).trim();
let email = readlineSync.question(`Email address: `).trim();
let affiliation = readlineSync.question(`Affiliation (none): `).trim();
let password: string | null = null;
let tries = 0;
while (password == null && tries < 3) {
  password = readlineSync.question('Password: ', { hideEchoBack: true });
  let confirm = readlineSync.question('Confirm password: ', { hideEchoBack: true });
  if (confirm != password) {
    console.log('The passwords are different. Please try again...');
    password = null;
    ++tries;
  }
}
if (password == null) {
  console.log('\nNo user created.\n');
  process.exit(0);
}

(async () => {
  await createAdmin();
  console.log(`\nCreated user "${firstName} ${lastName}" with email <${email}>.\n`);
})();

async function createAdmin() {
  await connectDB({
    host: process.env.CAVESITE_DB_HOST,
    database: process.env.CAVESITE_DB_NAME,
    port: parseInt(process.env.CAVESITE_DB_PORT!),
    user: process.env.CAVESITE_DB_USER,
    password: process.env.CAVESITE_DB_PASSWORD
  });
  try {
    await User.create(
      getDB(),
      firstName,
      lastName,
      email,
      affiliation != '' ? affiliation : null,
      password!,
      Permission.Admin | Permission.Edit,
      null
    );
  } catch (err: any) {
    console.log(err.message);
    await disconnectDB();
    process.exit(1);
  }
  await disconnectDB();
}
