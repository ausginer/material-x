// P37. What attributes written by hand cost in the bundle, against layer (b),
// with each component as the flattener emits it. Bundled with rolldown and
// minified, on core's real ControlledElement and operator. Run from the
// repository root:
//   node .plan/trait-decorators-1/probes/toolchain/attribute-bytes.ts
//
// The flattened components are the same text in every variant: the flattener
// emits the same get/set pairs and the same observedAttributes literal whether
// it reads them from a table or copies them. Only the trait modules differ.
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync } from 'node:zlib';

const root = fileURLToPath(new URL('../../../../', import.meta.url));
const { rolldown } = createRequire(join(root, 'package.json'))(
  'rolldown',
) as typeof import('rolldown');
const here = fileURLToPath(new URL('.', import.meta.url));
const scratch = mkdtempSync(join(here, '.attribute-bytes-'));
const core = join(root, 'packages/core/src');
const piirre = join(here, '../types/layer-b/piirre.ts');
const ydin = join(here, '../types/layer-b/ydin.ts');

const ATTRS: Record<string, Array<[string, string]>> = {
  ButtonLike: [
    ['color', 'Str'],
    ['size', 'Str'],
  ],
  Disableable: [['disabled', 'Bool']],
  Linkable: [
    ['href', 'Str'],
    ['target', 'Str'],
  ],
};

const header = `import attr, { Bool, Str } from ${JSON.stringify(join(core, 'attribute.ts'))};
import { bound, trait } from ${JSON.stringify(piirre)};
import { attributes } from ${JSON.stringify(ydin)};
const AnyElement = bound();
void attr; void Bool; void Str; void attributes;
`;

/** Each variant's trait module: the trait classes as the build leaves them. */
const traitModule = {
  // Layer (b): the accessor lines deleted, the table call kept.
  'layer (b)': (name: string, list: Array<[string, string]>) =>
    `export class ${name} extends AnyElement {
  static { trait(this); attributes(this, { ${list.map(([k, c]) => `${k}: ${c}`).join(', ')} }); }
}`,
  // Layer (a) alone: the get/set pairs and the static list stay in the trait.
  'layer (a) alone': (name: string, list: Array<[string, string]>) =>
    `export class ${name} extends AnyElement {
  static { trait(this); }
  static observedAttributes = [${list.map(([k]) => JSON.stringify(k)).join(', ')}];
${list
  .map(
    ([
      k,
      c,
    ]) => `  get ${k}() { return attr.get(this, ${JSON.stringify(k)}, ${c}); }
  set ${k}(value) { attr.set(this, ${JSON.stringify(k)}, value, ${c}); }`,
  )
  .join('\n')}
}`,
  // Layer (a) alone, with the flattener deleting the copied members from the
  // trait module in the consumer's build.
  'layer (a) alone, copied members deleted': (name: string) =>
    `export class ${name} extends AnyElement {
  static { trait(this); }
}`,
};

/** A component as the flattener emits it. */
const component = (name: string, traits: string[]): string => {
  const list = traits.flatMap((t) => ATTRS[t]!);
  return `import attr, { Bool, Str } from ${JSON.stringify(join(core, 'attribute.ts'))};
import { ControlledElement } from ${JSON.stringify(join(core, 'element.ts'))};
import { impl } from ${JSON.stringify(piirre)};
${traits.map((t) => `import { ${t} } from './${t}.ts';`).join('\n')}
export class ${name} extends ControlledElement {
  static observedAttributes = [...new Set([...(ControlledElement.observedAttributes ?? []), ${list.map(([k]) => JSON.stringify(k)).join(', ')}])];
${list
  .map(
    ([
      k,
      c,
    ]) => `  get ${k}() { return attr.get(this, ${JSON.stringify(k)}, ${c}); }
  set ${k}(value) { attr.set(this, ${JSON.stringify(k)}, value, ${c}); }`,
  )
  .join('\n')}
  static { impl(this, ${traits.join(', ')}); }
}
`;
};

const entries = {
  Button: ['ButtonLike', 'Disableable'],
  LinkButton: ['ButtonLike', 'Disableable', 'Linkable'],
};

try {
  for (const [name, traits] of Object.entries(entries)) {
    writeFileSync(join(scratch, `${name}.entry.ts`), component(name, traits));
  }
  for (const [variant, render] of Object.entries(traitModule)) {
    // One module per trait, as core has.
    for (const [name, list] of Object.entries(ATTRS)) {
      writeFileSync(join(scratch, `${name}.ts`), header + render(name, list));
    }
    const cells: string[] = [];
    for (const name of Object.keys(entries)) {
      // oxlint-disable-next-line no-await-in-loop
      const bundle = await rolldown({
        input: join(scratch, `${name}.entry.ts`),
        logLevel: 'silent',
      });
      // oxlint-disable-next-line no-await-in-loop
      const { output } = await bundle.generate({ format: 'es', minify: true });
      const code = output[0].code;
      cells.push(
        `${name} ${Buffer.byteLength(code)} B min, ${brotliCompressSync(code).length} B brotli`,
      );
    }
    console.log(`${variant}: ${cells.join(' | ')}`);
  }
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
