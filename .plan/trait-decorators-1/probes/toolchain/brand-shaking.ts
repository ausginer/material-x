// P41. Whether a bundle drops a trait class that only brands a component, so
// that the members a library build keeps for cross-package copies cost an
// application nothing unless it uses instanceof. Bundled and minified with
// rolldown, on core's real element and operator. Run from the repository root:
//   node .plan/trait-decorators-1/probes/toolchain/brand-shaking.ts
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
const scratch = mkdtempSync(join(here, '.brand-shaking-'));
const core = join(root, 'packages/core/src');
const attribute = JSON.stringify(join(core, 'attribute.ts'));
const element = JSON.stringify(join(core, 'element.ts'));

// The runtime of layer (a), with trait() taking an optional brand.
const RUNTIME = `const BRANDS = new WeakMap();
export function trait(ctr, brand = Symbol()) {
  BRANDS.set(ctr, brand);
  Object.defineProperty(ctr, Symbol.hasInstance, {
    configurable: true,
    value: (o) => o != null && typeof o === 'object' && o[brand] === true,
  });
}
export function impl({ prototype }, ...keys) {
  for (const key of keys) {
    Object.defineProperty(prototype, typeof key === 'symbol' ? key : BRANDS.get(key), { value: true });
  }
}
export const bound = () => null;
`;

const MEMBERS = `  get disabled() { return attr.get(this, 'disabled', Bool); }
  set disabled(value) { attr.set(this, 'disabled', value, Bool); }
  get href() { return attr.get(this, 'href', Str); }
  set href(value) { attr.set(this, 'href', value, Str); }
  get target() { return attr.get(this, 'target', Str); }
  set target(value) { attr.set(this, 'target', value, Str); }`;

/** The trait module as a build leaves it. */
const traitModule = (opts: {
  brand: 'inside' | 'module' | 'module, call pure';
  members: boolean;
}): string => `import attr, { Bool, Str } from ${attribute};
import { bound, trait } from './runtime.js';
${opts.brand === 'inside' ? '' : "export const $linked = Symbol('Linked');\n"}export class Linked extends bound() {
  static { ${opts.brand === 'module, call pure' ? '/* @__PURE__ */ ' : ''}trait(this${opts.brand === 'inside' ? '' : ', $linked'}); }
  static observedAttributes = ['disabled', 'href', 'target'];
  static tag = 'trait-class-kept';
${opts.members ? MEMBERS : ''}
}
`;

/** A component as the flattener emits it, branding by class or by symbol. */
const component = (
  by: 'class' | 'symbol',
  instanceOf: boolean,
): string => `import attr, { Bool, Str } from ${attribute};
import { ControlledElement } from ${element};
import { impl } from './runtime.js';
import { ${by === 'class' || instanceOf ? 'Linked' : ''}${by === 'symbol' ? `${instanceOf ? ', ' : ''}$linked` : ''} } from './trait.js';
export class Link extends ControlledElement {
  static observedAttributes = [...(ControlledElement.observedAttributes ?? []), 'disabled', 'href', 'target'];
${MEMBERS}
  static { impl(this, ${by === 'class' ? 'Linked' : '$linked'}); }
}
${instanceOf ? 'export const isLinked = (node) => node instanceof Linked;\n' : ''}`;

const rows: Array<
  [string, Parameters<typeof traitModule>[0], 'class' | 'symbol', boolean]
> = [
  [
    'impl(this, Linked): the class is referenced, members kept',
    { brand: 'inside', members: true },
    'class',
    false,
  ],
  [
    'impl(this, Linked), members deleted by the bundling build',
    { brand: 'inside', members: false },
    'class',
    false,
  ],
  [
    'impl(this, $linked), trait(this, $linked) in the static block',
    { brand: 'module', members: true },
    'symbol',
    false,
  ],
  [
    'impl(this, $linked), /* @__PURE__ */ trait(this, $linked)',
    { brand: 'module, call pure', members: true },
    'symbol',
    false,
  ],
  [
    'the same, and the application uses instanceof Linked',
    { brand: 'module, call pure', members: true },
    'symbol',
    true,
  ],
  [
    'the same with instanceof, members deleted by the bundling build',
    { brand: 'module, call pure', members: false },
    'symbol',
    true,
  ],
];

try {
  writeFileSync(join(scratch, 'runtime.js'), RUNTIME);
  for (const [label, trait, by, instanceOf] of rows) {
    writeFileSync(join(scratch, 'trait.js'), traitModule(trait));
    writeFileSync(join(scratch, 'entry.js'), component(by, instanceOf));
    // oxlint-disable-next-line no-await-in-loop
    const bundle = await rolldown({
      input: join(scratch, 'entry.js'),
      logLevel: 'silent',
    });
    // oxlint-disable-next-line no-await-in-loop
    const { output } = await bundle.generate({ format: 'es', minify: true });
    const code = output[0].code;
    const kept = code.includes('trait-class-kept');
    const members = code.split('get disabled').length - 1 > 1;
    console.log(
      `${label}: trait class kept: ${kept ? (members ? 'yes, with its members' : 'yes, without members') : 'no'} | ${Buffer.byteLength(code)} B min, ${brotliCompressSync(code).length} B brotli`,
    );
  }
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
