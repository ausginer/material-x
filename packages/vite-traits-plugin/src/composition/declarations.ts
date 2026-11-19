/**
 * A module's declarations: the TypeScript source itself, or, for a `.js`
 * module, the `.d.ts` that its package's `types` condition names for it. The
 * flattener reads a static's declared type from them, and the type aliases
 * that a declared type names. Members pair by binding name, so a bundler's
 * `var X = class …` pairs with `declare class X`.
 */
import { dirname, join, relative } from 'node:path';
import type { Class, Program, TSType } from '@oxc-project/types';
import {
  collectImports,
  collectTopClasses,
  extensionOf,
  parseModule,
  type LocalImport,
  type ModuleLoader,
} from '../syntax.ts';

/** The declarations of one module, and where its imports resolve from. */
export type DeclarationScope = Readonly<{
  /** The id of the module the declarations describe. */
  moduleId: string;
  program: Program;
  imports: ReadonlyMap<string, LocalImport>;
}>;

const TYPESCRIPT = new Set(['ts', 'mts', 'cts', 'tsx']);

type ExportTarget = string | Readonly<{ types?: string; default?: string }>;

/**
 * The `.d.ts` for the JavaScript module `id`: the `types` condition of the
 * `exports` entry whose `default` is `id`, in the nearest `package.json`, or
 * else the file beside it.
 */
async function declarationFile(
  loader: ModuleLoader,
  id: string,
): Promise<string> {
  const sibling = id.replace(/\.(m|c)?js$/u, '.d.$1ts');
  for (let dir = dirname(id); ; dir = dirname(dir)) {
    let manifest: { exports?: Readonly<Record<string, ExportTarget>> } | null;
    try {
      // oxlint-disable-next-line no-await-in-loop
      manifest = JSON.parse(await loader.load(join(dir, 'package.json'))) as {
        exports?: Readonly<Record<string, ExportTarget>>;
      };
    } catch {
      manifest = null;
    }
    if (manifest) {
      const path = `./${relative(dir, id).replaceAll('\\', '/')}`;
      for (const target of Object.values(manifest.exports ?? {})) {
        if (
          typeof target === 'object' &&
          target.default === path &&
          target.types
        ) {
          return join(dir, target.types);
        }
      }

      return sibling;
    }
    if (dirname(dir) === dir) {
      return sibling;
    }
  }
}

/**
 * The declarations of module `id`, or `null` when a JavaScript module has no
 * readable `.d.ts`.
 */
export async function declarationsOf(
  loader: ModuleLoader,
  id: string,
  code?: string,
): Promise<DeclarationScope | null> {
  if (TYPESCRIPT.has(extensionOf(id))) {
    const program = parseModule(id, code ?? (await loader.load(id)));
    return { moduleId: id, program, imports: collectImports(program) };
  }
  const file = await declarationFile(loader, id);
  let text: string;
  try {
    text = await loader.load(file);
  } catch {
    return null;
  }
  const program = parseModule(file, text);

  return { moduleId: id, program, imports: collectImports(program) };
}

/** A class's declaration in `scope`, by binding name. */
export function declaredClass(
  scope: DeclarationScope,
  name: string,
): Class | null {
  return collectTopClasses(scope.program).get(name)?.node ?? null;
}

/**
 * The declared type of each static field of class `name`: its annotation, or
 * `null` for a field with none. A field missing from the declarations is
 * absent from the map.
 */
export function staticTypes(
  scope: DeclarationScope,
  name: string,
): Map<string, TSType | null> {
  const types = new Map<string, TSType | null>();
  for (const element of declaredClass(scope, name)?.body.body ?? []) {
    if (
      element.type === 'PropertyDefinition' &&
      element.static &&
      !element.computed &&
      element.key.type === 'Identifier'
    ) {
      types.set(
        element.key.name,
        element.typeAnnotation?.typeAnnotation ?? null,
      );
    }
  }

  return types;
}

/**
 * The type alias `name` names in `scope`: declared there, or imported, followed
 * to the declarations of the module it is imported from.
 */
export async function resolveAlias(
  loader: ModuleLoader,
  scope: DeclarationScope,
  name: string,
): Promise<Readonly<{ type: TSType; scope: DeclarationScope }> | null> {
  for (const node of scope.program.body) {
    const declaration =
      node.type === 'ExportNamedDeclaration' ? node.declaration : node;
    if (
      declaration?.type === 'TSTypeAliasDeclaration' &&
      declaration.id.name === name &&
      !declaration.typeParameters
    ) {
      return { type: declaration.typeAnnotation, scope };
    }
  }
  const imported = scope.imports.get(name);
  if (!imported) {
    return null;
  }
  const id = await loader.resolve(imported.specifier, scope.moduleId);
  const target = id ? await declarationsOf(loader, id) : null;

  return target ? await resolveAlias(loader, target, imported.imported) : null;
}
