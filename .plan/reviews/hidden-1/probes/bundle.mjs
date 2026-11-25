// Run from packages/material-x, built: node bundle.mjs <out.js>
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const rootRequire = createRequire(`${process.cwd()}/../../package.json`);
const { rolldown } = await import(rootRequire.resolve('rolldown'));
const { runtime } = JSON.parse(readFileSync('files.json', 'utf8'));
const build = await rolldown({
  input: 'entry',
  platform: 'browser',
  plugins: [
    {
      name: 'e',
      resolveId: (id) => (id === 'entry' ? id : null),
      load: (id) =>
        id === 'entry'
          ? runtime
              .map(
                (e) => `import ${JSON.stringify(`${process.cwd()}/${e}.js`)};`,
              )
              .join('') +
            `globalThis.TAGS=${JSON.stringify(runtime.map((e) => `mx-${e.split('/').at(-1)}`))};`
          : null,
    },
  ],
});
const { output } = await build.generate({ format: 'iife', name: 'mx' });
writeFileSync(
  process.argv[2],
  output
    .map((c) => c.code ?? '')
    .join('\n')
    .replaceAll('</script', '<\\/script'),
);
