// What checkSideEffects reports for an export that is missing, one that imports
// a package the project doesn't have, a call rolldown can't prove pure, and a
// stylesheet with multibyte text. The package is written by hand into a
// temporary project's node_modules, with "sideEffects": false.
// Usage, from the repository root: node .plan/reviews/core-side-effects-1/probes/edges.ts
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkSideEffects } from '../../../../.scripts/release-check.ts';

const project = await mkdtemp(join(tmpdir(), 'side-effects-edges-'));
const directory = join(project, 'node_modules', 'p');
const files: Readonly<Record<string, string>> = {
  'pure.js': 'export const a = 1;\n',
  'pure-call.js': 'function f() { return 1; }\nexport const a = f();\n',
  'uninstalled.js': 'import "q";\nexport const a = 1;\n',
  'opaque-call.js': 'export const a = Object.freeze({});\n',
  'multibyte.css': 'a::after { content: "→→→"; }\n',
  'multibyte-style.js': 'import "./multibyte.css";\n',
};
const names = [
  'pure',
  'pure-call',
  'uninstalled',
  'opaque-call',
  'multibyte-style',
  'missing',
];
const exports = Object.fromEntries(
  names.map((name) => [`./${name}.js`, `./${name}.js`]),
);

try {
  await mkdir(directory, { recursive: true });
  for (const [name, code] of Object.entries(files)) {
    await writeFile(join(directory, name), code);
  }
  await writeFile(
    join(directory, 'package.json'),
    JSON.stringify({ name: 'p', type: 'module', sideEffects: false, exports }),
  );
  console.log(`exports: ${names.join(', ')}`);
  for (const { check, message } of await checkSideEffects(
    { name: 'p', sideEffects: false, exports },
    project,
  )) {
    console.log(`${check} | ${message}`);
  }
  console.log(
    `multibyte.css: ${Buffer.byteLength(files['multibyte.css']!)} bytes, ${files['multibyte.css']!.length} UTF-16 units`,
  );
} finally {
  await rm(project, { recursive: true, force: true });
}
