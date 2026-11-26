// Copies `built/value.js` to `dist/`, which a test reads, and appends a line to
// the file that `FIXTURE_LOG` names, so a test counts the builds.
import { appendFileSync, copyFileSync, mkdirSync } from 'node:fs';
import process from 'node:process';

mkdirSync('dist', { recursive: true });
copyFileSync('built/value.js', 'dist/value.js');

if (process.env['FIXTURE_LOG']) {
  appendFileSync(process.env['FIXTURE_LOG'], 'build\n');
}
