// Lists the top-level statements of each built @ydinjs/core module that run
// code at import: expression statements, and declarations whose initializer
// is a call or `new` without a /* @__PURE__ */ annotation.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
const root = process.argv[2]!;
const require = createRequire(join(root, 'package.json'));
const { parseSync } = require('oxc-parser');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
let count = 0;
for (const target of Object.values(pkg.exports) as Array<{
  default?: string;
}>) {
  if (!target.default) continue;
  const file = join(root, target.default!);
  const code = readFileSync(file, 'utf8');
  const { program } = parseSync(file, code);
  count++;
  for (const s of program.body) {
    const d = s.type.startsWith('Export') && s.declaration ? s.declaration : s;
    if (d.type === 'ExpressionStatement')
      console.log(
        `${target.default}: expression ${code.slice(d.start, d.start + 60).replace(/\s+/gu, ' ')}`,
      );
    if (d.type === 'VariableDeclaration')
      for (const v of d.declarations) {
        const init = v.init;
        if (!init) continue;
        if (
          (init.type === 'CallExpression' || init.type === 'NewExpression') &&
          !/@__PURE__|#__PURE__/.test(
            code.slice(Math.max(0, init.start - 20), init.start),
          )
        )
          console.log(
            `${target.default}: impure init ${code.slice(v.start, v.start + 60).replace(/\s+/gu, ' ')}`,
          );
      }
    if (d.type === 'ImportDeclaration' && d.specifiers.length === 0)
      console.log(`${target.default}: bare import ${d.source.value}`);
  }
}
console.log(`modules read: ${count}`);
