// Run from packages/material-x, built: node bundle.mjs <out.js>
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const rootRequire = createRequire(`${process.cwd()}/../../package.json`);
const { rolldown } = await import(rootRequire.resolve('rolldown'));
const entries = [
  'button/button',
  'button/icon-button',
  'button/split-button',
  'icon/icon',
];
const build = await rolldown({
  input: 'entry',
  platform: 'browser',
  plugins: [
    {
      name: 'e',
      resolveId: (id) => (id === 'entry' ? id : null),
      load: (id) =>
        id === 'entry'
          ? entries
              .map(
                (e) => `import ${JSON.stringify(`${process.cwd()}/${e}.js`)};`,
              )
              .join('')
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
