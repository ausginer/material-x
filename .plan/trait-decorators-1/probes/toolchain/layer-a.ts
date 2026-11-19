// P26. What oxc-parser 0.158 gives the flattener in layer (a)'s recommended
// form: the runtime base and the trait list of a composition, and each trait
// class's bound. Run from the repository root:
//   node .plan/trait-decorators-1/probes/toolchain/layer-a.ts
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const { parseSync } = createRequire(
  new URL(
    '../../../../packages/vite-traits-plugin/package.json',
    import.meta.url,
  ),
)('oxc-parser') as typeof import('oxc-parser');

const describe = (t: any): string =>
  t.type === 'TSTypeQuery'
    ? `typeof ${t.exprName.name}`
    : t.type === 'TSRestType'
      ? `...${t.typeAnnotation.typeName.name}`
      : t.type === 'TSTypeReference'
        ? t.typeName.name
        : t.type;

for (const file of ['p25-layer-a-form.ts', 'traits-a.ts']) {
  const id = `${here}../types/${file}`;
  const { program, errors } = parseSync(id, readFileSync(id, 'utf8'));
  console.log(`== ${file}: parse errors ${errors.length}`);
  for (const statement of program.body) {
    const node = (statement as any).declaration ?? statement;
    if (node.type === 'VariableDeclaration') {
      for (const d of node.declarations) {
        const t = d.id.typeAnnotation?.typeAnnotation;
        if (t?.typeName?.name !== 'Composed') continue;
        const [base, list] = t.typeArguments.params;
        console.log(
          `const ${d.id.name}: Composed<${describe(base)}, [${list.elementTypes.map(describe).join(', ')}]>`,
          `= ${d.init.callee.name}(${d.init.arguments.map((a: any) => a.name).join(', ')})`,
        );
      }
    }
    if (node.type === 'ClassDeclaration') {
      const block = node.body.body.find((m: any) => m.type === 'StaticBlock');
      const call = block?.body[0]?.expression;
      console.log(
        `class ${node.id.name} extends ${node.superClass?.name ?? '(nothing)'}`,
        call?.type === 'CallExpression'
          ? `; static block: ${call.callee.name}(this)`
          : '',
      );
    }
  }
}
