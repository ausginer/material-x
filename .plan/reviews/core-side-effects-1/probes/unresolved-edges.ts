// What checkSideEffects reports at 5a16e410b for imports that rolldown does not resolve:
// a node: built-in, an effect next to an unresolved import, one two modules deep,
// two modules importing one missing package, and a dynamic import of a missing file.
// Usage, from the repository root: node .plan/reviews/core-side-effects-1/probes/unresolved-edges.ts $PWD/.scripts/release-check.ts
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const { checkSideEffects } = await import(process.argv[2]!);
const project = await mkdtemp(join(tmpdir(), 'side-effects-edges2-'));
const directory = join(project, 'node_modules', 'p');
const files: Record<string, string> = {
  'builtin.js':
    'import { readFile } from "node:fs";\nexport const a = readFile;\n',
  'builtin-bare.js': 'import "node:fs";\nexport const a = 1;\n',
  'effect-and-missing.js':
    'import "q";\nglobalThis.x = 1;\nexport const a = 1;\n',
  'deep.js': 'import "./inner.js";\nexport const a = 1;\n',
  'inner.js': 'import "./gone.js";\nexport const b = 1;\n',
  'twice.js': 'import "./one.js";\nimport "./two.js";\n',
  'one.js': 'import "q";\n',
  'two.js': 'import "q";\n',
  'dynamic.js': 'export const load = () => import("./absent.js");\n',
};
const names = [
  'builtin',
  'builtin-bare',
  'effect-and-missing',
  'deep',
  'twice',
  'dynamic',
];
const exports = Object.fromEntries(
  names.map((n) => [`./${n}.js`, `./${n}.js`]),
);
try {
  await mkdir(directory, { recursive: true });
  for (const [n, c] of Object.entries(files))
    await writeFile(join(directory, n), c);
  await writeFile(
    join(directory, 'package.json'),
    JSON.stringify({ name: 'p', type: 'module', sideEffects: false, exports }),
  );
  for (const { check, message } of await checkSideEffects(
    { name: 'p', sideEffects: false, exports },
    project,
  )) {
    console.log(`${check} | ${message}`);
  }
} catch (e) {
  console.log('THREW', (e as Error).message.split('\n')[0]);
} finally {
  await rm(project, { recursive: true, force: true });
}
