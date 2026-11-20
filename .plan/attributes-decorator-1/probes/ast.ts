// P46 (s): where oxc-parser places both decorators, and the argument of
// `@attributes(…)`, against the statement's span.
import { parseSync } from 'oxc-parser';

const code =
  "import { trait } from './c.ts';\nimport { attributes } from './a.ts';\n@trait\n@attributes(TABLE)\nexport class A extends B {\n  accessor open!: boolean;\n}\n";
const { program, errors } = parseSync('x.ts', code);
const statement = program.body[2]!;
const cls =
  statement.type === 'ExportNamedDeclaration' &&
  statement.declaration?.type === 'ClassDeclaration'
    ? statement.declaration
    : null;
console.log(
  JSON.stringify({
    errors: errors.length,
    statement: [statement.type, statement.start, statement.end],
    decorators: cls?.decorators.map((d) => ({
      span: [d.start, d.end],
      expression: d.expression.type,
      text: code.slice(d.start, d.end),
    })),
    body: cls ? [cls.body.start, cls.body.end] : null,
  }),
);
