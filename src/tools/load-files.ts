import * as path from 'path';
import * as fs from 'fs';

import { KeyData } from '../backend/model/key_data';
import { DataKey, keyDataInfoByKey } from '../shared/data_keys';
import { Permission } from '../shared/user_auth';
import { connectDatabase } from './lib/load_database';
import { disconnectDB } from '../backend/integrations/postgres';

const setupFilesPath = path.join(__dirname, `../../setup/data_files`);

async function loadDataFiles() {
  const db = await connectDatabase();
  const fileNames = fs.readdirSync(setupFilesPath);
  for (const fileName of fileNames) {
    if (!fileName.startsWith('README') && fileName.includes('.')) {
      const keyName = fileName.substring(0, fileName.indexOf('.'));
      if (Object.values(DataKey).includes(keyName as DataKey)) {
        let data = await KeyData.read(db, null, Permission.Admin, keyName);
        if (data) {
          console.log(`Data already exists for key '${keyName}'; not overwritten.`);
        } else {
          data = fs.readFileSync(path.join(setupFilesPath, fileName)).toString();
          await KeyData.write(
            db,
            null,
            keyName,
            keyDataInfoByKey[keyName as DataKey].readPermission,
            data
          );
          console.log(`Uploaded data for key '${keyName}'.`);
        }
      } else {
        console.log(`ERROR: Data key not found for file "${fileName}".`);
      }
    }
  }
  await disconnectDB();
}

loadDataFiles();
