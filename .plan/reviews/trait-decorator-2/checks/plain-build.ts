// A rolldown build of argv[3] without the plugin, in checkout argv[2].
const [root, entry] = process.argv.slice(2);
const { rolldown } = await import(
  `${root}/node_modules/rolldown/dist/index.mjs`
);
try {
  const b = await rolldown({ input: entry, logLevel: 'silent' });
  console.log(
    'built:',
    JSON.stringify((await b.generate({ format: 'esm' })).output[0].code),
  );
} catch (e) {
  console.log(
    'build FAILED:',
    String((e as Error).message)
      .split('\n')
      .slice(0, 3)
      .join(' / '),
  );
}
