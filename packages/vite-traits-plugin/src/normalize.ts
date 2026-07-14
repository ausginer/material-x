import { createHash } from 'node:crypto';
import type {
  Program,
  Statement,
  VariableDeclarator,
} from '@oxc-project/types';
import { bail, REASON } from './diagnostics.ts';
import type { BindingRef, DescriptorTraitIR } from './ir.ts';

/**
 * Raw specifier of the descriptor `trait(...)` factory. The factory now lives in
 * `traits/attributes`; `traits/traits` is the pre-rename name, kept so
 * recognition survives the in-flight migration. Matched on the raw import
 * specifier (rather than a resolved path) so it works even while material-x
 * still imports the renamed-away `@ydinjs/core/traits/attributes.js`.
 */
const FACTORY_SPECIFIER =
  /(?:^|\/)(?:attributes|traits)\.[cm]?[jt]sx?$|(?:^|\/)traits\/(?:attributes|traits)$/u;

/** TS-only expression wrappers that carry a runtime `.expression` inside. */
const TS_WRAPPERS = new Set([
  'TSAsExpression',
  'TSSatisfiesExpression',
  'TSNonNullExpression',
  'TSInstantiationExpression',
  'ParenthesizedExpression',
]);

/** Strips erasable TS/paren wrappers to reach the underlying runtime node. */
export function unwrapTS<T extends { type: string }>(node: T): T {
  let current: { type: string; expression?: unknown } = node;
  while (
    TS_WRAPPERS.has(current.type) &&
    current.expression &&
    typeof current.expression === 'object'
  ) {
    current = current.expression as { type: string; expression?: unknown };
  }

  return current as T;
}

/**
 * A private module-scoped binding that must be surfaced through a build-only
 * synthetic export so a flattened consumer can link it.
 */
export type SyntheticExport = Readonly<{
  /** Original local name in the origin module. */
  local: string;
  /** Generated, collision-free export name. */
  exportName: string;
}>;

/**
 * Deterministic, collision-free synthetic export name for a private binding.
 *
 * Derived from the binding's **local name only** — deliberately not the module
 * id. The origin-module transform runs while a package builds (over its source),
 * while consumer transforms in other packages see the *built* module at a
 * different path; hashing the local name lets both sides agree across that
 * src→dist boundary. Within any one module a private local name is unique, so
 * the resulting export name is unique there too.
 */
export function syntheticExportName(local: string): string {
  const hash = createHash('sha1').update(local).digest('hex').slice(0, 8);
  const safe = local.replace(/[^\w$]/gu, '_');

  return `__mxflat_${safe}_${hash}`;
}

export type LocalImport = Readonly<{ specifier: string; imported: string }>;

/** Maps each local name introduced by a named/default import to its origin. */
export function collectImports(program: Program): Map<string, LocalImport> {
  const imports = new Map<string, LocalImport>();

  for (const node of program.body) {
    if (node.type !== 'ImportDeclaration') {
      continue;
    }

    const specifier = node.source.value;
    for (const spec of node.specifiers) {
      if (spec.type === 'ImportSpecifier') {
        imports.set(spec.local.name, {
          specifier,
          imported:
            spec.imported.type === 'Identifier'
              ? spec.imported.name
              : spec.imported.value,
        });
      } else if (spec.type === 'ImportDefaultSpecifier') {
        imports.set(spec.local.name, { specifier, imported: 'default' });
      }
    }
  }

  return imports;
}

/**
 * Names a module exports as its own local bindings — covering both
 * `export const X`/`export function X` and the `export { X, Y }` specifier form
 * emitted by the bundler (but not `export { X } from '...'` re-exports).
 */
/** Adds every locally-declared name a `declaration` introduces to `into`. */
function addDeclaredNames(
  declaration: { type: string; declarations?: unknown; id?: unknown },
  into: Set<string>,
): void {
  if (declaration.type === 'VariableDeclaration') {
    for (const decl of (declaration as { declarations: VariableDeclarator[] })
      .declarations) {
      if (decl.id.type === 'Identifier') {
        into.add(decl.id.name);
      }
    }
    return;
  }
  const id = declaration.id as { type?: string; name?: string } | undefined;
  if (id?.type === 'Identifier' && id.name) {
    into.add(id.name);
  }
}

export function collectExportedNames(program: Program): Set<string> {
  const names = new Set<string>();

  for (const node of program.body) {
    if (node.type !== 'ExportNamedDeclaration') {
      continue;
    }
    if (node.declaration) {
      addDeclaredNames(node.declaration, names);
    } else if (!node.source) {
      for (const spec of node.specifiers) {
        if (spec.local.type === 'Identifier') {
          names.add(spec.local.name);
        }
      }
    }
  }

  return names;
}

export type TopBinding = Readonly<{
  declarator: VariableDeclarator;
  exported: boolean;
}>;

/**
 * Indexes top-level `const`/`let` bindings by name, recording whether each is
 * exported (via either the inline `export` keyword or a later `export { … }`).
 */
export function collectTopBindings(program: Program): Map<string, TopBinding> {
  const exported = collectExportedNames(program);
  const bindings = new Map<string, TopBinding>();

  const add = (statement: Statement): void => {
    if (statement.type !== 'VariableDeclaration') {
      return;
    }
    for (const declarator of statement.declarations) {
      if (declarator.id.type === 'Identifier') {
        bindings.set(declarator.id.name, {
          declarator,
          exported: exported.has(declarator.id.name),
        });
      }
    }
  };

  for (const node of program.body) {
    if (node.type === 'ExportNamedDeclaration' && node.declaration) {
      add(node.declaration);
    } else {
      add(node);
    }
  }

  return bindings;
}

/**
 * Local names bound to the descriptor `trait` factory, recognized by the raw
 * import specifier (see {@link FACTORY_SPECIFIER}).
 */
export function resolveFactoryLocals(program: Program): ReadonlySet<string> {
  const locals = new Set<string>();

  for (const [local, imported] of collectImports(program)) {
    if (
      imported.imported === 'trait' &&
      FACTORY_SPECIFIER.test(imported.specifier)
    ) {
      locals.add(local);
    }
  }

  return locals;
}

/** Reads one descriptor object key, bailing on spread/computed/dynamic keys. */
function readDescriptorKey(
  prop: { type: string; computed?: boolean; key?: unknown },
  traitName: string,
): string {
  if (prop.type !== 'Property' || prop.computed) {
    bail(
      REASON.UNSUPPORTED_TRAIT_DEFINITION,
      traitName,
      'descriptor has a spread or computed member',
    );
  }

  const key = prop.key as { type: string; name?: string; value?: unknown };
  if (key.type === 'Identifier' && key.name) {
    return key.name;
  }
  if (key.type === 'Literal' && typeof key.value === 'string') {
    return key.value;
  }

  return bail(
    REASON.UNSUPPORTED_TRAIT_DEFINITION,
    traitName,
    'descriptor key is not a static string',
  );
}

/**
 * Rebases a specifier the origin module imports from onto one the consumer can
 * use: relative origin imports (e.g. a cross-package trait's `../attribute.js`)
 * map to a package specifier, returning `null` when no rebasing is possible.
 */
export type RebaseImport = (originSpecifier: string) => string | null;

/** Context a {@link linkBinding} call needs to reach a name from the consumer. */
type LinkContext = Readonly<{
  bindings: Map<string, TopBinding>;
  imports: Map<string, LocalImport>;
  moduleId: string;
  /** Specifier the consumer uses to reach `moduleId`; `''` when it IS the consumer. */
  specifier: string;
  synthetics: Map<string, SyntheticExport>;
  rebase: RebaseImport;
  traitName: string;
}>;

/**
 * Produces a {@link BindingRef} that a flattened consumer can use to reach the
 * value `name` refers to in the trait's origin module:
 *
 * - a value **imported** into the origin through a bare (package) specifier is
 *   re-imported from the same specifier;
 * - a value **local** to the origin is linked through the origin (allocating a
 *   synthetic export when it is private);
 * - when the origin *is* the consumer (`specifier === ''`), the value is already
 *   in scope, so it is referenced locally without an import.
 */
function linkBinding(name: string, ctx: LinkContext): BindingRef {
  const local = ctx.specifier === '';

  const imported = ctx.imports.get(name);
  if (imported && !local) {
    let { specifier } = imported;
    if (specifier.startsWith('.')) {
      const rebased = ctx.rebase(specifier);
      if (!rebased) {
        bail(
          REASON.UNSUPPORTED_TRAIT_DEFINITION,
          ctx.traitName,
          `${name} is reached through a relative import (${specifier}) that cannot be rebased onto the consumer`,
        );
      }
      specifier = rebased;
    }

    return { module: '', specifier, exportName: imported.imported };
  }

  // Same-module trait: the binding (local const or bare import) is already in
  // the consumer's scope, so reference it by name with no fresh import.
  if (local) {
    if (!ctx.bindings.has(name) && !ctx.imports.has(name)) {
      bail(
        REASON.UNSUPPORTED_TRAIT_DEFINITION,
        ctx.traitName,
        `${name} is not a module-scoped binding`,
      );
    }

    return {
      module: ctx.moduleId,
      specifier: '',
      exportName: name,
      local: true,
    };
  }

  const binding = ctx.bindings.get(name);
  if (!binding) {
    bail(
      REASON.UNSUPPORTED_TRAIT_DEFINITION,
      ctx.traitName,
      `${name} is not a module-scoped binding`,
    );
  }
  if (binding.exported) {
    return { module: ctx.moduleId, specifier: ctx.specifier, exportName: name };
  }

  const exportName = syntheticExportName(name);
  ctx.synthetics.set(name, { local: name, exportName });

  return {
    module: ctx.moduleId,
    specifier: ctx.specifier,
    exportName,
    synthetic: name,
  };
}

/**
 * Normalizes a single descriptor trait exported as `exportName` from an already
 * parsed origin module into Trait IR, collecting any synthetic exports its
 * linked private bindings require.
 *
 * @param program - Parsed origin module.
 * @param moduleId - Resolved absolute id of the origin module.
 * @param specifier - Specifier a consumer uses to reach the module; `''` when
 *   the trait is defined in the consumer module itself (linked locally).
 * @param exportName - Name the trait binding has in the origin module.
 * @param synthetics - Accumulator for private bindings needing synthetic export.
 * @param factoryLocals - Local names bound to the descriptor factory.
 * @param rebase - Maps a relative origin import onto a consumer-usable specifier
 *   (defaults to no rebasing, i.e. relative converter imports bail).
 */
export function normalizeDescriptorTrait(
  program: Program,
  moduleId: string,
  specifier: string,
  exportName: string,
  synthetics: Map<string, SyntheticExport>,
  factoryLocals: ReadonlySet<string>,
  rebase: RebaseImport = () => null,
): DescriptorTraitIR | null {
  const bindings = collectTopBindings(program);
  const imports = collectImports(program);
  const local = specifier === '';

  const binding = bindings.get(exportName);
  // A trait defined in the consumer module need not be exported; one reached
  // through a specifier must be, so the consumer's imports stay valid.
  if (!binding?.declarator.init || (!binding.exported && !local)) {
    return null;
  }

  const init = unwrapTS(binding.declarator.init);
  if (init.type !== 'CallExpression' || init.callee.type !== 'Identifier') {
    return null;
  }
  if (!factoryLocals.has(init.callee.name)) {
    return null;
  }

  if (init.arguments.length !== 2) {
    bail(
      REASON.UNSUPPORTED_TRAIT_DEFINITION,
      exportName,
      'descriptor trait factory expects (attrs, brand)',
    );
  }

  const attrsArg = unwrapTS(init.arguments[0]!);
  const brandArg = unwrapTS(init.arguments[1]!);

  const link = (name: string): BindingRef =>
    linkBinding(name, {
      bindings,
      imports,
      moduleId,
      specifier,
      synthetics,
      rebase,
      traitName: exportName,
    });

  // Brand: an inline `Symbol('…')` has no linkable identity across modules, so
  // only a named symbol binding can be flattened.
  if (brandArg.type !== 'Identifier') {
    bail(
      REASON.UNSUPPORTED_TRAIT_DEFINITION,
      exportName,
      'trait brand is not a named binding (an inline Symbol() cannot be linked)',
    );
  }
  const brand = link(brandArg.name);

  const observedAttributes: string[] = [];
  const accessors: Array<DescriptorTraitIR['accessors'][number]> = [];

  if (attrsArg.type === 'Identifier') {
    // Named attrs const: link the object once and index it per key.
    const attrsBinding = bindings.get(attrsArg.name);
    if (!attrsBinding?.declarator.init) {
      bail(
        REASON.UNSUPPORTED_TRAIT_DEFINITION,
        exportName,
        `attrs binding ${attrsArg.name} is not module-scoped`,
      );
    }
    const object = unwrapTS(attrsBinding.declarator.init);
    if (object.type !== 'ObjectExpression') {
      bail(
        REASON.UNSUPPORTED_TRAIT_DEFINITION,
        exportName,
        'descriptor attrs is not an inline object literal',
      );
    }
    const converter = link(attrsArg.name);
    for (const prop of object.properties) {
      const key = readDescriptorKey(prop, exportName);
      observedAttributes.push(key);
      accessors.push({ key, converter, converterPath: [key] });
    }
  } else if (attrsArg.type === 'ObjectExpression') {
    // Inline attrs: link each property's converter value individually.
    for (const prop of attrsArg.properties) {
      const key = readDescriptorKey(prop, exportName);
      const value = unwrapTS(
        (prop as { value: { type: string; name?: string } }).value,
      );
      if (value.type !== 'Identifier' || !value.name) {
        bail(
          REASON.UNSUPPORTED_TRAIT_DEFINITION,
          exportName,
          `converter for "${key}" is not a linkable identifier`,
        );
      }
      observedAttributes.push(key);
      accessors.push({ key, converter: link(value.name), converterPath: [] });
    }
  } else {
    bail(
      REASON.UNSUPPORTED_TRAIT_DEFINITION,
      exportName,
      'descriptor attrs is neither a named const nor an inline object',
    );
  }

  return {
    kind: 'descriptor',
    name: exportName,
    brand,
    observedAttributes,
    accessors,
  };
}

/**
 * Scans a parsed module for every private binding that would need a synthetic
 * export if any of its descriptor traits were flattened, so the origin-module
 * transform can emit those exports deterministically.
 */
export function collectModuleSyntheticExports(
  program: Program,
  moduleId: string,
  factoryLocals: ReadonlySet<string>,
): readonly SyntheticExport[] {
  const synthetics = new Map<string, SyntheticExport>();

  for (const name of collectExportedNames(program)) {
    try {
      normalizeDescriptorTrait(
        program,
        moduleId,
        moduleId,
        name,
        synthetics,
        factoryLocals,
      );
    } catch {
      // A non-descriptor export is simply skipped here; flattening a consumer
      // that references it will surface the real diagnostic.
    }
  }

  return [...synthetics.values()];
}
