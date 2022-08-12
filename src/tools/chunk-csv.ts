import * as fs from 'fs';
import * as path from 'path';

const LINES_PER_CHUNK = 2000;

if (process.argv.length != 4) {
  console.log(
    `First argument must be the path to the CSV file you'd like to split into ${LINES_PER_CHUNK} line chunks. Second argumnt must be the directory into which you would like to write the chunks.\n`
  );
  process.exit(1);
}

const csvPath = path.join(process.cwd(), process.argv[2]);
const outputPath = path.join(process.cwd(), process.argv[3]);

let rawFileText: string;
try {
  rawFileText = fs.readFileSync(csvPath, 'utf8');
} catch (err: any) {
  console.error(err.message);
  process.exit(1);
}
const lines = rawFileText.split(/\r?\n/);

let chunkNumber = 1;
for (let i = 0; i < lines.length; i += LINES_PER_CHUNK) {
  const chunkLines = lines.slice(i, i + LINES_PER_CHUNK);
  const chunkFile = path.join(
    outputPath,
    `chunk-${String(chunkNumber).padStart(2, '0')}.csv`
  );
  fs.writeFileSync(chunkFile, chunkLines.join('\n'));
  ++chunkNumber;
}
