import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ZERO_ADDR = '0x0000000000000000000000000000000000000000';
const START_MARKER = 'const EXCHANGES = {';
const END_MARKER = '\n};\n\n// Per-tab state';

export function loadExchanges() {
  const appPath = join(process.cwd(), 'public', 'app.js');
  const appSource = readFileSync(appPath, 'utf8');
  const start = appSource.indexOf(START_MARKER);
  const end = appSource.indexOf(END_MARKER);

  if (start === -1 || end === -1) {
    throw new Error(`Could not locate EXCHANGES in ${appPath}`);
  }

  const exchangeSource = appSource.slice(start, end + 3);
  const factory = new Function(
    'ZERO_ADDR',
    `"use strict";\n${exchangeSource}\nreturn EXCHANGES;`,
  );

  return factory(ZERO_ADDR);
}
