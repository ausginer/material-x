// Probe: a rolldown build, with the plugin, of a module that has no trait:
// a documented class with a non-trait decorator and a comment between
// `export` and `default`. argv[2] is the checkout, argv[3] the entry.
const [root, entry] = process.argv.slice(2);
const { viteTraitsPlugin } = await import(
  `${root}/packages/vite-traits-plugin/src/plugin.ts`
);
const { rolldown } = await import(
  `${root}/node_modules/rolldown/dist/index.mjs`
);
try {
  const bundle = await rolldown({
    input: entry,
    plugins: viteTraitsPlugin(),
    logLevel: 'silent',
  });
  const { output } = await bundle.generate({ format: 'esm' });
  console.log('built:', JSON.stringify(output[0].code));
} catch (e) {
  console.log(
    'build FAILED:',
    String((e as Error).message)
      .split('\n')
      .slice(0, 3)
      .join(' / '),
  );
}
