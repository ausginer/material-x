// P48: for each of the 10 published trait declarations, whether the stage's
// build has each JSDoc that the source puts in front of `@trait`, directly
// before `export declare class <Name>`, and the reference build lacks it.
// Usage: node docs.ts <worktree> <run.sh out dir>
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const [root, out] = process.argv.slice(2) as [string, string];
const core = [
  'checkable',
  'disableable',
  'linkable',
  'nameable',
  'reorderable',
  'selectable',
  'typeable',
  'valuable',
];
const pairs: Array<[string, string]> = [
  ...core.map((n): [string, string] => [
    `packages/core/src/traits/${n}.ts`,
    `packages/core/traits/${n}.d.ts`,
  ]),
  [
    'packages/material-x/src/core/traits/focus-forwarding.ts',
    'packages/material-x/core/traits/focus-forwarding.d.ts',
  ],
  [
    'packages/material-x/src/button/IconButtonCore.ts',
    'packages/material-x/button/IconButtonCore.d.ts',
  ],
];
let complete = 0;
for (const [src, dts] of pairs) {
  const source = readFileSync(resolve(root, src), 'utf8');
  const stage = readFileSync(resolve(out, 'stage', dts), 'utf8');
  const ref = readFileSync(resolve(out, 'ref', dts), 'utf8');
  const re =
    /(\/\*\*(?:(?!\*\/)[\s\S])*\*\/)\s*@trait\b[\s\S]*?export\s+class\s+(\w+)/gu;
  let found = 0;
  let kept = 0;
  for (const [, doc, name] of source.matchAll(re)) {
    found += 1;
    const want = `${doc}\nexport declare class ${name}`;
    if (stage.includes(want) && !ref.includes(want)) kept += 1;
  }
  console.log(`${dts}: ${kept}/${found}`);
  if (found > 0 && kept === found) complete += 1;
}
console.log(`files with every trait doc: ${complete}/${pairs.length}`);
