// The witnesses of the row on the scroll start's drawing and hits. Run from
// packages/material-x: node ../../.plan/top-app-bar-1/probes/mutations-3.mjs
// The stylesheet is restored at the end.
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const file = 'src/top-app-bar/styles/default/main.styles.css';
const good = readFileSync(file, 'utf8');
const declaration = '  visibility: hidden;\n';

if (good.split(declaration).length !== 2) throw new Error('not one match');

const mutations = {
  'as it is': declaration,
  'no visibility': '',
  'opacity: 0 in its place': '  opacity: 0;\n',
  'pointer-events: none in its place': '  pointer-events: none;\n',
};

try {
  for (const [name, text] of Object.entries(mutations)) {
    writeFileSync(
      file,
      good.replace(declaration, () => text),
    );

    for (const engine of ['chromium', 'firefox', 'webkit']) {
      const { stdout, stderr } = spawnSync(
        'aube',
        [
          'exec',
          'vitest',
          'run',
          '-c',
          'vitest.config.ts',
          '--project',
          'browser*',
          'tests/top-app-bar/top-app-bar.browser',
        ],
        {
          encoding: 'utf8',
          env: { ...process.env, MX_TEST_ENGINES: engine, NO_COLOR: '1' },
        },
      );
      const out = stdout + stderr;
      console.log(`## ${name} | ${engine} | ${/Tests  (.*)/u.exec(out)?.[1]}`);
      for (const line of new Set(
        out.match(/^ FAIL .*|AssertionError: .*/gmu) ?? [],
      ))
        console.log(
          `   ${line
            .trim()
            .replace(/^FAIL.*test\.ts:\d+ > /u, '')
            .slice(0, 130)}`,
        );
    }
  }
} finally {
  writeFileSync(file, good);
}
