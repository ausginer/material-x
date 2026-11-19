// P7. What the plugin's parser (oxc-parser 0.158) sees in a decorator-marker
// component, and what oxc-transform 0.158 emits when nothing strips the
// markers. Run from the repository root:
//   node .plan/trait-decorators-1/probes/toolchain/probe.ts
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const require = createRequire(
  new URL(
    '../../../../packages/vite-traits-plugin/package.json',
    import.meta.url,
  ),
);
const { parseSync } = require('oxc-parser') as typeof import('oxc-parser');
const { transformSync, isolatedDeclarationSync } = createRequire(
  new URL('../../../../package.json', import.meta.url),
)('oxc-transform') as typeof import('oxc-transform');

const id = `${here}component.ts`;
const code = readFileSync(id, 'utf8');

console.log(
  '== 1. parse: top-level statements, class decorators, interface heritage',
);
const { program, errors } = parseSync(id, code);
console.log('parse errors:', errors.length);
for (const statement of program.body) {
  const node = (statement as any).declaration ?? statement;
  if (node.type === 'TSInterfaceDeclaration') {
    console.log(
      `interface ${node.id.name} extends`,
      node.extends.map((h: any) => h.expression.name),
    );
  }
  if (node.type === 'ClassDeclaration') {
    for (const d of node.decorators) {
      console.log(
        `class ${node.id.name} decorator [${d.start}, ${d.end}):`,
        JSON.stringify(code.slice(d.start, d.end)),
        'callee',
        d.expression.callee.name,
        'args',
        d.expression.arguments.map((a: any) => a.name),
      );
    }
    for (const m of node.body.body) {
      console.log(
        `  member ${m.type} ${m.key?.name}`,
        m.decorators?.length
          ? `decorators ${JSON.stringify(m.decorators.map((d: any) => code.slice(d.start, d.end)))}`
          : '',
      );
    }
  }
}

for (const [label, options] of [
  ['2. transform, target esnext, standard decorators', { target: 'esnext' }],
  ['3. transform, target es2022, standard decorators', { target: 'es2022' }],
  [
    '4. transform, experimentalDecorators (legacy lowering)',
    { target: 'esnext', decorator: { legacy: true } },
  ],
] as const) {
  console.log(`== ${label}`);
  const result = transformSync(id, code, options as any);
  console.log(
    'errors:',
    result.errors.map((e: any) => e.message),
  );
  console.log(result.code);
}

console.log('== 5. isolated declarations (what tsdown emits)');
const dts = isolatedDeclarationSync(id, code, {});
console.log(
  'errors:',
  dts.errors.map((e: any) => e.message),
);
console.log(dts.code);

console.log('== 7. Form D: parse the type-argument marker');
const idD = `${here}component-d.ts`;
const codeD = readFileSync(idD, 'utf8');
const parsedD = parseSync(idD, codeD);
console.log('parse errors:', parsedD.errors.length);
for (const statement of parsedD.program.body) {
  const node = (statement as any).declaration ?? statement;
  if (node.type !== 'ClassDeclaration') continue;
  const args = node.superTypeArguments;
  console.log(
    `class ${node.id.name} extends ${node.superClass.name}`,
    'superTypeArguments',
    args?.type,
    `[${args?.start}, ${args?.end})`,
  );
  for (const element of args.params[0].elementTypes) {
    console.log(
      '  element',
      element.type,
      element.type === 'TSTypeQuery'
        ? element.exprName.name
        : element.typeAnnotation?.typeName?.name,
    );
  }
}
console.log('== 8. Form D: transform, target esnext');
console.log(transformSync(idD, codeD, { target: 'esnext' }).code);
console.log('== 9. Form D: isolated declarations (what tsdown emits)');
const dtsD = isolatedDeclarationSync(idD, codeD, {});
console.log(
  'errors:',
  dtsD.errors.map((e: any) => e.message),
);
console.log(dtsD.code);

console.log('== 6. does Node', process.version, 'run a standard decorator?');
try {
  // eslint-disable-next-line no-new-func
  new Function('function d(){} @d class A {}');
  console.log('parsed');
} catch (error) {
  console.log(String(error));
}
