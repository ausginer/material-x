import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { readFileSync } from 'node:fs';
const pkg = process.argv[2];
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
const files = JSON.parse(readFileSync(pkg + '/files.json', 'utf8'));
for (const e of files.runtime) {
  const name = typeof e === 'string' ? e : JSON.stringify(e);
  const path =
    pkg +
    '/' +
    name
      .replace(/^\.\//, '')
      .replace(/\.ts$/, '')
      .replace(/^src\//, '') +
    (name.endsWith('.js') ? '' : '.js');
  const b = await r.rolldown({
    input: path,
    platform: 'browser',
    logLevel: 'silent',
  });
  const { output } = await b.generate({ format: 'esm', codeSplitting: false });
  const mods = output.flatMap((c) => c.moduleIds ?? []);
  const code = output.map((c) => c.code ?? '').join('');
  console.log(
    name.padEnd(45),
    'aria-notify module:',
    mods.some((m) => m.includes('aria-notify')),
    '| template text:',
    code.includes('aria-live'),
    '| css:',
    /clip-path:\s*inset\(50%\)/.test(code) && code.includes('.aria-notify'),
    '| has-slotted:',
    mods.some((m) => m.includes('has-slotted')),
  );
}
