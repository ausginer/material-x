// P8. Whether the flattener's current machinery sees the decorator-marker
// form, and which parts of it apply. Run from the repository root:
//   node .plan/trait-decorators-1/probes/toolchain/machinery.ts
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { RolldownMagicString } from 'rolldown';
import {
  analyzeModule,
  parseModule,
} from '../../../../packages/vite-traits-plugin/src/analyze.ts';
import { collectFreeReferences } from '../../../../packages/vite-traits-plugin/src/free-references.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const read = (name: string) => {
  const id = `${here}${name}`;
  return { id, code: readFileSync(id, 'utf8') };
};

console.log('== 1. analyzeModule on the decorator-marker component');
const component = read('component.ts');
const result = await analyzeModule(component.id, component.code, {
  resolve: async () => null,
  load: async () => '',
});
console.log(
  'compositions:',
  result.compositions.length,
  'bailouts:',
  result.bailouts.length,
);

console.log('== 2. collectFreeReferences on each member of the class traits');
const traits = read('traits.ts');
for (const statement of parseModule(traits.id, traits.code).body) {
  const node = (statement as any).declaration ?? statement;
  if (node.type !== 'ClassDeclaration') continue;
  for (const member of node.body.body) {
    try {
      const refs = collectFreeReferences(member.value, (detail) => {
        throw new Error(detail);
      });
      console.log(
        `${node.id.name}.${member.kind} ${member.key.name}:`,
        refs.map((r) => r.name),
      );
    } catch (error) {
      console.log(
        `${node.id.name}.${member.key.name}: retained —`,
        (error as Error).message,
      );
    }
  }
}

console.log('== 3. strip every decorator span with RolldownMagicString');
const s = new RolldownMagicString(component.code);
const walk = (node: any): void => {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) return node.forEach(walk);
  for (const d of node.decorators ?? []) s.remove(d.start, d.end + 1);
  for (const value of Object.values(node)) walk(value);
};
walk(parseModule(component.id, component.code));
console.log(s.toString());
