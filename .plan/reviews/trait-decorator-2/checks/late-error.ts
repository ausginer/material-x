// A documented trait, then a syntax error later in the module.
const root = process.argv[2];
const { moveExportBeforeDecorators } = await import(
  `${root}/packages/vite-traits-plugin/src/declaration-doc.ts`
);
const code = '/** D. */\n@trait\nexport default class X {}\nconst = 1;\n';
try {
  const r = moveExportBeforeDecorators('/x.ts', code);
  console.log(r ? JSON.stringify(r.magic.toString()) : 'null');
} catch (e) {
  console.log('THROWS', (e as Error).message);
}
