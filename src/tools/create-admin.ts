import * as fs from 'fs';
import * as path from 'path';
import * as readlineSync from 'readline-sync';

import { getDB, connectDB, disconnectDB } from '../integrations/postgres';
import { User } from '../model/user';
import { Permission } from '../shared/user_info';

console.log('Creating an admin for Texas Underground...\n');

const whichDB = readlineSync
  .question(`Is this for the production database (y/n)? `, {
    defaultInput: 'yes'
  })
  .toLowerCase();
const production = whichDB == 'yes' || whichDB == 'y';
const envVars = getEnvironmentVars(production);

let firstName = readlineSync.question(`User first name: `).trim();
let lastName = readlineSync.question(`User last name: `).trim();
let email = readlineSync.question(`Email address: `).trim();
let affiliation = readlineSync.question(`Affiliation (none): `).trim();
let password = readlineSync.question('Password: ', { hideEchoBack: true });

(async () => {
  await createAdmin();
  console.log(`\nCreated user ${firstName} ${lastName} with email ${email}.\n`);
})();

async function createAdmin() {
  await connectDB({
    host: envVars['VITE_DB_HOST'],
    database: envVars['VITE_DB_NAME'],
    port: parseInt(envVars['VITE_DB_PORT']),
    user: envVars['VITE_DB_USER'],
    password: envVars['VITE_DB_PASSWORD']
  });
  try {
    await User.create(
      getDB(),
      firstName,
      lastName,
      email,
      affiliation != '' ? affiliation : null,
      password,
      Permission.Admin | Permission.Edit | Permission.Coords,
      null
    );
  } catch (err: any) {
    console.log(err.message);
    await disconnectDB();
    process.exit(1);
  }
  await disconnectDB();
}

function getEnvironmentVars(production: boolean) {
  const filename = production ? '.env.production' : '.env.development';
  const filepath = path.join(__dirname, '../', filename);
  try {
    const vars: Record<string, string> = {};
    const text = fs.readFileSync(filepath).toString();
    for (const line of text.split('\n')) {
      const values = line.split('=');
      if (values[0].trim() != '') {
        vars[values[0].trim()] = values[1].trim();
      }
    }
    return vars;
  } catch (err: any) {
    console.log(err.message);
    process.exit(1);
  }
}
