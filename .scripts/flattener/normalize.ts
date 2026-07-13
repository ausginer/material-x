import { createHash } from 'node:crypto';
import type {
  ExportNamedDeclaration,
  Expression,
  ImportDeclaration,
  Program,
  Statement,
  VariableDeclarator,
} from '@oxc-project/types';
import { bail, REASON } from './diagnostics.ts';
import type { BindingRef, DescriptorTraitIR } from './ir.ts';

/**
 * Resolved module path of the descriptor `trait(...)` factory. Matches both the
 * built (`ydin/traits/traits.js`) and in-source (`.../traits/traits.ts`) forms,
 * so recognition is by resolved import rather than by the raw specifier.
 */
const DESCRIPTOR_FACTORY = /(?:^|\/)traits\/traits\.[cm]?[jt]sx?$/u;

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
 * Both the origin-module transform (which emits the export) and every consumer
 * transform (which emits the import) derive the name from the same inputs, so
 * they agree regardless of transform order.
 */
export function syntheticExportName(moduleId: string, local: string): string {
  const hash = createHash('sha1')
    .update(moduleId)
    .update('\0')
    .update(local)
    .digest('hex')
    .slice(0, 8);
  const safe = local.replace(/[^\w$]/gu, '_');

  return `__mxflat_${safe}_${hash}`;
}

/**
 * Produces a {@link BindingRef} for a module-scoped binding, allocating a
 * synthetic export when the binding is private.
 */
function linkBinding(
  local: string,
  exported: boolean,
  moduleId: string,
  specifier: string,
  synthetics: Map<string, SyntheticExport>,
): BindingRef {
  if (exported) {
    return { module: moduleId, specifier, exportName: local };
  }

  const exportName = syntheticExportName(moduleId, local);
  synthetics.set(local, { local, exportName });

  return { module: moduleId, specifier, exportName, synthetic: local };
}

type LocalImport = Readonly<{ specifier: string; imported: string }>;

/**
 * Maps each local name introduced by a named/default import to its origin.
 */
function collectImports(program: Program): Map<string, LocalImport> {
  const imports = new Map<string, LocalImport>();

  for (const node of program.body) {
    if (node.type !== 'ImportDeclaration') {
      continue;
    }

    const decl: ImportDeclaration = node;
    const specifier = decl.source.value;

    for (const spec of decl.specifiers ?? []) {
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
 * Resolves which local names in a module are bound to the descriptor `trait`
 * factory, recognizing it by resolved module path rather than raw specifier.
 */
export async function resolveFactoryLocals(
  program: Program,
  resolve: (specifier: string) => Promise<string | null>,
): Promise<ReadonlySet<string>> {
  const locals = new Set<string>();

  await Promise.all(
    [...collectImports(program)].map(async ([local, imported]) => {
      if (imported.imported !== 'trait') {
        return;
      }
      const resolved = await resolve(imported.specifier);
      if (resolved && DESCRIPTOR_FACTORY.test(resolved)) {
        locals.add(local);
      }
    }),
  );

  return locals;
}

type TopBinding = Readonly<{
  declarator: VariableDeclarator;
  exported: boolean;
}>;

/**
 * Indexes top-level `const`/`let` bindings by name, recording whether each is
 * exported. Only module-scoped declarations are considered.
 */
function collectTopBindings(program: Program): Map<string, TopBinding> {
  const bindings = new Map<string, TopBinding>();

  const add = (statement: Statement, exported: boolean): void => {
    if (statement.type !== 'VariableDeclaration') {
      return;
    }

    for (const declarator of statement.declarations) {
      if (declarator.id.type === 'Identifier') {
        bindings.set(declarator.id.name, { declarator, exported });
      }
    }
  };

  for (const node of program.body) {
    if (node.type === 'ExportNamedDeclaration' && node.declaration) {
      add(node.declaration, true);
    } else {
      add(node, false);
    }
  }

  return bindings;
}

/**
 * Reads the string keys of an object-literal descriptor argument in source
 * order. Bails on spreads, computed, or non-identifier/string keys.
 */
function readDescriptorKeys(
  expr: Expression,
  traitName: string,
): readonly string[] {
  if (expr.type !== 'ObjectExpression') {
    bail(
      REASON.UNSUPPORTED_TRAIT_DEFINITION,
      traitName,
      'descriptor argument is not an inline object literal',
    );
  }

  return expr.properties.map((prop) => {
    if (prop.type !== 'Property' || prop.computed) {
      bail(
        REASON.UNSUPPORTED_TRAIT_DEFINITION,
        traitName,
        'descriptor has a spread or computed member',
      );
    }

    if (prop.key.type === 'Identifier') {
      return prop.key.name;
    }
    if (prop.key.type === 'Literal' && typeof prop.key.value === 'string') {
      return prop.key.value;
    }

    return bail(
      REASON.UNSUPPORTED_TRAIT_DEFINITION,
      traitName,
      'descriptor key is not a static string',
    );
  });
}

/**
 * Normalizes a single descriptor trait exported as `exportName` from an already
 * parsed origin module into Trait IR, collecting any synthetic exports its
 * linked private bindings require.
 *
 * @param program - Parsed origin module.
 * @param moduleId - Resolved absolute id of the origin module.
 * @param specifier - Import specifier a consumer uses to reach the module.
 * @param exportName - Name the trait is exported under.
 * @param synthetics - Accumulator for private bindings needing synthetic export.
 * @param factoryLocals - Local names bound to the resolved descriptor factory.
 */
export function normalizeDescriptorTrait(
  program: Program,
  moduleId: string,
  specifier: string,
  exportName: string,
  synthetics: Map<string, SyntheticExport>,
  factoryLocals: ReadonlySet<string>,
): DescriptorTraitIR | null {
  const bindings = collectTopBindings(program);

  const binding = bindings.get(exportName);
  if (!binding?.exported || !binding.declarator.init) {
    return null;
  }

  const { init } = binding.declarator;
  if (init.type !== 'CallExpression' || init.callee.type !== 'Identifier') {
    return null;
  }

  // Recognize the descriptor `trait(...)` factory by resolved import.
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

  const [attrsArg, brandArg] = init.arguments;
  if (
    !attrsArg ||
    !brandArg ||
    attrsArg.type !== 'Identifier' ||
    brandArg.type !== 'Identifier'
  ) {
    bail(
      REASON.UNSUPPORTED_TRAIT_DEFINITION,
      exportName,
      'descriptor trait arguments must be module-scoped identifiers',
    );
  }

  const attrsBinding = bindings.get(attrsArg.name);
  if (!attrsBinding?.declarator.init) {
    bail(
      REASON.UNSUPPORTED_TRAIT_DEFINITION,
      exportName,
      `attrs binding ${attrsArg.name} is not module-scoped`,
    );
  }

  const keys = readDescriptorKeys(attrsBinding.declarator.init, exportName);

  const converterRef = linkBinding(
    attrsArg.name,
    attrsBinding.exported,
    moduleId,
    specifier,
    synthetics,
  );
  const brandBinding = bindings.get(brandArg.name);
  if (!brandBinding) {
    bail(
      REASON.UNSUPPORTED_TRAIT_DEFINITION,
      exportName,
      `brand binding ${brandArg.name} is not module-scoped`,
    );
  }
  const brandRef = linkBinding(
    brandArg.name,
    brandBinding.exported,
    moduleId,
    specifier,
    synthetics,
  );

  return {
    kind: 'descriptor',
    name: exportName,
    brand: brandRef,
    observedAttributes: keys,
    accessors: keys.map((key) => ({
      key,
      converter: converterRef,
      converterPath: [key],
    })),
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

  for (const node of program.body) {
    if (
      node.type !== 'ExportNamedDeclaration' ||
      node.declaration?.type !== 'VariableDeclaration'
    ) {
      continue;
    }

    const exportNode: ExportNamedDeclaration = node;
    for (const declarator of (
      exportNode.declaration as { declarations: VariableDeclarator[] }
    ).declarations) {
      if (declarator.id.type !== 'Identifier') {
        continue;
      }

      try {
        normalizeDescriptorTrait(
          program,
          moduleId,
          '',
          declarator.id.name,
          synthetics,
          factoryLocals,
        );
      } catch {
        // A non-descriptor export is simply skipped here; flattening a consumer
        // that references it will surface the real diagnostic.
      }
    }
  }

  return [...synthetics.values()];
}
