// Prints every top-level statement of each built @ydinjs/core module that
// package.json's `exports` names, with what it evaluates at import.
// Usage: node top-level.ts <packages/core>
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';

const root = resolve(process.argv[2]!);
const require = createRequire(join(root, 'package.json'));
const { parseSync } = require('oxc-parser');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

type Node = { type: string; start: number; end: number; [k: string]: any };

function describe(code: string, n: Node | null | undefined): string {
  if (!n) return 'none';
  const text = code.slice(n.start, n.end).replace(/\s+/gu, ' ');
  return `${n.type} ${text.length > 70 ? `${text.slice(0, 70)}…` : text}`;
}

function classEffects(code: string, c: Node): string[] {
  const out: string[] = [];
  if (c.decorators?.length) out.push('decorators');
  if (c.superClass) out.push(`extends ${describe(code, c.superClass)}`);
  for (const m of c.body.body as Node[]) {
    if (m.decorators?.length) out.push(`member decorator ${describe(code, m)}`);
    if (m.computed) out.push(`computed key ${describe(code, m.key)}`);
    if (m.type === 'StaticBlock') out.push(`static block ${describe(code, m)}`);
    if (
      (m.type === 'PropertyDefinition' || m.type === 'AccessorProperty') &&
      m.static &&
      m.value
    )
      out.push(`static init ${describe(code, m.value)}`);
  }
  return out;
}

let modules = 0;
for (const target of Object.values(pkg.exports) as Array<{
  default?: string;
}>) {
  if (!target.default) continue;
  modules++;
  const file = join(root, target.default);
  const code = readFileSync(file, 'utf8');
  const { program, errors } = parseSync(file, code);
  if (errors.length) console.log(`${target.default}: PARSE ERROR`);
  console.log(`## ${target.default}`);
  for (const s of program.body as Node[]) {
    const d: Node =
      (s.type === 'ExportNamedDeclaration' ||
        s.type === 'ExportDefaultDeclaration') &&
      s.declaration
        ? s.declaration
        : s;
    switch (d.type) {
      case 'ImportDeclaration':
        console.log(
          `  import ${d.specifiers.length ? `{${d.specifiers.length}}` : 'BARE'} ${d.source.value}`,
        );
        break;
      case 'ExportNamedDeclaration':
        console.log(
          `  export {${d.specifiers.length}}${d.source ? ` from ${d.source.value}` : ''}`,
        );
        break;
      case 'ExportAllDeclaration':
        console.log(`  export * from ${d.source.value}`);
        break;
      case 'FunctionDeclaration':
        console.log(`  function ${d.id?.name}`);
        break;
      case 'ClassDeclaration':
      case 'ClassExpression': {
        const e = classEffects(code, d);
        console.log(
          `  class ${d.id?.name}${e.length ? `: ${e.join('; ')}` : ''}`,
        );
        break;
      }
      case 'VariableDeclaration':
        for (const v of d.declarations as Node[]) {
          const init = v.init as Node | null;
          let extra = '';
          if (init?.type === 'ClassExpression') {
            const e = classEffects(code, init);
            extra = e.length ? ` [${e.join('; ')}]` : '';
          }
          console.log(
            `  ${d.kind} ${code.slice(v.id.start, v.id.end)} = ${describe(code, init)}${extra}`,
          );
        }
        break;
      default:
        console.log(`  OTHER ${describe(code, d)}`);
    }
  }
}
console.log(`modules read: ${modules}`);
