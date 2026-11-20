// Probe: the load stage and positionWithoutStage on trivia around and between
// the keywords, CRLF, and a module that doesn't parse. For each form: whether
// it throws, the output, whether the output parses, whether every non-space
// character maps back to itself, and whether oxc's declaration emitter keeps
// `/** D. */` before the class. argv[2] is the checkout.
const root = process.argv[2];
const src = `${root}/packages/vite-traits-plugin/src/`;
const { moveExportBeforeDecorators, positionWithoutStage } = await import(
  `${src}declaration-doc.ts`
);
const { parseModule } = await import(`${src}syntax.ts`);
const { parseSync } = await import(
  `${root}/node_modules/oxc-parser/src-js/index.js`
).catch(
  () =>
    import(
      `${root}/node_modules/.aube/node_modules/oxc-parser/src-js/index.js`
    ),
);
const { isolatedDeclarationSync } = await import(
  `${root}/node_modules/oxc-transform/index.js`
);

const tail = ' class X {}\n';
const cases: Record<string, string> = {
  'nested-looking block':
    '/** D. */\n@trait\nexport /* a /* b */ default' + tail,
  '/*/ edge': '/** D. */\n@trait\nexport /*/ x */ default' + tail,
  '/**/ empty': '/** D. */\n@trait\nexport /**/ default' + tail,
  'JSDoc-looking between keywords':
    '/** D. */\n@trait\nexport /** Not the doc. */ default' + tail,
  'line comment, CRLF':
    '/** D. */\r\n@trait\r\nexport // c\r\ndefault' +
    tail.replace('\n', '\r\n'),
  'whole module CRLF, named':
    '/** D. */\r\n@trait\r\n@sealed\r\nexport class X {}\r\n',
  'line comment ended by U+2028':
    '/** D. */\n@trait\nexport // c default' + tail,
  'comment after last decorator':
    '/** D. */\n@trait /* c */ export /* d */ default /* e */' + tail,
  'line comment after last decorator':
    '/** D. */\n@trait // c\nexport default' + tail,
  'comments between decorators':
    '/** D. */\n@trait /* a */ @sealed // b\nexport /* c */ default' + tail,
  'decorator with */ in a string arg':
    '/** D. */\n@tag("*/")\nexport /* c */ default' + tail,
  'export default abstract':
    '/** D. */\n@trait\nexport /* c */ default abstract' + tail,
  'export abstract, comment':
    '/** D. */\n@trait\nexport /* c */ abstract' + tail,
  'anonymous default, comment':
    '/** D. */\n@trait\nexport /* c */ default class {}\n',
  'unparseable: unclosed class':
    '/** D. */\n@trait\nexport default class X {\n',
  'unparseable: nested comment closes early':
    '/** D. */\n@trait\nexport /* a /* b */ c */ default' + tail,
  'unparseable: decorator then garbage':
    '/** D. */\n@trait\nexport default %%% class X {}\n',
};
for (const [name, code] of Object.entries(cases)) {
  let r;
  try {
    r = moveExportBeforeDecorators('/x.ts', code);
  } catch (e) {
    console.log(`${name}: THROWS ${(e as Error).message}`);
    continue;
  }
  if (!r) {
    console.log(
      `${name}: null (source parse errors: ${parseSync('/x.ts', code).errors.length})`,
    );
    continue;
  }
  const out = r.magic.toString();
  const errors = parseSync('/x.ts', out).errors.length;
  const program = parseModule('/x.ts', out);
  const bad: string[] = [];
  for (let i = 0; i < out.length; i++) {
    const j = positionWithoutStage(program, out, r.exports, i);
    if (!/\s/u.test(out[i]!) && out[i] !== code[j])
      bad.push(`${i}:${JSON.stringify(out[i])}`);
  }
  const dts = isolatedDeclarationSync('/x.ts', out).code;
  console.log(
    `${name}: ${JSON.stringify(out)} | output parse errors ${errors} | mismapped ${bad.length ? bad.join(',') : 'none'} | .d.ts keeps doc ${/\/\*\* D\. \*\/\s*export/u.test(dts)} | .d.ts ${JSON.stringify(dts)}`,
  );
}
