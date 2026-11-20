// Rewrites each given trait source from `static { trait(this); … }` to
// `@trait` and `@attributes(T)` above the statement, in place, below its JSDoc.
// With --after-export, `export @trait class` instead.
//   node migrate.ts [--after-export] <file>...
import { readFile, writeFile } from 'node:fs/promises';
import { migrateSource } from './decorators.ts';

const args = process.argv.slice(2);
const afterExport = args[0] === '--after-export';
for (const file of afterExport ? args.slice(1) : args) {
  const next = migrateSource(file, await readFile(file, 'utf8'), afterExport);
  if (next === null) {
    console.log(`unchanged ${file}`);
  } else {
    await writeFile(file, next);
    console.log(`migrated  ${file}`);
  }
}
