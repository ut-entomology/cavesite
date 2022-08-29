/**
 * Command line tool for chunking a CSV into files
 * having a maximum number of lines.
 */

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
let headerLine = '';

// Load lines.

let rawFileText: string;
try {
  rawFileText = fs.readFileSync(csvPath, 'utf8');
} catch (err: any) {
  console.error(err.message);
  process.exit(1);
}
const inputLines = rawFileText.split(/\r?\n/);
const outputLines: string[] = [];

// Index all lines by their catalog numbers.

const linesByCatNum: Record<string, string[]> = {};
for (const line of inputLines) {
  const columns = line.split(',');
  const catNum = columns[4];
  let catNumLines = linesByCatNum[catNum];
  if (!catNumLines) {
    catNumLines = [line];
    linesByCatNum[catNum] = catNumLines;
  } else {
    catNumLines.push(line);
  }
}

// Remove second and subsequent duplicates.

for (const line of inputLines) {
  const columns = line.split(',');
  const catNum = columns[4];
  const catNumLines = linesByCatNum[catNum];
  if (catNumLines[0] == line) {
    outputLines.push(line);
  } else {
    const keptInfo = getDescription(catNumLines[0]);
    for (let i = 1; i < catNumLines.length; ++i) {
      const droppedInfo = getDescription(catNumLines[i]);
      console.log(`"${catNum}","${keptInfo}","${droppedInfo}"`);
    }
  }
}

// Write chunks.

let chunkNumber = 1;
for (let i = 0; i < outputLines.length; i += LINES_PER_CHUNK) {
  const chunkLines = outputLines.slice(i, i + LINES_PER_CHUNK);
  if (i == 0) {
    headerLine = outputLines[0];
  } else {
    chunkLines.unshift(headerLine);
  }
  const chunkFile = path.join(
    outputPath,
    `chunk-${String(chunkNumber).padStart(2, '0')}.csv`
  );
  fs.writeFileSync(chunkFile, chunkLines.join('\n'));
  ++chunkNumber;
}

function getDescription(line: string): string {
  const columns = line.split(',');

  const taxa: string[] = [];
  for (let i = 5; i <= 12; ++i) {
    if (i != 9) taxa.push(columns[i]);
  }
  const startingTaxon =
    taxa.findIndex((t) => t == '' || t[0] == t[0].toLowerCase()) - 1;

  const taxon = taxa.slice(startingTaxon).join(' ').trim();
  const locality = columns[16];

  return `${taxon}: ${locality}`;
}
