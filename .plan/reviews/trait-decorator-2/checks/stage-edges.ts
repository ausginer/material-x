// Probe: the load stage and positionWithoutStage on edge forms.
// argv[2] is the checkout.
const P = `${process.argv[2]}/packages/vite-traits-plugin/src/`;
const { moveExportBeforeDecorators, positionWithoutStage } = await import(
  P + 'declaration-doc.ts'
);
const { parseModule } = await import(P + 'syntax.ts');

const cases: Record<string, string> = {
  'comment between export and default':
    '/** d */\n@trait\nexport /* c */ default class X {}\n',
  'comment after last decorator':
    '/** d */\n@trait /* c */ export class X {}\n',
  'comment after last decorator, default':
    '/** d */\n@trait /* c */ export default class X {}\n',
  'jsdoc then other statement then decorator':
    '/** d */\nconst a = 1;\n@trait\nexport class X {}\n',
  'trailing jsdoc on same line as prev':
    'const a = 1; /** d */\n@trait\nexport class X {}\n',
  'anonymous default, two decorators':
    '/** d */\n@trait\n@sealed\nexport default class {}\n',
  'two classes, second documented':
    '@trait\nexport class A {}\n/** d */ // n\n@trait\nexport default class B {}\n',
};
for (const [name, code] of Object.entries(cases)) {
  try {
    const r = moveExportBeforeDecorators('/x.ts', code);
    if (!r) {
      console.log(`${name}: unchanged`);
      continue;
    }
    const out = r.magic.toString();
    // Map every position of `out` back and compare the character with the source.
    const program = parseModule('/x.ts', out);
    const bad: number[] = [];
    for (let i = 0; i < out.length; i++) {
      const j = positionWithoutStage(program, out, r.exports, i);
      if (out[i] !== code[j] && !/\s/u.test(out[i]!)) bad.push(i);
    }
    console.log(
      `${name}: ${JSON.stringify(out)} exports=${[...r.exports]} mismapped=${bad.length ? bad.map((i) => `${i}:${JSON.stringify(out[i])}`).join(',') : 'none'}`,
    );
  } catch (e) {
    console.log(
      `${name}: THROWS ${(e as Error).constructor.name}: ${(e as Error).message}`,
    );
  }
}
