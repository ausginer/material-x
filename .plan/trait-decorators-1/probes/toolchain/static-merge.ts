// P39. The owner's generic rule for trait statics: classify each static by its
// declared type and merge arrays, spread objects, and let the last simple value
// win. Run from the repository root:
//   node .plan/trait-decorators-1/probes/toolchain/static-merge.ts
//
// §1 reads each static's kind from declarations, with oxc-parser only.
// §2 runs the merge at runtime in Node. §3 asks three browsers what duplicate
// observedAttributes do. §4 pairs core's built JavaScript with its declarations.
// §5 is the pipeline question: what happens to JavaScript inserted into a .ts
// module in a real Vite build.
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../../../../', import.meta.url));
const requireRoot = createRequire(join(root, 'package.json'));
const { parseSync } = requireRoot('oxc-parser') as typeof import('oxc-parser');
const { isolatedDeclarationSync, transformSync } = requireRoot(
  'oxc-transform',
) as typeof import('oxc-transform');
const statics = fileURLToPath(
  new URL('../types/layer-a-statics/', import.meta.url),
);
const here = fileURLToPath(new URL('.', import.meta.url));

// ------------------------------------------------------------------ §1
console.log('== 1. the kind of each static, read from declarations');
/** Declarations as a build without a type checker emits them. */
const declarations = (file: string): string =>
  isolatedDeclarationSync(file, readFileSync(file, 'utf8'), {}).code;

type Kind =
  | 'array'
  | 'object'
  | 'simple'
  | 'tuple: build error'
  | 'class instance: build error'
  | 'function: build error'
  | 'mixed union: build error'
  | 'method'
  | 'accessor'
  | `resolve ${string}`
  | `unresolved ${string}`;

const ARRAY_NAMES = new Set(['Array', 'ReadonlyArray']);
const OBJECT_WRAPPERS = new Set(['Readonly', 'Partial', 'Required', 'Record']);
const SIMPLE = new Set([
  'TSStringKeyword',
  'TSNumberKeyword',
  'TSBooleanKeyword',
  'TSBigIntKeyword',
  'TSLiteralType',
  'TSTemplateLiteralType',
]);

/** A module's type aliases, by name, and its imported type names. */
const aliasesOf = (program: any) => {
  const aliases = new Map<string, any>();
  const imports = new Map<string, string>();
  for (const s of program.body) {
    const node = s.declaration ?? s;
    if (node.type === 'TSTypeAliasDeclaration') {
      aliases.set(node.id.name, node.typeAnnotation);
    }
    if (s.type === 'ImportDeclaration') {
      for (const spec of s.specifiers)
        imports.set(spec.local.name, s.source.value);
    }
  }
  return { aliases, imports };
};

const classify = (
  type: any,
  scope: ReturnType<typeof aliasesOf>,
  load: (specifier: string) => ReturnType<typeof aliasesOf> | null,
): Kind => {
  switch (type.type) {
    case 'TSArrayType':
      return 'array';
    case 'TSTupleType':
      return 'tuple: build error';
    case 'TSTypeOperator':
      return type.operator === 'readonly'
        ? classify(type.typeAnnotation, scope, load)
        : 'mixed union: build error';
    case 'TSTypeLiteral':
      return 'object';
    case 'TSFunctionType':
      return 'function: build error';
    case 'TSTypeQuery':
      return 'unresolved typeof: build error';
    case 'TSUnionType': {
      // `T | undefined` and `T | null` are T, absent.
      const kinds = new Set(
        type.types
          .filter(
            (t: any) =>
              t.type !== 'TSUndefinedKeyword' && t.type !== 'TSNullKeyword',
          )
          .map((t: any) => classify(t, scope, load)),
      );
      return kinds.size === 1
        ? ([...kinds][0] as Kind)
        : 'mixed union: build error';
    }
    case 'TSTypeReference': {
      const name = type.typeName.name;
      if (ARRAY_NAMES.has(name)) return 'array';
      if (OBJECT_WRAPPERS.has(name)) {
        return name === 'Record'
          ? 'object'
          : classify(type.typeArguments.params[0], scope, load);
      }
      if (scope.aliases.has(name)) {
        const kind = classify(scope.aliases.get(name), scope, load);
        return `resolve ${name} in this module → ${kind}`;
      }
      if (scope.imports.has(name)) {
        const other = load(scope.imports.get(name)!);
        const target = other?.aliases.get(name);
        return target
          ? `resolve ${name} from ${scope.imports.get(name)} → ${classify(target, other!, load)}`
          : `unresolved ${name}: build error`;
      }
      // Map, Set, Date: a class instance, which neither spread nor
      // concatenation reproduces.
      return 'class instance: build error';
    }
    default:
      return SIMPLE.has(type.type)
        ? 'simple'
        : `unresolved ${type.type}: build error`;
  }
};

{
  const file = join(statics, 'statics.ts');
  const dts = declarations(file);
  const { program } = parseSync('statics.d.ts', dts);
  const scope = aliasesOf(program);
  const load = (specifier: string) => {
    const other = join(statics, specifier);
    return aliasesOf(parseSync('other.d.ts', declarations(other)).program);
  };
  const cls = program.body
    .map((s: any) => s.declaration ?? s)
    .find((n: any) => n.type === 'ClassDeclaration');
  for (const member of cls.body.body) {
    if (!member.static) continue;
    let kind: Kind;
    if (
      member.type === 'MethodDefinition' ||
      member.type === 'TSAbstractMethodDefinition'
    ) {
      kind = member.kind === 'method' ? 'method' : 'accessor';
    } else if (member.typeAnnotation) {
      kind = classify(member.typeAnnotation.typeAnnotation, scope, load);
    } else if (member.value) {
      // `static readonly count = 1`: a const-inferred literal.
      kind =
        member.value.type === 'Literal'
          ? 'simple'
          : 'unresolved initializer: build error';
    } else {
      kind = 'unresolved no type: build error';
    }
    console.log(
      `  ${member.key.name}${member.optional ? '?' : ''}: ${dts
        .slice(
          member.typeAnnotation?.typeAnnotation.start ??
            member.value?.start ??
            member.start,
          member.typeAnnotation?.typeAnnotation.end ??
            member.value?.end ??
            member.end,
        )
        .replace(/\s+/g, ' ')} → ${kind}`,
    );
  }
}

// ------------------------------------------------------------------ §2
console.log('== 2. the merge at runtime');
class Base {
  static observedAttributes = ['base'];
  static options = { a: 0, nested: { x: 1 } };
}
const T1 = {
  observedAttributes: Object.freeze(['color', 'disabled']),
  options: { a: 1, nested: { y: 2 } },
  mode: 'open',
};
const T2 = {
  observedAttributes: ['disabled', 'size'],
  options: { b: 2 },
  mode: 'closed',
};
const own = { observedAttributes: ['aria-label'] };
// What the flattener would emit: base's runtime value, traits in list order,
// the component's own last.
class Component extends (Base as {
  new (): object;
  observedAttributes: string[];
  options: object;
}) {
  static observedAttributes = [
    ...(Base.observedAttributes ?? []),
    ...T1.observedAttributes,
    ...T2.observedAttributes,
    ...own.observedAttributes,
  ];
  static deduplicated = [...new Set(Component.observedAttributes)];
  static options = { ...Base.options, ...T1.options, ...T2.options };
  static mode = T2.mode;
}
console.log('  concatenated:', JSON.stringify(Component.observedAttributes));
console.log('  with new Set:', JSON.stringify(Component.deduplicated));
console.log(
  '  spread object:',
  JSON.stringify(Component.options),
  '| nested is shallow, the base nested.x is lost:',
  !('x' in Component.options.nested),
);
console.log(
  '  a frozen trait array, merged: frozen?',
  Object.isFrozen(Component.observedAttributes),
  '| the trait value unchanged:',
  JSON.stringify(T1.observedAttributes),
);
console.log('  last simple value wins:', Component.mode);

// ------------------------------------------------------------------ §3
console.log('== 3. duplicate observedAttributes in a browser');
const { chromium, firefox, webkit } = requireRoot(
  'playwright',
) as typeof import('playwright');
for (const browserType of [chromium, firefox, webkit]) {
  // oxlint-disable-next-line no-await-in-loop
  const browser = await browserType.launch();
  try {
    // oxlint-disable-next-line no-await-in-loop
    const page = await browser.newPage();
    // oxlint-disable-next-line no-await-in-loop
    const result = await page.evaluate(() => {
      const calls: string[] = [];
      let reads = 0;
      customElements.define(
        'x-dup',
        class extends HTMLElement {
          static get observedAttributes(): string[] {
            reads += 1;
            return ['disabled', 'color', 'disabled', 'disabled'];
          }
          attributeChangedCallback(name: string): void {
            calls.push(name);
          }
        },
      );
      const element = document.createElement('x-dup');
      element.setAttribute('disabled', '');
      element.setAttribute('color', 'a');
      element.removeAttribute('disabled');
      return { reads, calls };
    });
    console.log(
      `  ${browserType.name()} ${browser.version()}: observedAttributes read ${result.reads} time(s); callbacks ${JSON.stringify(result.calls)}`,
    );
  } finally {
    // oxlint-disable-next-line no-await-in-loop
    await browser.close();
  }
}

// ------------------------------------------------------------------ §4
console.log('== 4. pairing built JavaScript with its declarations');
const membersOf = (file: string, code: string) => {
  const { program } = parseSync(file, code);
  const out = new Map<string, Map<string, string>>();
  const visit = (node: any): void => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.forEach(visit);
    // A bundler may emit `var X = class extends …`, as core's build does.
    const named =
      node.type === 'ClassDeclaration' && node.id
        ? { name: node.id.name, cls: node }
        : node.type === 'VariableDeclarator' &&
            node.init?.type === 'ClassExpression'
          ? { name: node.id.name, cls: node.init }
          : null;
    if (named) {
      const members = new Map<string, string>();
      for (const m of named.cls.body.body) {
        if (m.type === 'StaticBlock') continue;
        const name =
          m.key?.type === 'PrivateIdentifier' ? `#${m.key.name}` : m.key?.name;
        const kind = `${m.static ? 'static ' : ''}${m.kind ?? (m.type === 'AccessorProperty' ? 'accessor' : 'property')}`;
        const type = m.typeAnnotation
          ? `: ${code.slice(m.typeAnnotation.typeAnnotation.start, m.typeAnnotation.typeAnnotation.end)}`
          : m.value?.type === 'TSEmptyBodyFunctionExpression' ||
              m.value?.type === 'FunctionExpression'
            ? `(${(m.value.params ?? []).map((p: any) => code.slice(p.start, p.end)).join(', ')})${m.value.returnType ? code.slice(m.value.returnType.start, m.value.returnType.end) : ''}`
            : '';
        members.set(`${kind} ${name}`, type.replace(/\s+/g, ' '));
      }
      out.set(named.name, members);
    }
    for (const v of Object.values(node)) visit(v);
  };
  visit(program);
  return out;
};
const pair = (
  label: string,
  jsFile: string,
  js: string,
  dtsFile: string,
  dts: string,
): void => {
  const jsClasses = membersOf(jsFile, js);
  const dtsClasses = membersOf(dtsFile, dts);
  for (const [name, jsMembers] of jsClasses) {
    const dtsMembers = dtsClasses.get(name) ?? new Map();
    const both = [...jsMembers.keys()].filter((k) => dtsMembers.has(k));
    console.log(
      `  ${label} class ${name}: ${jsMembers.size} in .js, ${dtsMembers.size} in .d.ts, paired ${both.length}`,
    );
    console.log(
      '    only in .js:',
      JSON.stringify([...jsMembers.keys()].filter((k) => !dtsMembers.has(k))),
    );
    console.log(
      '    only in .d.ts:',
      JSON.stringify([...dtsMembers.keys()].filter((k) => !jsMembers.has(k))),
    );
    for (const k of both) console.log(`    ${k}${dtsMembers.get(k)}`);
  }
};
{
  const js = join(root, 'packages/core/element.js');
  const dts = join(root, 'packages/core/element.d.ts');
  pair(
    "core's built",
    js,
    readFileSync(js, 'utf8'),
    dts,
    readFileSync(dts, 'utf8'),
  );
}
{
  // A layer (a) trait class as core's build would emit it: oxc's type strip
  // for the .js, oxc's isolated declarations for the .d.ts.
  const source = `import attr, { Bool } from '@ydinjs/core/attribute.js';
import { bound, trait, type Bound } from './piirre.ts';
const AnyElement: Bound<HTMLElement> = bound();
const controls = new WeakMap<HTMLElement, HTMLElement>();
export class Disableable extends AnyElement {
  static {
    trait(this);
  }
  static readonly observedAttributes: readonly string[] = ['disabled'];
  #brand!: true;
  get disabled(): boolean {
    return attr.get(this, 'disabled', Bool);
  }
  set disabled(value: boolean) {
    attr.set(this, 'disabled', value, Bool);
  }
  override focus(options?: FocusOptions): void;
  override focus(options?: FocusOptions): void {
    controls.get(this)!.focus(options);
  }
  declare readonly label: string;
}
`;
  const js = transformSync('disableable.ts', source, {}).code;
  const dts = isolatedDeclarationSync('disableable.ts', source, {}).code;
  pair('layer (a)', 'disableable.js', js, 'disableable.d.ts', dts);
}

// ------------------------------------------------------------------ §5
console.log(
  '== 5. JavaScript inserted into a .ts module, in a real Vite build',
);
const vite = (await import(
  pathToFileURL(requireRoot.resolve('vite')).href
)) as typeof import('vite');
const scratch = mkdtempSync(join(here, '.static-merge-'));
// A member as built JavaScript holds it: `a < b > (c)` compares twice.
const MEMBER = 'm(a, b, c) { return a < b > (c); }';
const consumer = (typed: boolean): string => `export class Component {
  __insert() {}
}
export const typed${typed ? ': number' : ''} = 1;
`;
try {
  let run = 0;
  for (const [label, file, strip] of [
    ['.js consumer, member inserted', 'consumer.js', false],
    [
      '.ts consumer, member inserted before the type strip',
      'consumer.ts',
      false,
    ],
    [
      ".ts consumer, the flattener strips types first and returns moduleType 'js'",
      'consumer.ts',
      true,
    ],
    [
      '.ts consumer, inserted by a normal-order plugin, after vite:oxc',
      'consumer.ts',
      'after',
    ],
  ] as const) {
    writeFileSync(join(scratch, file), consumer(file.endsWith('.ts')));
    // oxlint-disable-next-line no-await-in-loop
    const out = (await vite.build({
      configFile: false,
      root: scratch,
      logLevel: 'silent',
      plugins: [
        {
          name: 'inserts-javascript',
          ...(strip === 'after' ? {} : { enforce: 'pre' as const }),
          transform(code: string, id: string) {
            if (!id.startsWith(scratch)) return null;
            if (strip !== true)
              return code.replace(/__insert\(\)\s*\{\s*\}/, MEMBER);
            const js = transformSync(id, code, {}).code;
            return {
              code: js.replace(/__insert\(\)\s*\{\s*\}/, MEMBER),
              moduleType: 'js',
            };
          },
        },
      ],
      build: {
        write: false,
        minify: false,
        lib: { entry: join(scratch, file), formats: ['es'], fileName: 'out' },
      },
    })) as Array<{ output: Array<{ type: string; code?: string }> }>;
    const code = out[0]!.output.find((o) => o.type === 'chunk')!.code!;
    const built = join(scratch, `out-${(run += 1)}.mjs`);
    writeFileSync(built, code);
    // oxlint-disable-next-line no-await-in-loop
    const { Component } = await import(pathToFileURL(built).href);
    let result: unknown;
    try {
      result = new Component().m(1, 2, 3);
    } catch (error) {
      result = `throws ${(error as Error).name}: ${(error as Error).message}`;
    }
    console.log(
      `  ${label}: emitted ${JSON.stringify(code.split('\n').find((l) => l.includes('a(c)') || l.includes('< b')))?.trim()} → m(1, 2, 3) = ${result}`,
    );
  }
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
void dirname;
