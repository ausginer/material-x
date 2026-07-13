import type {
  Class,
  Node,
  Program,
  VariableDeclaration,
  VariableDeclarator,
} from '@oxc-project/types';
import { parseSync } from 'oxc-parser';
import { bail, BailoutError, REASON } from './diagnostics.ts';
import { TRAIT_IR_VERSION, type CompositionIR, type TraitIR } from './ir.ts';
import {
  normalizeDescriptorTrait,
  resolveFactoryLocals,
  type SyntheticExport,
} from './normalize.ts';

/**
 * Host-provided resolution and loading, so analysis does not hard-code the
 * bundler's module graph or filesystem access.
 */
export type ModuleLoader = Readonly<{
  /** Resolve `specifier` relative to `importer` to an absolute module id. */
  resolve(specifier: string, importer: string): Promise<string | null>;
  /** Load source text for a resolved module id. */
  load(id: string): Promise<string>;
}>;

/** Specifiers whose `impl` export is the composition builder. */
const IMPL_MODULE = /(?:^|\/)ydin\/traits\/(?:traits|piirre)(?:\.[jt]s)?$/u;

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

    for (const key in current) {
      if (key === 'type' || key === 'start' || key === 'end') {
        continue;
      }
      stack.push((current as Record<string, unknown>)[key]);
    }
  }
}

type LocalImport = Readonly<{ specifier: string; imported: string }>;

function collectImports(program: Program): Map<string, LocalImport> {
  const imports = new Map<string, LocalImport>();

  for (const node of program.body) {
    if (node.type !== 'ImportDeclaration') {
      continue;
    }

    for (const spec of node.specifiers ?? []) {
      if (spec.type === 'ImportSpecifier') {
        imports.set(spec.local.name, {
          specifier: node.source.value,
          imported:
            spec.imported.type === 'Identifier'
              ? spec.imported.name
              : spec.imported.value,
        });
      }
    }
  }

  return imports;
}

type ImplSite = Readonly<{
  declaration: VariableDeclaration;
  declarator: VariableDeclarator;
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
        sites.push({ declaration, declarator, name: declarator.id.name });
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

const parseCache = new Map<string, Program>();

/** Parses `code` for `id`, caching by id. */
export function parseModule(id: string, code: string): Program {
  const cached = parseCache.get(id);
  if (cached) {
    return cached;
  }

  const { program } = parseSync(id, code);
  parseCache.set(id, program);

  return program;
}

/** Drops a cached parse (used on watch invalidation). */
export function invalidateModule(id: string): void {
  parseCache.delete(id);
}

/**
 * Analyzes a consumer module and returns every eligible, fully-normalized
 * composition together with the private bindings that need synthetic exports in
 * their origin modules. Bailouts are thrown as {@link BailoutError}.
 */
export async function analyzeModule(
  id: string,
  code: string,
  loader: ModuleLoader,
): Promise<
  Readonly<{
    compositions: readonly AnalyzedComposition[];
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
    return { compositions: [], synthetics: new Map(), dependencies: [] };
  }

  const compositions: AnalyzedComposition[] = [];
  const syntheticsByModule = new Map<string, Map<string, SyntheticExport>>();
  const dependencies = new Set<string>();

  for (const site of sites) {
    const consumer = requireSingleConsumer(program, site);
    const call = site.declarator.init;
    if (call?.type !== 'CallExpression') {
      continue;
    }

    const [baseArg, listArg] = call.arguments;
    if (!baseArg || baseArg.type === 'SpreadElement') {
      bail(
        REASON.UNSUPPORTED_TRAIT_LIST,
        site.name,
        'missing base constructor',
      );
    }
    if (listArg?.type !== 'ArrayExpression') {
      bail(
        REASON.UNSUPPORTED_TRAIT_LIST,
        site.name,
        'trait list is not an inline array literal',
      );
    }

    const traits: TraitIR[] = [];
    for (const element of listArg.elements) {
      if (element?.type !== 'Identifier') {
        bail(
          REASON.UNSUPPORTED_TRAIT_LIST,
          site.name,
          'trait list has a hole, spread, or non-identifier element',
        );
      }

      const imported = imports.get(element.name);
      if (!imported) {
        bail(
          REASON.UNSUPPORTED_TRAIT,
          site.name,
          `trait ${element.name} is not an import`,
        );
      }

      // Traits are resolved in declaration order to preserve layer precedence.
      // oxlint-disable-next-line no-await-in-loop
      const traitId = await loader.resolve(imported.specifier, id);
      if (!traitId) {
        bail(
          REASON.UNSUPPORTED_TRAIT,
          site.name,
          `cannot resolve trait module ${imported.specifier}`,
        );
      }
      dependencies.add(traitId);

      let traitSource: string;
      try {
        // oxlint-disable-next-line no-await-in-loop
        traitSource = await loader.load(traitId);
      } catch {
        return bail(
          REASON.UNSUPPORTED_TRAIT,
          site.name,
          `cannot load trait module ${traitId}`,
        );
      }
      const traitProgram = parseModule(traitId, traitSource);
      const moduleSynthetics =
        syntheticsByModule.get(traitId) ?? new Map<string, SyntheticExport>();
      syntheticsByModule.set(traitId, moduleSynthetics);

      // oxlint-disable-next-line no-await-in-loop
      const factoryLocals = await resolveFactoryLocals(
        traitProgram,
        (specifier) => loader.resolve(specifier, traitId),
      );
      const ir = normalizeDescriptorTrait(
        traitProgram,
        traitId,
        imported.specifier,
        imported.imported,
        moduleSynthetics,
        factoryLocals,
      );
      if (!ir) {
        bail(
          REASON.UNSUPPORTED_TRAIT,
          site.name,
          `trait ${element.name} is not a supported descriptor trait`,
        );
      }
      traits.push(ir);
    }

    compositions.push({
      composition: { version: TRAIT_IR_VERSION, traits },
      baseSource: code.slice(baseArg.start, baseArg.end),
      className: consumer.id?.name ?? site.name,
      declarationSpan: [site.declaration.start, site.declaration.end],
      superClassSpan: [consumer.superClass!.start, consumer.superClass!.end],
      classBodyInsert: consumer.body.start + 1,
    });
  }

  return {
    compositions,
    synthetics: new Map(
      [...syntheticsByModule].map(([m, s]) => [m, [...s.values()]]),
    ),
    dependencies: [...dependencies],
  };
}

export { BailoutError };
