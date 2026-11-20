// P45 (h): where oxc-parser places `@trait` in each placement, against the
// statement's span, which decides where the plugin inserts the brand.
import { parseSync } from 'oxc-parser';

for (const code of [
  "import { trait } from './composition.ts';\n@trait\nexport class A extends B {}\n",
  "import { trait } from './composition.ts';\nexport @trait class A extends B {}\n",
  "import { trait } from './composition.ts';\n@trait\nclass A extends B {}\n",
]) {
  const { program, errors } = parseSync('x.ts', code);
  const statement = program.body[1]!;
  const cls =
    statement.type === 'ClassDeclaration'
      ? statement
      : statement.type === 'ExportNamedDeclaration' &&
          statement.declaration?.type === 'ClassDeclaration'
        ? statement.declaration
        : null;
  console.log(
    JSON.stringify({
      source: code.split('\n').slice(1).join(' ').trim(),
      errors: errors.length,
      statement: [statement.type, statement.start, statement.end],
      decorators: cls?.decorators.map((d) => [d.start, d.end]),
    }),
  );
}
