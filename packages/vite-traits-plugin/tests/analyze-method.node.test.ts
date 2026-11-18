import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { analyzeModule, parseModule } from '../src/analyze.ts';
import { BailoutError, REASON, type Reason } from '../src/diagnostics.ts';
import { lowerModule } from '../src/lower.ts';
import {
  normalizeMethodTrait,
  resolveGenericFactoryLocals,
} from '../src/normalize.ts';
import { fixtureId, nodeLoader } from './helpers.ts';

const HEAD = `import { impl } from '@ydinjs/core/traits/attributes.js';
import { trait } from '@ydinjs/core/traits/primitives.js';
import { Base } from './base.ts';
import { Checkable } from './checkable.ts';
const $t = Symbol('T');`;

/** A consumer module that defines the trait `T` and composes `list`. */
function consumer(traitInit: string, classBody = '', list = 'T'): string {
  return `${HEAD}
export const T = ${traitInit};
const FooBase = impl(Base, [${list}]);
export class Foo extends FooBase {
${classBody}
}`;
}

/** A method trait whose class body is `body`. */
function methods(body: string): string {
  return `trait((base: typeof Base) => class extends base {
${body}
}, $t)`;
}

/** Analyzes ad-hoc consumer source rooted at the fixtures directory. */
function analyzeSource(code: string, name = 'method-consumer-src.ts') {
  return analyzeModule(fixtureId(name), code, nodeLoader);
}

async function reasons(code: string, name?: string): Promise<Reason[]> {
  const { bailouts } = await analyzeSource(code, name);

  return bailouts.map(({ reason }) => reason);
}

describe('analyzeModule and a method trait', () => {
  it('should flatten a method trait in the consumer module', async () => {
    const { compositions } = await analyzeSource(
      consumer(methods('m(): number { return 1; }')),
    );
    expect(compositions[0]?.composition.traits.map((t) => t.kind)).toEqual([
      'method',
    ]);
  });

  it.each<readonly [string, string, Reason]>([
    [
      'is not a direct trait() call',
      `(0, trait)((base: typeof Base) => class extends base {}, $t)`,
      REASON.UNSUPPORTED_TRAIT,
    ],
    [
      'brand is an inline symbol',
      `trait((base: typeof Base) => class extends base {}, Symbol('T'))`,
      REASON.UNSUPPORTED_TRAIT_DEFINITION,
    ],
    [
      'transformer is a reference',
      `trait(Object, $t)`,
      REASON.UNSUPPORTED_TRAIT_DEFINITION,
    ],
    [
      'transformer is async',
      `trait(async (base: typeof Base) => class extends base {}, $t)`,
      REASON.UNSUPPORTED_TRAIT_DEFINITION,
    ],
    [
      'transformer takes two parameters',
      `trait((base: typeof Base, other: unknown) => class extends base {}, $t)`,
      REASON.UNSUPPORTED_TRAIT_DEFINITION,
    ],
    [
      'transformer has a statement before its return',
      `trait((base: typeof Base) => { void 0; return class extends base {}; }, $t)`,
      REASON.UNSUPPORTED_TRAIT_DEFINITION,
    ],
    [
      "class doesn't extend the parameter",
      `trait((base: typeof Base) => class extends Base {}, $t)`,
      REASON.UNSUPPORTED_TRAIT_DEFINITION,
    ],
    [
      'class body references the class name',
      `trait((base: typeof Base) => class Named extends base { m() { return Named; } }, $t)`,
      REASON.UNSUPPORTED_TRAIT_MEMBER,
    ],
  ])('should retain a site whose trait %s', async (_, init, reason) => {
    expect(await reasons(consumer(init))).toEqual([reason]);
  });

  it.each<readonly [string, string]>([
    ['a constructor', 'constructor() { super(); }'],
    ['a field', 'count = 0;'],
    ['a static method', 'static m() {}'],
    ['a static block', 'static {}'],
    ['a private method', '#m() {}'],
    ['a computed key', "['m']() {}"],
    ['an auto-accessor', 'accessor count = 0;'],
    ['a decorated method', '@Object m() {}'],
    ['a body that uses super', 'm() { return super.toString(); }'],
    ['a body that calls eval', "m() { return eval('1'); }"],
    [
      'a body that calls a parenthesized eval',
      'm(src: string) { return (eval)(src); }',
    ],
    [
      'a body that calls eval through a type assertion',
      'm(src: string) { return (eval as (s: string) => unknown)(src); }',
    ],
    [
      'a body that calls eval indirectly',
      'm(src: string) { return (0, eval)(src); }',
    ],
    ["a body that reads the transformer's parameter", 'm() { return base; }'],
    ['a body that declares a var', 'm() { var x = 1; return x; }'],
    ['a body that declares a function', 'm() { function f() {} return f; }'],
    ['a body that declares a class', 'm() { return class {}; }'],
    ['a body that uses import.meta', 'm() { return import.meta.url; }'],
  ])('should retain a site whose trait class has %s', async (_, body) => {
    expect(await reasons(consumer(methods(body)))).toEqual([
      REASON.UNSUPPORTED_TRAIT_MEMBER,
    ]);
  });

  it('should retain a site whose trait member reads a module function', async () => {
    const code = consumer(methods('m() { return helper(); }')).replace(
      'export const T',
      'function helper() { return 1; }\nexport const T',
    );
    expect(await reasons(code)).toEqual([REASON.UNSUPPORTED_TRAIT_DEFINITION]);
  });

  it('should allow members that emit no JavaScript', async () => {
    const { compositions } = await analyzeSource(
      consumer(
        methods('[key: string]: unknown;\nm(): void;\nm(x?: number) {}'),
      ),
    );
    const [trait] = compositions[0]?.composition.traits ?? [];
    expect(trait?.kind === 'method' && trait.members.map((m) => m.key)).toEqual(
      ['m'],
    );
  });
});

describe('analyzeModule and the layers around a method trait', () => {
  const pair = 'get x() { return 1; }\nset x(v: number) {}';

  it('should retain a site whose later trait declares one half of an accessor', async () => {
    const code = consumer(
      methods('get checked() { return true; }'),
      '',
      'Checkable, T',
    );
    expect(await reasons(code)).toEqual([REASON.TRAIT_ACCESSOR_HALF]);
  });

  it("should retain a site whose class declares one half of a method trait's accessor", async () => {
    const code = consumer(methods(pair), 'get x() { return 2; }');
    expect(await reasons(code)).toEqual([REASON.CLASS_ACCESSOR_HALF]);
  });

  it("should retain a site whose class uses super for a method trait's key", async () => {
    const code = consumer(
      methods('m() { return 1; }'),
      'm() { return super.m(); }',
    );
    expect(await reasons(code)).toEqual([REASON.CLASS_SUPER_TRAIT_MEMBER]);
  });

  it("should flatten a class that replaces a method trait's accessor pair", async () => {
    const code = consumer(
      methods(pair),
      'get x() { return 2; }\nset x(v: number) {}',
    );
    expect(await reasons(code)).toEqual([]);
  });

  it("should flatten a later trait's lone getter over an earlier method", async () => {
    const code = `${consumer(methods('x() {}'), '', 'T, U')}
export const U = trait((base: typeof Base) => class extends base { get x() { return 1; } }, $t);`;
    expect(await reasons(code)).toEqual([]);
  });
});

describe('analyzeModule and the names a method trait reads', () => {
  const GLOBAL_HEAD = `import { impl } from '@ydinjs/core/traits/attributes.js';
import { Base } from './base.ts';
import { GlobalReader } from './global-reader.ts';
const FooBase = impl(Base, [GlobalReader]);`;

  it('should flatten a member that reads a global', async () => {
    const { compositions } = await analyzeSource(
      `${GLOBAL_HEAD}\nexport class Foo extends FooBase {}`,
    );
    const [trait] = compositions[0]?.composition.traits ?? [];
    expect(trait?.kind === 'method' && trait.members[0]?.globals).toEqual([
      'performance',
    ]);
  });

  it.each<readonly [string, string]>([
    [
      'module binds the global',
      `${GLOBAL_HEAD}\nconst performance = { now: () => 0 };\nexport class Foo extends FooBase {}`,
    ],
    [
      'class is named as the global',
      `${GLOBAL_HEAD}\nexport class performance extends FooBase {}`,
    ],
    [
      'class is not module-scoped',
      `${GLOBAL_HEAD}\nexport function make() { return class extends FooBase {}; }`,
    ],
  ])('should retain a site whose consumer %s', async (_, code) => {
    expect(await reasons(code)).toEqual([REASON.TRAIT_BINDING_SHADOWED]);
  });

  it('should retain a TypeScript method trait in a JavaScript consumer', async () => {
    const code = `${GLOBAL_HEAD}\nexport class Foo extends FooBase {}`;
    expect(await reasons(code, 'method-consumer-src.js')).toEqual([
      REASON.TRAIT_SOURCE_LANGUAGE,
    ]);
  });

  it('should retain a TypeScript method trait in a TSX consumer', async () => {
    const code = `${GLOBAL_HEAD}\nexport class Foo extends FooBase {}`;
    expect(await reasons(code, 'method-consumer-src.tsx')).toEqual([
      REASON.TRAIT_SOURCE_LANGUAGE,
    ]);
  });
});

describe('normalizeMethodTrait', () => {
  const ORIGIN = `import { trait } from '@ydinjs/core/traits/primitives.js';
const $t = Symbol('T');
let count = 0;
const map = new WeakMap();
export const T = trait((base) => class extends base {
  m() { const { map: own } = { map }; return own.get(this) ?? count; }
  n() { count += 1; }
}, $t);`;

  const normalize = (code: string, exportName = 'T') => {
    const id = '/virtual/origin.js';
    const program = parseModule(id, code);

    return normalizeMethodTrait(
      code,
      program,
      id,
      './origin.js',
      exportName,
      new Map(),
      resolveGenericFactoryLocals(program),
    );
  };

  it('should retain a trait whose member assigns a linked binding', () => {
    expect(() => normalize(ORIGIN)).toThrow(
      expect.objectContaining({ reason: REASON.UNSUPPORTED_TRAIT_MEMBER }),
    );
  });

  it('should link each module binding a member reads, at each occurrence', () => {
    const ir = normalize(ORIGIN.replace('  n() { count += 1; }\n', ''));
    expect(
      ir?.members[0]?.links.map(({ name, occurrences }) => [
        name,
        occurrences.map(({ shorthand }) => shorthand),
      ]),
    ).toEqual([
      ['map', [true]],
      ['count', [false]],
    ]);
  });

  it('should return null for a binding that is not a generic trait() call', () => {
    expect(normalize(`${ORIGIN}\nexport const U = 1;`, 'U')).toBeNull();
  });

  it('should throw bailouts as BailoutError instances', () => {
    expect(() => normalize(ORIGIN)).toThrow(BailoutError);
  });
});

describe('lowerModule and a method trait', () => {
  it('should rewrite a shorthand property to its link', async () => {
    const id = fixtureId('method-consumer.ts');
    const code = await readFile(id, 'utf8');
    const { compositions } = await analyzeModule(id, code, nodeLoader);

    expect(lowerModule(code, compositions).toString()).toMatch(
      /\{ targets: __mxflat_lnk_[0-9a-f]{8} \}/u,
    );
  });

  it('should not emit observedAttributes for method traits alone', async () => {
    const code = consumer(methods('m() {}'));
    const { compositions } = await analyzeSource(code);

    expect(lowerModule(code, compositions).toString()).not.toContain(
      'observedAttributes',
    );
  });
});
