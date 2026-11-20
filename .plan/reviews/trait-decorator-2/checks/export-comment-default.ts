// Probe: the load stage on a documented `@dec export /* c */ default class`,
// in the checkout given as argv[2]. Any decorated class counts, not only a trait.
const root = process.argv[2];
const { moveExportBeforeDecorators } = await import(
  `${root}/packages/vite-traits-plugin/src/declaration-doc.ts`
);
for (const code of [
  '/** Doc. */\n@trait\nexport /* c */ default class X {}\n',
  '/** Doc. */\n@sealed\nexport // c\ndefault class Y {}\n',
  '/** Doc. */\n@trait\nexport /* c */ class Z {}\n',
]) {
  try {
    const r = moveExportBeforeDecorators('/x.ts', code);
    console.log(
      JSON.stringify(code),
      '->',
      r ? JSON.stringify(r.magic.toString()) : 'null',
    );
  } catch (e) {
    console.log(
      JSON.stringify(code),
      '-> THROWS',
      `${(e as Error).constructor.name}: ${(e as Error).message}`,
    );
  }
}
