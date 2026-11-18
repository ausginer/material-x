import { dirname, join, relative } from 'node:path';
import type {
  CallExpression,
  Class,
  Expression,
  Node,
  Program,
  VariableDeclaration,
  VariableDeclarator,
} from '@oxc-project/types';
import { parseSync } from 'oxc-parser';
import { bail, BailoutError, REASON } from './diagnostics.ts';
import { TRAIT_IR_VERSION, type CompositionIR, type TraitIR } from './ir.ts';
import {
  collectImports,
  collectTopBindings,
  type LocalImport,
  normalizeDescriptorTrait,
  resolveFactoryLocals,
  type SyntheticExport,
  type TopBinding,
  unwrapTS,
} from './normalize.ts';

/**
 * Host-provided resolution and loading, so analysis does not hard-code the
 * bundler's module graph or filesystem access.
 */
export interface ModuleLoader {
  /** Resolve `specifier` relative to `importer` to an absolute module id. */
  resolve(specifier: string, importer: string): Promise<string | null>;
  /** Load source text for a resolved module id. */
  load(id: string): Promise<string>;
}

/** Specifiers whose `impl` export is the composition builder. */
const IMPL_MODULE =
  /(?:^|\/)@ydinjs\/core\/traits\/(?:attributes|primitives)(?:\.[cm]?[jt]sx?)?$/u;

/** Range in the consumer source, as `[start, end)` byte offsets. */
export type Span = readonly [number, number];

/**
 * A fully analyzed, eligible `impl` site with everything lowering needs.
 */
export type AnalyzedComposition = Readonly<{
  composition: CompositionIR;
  /** Source text of the base constructor expression (e.g. `ControlledElement`). */
  baseSource: string;
  /** Name of the flattened component class, for diagnostics. */
  className: string;
  /** Range of the whole `const X = impl(...)` statement to remove. */
  declarationSpan: Span;
  /** Range of the superclass reference to rewrite to the base. */
  superClassSpan: Span;
  /** Offset just past the class body's opening `{`. */
  classBodyInsert: number;
}>;

/** Depth-first walk over every AST node reachable from `root`. */
function walk(root: Node, visit: (node: Node) => void): void {
  const stack: unknown[] = [root];

  while (stack.length > 0) {
    const current = stack.pop();

    if (Array.isArray(current)) {
      for (const item of current) {
        stack.push(item);
      }
      continue;
    }

    if (!current || typeof current !== 'object') {
      continue;
    }

    if (typeof (current as { type?: unknown }).type === 'string') {
      visit(current as Node);
    }

    for (const key of Object.keys(current)) {
      if (key === 'type' || key === 'start' || key === 'end') {
        continue;
      }
      stack.push((current as Record<string, unknown>)[key]);
    }
  }
}

type ImplSite = Readonly<{
  declaration: VariableDeclaration;
  declarator: VariableDeclarator;
  call: CallExpression;
  name: string;
}>;

/** Finds top-level `const X = impl(base, [...])` declarations. */
function findImplSites(
  program: Program,
  implLocals: ReadonlySet<string>,
): readonly ImplSite[] {
  const sites: ImplSite[] = [];

  const scan = (declaration: VariableDeclaration): void => {
    for (const declarator of declaration.declarations) {
      const { init } = declarator;
      if (
        declarator.id.type === 'Identifier' &&
        init?.type === 'CallExpression' &&
        init.callee.type === 'Identifier' &&
        implLocals.has(init.callee.name)
      ) {
        sites.push({
          declaration,
          declarator,
          call: init,
          name: declarator.id.name,
        });
      }
    }
  };

  for (const node of program.body) {
    if (node.type === 'VariableDeclaration') {
      scan(node);
    } else if (
      node.type === 'ExportNamedDeclaration' &&
      node.declaration?.type === 'VariableDeclaration'
    ) {
      // An exported intermediary escapes; record so eligibility can bail.
      scan(node.declaration);
    }
  }

  return sites;
}

/**
 * Verifies the intermediary `name` is used solely as the superclass of exactly
 * one local class, and returns that class. Any other reference bails.
 */
function requireSingleConsumer(program: Program, site: ImplSite): Class {
  let references = 0;
  let consumer: Class | undefined;

  walk(program, (node) => {
    if (node.type === 'Identifier' && node.name === site.name) {
      references += 1;
    }

    if (
      (node.type === 'ClassDeclaration' || node.type === 'ClassExpression') &&
      node.superClass?.type === 'Identifier' &&
      node.superClass.name === site.name
    ) {
      consumer ??= node;
    }
  });

  // Expect exactly the declarator id and the single superclass reference.
  if (!consumer) {
    bail(
      REASON.IMPL_ESCAPES,
      site.name,
      'composition constructor is not used as a superclass',
    );
  }
  if (references > 2) {
    bail(
      REASON.IMPL_MULTIPLE_CONSUMERS,
      site.name,
      'composition constructor is referenced more than once',
    );
  }

  return consumer;
}

const parseCache = new Map<
  string,
  Readonly<{ code: string; program: Program }>
>();

/**
 * Parses `code` for `id`. The cache holds the last source parsed for each id,
 * and a different source for that id is parsed again.
 */
export function parseModule(id: string, code: string): Program {
  const cached = parseCache.get(id);
  if (cached?.code === code) {
    return cached.program;
  }

  const { program } = parseSync(id, code);
  parseCache.set(id, { code, program });

  return program;
}

/** Drops a cached parse (used on watch invalidation). */
export function invalidateModule(id: string): void {
  parseCache.delete(id);
}

/** A trait module resolved to the module context it lives in. */
type ModuleCtx = Readonly<{
  id: string;
  program: Program;
  imports: Map<string, LocalImport>;
  bindings: Map<string, TopBinding>;
}>;

/** A single trait occurrence resolved to where it is defined/exported. */
type TraitRef = Readonly<{
  /** Identifier name, for diagnostics. */
  name: string;
  /** Absolute id of the module defining the trait. */
  originId: string;
  /** Parsed origin module. */
  program: Program;
  /** Specifier the consumer imports the trait's links through; `''` when local. */
  specifier: string;
  /** Name the trait binding has in its origin module. */
  exportName: string;
}>;

/** Shared state threaded through the mutually-recursive trait-list resolver. */
type Resolver = Readonly<{
  consumerId: string;
  consumerDir: string;
  loader: ModuleLoader;
  ctxCache: Map<string, ModuleCtx>;
  /** Per-origin cache of relative-import → consumer-usable specifier. */
  rebaseCache: Map<string, Map<string, string | null>>;
  dependencies: Set<string>;
  /** Ordered trait references accumulated in declaration/layer order. */
  out: TraitRef[];
  /**
   * Trait-list bindings being expanded, as `<module id>\0<binding name>`. A
   * binding met again while it is being expanded is a cycle.
   */
  listPath: Set<string>;
}>;

/**
 * Specifier the consumer uses to import from `originId`: empty when the trait is
 * defined in the consumer module itself (linked in place), the original bare
 * specifier for package imports, or a path rebased onto the consumer for
 * relative ones (which may have been reached through an intermediate module).
 */
function consumerSpecifier(
  r: Resolver,
  originId: string,
  rawSpecifier: string,
): string {
  if (originId === r.consumerId) {
    return '';
  }
  // A bare package specifier reaches the origin from anywhere unchanged.
  if (rawSpecifier && !rawSpecifier.startsWith('.')) {
    return rawSpecifier;
  }
  // Otherwise the origin is a file reached by path — either a trait defined in
  // an *intermediate* module (empty `rawSpecifier`, e.g. `ButtonLike` inside
  // `ButtonCore`, reached through a spread list) or one imported relatively.
  // Both must be re-pathed from the actual consumer, not treated as in-scope.
  const rel = relative(r.consumerDir, originId).replaceAll('\\', '/');
  return rel.startsWith('.') ? rel : `./${rel}`;
}

/** Loads, parses and indexes a module, caching the result. */
async function buildCtx(r: Resolver, originId: string): Promise<ModuleCtx> {
  const cached = r.ctxCache.get(originId);
  if (cached) {
    return cached;
  }
  r.dependencies.add(originId);
  const parsed = parseModule(originId, await r.loader.load(originId));
  const ctx: ModuleCtx = {
    id: originId,
    program: parsed,
    imports: collectImports(parsed),
    bindings: collectTopBindings(parsed),
  };
  r.ctxCache.set(originId, ctx);
  return ctx;
}

/** The array literal a trait-list binding is initialized to, if any. */
function arrayInit(binding: TopBinding | undefined): Expression | undefined {
  const init = binding?.declarator.init;
  if (!init) {
    return undefined;
  }
  const unwrapped = unwrapTS(init);
  return unwrapped.type === 'ArrayExpression' ? unwrapped : undefined;
}

/**
 * Rebases a specifier imported *inside* an origin module onto one a consumer in
 * another package can use. A relative import is resolved to disk and remapped
 * through the nearest `package.json` to `<name>/<path-from-package-root>` (e.g.
 * a cross-package trait's `../attribute.js` → `@ydinjs/core/attribute.js`).
 * Bare specifiers already work everywhere and pass through; anything that can't
 * be mapped returns `null`.
 */
async function rebaseOriginSpecifier(
  r: Resolver,
  originId: string,
  originSpecifier: string,
): Promise<string | null> {
  if (!originSpecifier.startsWith('.')) {
    return originSpecifier;
  }
  const abs = await r.loader.resolve(originSpecifier, originId);
  if (!abs) {
    return null;
  }
  let dir = dirname(abs);
  for (;;) {
    let name: string | undefined;
    try {
      // oxlint-disable-next-line no-await-in-loop
      const raw = await r.loader.load(join(dir, 'package.json'));
      ({ name } = JSON.parse(raw) as { name?: string });
    } catch {
      name = undefined;
    }
    if (name) {
      const sub = relative(dir, abs).replaceAll('\\', '/');
      return sub ? `${name}/${sub}` : name;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      return null;
    }
    dir = parent;
  }
}

/**
 * Pre-resolves every relative import of an origin module to a consumer-usable
 * specifier, so the synchronous normalizer can rebase converter/brand links
 * without doing I/O itself. Cached per origin.
 */
async function originRebases(
  r: Resolver,
  originId: string,
): Promise<Map<string, string | null>> {
  const cached = r.rebaseCache.get(originId);
  if (cached) {
    return cached;
  }
  const map = new Map<string, string | null>();
  const ctx = r.ctxCache.get(originId);
  for (const [, imported] of ctx?.imports ?? []) {
    if (imported.specifier.startsWith('.') && !map.has(imported.specifier)) {
      map.set(
        imported.specifier,
        // oxlint-disable-next-line no-await-in-loop
        await rebaseOriginSpecifier(r, originId, imported.specifier),
      );
    }
  }
  r.rebaseCache.set(originId, map);
  return map;
}

/** Resolves a single trait identifier to where it is defined and pushes it. */
async function resolveTraitRef(
  r: Resolver,
  name: string,
  ctx: ModuleCtx,
  site: ImplSite,
): Promise<void> {
  if (ctx.bindings.has(name)) {
    // Defined in this module: link locally when it IS the consumer, else
    // through the specifier that reaches this module.
    r.out.push({
      name,
      originId: ctx.id,
      program: ctx.program,
      specifier: consumerSpecifier(r, ctx.id, ''),
      exportName: name,
    });
    return;
  }

  const imported = ctx.imports.get(name);
  if (!imported) {
    bail(
      REASON.UNSUPPORTED_TRAIT,
      site.name,
      `trait ${name} is not resolvable`,
    );
  }
  const originId = await r.loader.resolve(imported.specifier, ctx.id);
  if (!originId) {
    bail(
      REASON.UNSUPPORTED_TRAIT,
      site.name,
      `cannot resolve trait module ${imported.specifier}`,
    );
  }
  const origin = await buildCtx(r, originId);
  r.out.push({
    name,
    originId,
    program: origin.program,
    specifier: consumerSpecifier(r, originId, imported.specifier),
    exportName: imported.imported,
  });
}

/**
 * Finds the array literal that a trait-list reference names, local to `ctx` or
 * imported into it, with the module that declares it.
 */
async function findListBinding(
  r: Resolver,
  name: string,
  ctx: ModuleCtx,
  site: ImplSite,
): Promise<Readonly<{ key: string; array: Expression; ctx: ModuleCtx }>> {
  const localArray = arrayInit(ctx.bindings.get(name));
  if (localArray) {
    return { key: `${ctx.id}\0${name}`, array: localArray, ctx };
  }
  if (ctx.bindings.has(name)) {
    bail(
      REASON.UNSUPPORTED_TRAIT_LIST,
      site.name,
      `${name} is not an array literal`,
    );
  }

  const imported = ctx.imports.get(name);
  if (!imported) {
    bail(
      REASON.UNSUPPORTED_TRAIT_LIST,
      site.name,
      `trait list reference ${name} is not defined`,
    );
  }
  const originId = await r.loader.resolve(imported.specifier, ctx.id);
  if (!originId) {
    bail(
      REASON.UNSUPPORTED_TRAIT_LIST,
      site.name,
      `cannot resolve trait-list module ${imported.specifier}`,
    );
  }
  const origin = await buildCtx(r, originId);
  const importedArray = arrayInit(origin.bindings.get(imported.imported));
  if (!importedArray) {
    bail(
      REASON.UNSUPPORTED_TRAIT_LIST,
      site.name,
      `imported trait list ${name} is not an array literal`,
    );
  }

  return {
    key: `${originId}\0${imported.imported}`,
    array: importedArray,
    ctx: origin,
  };
}

/**
 * Expands a trait list into ordered trait references. A list is either an array
 * literal (whose elements are trait identifiers or spreads of other lists) or an
 * identifier referencing a trait-list const, local or imported — followed across
 * module boundaries. Self-recursive; awaits stay sequential so declaration order
 * fixes prototype-layer precedence.
 */
async function resolveList(
  r: Resolver,
  expr: Expression,
  ctx: ModuleCtx,
  site: ImplSite,
): Promise<void> {
  const node = unwrapTS(expr);

  if (node.type === 'Identifier') {
    const list = await findListBinding(r, node.name, ctx, site);
    if (r.listPath.has(list.key)) {
      bail(
        REASON.UNSUPPORTED_TRAIT_LIST,
        site.name,
        `trait list ${node.name} references itself`,
      );
    }
    r.listPath.add(list.key);
    await resolveList(r, list.array, list.ctx, site);
    r.listPath.delete(list.key);
    return;
  }

  if (node.type !== 'ArrayExpression') {
    bail(
      REASON.UNSUPPORTED_TRAIT_LIST,
      site.name,
      'trait list is not an array literal or a reference to one',
    );
  }

  for (const element of node.elements) {
    if (!element) {
      bail(REASON.UNSUPPORTED_TRAIT_LIST, site.name, 'trait list has a hole');
    }
    if (element.type === 'SpreadElement') {
      // oxlint-disable-next-line no-await-in-loop
      await resolveList(r, element.argument, ctx, site);
      continue;
    }
    const el = unwrapTS(element);
    if (el.type !== 'Identifier') {
      bail(
        REASON.UNSUPPORTED_TRAIT_LIST,
        site.name,
        'trait list element is not an identifier',
      );
    }
    // oxlint-disable-next-line no-await-in-loop
    await resolveTraitRef(r, el.name, ctx, site);
  }
}

/**
 * Static name of a class member key or a member expression's property: an
 * identifier that isn't computed, or a string literal. `undefined` otherwise.
 */
function staticKeyName(
  key: Readonly<{ type: string; name?: unknown; value?: unknown }>,
  computed: boolean,
): string | undefined {
  if (key.type === 'Identifier' && !computed && typeof key.name === 'string') {
    return key.name;
  }

  return key.type === 'Literal' && typeof key.value === 'string'
    ? key.value
    : undefined;
}

/**
 * Retains the site when its class would change meaning once the trait layers
 * are gone. The flattened class body holds the traits' accessors before the
 * class's own members, and its `super` is the base: a lone getter or setter
 * would join the trait's other half, and `super.key` would skip the trait.
 */
function requireClassMeaning(
  consumer: Class,
  traits: readonly TraitIR[],
  site: ImplSite,
): void {
  const traitKeys = new Set(
    traits.flatMap((trait) => trait.accessors.map(({ key }) => key)),
  );

  // The trait keys whose getter, and whose setter, the class declares.
  const getters = new Set<string>();
  const setters = new Set<string>();
  for (const member of consumer.body.body) {
    if (
      member.type !== 'MethodDefinition' ||
      member.static ||
      (member.kind !== 'get' && member.kind !== 'set')
    ) {
      continue;
    }
    const key = staticKeyName(member.key, member.computed);
    if (key !== undefined && traitKeys.has(key)) {
      (member.kind === 'get' ? getters : setters).add(key);
    }
  }
  const half = (declared: ReadonlySet<string>, other: ReadonlySet<string>) =>
    declared.values().find((key) => !other.has(key));
  const lone = half(getters, setters) ?? half(setters, getters);
  if (lone !== undefined) {
    bail(
      REASON.CLASS_ACCESSOR_HALF,
      site.name,
      `the class declares one half of ${lone}, which a trait supplies as an accessor`,
    );
  }

  walk(consumer.body, (node) => {
    if (node.type !== 'MemberExpression' || node.object.type !== 'Super') {
      return;
    }
    if (node.computed) {
      bail(
        REASON.CLASS_COMPUTED_SUPER,
        site.name,
        'the class uses a computed super member',
      );
    }
    const key = staticKeyName(node.property, false);
    if (
      key === 'observedAttributes' ||
      (key !== undefined && traitKeys.has(key))
    ) {
      bail(
        REASON.CLASS_SUPER_TRAIT_MEMBER,
        site.name,
        `the class uses super.${key}, which a flattened trait supplies`,
      );
    }
  });
}

/** Per-module analysis state shared by the module's `impl` sites. */
type ModuleAnalysis = Readonly<{
  code: string;
  program: Program;
  consumerCtx: ModuleCtx;
  resolver: Resolver;
  factoryCache: Map<string, ReadonlySet<string>>;
}>;

/**
 * Analyzes one `impl` site. A bailout is thrown as {@link BailoutError} before
 * the site's synthetic exports reach `synthetics`.
 */
async function analyzeSite(
  analysis: ModuleAnalysis,
  site: ImplSite,
  synthetics: Map<string, Map<string, SyntheticExport>>,
): Promise<AnalyzedComposition> {
  const { code, program, consumerCtx, resolver, factoryCache } = analysis;
  const consumer = requireSingleConsumer(program, site);

  const [baseArg, listArg] = site.call.arguments;
  if (!baseArg || baseArg.type === 'SpreadElement') {
    bail(REASON.UNSUPPORTED_TRAIT_LIST, site.name, 'missing base constructor');
  }
  if (!listArg || listArg.type === 'SpreadElement') {
    bail(REASON.UNSUPPORTED_TRAIT_LIST, site.name, 'missing trait list');
  }

  resolver.out.length = 0;
  resolver.listPath.clear();
  await resolveList(resolver, listArg, consumerCtx, site);

  const siteSynthetics = new Map<string, Map<string, SyntheticExport>>();
  const traits: TraitIR[] = [];
  for (const ref of resolver.out) {
    const factoryLocals =
      factoryCache.get(ref.originId) ?? resolveFactoryLocals(ref.program);
    factoryCache.set(ref.originId, factoryLocals);

    const moduleSynthetics =
      siteSynthetics.get(ref.originId) ?? new Map<string, SyntheticExport>();
    siteSynthetics.set(ref.originId, moduleSynthetics);

    // oxlint-disable-next-line no-await-in-loop
    const rebases = await originRebases(resolver, ref.originId);
    const ir = normalizeDescriptorTrait(
      ref.program,
      ref.originId,
      ref.specifier,
      ref.exportName,
      moduleSynthetics,
      factoryLocals,
      (specifier) => rebases.get(specifier) ?? null,
    );
    if (!ir) {
      bail(
        REASON.UNSUPPORTED_TRAIT,
        site.name,
        `trait ${ref.name} is not a supported descriptor trait`,
      );
    }
    traits.push(ir);
  }

  requireClassMeaning(consumer, traits, site);

  for (const [moduleId, siteExports] of siteSynthetics) {
    const moduleExports = synthetics.get(moduleId) ?? new Map();
    synthetics.set(moduleId, moduleExports);
    for (const [local, synthetic] of siteExports) {
      moduleExports.set(local, synthetic);
    }
  }

  return {
    composition: { version: TRAIT_IR_VERSION, traits },
    baseSource: code.slice(baseArg.start, baseArg.end),
    className: consumer.id?.name ?? site.name,
    declarationSpan: [site.declaration.start, site.declaration.end],
    superClassSpan: [consumer.superClass!.start, consumer.superClass!.end],
    classBodyInsert: consumer.body.start + 1,
  };
}

/**
 * Analyzes a consumer module and returns every eligible, fully-normalized
 * composition together with the private bindings that need synthetic exports in
 * their origin modules. Each `impl` site is a transaction: a site that bails
 * contributes only its {@link BailoutError}, and the module's other sites are
 * still analyzed.
 */
export async function analyzeModule(
  id: string,
  code: string,
  loader: ModuleLoader,
): Promise<
  Readonly<{
    compositions: readonly AnalyzedComposition[];
    /** One per retained site, in source order. */
    bailouts: readonly BailoutError[];
    /** Origin module id -> synthetic exports it must expose. */
    synthetics: ReadonlyMap<string, readonly SyntheticExport[]>;
    /** Modules whose parse this analysis depended on, for watch tracking. */
    dependencies: readonly string[];
  }>
> {
  const program = parseModule(id, code);
  const imports = collectImports(program);

  const implLocals = new Set(
    [...imports.entries()]
      .filter(([, i]) => i.imported === 'impl' && IMPL_MODULE.test(i.specifier))
      .map(([local]) => local),
  );

  const sites = findImplSites(program, implLocals);
  if (sites.length === 0) {
    return {
      compositions: [],
      bailouts: [],
      synthetics: new Map(),
      dependencies: [],
    };
  }

  const compositions: AnalyzedComposition[] = [];
  const bailouts: BailoutError[] = [];
  const syntheticsByModule = new Map<string, Map<string, SyntheticExport>>();
  const dependencies = new Set<string>();
  const consumerCtx: ModuleCtx = {
    id,
    program,
    imports,
    bindings: collectTopBindings(program),
  };

  // The resolver expands a trait list into an ordered list of trait references,
  // following const-array references and spreads across module boundaries.
  const analysis: ModuleAnalysis = {
    code,
    program,
    consumerCtx,
    resolver: {
      consumerId: id,
      consumerDir: dirname(id),
      loader,
      ctxCache: new Map([[id, consumerCtx]]),
      rebaseCache: new Map(),
      dependencies,
      out: [],
      listPath: new Set(),
    },
    factoryCache: new Map(),
  };

  for (const site of sites) {
    try {
      // oxlint-disable-next-line no-await-in-loop
      compositions.push(await analyzeSite(analysis, site, syntheticsByModule));
    } catch (error) {
      if (!(error instanceof BailoutError)) {
        throw error;
      }
      bailouts.push(error);
    }
  }

  return {
    compositions,
    bailouts,
    synthetics: new Map(
      [...syntheticsByModule].map(([m, s]) => [m, [...s.values()]]),
    ),
    dependencies: [...dependencies],
  };
}

export { BailoutError };
