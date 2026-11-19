// P36. Whether a trait with real code crosses a package boundary, with the real
// plugin in a real Vite build, and what each route costs. Run from the
// repository root:
//   node .plan/trait-decorators-1/probes/toolchain/portability.ts
//
// The other package, `@probe/traits`, is installed in a scratch node_modules.
// It ships two traits as TypeScript source and as built JavaScript:
// - material-x's FocusForwarding, copied byte for byte;
// - core's Disableable with its attribute written by hand, layer (a) alone.
// Both are in today's method-trait form, `trait(base => class extends base {…})`,
// because the plugin recognises only today's forms. The copy rule they meet,
// `canCopySource`, is the one layer (a)'s flattener inherits.
import { spawnSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { brotliCompressSync } from 'node:zlib';

const root = fileURLToPath(new URL('../../../../', import.meta.url));
const requireRoot = createRequire(join(root, 'package.json'));
const vite = (await import(
  pathToFileURL(requireRoot.resolve('vite')).href
)) as typeof import('vite');
const { parseSync } = requireRoot('oxc-parser') as typeof import('oxc-parser');
const { ResolverFactory } = requireRoot(
  'oxc-resolver',
) as typeof import('oxc-resolver');
const { viteTraitsPlugin } = await import(
  pathToFileURL(join(root, 'packages/vite-traits-plugin/src/plugin.ts')).href
);
const { analyzeModule } = await import(
  pathToFileURL(join(root, 'packages/vite-traits-plugin/src/analyze.ts')).href
);

const CONDITION = 'ydin-source';
const scratch = mkdtempSync(
  join(fileURLToPath(new URL('.', import.meta.url)), '.portability-'),
);
const pkg = join(scratch, 'node_modules/@probe/traits');
const write = (file: string, text: string): void => {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text);
};
const size = (code: string): string =>
  `${Buffer.byteLength(code)} B min, ${brotliCompressSync(code).length} B brotli`;

// ---------------------------------------------------------------- the package
const DISABLEABLE_TS = `import attr, { Bool } from '@ydinjs/core/attribute.js';
import { trait } from '@ydinjs/core/traits/primitives.js';

const $disableable: unique symbol = Symbol('Disableable');

/** core's Disableable, its attribute written by hand. */
export const Disableable = trait(
  (base: new () => HTMLElement) =>
    class extends base {
      get disabled(): boolean {
        return attr.get(this, 'disabled', Bool);
      }
      set disabled(value: boolean) {
        attr.set(this, 'disabled', value, Bool);
      }
    },
  $disableable,
);
`;
const FOCUS_TS = readFileSync(
  join(root, 'packages/material-x/src/core/traits/focus-forwarding.ts'),
  'utf8',
);
const sources = {
  'disableable.ts': DISABLEABLE_TS,
  'focus-forwarding.ts': FOCUS_TS,
};
const exports: Record<string, unknown> = {};
for (const [name, text] of Object.entries(sources)) {
  const js = name.replace(/\.ts$/, '.js');
  write(join(pkg, 'src/traits', name), text);
  // The package's build: the type-stripping transform core's tsdown runs.
  const built = await vite.transformWithOxc(
    text,
    join(pkg, 'src/traits', name),
    {
      lang: 'ts',
    },
  );
  write(join(pkg, 'traits', js), built.code);
  exports[`./traits/${js}`] = {
    [CONDITION]: `./src/traits/${name}`,
    default: `./traits/${js}`,
  };
}
write(
  join(pkg, 'package.json'),
  JSON.stringify({ name: '@probe/traits', type: 'module', exports }, null, 2),
);

const CONSUMER = `import { ControlledElement } from '@ydinjs/core/element.js';
import { impl } from '@ydinjs/core/traits/attributes.js';
import { Disableable } from '@probe/traits/traits/disableable.js';
import { FocusForwarding } from '@probe/traits/traits/focus-forwarding.js';

const ButtonBase = impl(ControlledElement, [Disableable, FocusForwarding]);

export class Button extends ButtonBase {}
`;
write(join(scratch, 'button.ts'), CONSUMER);
write(join(scratch, 'button.js'), CONSUMER);

try {
  // ------------------------------------------- 1. the real plugin, in Vite
  console.log(
    '== 1. vite build with the real plugin: a consumer in another package',
  );
  const build = async (
    entry: string,
    conditions: readonly string[],
    minify: boolean,
  ): Promise<{ code: string; warnings: string[] }> => {
    const warnings: string[] = [];
    const out = (await vite.build({
      configFile: false,
      root: scratch,
      logLevel: 'silent',
      plugins: [viteTraitsPlugin()],
      resolve: { conditions: [...conditions] },
      build: {
        write: false,
        minify,
        lib: { entry: join(scratch, entry), formats: ['es'], fileName: 'out' },
        rolldownOptions: {
          onwarn: (warning: { message: string }) => {
            warnings.push(warning.message);
          },
        },
      },
    })) as Array<{ output: Array<{ type: string; code?: string }> }>;
    const code = out[0]!.output.find((o) => o.type === 'chunk')!.code!;
    return { code, warnings };
  };
  const defaults = [...vite.defaultClientConditions];
  const rows: Array<[string, string, readonly string[]]> = [
    ['A', 'button.ts', defaults],
    ['B', 'button.js', defaults],
    ['C', 'button.ts', [CONDITION, ...defaults]],
    ['D', 'button.js', [CONDITION, ...defaults]],
  ];
  for (const [label, entry, conditions] of rows) {
    // oxlint-disable-next-line no-await-in-loop
    const plain = await build(entry, conditions, false);
    // oxlint-disable-next-line no-await-in-loop
    const minified = await build(entry, conditions, true);
    const reasons = plain.warnings
      .map((w) => /\(([a-z-]+)\)/.exec(w)?.[1])
      .filter(Boolean);
    console.log(
      `${label}. consumer ${entry}, conditions [${conditions.includes(CONDITION) ? `${CONDITION}, ` : ''}…defaults]:`,
      `flattener warnings [${reasons.join(', ')}]`,
      `| Button extends ControlledElement directly: ${/\bButton = class extends ControlledElement\b/.test(plain.code)}`,
      `| ${size(minified.code)}`,
    );
  }

  // ---------------------------------- 2. where the trait's id resolves from
  console.log('== 2. which file the trait specifier resolves to');
  const spec = '@probe/traits/traits/disableable.js';
  for (const conditionNames of [
    ['import', 'default'],
    [CONDITION, 'import', 'default'],
  ]) {
    const resolver = new ResolverFactory({ conditionNames });
    const { path } = resolver.sync(scratch, spec);
    console.log(
      `oxc-resolver (rolldown's), conditions [${conditionNames.join(', ')}]:`,
      relative(scratch, path ?? '(none)'),
    );
  }
  // The plugin's fallback for an external @ydinjs/* package is Node's
  // import.meta.resolve, from the plugin's own module, under Node's conditions.
  for (const flags of [[], [`--conditions=${CONDITION}`]]) {
    const child = spawnSync(
      process.execPath,
      [
        ...flags,
        '--input-type=module',
        '-e',
        `console.log(import.meta.resolve(${JSON.stringify(spec)}))`,
      ],
      { encoding: 'utf8', cwd: scratch },
    );
    console.log(
      `node import.meta.resolve ${flags.join(' ') || '(no flag)'}:`,
      relative(scratch, fileURLToPath(child.stdout.trim())),
    );
  }

  // ------------------------------------------------ 3. parse equivalence
  console.log('== 3. the parse-equivalence check');
  // A member is copied when its text parses without error in the origin's
  // language and in the consumer's, and the two trees are equal apart from
  // positions.
  const strip = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(strip);
    if (node && typeof node === 'object') {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(node)) {
        if (k === 'start' || k === 'end' || k === 'range' || k === 'loc')
          continue;
        out[k] = strip(v);
      }
      return out;
    }
    return node;
  };
  type Lang = 'js' | 'ts' | 'tsx' | 'mts';
  const tree = (member: string, lang: Lang): string | null => {
    const r = parseSync(`m.${lang}`, `(class {\n${member}\n});`, {
      astType: 'ts',
    });
    return r.errors.length > 0
      ? null
      : JSON.stringify(strip(r.program.body[0]));
  };
  const sameMeaning = (
    member: string,
    origin: Lang,
    consumer: Lang,
  ): boolean => {
    const a = tree(member, origin);
    return a !== null && a === tree(member, consumer);
  };
  const membersOf = (file: string, code: string): string[] => {
    const { program } = parseSync(file, code);
    const found: string[] = [];
    const visit = (node: any): void => {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) return node.forEach(visit);
      if (node.type === 'ClassBody') {
        for (const m of node.body) found.push(code.slice(m.start, m.end));
      }
      for (const v of Object.values(node)) visit(v);
    };
    visit(program);
    return found;
  };
  for (const name of ['disableable.js', 'focus-forwarding.js']) {
    const code = readFileSync(join(pkg, 'traits', name), 'utf8');
    const members = membersOf(name, code);
    console.log(
      `@probe/traits/traits/${name}: ${members.length} members, js → ts agree:`,
      members.map((m) => sameMeaning(m, 'js', 'ts')),
    );
  }
  // The built JavaScript of two real libraries: how often the check refuses a
  // member that has the same meaning.
  const corpus = (dir: string, match: RegExp): string[] =>
    readdirSync(dir, { recursive: true, encoding: 'utf8' })
      .filter((f) => match.test(f) && !f.includes('node_modules'))
      .map((f) => join(dir, f));
  for (const [label, files] of [
    [
      "core's built JavaScript",
      corpus(join(root, 'packages/core'), /^(?!src\/|tests\/).*\.js$/),
    ],
    [
      "vite's dist",
      corpus(join(dirname(requireRoot.resolve('vite')), '..'), /\.(m?js)$/),
    ],
  ] as const) {
    let total = 0;
    const refused: string[] = [];
    for (const file of files) {
      const code = readFileSync(file, 'utf8');
      for (const member of membersOf(file, code)) {
        total++;
        if (!sameMeaning(member, 'js', 'ts')) refused.push(member);
      }
    }
    console.log(
      `${label}: ${files.length} files, ${total} class members, js → ts refused ${refused.length}`,
    );
    for (const member of refused.slice(0, 3)) {
      console.log('  refused:', JSON.stringify(member.slice(0, 120)));
    }
  }
  for (const [member, origin, consumer] of [
    ['m(a, b, c) { return a < b > (c); }', 'js', 'ts'],
    ['m(a, b) { return a < b; }', 'js', 'ts'],
    ['m(x: unknown) { return <string>x; }', 'ts', 'tsx'],
    ['m(x: unknown) { return <string>x; }', 'ts', 'mts'],
    ['m(x: unknown) { return x as string; }', 'ts', 'tsx'],
    ['m(x: unknown) { return x as string; }', 'ts', 'js'],
  ] as const) {
    console.log(
      `${origin} → ${consumer} ${member}:`,
      sameMeaning(member, origin, consumer) ? 'copy' : 'refuse',
    );
  }
  const self = readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n');
  console.log(
    'lines of the check in this probe (strip, tree, sameMeaning):',
    self.findIndex((l) => l.startsWith('  const membersOf')) -
      self.findIndex((l) => l.startsWith('  const strip')),
  );

  // ------------------------------------------ 4. after the type transform
  console.log('== 4. flattening after the TypeScript transform');
  const stripped = (
    await vite.transformWithOxc(CONSUMER, join(scratch, 'button.ts'), {
      lang: 'ts',
    })
  ).code;
  const resolver = new ResolverFactory({
    conditionNames: ['import', 'default'],
  });
  const loader = {
    resolve: async (specifier: string, importer: string) =>
      resolver.sync(dirname(importer), specifier).path ?? null,
    load: async (id: string) => readFileSync(id, 'utf8'),
  };
  for (const [label, id, code] of [
    [
      'the consumer as authored, button.ts',
      join(scratch, 'button.ts'),
      CONSUMER,
    ],
    [
      'the consumer after the type transform, read as JavaScript',
      join(scratch, 'button.js'),
      stripped,
    ],
  ] as const) {
    // oxlint-disable-next-line no-await-in-loop
    const { compositions, bailouts } = await analyzeModule(id, code, loader);
    console.log(
      `${label}: flattened ${compositions.length}, retained [${bailouts.map((b: { reason: string }) => b.reason).join(', ')}]`,
    );
  }
  // Layer (a)'s trait list is a type, so the type transform deletes it.
  const layerA = `import { compose, type Composed } from './piirre.ts';
import { ControlledElement } from '@ydinjs/core/element.js';
import { Disableable } from '@probe/traits/traits/disableable.js';
const ButtonBase: Composed<typeof ControlledElement, [typeof Disableable]> = compose(ControlledElement);
export class Button extends ButtonBase {}
`;
  const layerAOut = (
    await vite.transformWithOxc(layerA, join(scratch, 'layer-a.ts'), {
      lang: 'ts',
    })
  ).code;
  console.log(
    'a layer (a) composition after the type transform:',
    JSON.stringify(layerAOut.split('\n').find((l) => l.includes('compose('))),
    '| names Disableable:',
    /\bDisableable\b/.test(layerAOut),
  );
  // rolldown's plugin hooks see TypeScript: a plugin that returns JavaScript
  // for a .ts module has to say so, or the JavaScript is parsed as TypeScript.
  const { rolldown } = requireRoot('rolldown') as typeof import('rolldown');
  write(join(scratch, 'meaning.ts'), 'export {};\n');
  for (const moduleType of [undefined, 'js'] as const) {
    // oxlint-disable-next-line no-await-in-loop
    const bundle = await rolldown({
      input: join(scratch, 'meaning.ts'),
      logLevel: 'silent',
      plugins: [
        {
          name: 'returns-javascript',
          transform: (_code: string, id: string) =>
            id.endsWith('meaning.ts')
              ? {
                  code: 'const a = 1, b = 2, c = 3;\nexport const r = a < b > (c);\n',
                  ...(moduleType ? { moduleType } : {}),
                }
              : null,
        },
      ],
    });
    // oxlint-disable-next-line no-await-in-loop
    const { output } = await bundle.generate({ format: 'es' });
    const file = join(scratch, `meaning-${moduleType ?? 'ts'}.mjs`);
    write(file, output[0].code);
    // oxlint-disable-next-line no-await-in-loop
    const evaluated = await import(pathToFileURL(file).href).catch(
      (e: Error) => ({ r: `throws ${e.name}: ${e.message}` }),
    );
    console.log(
      `rolldown, JavaScript returned for a .ts module, moduleType ${moduleType ?? '(unset)'}: r =`,
      evaluated.r,
    );
  }
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
