// P42. What instanceof returns, and whether an unused trait class drops, for
// each way a trait module's build can install the brand. P41 read only bytes
// and whether the class survived; this probe runs each bundle and reads
// `new Link() instanceof Linked`. Bundled with rolldown and esbuild, minified,
// on a plain base class so the bundle runs in Node. A last pass builds the
// trait module as a library first, as core's tsdown build does, and bundles
// the application from that output. Run from the repository root:
//   node .plan/trait-decorators-1/probes/toolchain/brand-install.ts
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { brotliCompressSync } from 'node:zlib';

const root = fileURLToPath(new URL('../../../../', import.meta.url));
const require = createRequire(join(root, 'package.json'));
const { rolldown } = require('rolldown') as typeof import('rolldown');
const esbuild = require('esbuild') as typeof import('esbuild');
const here = fileURLToPath(new URL('.', import.meta.url));
const scratch = mkdtempSync(join(here, '.brand-install-'));

// Layer (a)'s runtime as commit 2 implements it, with the helper of form c1.
const RUNTIME = `export function trait(ctr, brand = Symbol(ctr.name)) {
  Object.defineProperty(ctr, Symbol.hasInstance, {
    configurable: true,
    value: (o) => o != null && o[brand] === true,
  });
}
export function impl(target, ...brands) {
  for (const brand of brands) Object.defineProperty(target.prototype, brand, { value: true });
}
export const branded = (brand) => (o) => o != null && o[brand] === true;
export const bound = () => null;
`;

// As core's build emits attribute-traits.js: the bound is an unmarked call.
const BOUNDS = `import { bound } from './runtime.js';
export const AnyElement = bound();
`;

const BASE = 'export class Base {}\n';

const MEMBERS = `  get disabled() { return this.getAttribute?.('disabled'); }
  set disabled(value) { this.setAttribute?.('disabled', value); }
  get href() { return this.getAttribute?.('href'); }
  set href(value) { this.setAttribute?.('href', value); }`;

const FORMS = {
  'a  static { /* @__PURE__ */ trait(this, $b) }': {
    imports: 'trait',
    install: 'static { /* @__PURE__ */ trait(this, $linked); }',
  },
  'b  static { trait(this, $b) }': {
    imports: 'trait',
    install: 'static { trait(this, $linked); }',
  },
  'c1 static [Symbol.hasInstance] = /* @__PURE__ */ branded($b)': {
    imports: 'branded',
    install: 'static [Symbol.hasInstance] = /* @__PURE__ */ branded($linked);',
  },
  'c2 static [Symbol.hasInstance] = (o) => o != null && o[$b] === true': {
    imports: '',
    install:
      'static [Symbol.hasInstance] = (o) => o != null && o[$linked] === true;',
  },
  'd  static [Symbol.hasInstance](o) { return o != null && o[$b] === true; }': {
    imports: '',
    install:
      'static [Symbol.hasInstance](o) { return o != null && o[$linked] === true; }',
  },
} as const;
type Form = keyof typeof FORMS;

/** The trait module as its own build leaves it. */
const traitModule = (form: Form, members: boolean): string => {
  const { imports, install } = FORMS[form];
  return `${imports ? `import { ${imports} } from './runtime.js';\n` : ''}import { AnyElement } from './bounds.js';
export const $linked = Symbol('Linked');
export class Linked extends AnyElement {
  ${install}
  static observedAttributes = ['disabled', 'href'];
  static tag = 'trait-class-kept';
${members ? MEMBERS : ''}
}
`;
};

/** A component as the flattener emits it, and the probe's reading of it. */
const entry = (
  from: string,
  instanceOf: boolean,
): string => `import { Base } from './base.js';
import { impl } from './runtime.js';
import { $linked${instanceOf ? ', Linked' : ''} } from '${from}';
export class Link extends Base {
${MEMBERS}
  static { impl(this, $linked); }
}
export class Other extends Base {}
${
  instanceOf
    ? `export const read = () => [new Link() instanceof Linked, new Other() instanceof Linked, null instanceof Linked];`
    : 'export const read = () => [new Link() instanceof Link];'
}
`;

type Bundler = 'rolldown' | 'esbuild';

async function bundle(bundler: Bundler, input: string): Promise<string> {
  if (bundler === 'rolldown') {
    const build = await rolldown({ input, logLevel: 'silent' });
    const { output } = await build.generate({ format: 'es', minify: true });
    return output[0].code;
  }
  const result = await esbuild.build({
    entryPoints: [input],
    bundle: true,
    minify: true,
    format: 'esm',
    platform: 'neutral',
    write: false,
    logLevel: 'silent',
  });
  return result.outputFiles[0].text;
}

/** The trait module built as a library, the way tsdown builds core. */
async function library(input: string): Promise<string> {
  const build = await rolldown({
    input,
    external: [/runtime\.js$/, /bounds\.js$/],
    logLevel: 'silent',
  });
  const { output } = await build.generate({ format: 'es' });
  return output[0].code.replaceAll(/"\.\/(\w+\.js)"/g, '"../$1"');
}

let run = 0;
async function read(
  bundler: Bundler,
  from: string,
  instanceOf: boolean,
): Promise<string> {
  writeFileSync(join(scratch, 'entry.js'), entry(from, instanceOf));
  const code = await bundle(bundler, join(scratch, 'entry.js'));
  const out = join(scratch, `out-${(run += 1)}.mjs`);
  writeFileSync(out, code);
  const result = (
    (await import(pathToFileURL(out).href)) as {
      read: () => boolean[];
    }
  ).read();
  const kept = code.includes('trait-class-kept');
  const members = code.split('get disabled').length - 1 > 1;
  const cls = kept
    ? members
      ? 'kept, members'
      : 'kept, no members'
    : 'dropped';
  const bytes = `${Buffer.byteLength(code)} B, ${brotliCompressSync(code).length} B brotli`;
  return instanceOf
    ? `${cls}; Link ${result[0]}, Other ${result[1]}, null ${result[2]} | ${bytes}`
    : `${cls}; runs ${result[0]} | ${bytes}`;
}

try {
  writeFileSync(join(scratch, 'runtime.js'), RUNTIME);
  writeFileSync(join(scratch, 'bounds.js'), BOUNDS);
  writeFileSync(join(scratch, 'base.js'), BASE);
  mkdirSync(join(scratch, 'lib'));
  for (const bundler of ['rolldown', 'esbuild'] as const) {
    console.log(`## ${bundler}, application bundle from the trait's own build`);
    for (const form of Object.keys(FORMS) as Form[]) {
      writeFileSync(join(scratch, 'trait.js'), traitModule(form, true));
      // oxlint-disable-next-line no-await-in-loop
      const unused = await read(bundler, './trait.js', false);
      // oxlint-disable-next-line no-await-in-loop
      const used = await read(bundler, './trait.js', true);
      writeFileSync(join(scratch, 'trait.js'), traitModule(form, false));
      // oxlint-disable-next-line no-await-in-loop
      const deleted = await read(bundler, './trait.js', true);
      console.log(
        `${form}\n   no instanceof: ${unused}\n   instanceof: ${used}\n   instanceof, members deleted: ${deleted}`,
      );
    }
  }
  for (const bundler of ['rolldown', 'esbuild'] as const) {
    console.log(
      `## ${bundler}, application bundle from a rolldown library build of the trait module`,
    );
    for (const form of Object.keys(FORMS) as Form[]) {
      writeFileSync(join(scratch, 'trait.js'), traitModule(form, true));
      // oxlint-disable-next-line no-await-in-loop
      const lib = await library(join(scratch, 'trait.js'));
      writeFileSync(join(scratch, 'lib', 'trait.js'), lib);
      const installed =
        lib.includes('$linked') && /hasInstance|trait\(this/.test(lib);
      // oxlint-disable-next-line no-await-in-loop
      const unused = await read(bundler, './lib/trait.js', false);
      // oxlint-disable-next-line no-await-in-loop
      const used = await read(bundler, './lib/trait.js', true);
      console.log(
        `${form}\n   library keeps the install: ${installed}\n   no instanceof: ${unused}\n   instanceof: ${used}`,
      );
    }
  }
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
