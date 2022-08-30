/**
 * Tool for parsing the karst obligates out of the raw file that James provided.
 */

import * as fs from 'fs';
import * as path from 'path';

const NON_TAXA = [
  'Species',
  'Stygobites',
  'Troglobites',
  'Undetermined',
  'New genus',
  '“Cyclops',
  '"Cyclops'
];

if (process.argv.length != 3) {
  console.log(
    'Please provide the path to the raw file listing karst obligates at one per line. Each line lists a genus, species, or species+subspecies. The program cleans up the data, inferring missing information from preceding lines.\n'
  );
  process.exit(1);
}

const filepath = path.join(process.cwd(), process.argv[2]);

let rawFileText: string;
try {
  rawFileText = fs.readFileSync(filepath, 'utf8');
} catch (err: any) {
  console.error(err.message);
  process.exit(1);
}
const lines = rawFileText.split(/\r?\n/);

let priorLine = '';
let priorGenus = '';
for (let i = 0; i < lines.length; ++i) {
  let line = lines[i].trim();
  if (lineContainsTaxon(line)) {
    // Remove pounds, repeated spaces and add spaces after periods.
    line = line.replaceAll('#', '');
    line = line.replaceAll(/  +/g, ' ');
    line = line.replaceAll('. ', '.').replaceAll('.', '. ');

    // Concatenate wrapped lines.
    if (line[0] == line[0].toLowerCase()) {
      if (priorLine[priorLine.length - 1] == '-') {
        line = priorLine.substring(0, priorLine.length - 1) + line;
      } else {
        line = priorLine + ' ' + line;
      }
    }

    // Remove parenthetic text.
    const firstParen = line.indexOf('(');
    const lastParen = line.indexOf(')');
    if (firstParen >= 0) {
      line =
        line.substring(0, firstParen).trim() +
        ' ' +
        line.substring(lastParen + 1).trim();
    }

    // Expand an abbreviated genus.
    if (line[1] == '.') {
      if (line[0] != priorGenus[0]) {
        throw Error(`Abbreviation doesn't match prior genus at line ${i + 1}`);
      }
      line = priorGenus + line.substring(2);
    }

    // Update the prior genus and the prior line.
    const firstSpace = line.indexOf(' ');
    priorGenus = firstSpace < 0 ? line : line.substring(0, firstSpace);
    priorLine = line;

    // Write the revised taxon to stdout.
    if (line[line.length - 1] != '-') {
      console.log(line);
    }
  }
}

function lineContainsTaxon(line: string): boolean {
  if (line.length == 0) return false;
  for (const nonTaxon of NON_TAXA) {
    if (line.includes(nonTaxon)) return false;
  }
  return true;
}
