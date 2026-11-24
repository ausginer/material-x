import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(`${process.cwd()}/package.json`);
const rr = createRequire(`${process.cwd()}/../../package.json`);
let p;
try {
  p = require.resolve('rolldown');
} catch {
  p = rr.resolve('rolldown');
}
const { rolldown } = await import(p);
const entries = [
  'list/list',
  'list/sortable-list',
  'list/list-item',
  'list/list-button-item',
  'list/list-link-item',
  'icon/icon',
  'button/button',
  'button/split-button',
  'button/icon-button',
  'button/link-button',
  'button/switch-button',
  'button/switch-icon-button',
  'button-group/button-group',
  'button-group/connected-button-group',
  'checkbox/checkbox',
  'radio/radio',
  'fab/fab',
  'text-field/text-field',
  'text-field/multiline-text-field',
];
const b = await rolldown({
  input: 'entry',
  platform: 'browser',
  plugins: [
    {
      name: 'e',
      resolveId: (i) => (i === 'entry' ? i : null),
      load: (i) =>
        i === 'entry'
          ? entries
              .map(
                (e) => `import ${JSON.stringify(`${process.cwd()}/${e}.js`)};`,
              )
              .join('')
          : null,
    },
  ],
});
const { output } = await b.generate({ format: 'iife', name: 'mx' });
fs.writeFileSync(
  process.argv[2],
  output
    .map((c) => c.code ?? '')
    .join('\n')
    .replaceAll('</script', '<\\/script'),
);
