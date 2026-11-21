import { writeFile } from 'node:fs/promises';
import { afterAll, expect, it } from 'vitest';
import { fixtureId, transform } from './helpers.ts';

const OUT = process.env.RV_OUT ?? '/dev/null';
const HEADER = `import { compose, trait, bound, type Composed, type Bound } from '@ydinjs/core/traits/composition.js';
import { Base } from './base.ts';
const AnyBase: Bound<Base> = bound();
export const shared = 1;
const hidden = 2;
`;
const rows: unknown[] = [];

const tr = (name: string, body: string, ext = 'AnyBase') =>
  `@trait\nexport class ${name} extends ${ext} {\n${body}\n}\n`;
const comp = (traits: string, body = '', name = 'Foo', base = 'Base') =>
  `const ${name}Base: Composed<typeof ${base}, [${traits}]> = compose(${base});\nexport class ${name} extends ${name}Base {\n${body}\n}\n`;
const ctorTrait = tr(
  'T',
  `  #s = 0;\n  constructor() {\n    super();\n    this.#s = 1;\n  }\n  get s(): number { return this.#s; }`,
);

async function probe(
  label: string,
  body: string,
  others: Record<string, string> = {},
  file = 'rv-virtual.ts',
) {
  const id = fixtureId(file);
  const source = `${HEADER}${body}`;
  const files: Record<string, string> = { [id]: source };
  for (const [n, c] of Object.entries(others)) files[fixtureId(n)] = c;
  try {
    const out = await transform(id, { files });
    rows.push({
      label,
      result: 'accepted',
      warnings: out.warnings,
      code: label.startsWith('!') ? out.code : undefined,
    });
  } catch (error: any) {
    const pos: number | undefined = error.pos;
    rows.push({
      label,
      code: error.code ?? 'THROWN',
      message: String(error.message).slice(0, 200),
      at:
        pos === undefined ? null : JSON.stringify(source.slice(pos, pos + 28)),
    });
  }
}

afterAll(async () => {
  await writeFile(OUT, rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
});

it('probes', async () => {
  // --- trait field initializers
  await probe(
    'init this direct',
    tr('T', '  #x = this.constructor;\n  get x() { return this.#x; }') +
      comp('typeof T'),
  );
  await probe(
    'init this arrow',
    tr('T', '  #x = () => this;\n  get x() { return this.#x; }') +
      comp('typeof T'),
  );
  await probe(
    'init this nested fn',
    tr(
      'T',
      '  #x = function () { return this; };\n  get x() { return this.#x; }',
    ) + comp('typeof T'),
  );
  await probe(
    'init this object method',
    tr('T', '  #x = { m() { return this; } };\n  get x() { return this.#x; }') +
      comp('typeof T'),
  );
  await probe(
    'init super',
    tr('T', '  #x = super.toString;\n  get x() { return this.#x; }') +
      comp('typeof T'),
  );
  await probe(
    'init class expr',
    tr('T', '  #x = class {};\n  get x() { return this.#x; }') +
      comp('typeof T'),
  );
  await probe(
    'init new.target',
    tr('T', '  #x = new.target;\n  get x() { return this.#x; }') +
      comp('typeof T'),
  );
  await probe(
    'init import.meta',
    tr('T', '  #x = import.meta.url;\n  get x() { return this.#x; }') +
      comp('typeof T'),
  );
  await probe(
    'init this but field unreferenced (accepted?)',
    tr('T', '  #x = this.constructor;') + comp('typeof T'),
  );
  await probe(
    '! init links: new Map, exported, private',
    tr(
      'T',
      '  #x = new Map([[shared, hidden]]);\n  get x() { return this.#x; }',
    ) + comp('typeof T'),
  );
  // --- private-name forms
  await probe(
    'other.#x',
    tr('T', '  #x = 1;\n  eq(o: T) { return o.#x === this.#x; }') +
      comp('typeof T'),
  );
  await probe(
    '#x in o',
    tr('T', '  #x = 1;\n  is(o: object) { return #x in o; }') +
      comp('typeof T'),
  );
  await probe(
    '#x in this',
    tr('T', '  #x = 1;\n  is() { return #x in this; }') + comp('typeof T'),
  );
  await probe(
    'this.#x in nested function',
    tr(
      'T',
      '  #x = 1;\n  f() { const self = this; return function () { return self && this.#x; }; }',
    ) + comp('typeof T'),
  );
  await probe(
    'this.#x in object method',
    tr('T', '  #x = 1;\n  f() { return { g() { return this.#x; } }; }') +
      comp('typeof T'),
  );
  await probe(
    'this.#x in arrow (accepted)',
    tr('T', '  #x = 1;\n  f() { return () => this.#x; }') + comp('typeof T'),
  );
  await probe(
    'this.#x compound/update/destructure (accepted)',
    tr(
      'T',
      '  #x = 1;\n  #y = 0;\n  f() { this.#x += 1; this.#x++; [this.#y] = [2]; ({ a: this.#x } = { a: 3 }); return this.#x + this.#y; }',
    ) + comp('typeof T'),
  );
  await probe(
    '(this).#x',
    tr('T', '  #x = 1;\n  f() { return (this).#x; }') + comp('typeof T'),
  );
  await probe(
    'this?.#x',
    tr('T', '  #x = 1;\n  f() { return this?.#x; }') + comp('typeof T'),
  );
  await probe(
    'static private field',
    tr('T', '  static #s = 1;') + comp('typeof T'),
  );
  await probe(
    'static private method',
    tr('T', '  static #m() { return 1; }') + comp('typeof T'),
  );
  await probe(
    'static method reads #x',
    tr(
      'T',
      '  #x = 1;\n  get x() { return this.#x; }\n  static f(o: T) { return o.#x; }',
    ) + comp('typeof T'),
  );
  await probe('accessor #x', tr('T', '  accessor #x = 1;') + comp('typeof T'));
  await probe('public field', tr('T', '  y = 1;') + comp('typeof T'));
  await probe(
    'private method + public same name (accepted)',
    tr('T', '  #f() { return 1; }\n  f() { return this.#f(); }') +
      comp('typeof T'),
  );
  // --- trait constructors
  await probe(
    'ctor param',
    tr('T', '  constructor(a: number) {\n    super();\n  }') + comp('typeof T'),
  );
  await probe(
    'ctor param property',
    tr('T', '  constructor(private a: number) {\n    super();\n  }') +
      comp('typeof T'),
  );
  await probe(
    'ctor no super',
    tr('T', '  constructor() {\n    shared;\n  }') + comp('typeof T'),
  );
  await probe('ctor empty', tr('T', '  constructor() {}') + comp('typeof T'));
  await probe(
    'ctor super(x)',
    tr('T', '  constructor() {\n    super(shared);\n  }') + comp('typeof T'),
  );
  await probe(
    'ctor statement before super',
    tr('T', '  constructor() {\n    shared;\n    super();\n  }') +
      comp('typeof T'),
  );
  await probe(
    'ctor second super()',
    tr('T', '  constructor() {\n    super();\n    if (shared) super();\n  }') +
      comp('typeof T'),
  );
  await probe(
    'ctor super.method',
    tr('T', '  constructor() {\n    super();\n    super.toString();\n  }') +
      comp('typeof T'),
  );
  await probe(
    'ctor arguments',
    tr('T', '  constructor() {\n    super();\n    shared(arguments);\n  }') +
      comp('typeof T'),
  );
  await probe(
    'ctor arguments in arrow',
    tr('T', '  constructor() {\n    super();\n    (() => arguments)();\n  }') +
      comp('typeof T'),
  );
  await probe(
    'ctor arguments in nested function (accepted)',
    tr(
      'T',
      '  constructor() {\n    super();\n    (function () { return arguments; })();\n  }',
    ) + comp('typeof T'),
  );
  await probe(
    'ctor new.target',
    tr('T', '  constructor() {\n    super();\n    new.target;\n  }') +
      comp('typeof T'),
  );
  await probe(
    'ctor bare return',
    tr('T', '  constructor() {\n    super();\n    return;\n  }') +
      comp('typeof T'),
  );
  await probe(
    'ctor return in if',
    tr(
      'T',
      '  constructor() {\n    super();\n    if (shared) { return; }\n  }',
    ) + comp('typeof T'),
  );
  await probe(
    'ctor return x',
    tr('T', '  constructor() {\n    super();\n    return {};\n  }') +
      comp('typeof T'),
  );
  await probe(
    'ctor return in arrow/function (accepted)',
    tr(
      'T',
      '  constructor() {\n    super();\n    (() => { return 1; })();\n    (function () { return 2; })();\n  }',
    ) + comp('typeof T'),
  );
  await probe(
    'ctor var',
    tr('T', '  constructor() {\n    super();\n    var v = 1;\n  }') +
      comp('typeof T'),
  );
  await probe(
    'ctor function decl',
    tr('T', '  constructor() {\n    super();\n    function f() {}\n  }') +
      comp('typeof T'),
  );
  await probe(
    'ctor eval',
    tr('T', '  constructor() {\n    super();\n    eval("1");\n  }') +
      comp('typeof T'),
  );
  await probe(
    'ctor overload',
    tr('T', '  constructor();\n  constructor() {\n    super();\n  }') +
      comp('typeof T'),
  );
  await probe(
    'ctor modifier',
    tr('T', '  public constructor() {\n    super();\n  }') + comp('typeof T'),
  );
  await probe(
    'ctor reads trait class name',
    tr('T', '  constructor() {\n    super();\n    T;\n  }') + comp('typeof T'),
  );
  // --- component constructors (with a trait constructor)
  await probe(
    'comp no super',
    ctorTrait + comp('typeof T', '  constructor() {\n    shared;\n  }'),
  );
  await probe(
    'comp two super if/else',
    ctorTrait +
      comp(
        'typeof T',
        '  constructor() {\n    if (shared) super(); else super();\n  }',
      ),
  );
  await probe(
    'comp two super sequential',
    ctorTrait +
      comp('typeof T', '  constructor() {\n    super();\n    super();\n  }'),
  );
  await probe(
    'comp super in arrow',
    ctorTrait +
      comp(
        'typeof T',
        '  constructor() {\n    const f = () => super();\n    f();\n  }',
      ),
  );
  await probe(
    'comp super in block',
    ctorTrait +
      comp('typeof T', '  constructor() {\n    {\n      super();\n    }\n  }'),
  );
  await probe(
    'comp super in try',
    ctorTrait +
      comp(
        'typeof T',
        '  constructor() {\n    try {\n      super();\n    } finally {}\n  }',
      ),
  );
  await probe(
    'comp super ternary',
    ctorTrait +
      comp(
        'typeof T',
        '  constructor() {\n    shared ? super() : super();\n  }',
      ),
  );
  await probe(
    'comp super, (this.x=1)',
    ctorTrait +
      comp(
        'typeof T',
        '  x = 0;\n  constructor() {\n    super(), (this.x = 1);\n  }',
      ),
  );
  await probe(
    'comp const self = super()',
    ctorTrait +
      comp('typeof T', '  constructor() {\n    const self = super();\n  }'),
  );
  await probe(
    'comp super(super-ish arg in arrow)',
    ctorTrait +
      comp('typeof T', '  constructor() {\n    super((() => 1)());\n  }'),
  );
  await probe(
    'comp (super())',
    ctorTrait + comp('typeof T', '  constructor() {\n    (super());\n  }'),
  );
  await probe(
    'comp await-free super with label',
    ctorTrait + comp('typeof T', '  constructor() {\n    l: super();\n  }'),
  );
  await probe(
    'comp no super, no trait ctor (accepted)',
    tr('U', '  #s = 0;\n  get s() { return this.#s; }') +
      comp(
        'typeof U',
        '  constructor() {\n    if (shared) super(); else super();\n  }',
      ),
  );
  // --- shadowing
  await probe(
    'shadow: ctor param',
    tr('T', '  constructor() {\n    super();\n    shared;\n  }') +
      comp('typeof T', '  constructor(shared: number) {\n    super();\n  }'),
  );
  await probe(
    'shadow: const after super',
    tr('T', '  constructor() {\n    super();\n    shared;\n  }') +
      comp(
        'typeof T',
        '  constructor() {\n    super();\n    const shared = 1;\n  }',
      ),
  );
  await probe(
    'shadow: const before super',
    tr('T', '  constructor() {\n    super();\n    shared;\n  }') +
      comp(
        'typeof T',
        '  constructor() {\n    const shared = 1;\n    super();\n  }',
      ),
  );
  await probe(
    'shadow: var nested',
    tr('T', '  constructor() {\n    super();\n    shared;\n  }') +
      comp(
        'typeof T',
        '  constructor() {\n    super();\n    if (1) { var shared = 1; }\n  }',
      ),
  );
  await probe(
    'shadow: function decl',
    tr('T', '  constructor() {\n    super();\n    shared;\n  }') +
      comp(
        'typeof T',
        '  constructor() {\n    super();\n    function shared() {}\n  }',
      ),
  );
  await probe(
    'shadow: let in nested block (accepted)',
    tr('T', '  constructor() {\n    super();\n    shared;\n  }') +
      comp(
        'typeof T',
        '  constructor() {\n    super();\n    if (1) { let shared = 1; }\n  }',
      ),
  );
  await probe(
    'shadow: global read vs param',
    tr('T', '  constructor() {\n    super();\n    console.log(1);\n  }') +
      comp('typeof T', '  constructor(console: number) {\n    super();\n  }'),
  );
  await probe(
    'shadow: generated args',
    tr('T', '  constructor() {\n    super();\n    args;\n  }') +
      comp('typeof T'),
  );
  await probe(
    'shadow: param property',
    tr('T', '  constructor() {\n    super();\n    shared;\n  }') +
      comp(
        'typeof T',
        '  constructor(private shared: number) {\n    super();\n  }',
      ),
  );
  await probe(
    'shadow: catch param at top level (accepted?)',
    tr('T', '  constructor() {\n    super();\n    shared;\n  }') +
      comp(
        'typeof T',
        '  constructor() {\n    super();\n    try {} catch (shared) {}\n  }',
      ),
  );
  // --- private-name collisions
  await probe(
    'collide: component declares renamed',
    ctorTrait + comp('typeof T', '  #s_bb23c946 = 1;'),
  );
  await probe(
    'collide: component private method = renamed',
    ctorTrait + comp('typeof T', '  #s_bb23c946() { return 1; }'),
  );
  await probe(
    'collide: component private, different trait suffix (accepted)',
    ctorTrait + comp('typeof T', '  #s_00000000 = 1;\n  #s = 2;'),
  );
  // --- component fields
  await probe('cfield this', ctorTrait + comp('typeof T', '  x = this.s;'));
  await probe(
    'cfield arrow this',
    ctorTrait + comp('typeof T', '  x = () => this.s;'),
  );
  await probe(
    'cfield map arrow',
    ctorTrait + comp('typeof T', '  x = [1].map(() => this.s);'),
  );
  await probe(
    'cfield nested function',
    ctorTrait + comp('typeof T', '  x = function () { return this; };'),
  );
  await probe(
    'cfield object method',
    ctorTrait + comp('typeof T', '  x = { m() { return this; } };'),
  );
  await probe(
    'cfield super',
    ctorTrait + comp('typeof T', '  x = super.toString();'),
  );
  await probe(
    'cfield accessor',
    ctorTrait + comp('typeof T', '  accessor x = this.s;'),
  );
  await probe('cfield private', ctorTrait + comp('typeof T', '  #x = this.s;'));
  await probe(
    'cfield static this (accepted)',
    ctorTrait + comp('typeof T', '  static x = this;'),
  );
  await probe(
    'cfield no this (accepted)',
    ctorTrait + comp('typeof T', '  x = new Map();'),
  );
  await probe(
    'cfield this without trait ctor (accepted)',
    tr('U', '  #s = 0;\n  get s() { return this.#s; }') +
      comp('typeof U', '  x = this.s;'),
  );
  await probe(
    'cfield in nested class decl? computed key this',
    ctorTrait + comp('typeof T', '  [shared] = 1;'),
  );
  expect(rows.length).toBeGreaterThan(0);
});
