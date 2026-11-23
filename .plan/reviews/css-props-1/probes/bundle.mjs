import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { writeFileSync } from 'node:fs';
import { brotliCompressSync, gzipSync, constants } from 'node:zlib';
const [pkg, out] = process.argv.slice(2);
const req = createRequire(pkg + '/package.json');
let r;
try {
  r = await import(pathToFileURL(req.resolve('rolldown')).href);
} catch {
  r = await import(
    pathToFileURL(
      createRequire(
        req.resolve('size-limit-preset-rolldown/package.json'),
      ).resolve('rolldown'),
    ).href
  );
}
for (const n of [
  'text-field/text-field',
  'text-field/multiline-text-field',
  'button/button',
  'button/icon-button',
  'button/link-button',
  'button/split-button',
  'checkbox/checkbox',
  'list/sortable-list',
]) {
  const b = await r.rolldown({
    input: `${pkg}/${n}.js`,
    platform: 'browser',
    logLevel: 'silent',
  });
  const { output } = await b.generate({
    format: 'esm',
    minify: true,
    codeSplitting: false,
  });
  const c = output.map((o) => o.code ?? '').join('');
  const mods = output.flatMap((o) => o.moduleIds ?? []);
  writeFileSync(`${out}-${n.replace('/', '_')}.js`, c);
  const br = (q) =>
    brotliCompressSync(c, { params: { [constants.BROTLI_PARAM_QUALITY]: q } })
      .length;
  console.log(
    n.padEnd(32),
    'raw',
    c.length,
    'gzip',
    gzipSync(c, { level: 9 }).length,
    'br11',
    br(11),
    'br9',
    br(9),
    'br5',
    br(5),
    '| useCSSProps module:',
    mods.some((m) => m.endsWith('useCSSProps.js')),
    '| icon-button:',
    mods.some((m) => m.endsWith('button/icon-button.js')),
  );
}
