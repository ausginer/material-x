// Where each tool keeps a trait's JSDoc, for each placement of the doc and the
// decorators:
//   oxc     the isolated-declarations emitter tsdown uses (rolldown/experimental)
//   ts6-dts TypeScript 6's declaration emit (ts.transpileDeclaration)
//   ts6-doc the documentation TypeScript 6 gives the class symbol, which an
//           editor's hover shows
// With `--write <dir>`, also writes each case to <dir>/<n>.ts, for tsc 7.
//   node placement.ts [--write <dir>]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { isolatedDeclarationSync } from 'rolldown/experimental';
import ts from 'typescript';

const DOC = '/**\n * The doc.\n */';
const BODY = 'class X extends Base {\n  accessor x!: boolean;\n}';

export const cases: Array<[string, string]> = [
  ['doc, export class (today)', `${DOC}\nexport ${BODY}`],
  ['doc, @trait, export class', `${DOC}\n@trait\nexport ${BODY}`],
  [
    'doc, @trait, @attributes(T), export class',
    `${DOC}\n@trait\n@attributes(T)\nexport ${BODY}`,
  ],
  ['@trait, doc, export class', `@trait\n${DOC}\nexport ${BODY}`],
  [
    '@trait, @attributes(T), doc, export class',
    `@trait\n@attributes(T)\n${DOC}\nexport ${BODY}`,
  ],
  ['doc, export, @trait, class', `${DOC}\nexport @trait ${BODY}`],
  [
    'doc, export, @trait, @attributes(T), class (oxfmt layout)',
    `${DOC}\nexport\n@trait\n@attributes(T)\n${BODY}`,
  ],
  ['export, doc, @trait, class', `export ${DOC}\n@trait ${BODY}`],
  ['export, @trait, doc, class', `export @trait\n${DOC}\n${BODY}`],
  [
    'doc, @trait, class (not exported)',
    `${DOC}\n@trait\n${BODY}\nexport { X };`,
  ],
];

export const prelude =
  "import { trait } from './c.ts';\nimport { attributes, Base } from './a.ts';\nconst T = {};\n";

function hoverDoc(text: string): boolean {
  const file = 'x.ts';
  const host = ts.createCompilerHost({});
  const original = host.getSourceFile.bind(host);
  host.getSourceFile = (name, version) =>
    name === file
      ? ts.createSourceFile(file, text, version, true)
      : original(name, version);
  const program = ts.createProgram(
    [file],
    { noLib: true, noResolve: true },
    host,
  );
  const checker = program.getTypeChecker();
  const source = program.getSourceFile(file)!;
  const cls = source.statements.find(ts.isClassDeclaration)!;
  const symbol = checker.getSymbolAtLocation(cls.name!)!;
  return ts
    .displayPartsToString(symbol.getDocumentationComment(checker))
    .includes('The doc.');
}

const mark = (kept: boolean): string => (kept ? 'KEPT   ' : 'DROPPED');
const write = process.argv.indexOf('--write');
const dir = write === -1 ? null : process.argv[write + 1]!;
if (dir) mkdirSync(dir, { recursive: true });

console.log('oxc      ts6-dts  ts6-doc  case');
for (const [index, [name, body]] of cases.entries()) {
  const text = prelude + body;
  const oxc = isolatedDeclarationSync('x.ts', text, {});
  const ts6 = ts.transpileDeclaration(text, {
    fileName: 'x.ts',
    compilerOptions: { isolatedDeclarations: true },
  });
  console.log(
    `${mark(oxc.code.includes('The doc.'))}  ${mark(
      ts6.outputText.includes('The doc.'),
    )}  ${mark(hoverDoc(text))}  ${index}: ${name}`,
  );
  if (dir) writeFileSync(join(dir, `${index}.ts`), text);
}
