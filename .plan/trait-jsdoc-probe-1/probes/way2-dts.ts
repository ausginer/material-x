// Way 2's declarations for two trait modules: what oxc's isolated-declarations
// emitter (the one tsdown uses) makes of a trait after the whole trait
// transform, with the errors it reports. Run on a migrated tree:
//   node way2-dts.ts <file>...
import { readFile } from 'node:fs/promises';
import { isolatedDeclarationSync } from 'rolldown/experimental';
import { lowerAttributes } from '../../../packages/vite-traits-plugin/src/attributes/lower.ts';
import { flattenModule } from '../../../packages/vite-traits-plugin/src/plugin.ts';
import { parseModule } from '../../../packages/vite-traits-plugin/src/syntax.ts';
import { desugar } from './decorators.ts';

const noLoader = {
  resolve: () => Promise.resolve(null),
  load: () => Promise.reject(new Error('a trait module reads no other module')),
};

for (const id of process.argv.slice(2)) {
  let code = await readFile(id, 'utf8');
  code = desugar(id, code)?.toString() ?? code;
  code = lowerAttributes(code, parseModule(id, code))?.toString() ?? code;
  code =
    (await flattenModule(code, id, 'library', noLoader)).magic?.toString() ??
    code;
  const { code: dts, errors } = isolatedDeclarationSync(id, code, {});
  console.log(`===== ${id}`);
  console.log(dts);
  for (const error of errors) {
    console.log(`error: ${error.message}`);
  }
}
