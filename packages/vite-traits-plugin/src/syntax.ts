/**
 * Module-level syntax that both layers read: parsing with a cache, imports,
 * top-level bindings and classes, and member keys.
 */
import { createHash } from 'node:crypto';
import type {
  Class,
  Node,
  Program,
  Statement,
  VariableDeclarator,
} from '@oxc-project/types';
import { parseSync } from 'oxc-parser';

/** Range in a module's source, as `[start, end)` offsets. */
export type Span = readonly [number, number];

/** The fields of a top-level declaration that bindings are read from. */
type DeclarationLike = Readonly<{
  type: string;
  declarations?: readonly VariableDeclarator[];
  id?: Readonly<{ type?: string; name?: string }> | null;
}>;

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

/** Drops a cached parse, on a watch change. */
export function invalidateModule(id: string): void {
  parseCache.delete(id);
}

/** Depth-first walk over every AST node reachable from `root`. */
export function walk(root: Node, visit: (node: Node) => void): void {
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

/** An identifier-like node that reads a binding. */
export type ValueReference = Readonly<{
  type: string;
  name: string;
  start: number;
  end: number;
}>;

/** The fields that hold only types, in any node. */
const TYPE_FIELDS = new Set([
  'typeAnnotation',
  'typeArguments',
  'typeParameters',
  'returnType',
  'superTypeArguments',
  'implements',
]);

/** Type nodes and type-only declarations, besides every `TS…Type`. */
const TYPE_NODES = new Set([
  'TSTypeAnnotation',
  'TSTypeReference',
  'TSTypeQuery',
  'TSTypeLiteral',
  'TSTypeOperator',
  'TSTypePredicate',
  'TSTypeParameterDeclaration',
  'TSTypeParameterInstantiation',
  'TSTypeAliasDeclaration',
  'TSInterfaceDeclaration',
]);

/** Whether a node is a type, or a declaration that emits nothing. */
function isTypeOnly(
  node: Readonly<Record<string, unknown>> & { type?: string },
): boolean {
  const { type } = node;

  return (
    type !== undefined &&
    (TYPE_NODES.has(type) ||
      /^TS\w*(?:Type|Keyword)$/u.test(type) ||
      node['declare'] === true)
  );
}

/**
 * Visits each value reference under `node`. It fails closed: every node is
 * walked, TypeScript or not, so a shape this function doesn't know visits its
 * identifiers, which can only refuse what a caller checks. Any
 * identifier-like node is visited, `JSXIdentifier` included, so `<X />` and
 * `<X.Inner />` are references. Only these aren't visited: a type position,
 * a type-only declaration, a `declare` declaration, a non-computed property
 * key or member name, a JSX attribute name, the property of a JSX member name,
 * a private or namespaced JSX name, a label, and an import. A shorthand
 * property `{ X }` and an export specifier are visited. A direct
 * `eval('X')` can't be seen.
 */
export function forEachValueReference(
  node: unknown,
  visit: (identifier: ValueReference) => void,
): void {
  if (Array.isArray(node)) {
    for (const item of node) {
      forEachValueReference(item, visit);
    }
    return;
  }
  if (!node || typeof node !== 'object') {
    return;
  }
  const value = node as Readonly<Record<string, unknown>> & { type?: string };
  const { type } = value;
  if (type === 'PrivateIdentifier' || type === 'JSXNamespacedName') {
    // A private name and a namespaced JSX name never name a module binding.
    return;
  }
  const { name } = value;
  if (type?.endsWith('Identifier') && typeof name === 'string') {
    // Any identifier-like node is a reference, `JSXIdentifier` included,
    // unless its position is a known non-reference, which the parent skips.
    visit(value as ValueReference);
    return;
  }
  if (isTypeOnly(value) || type === 'ImportDeclaration') {
    return;
  }
  if (type === 'ExportSpecifier') {
    forEachValueReference(value['local'], visit);
    return;
  }
  const keyed =
    type === 'Property' ||
    type === 'MethodDefinition' ||
    type === 'PropertyDefinition' ||
    type === 'AccessorProperty';
  for (const [field, child] of Object.entries(value)) {
    if (
      TYPE_FIELDS.has(field) ||
      field === 'label' ||
      (keyed && field === 'key' && value['computed'] !== true) ||
      (type === 'MemberExpression' &&
        field === 'property' &&
        value['computed'] !== true) ||
      (type === 'JSXMemberExpression' && field === 'property') ||
      (type === 'JSXAttribute' && field === 'name')
    ) {
      continue;
    }
    forEachValueReference(child, visit);
  }
}

/** TS-only expression wrappers that carry a runtime `.expression` inside. */
const TS_WRAPPERS = new Set([
  'TSAsExpression',
  'TSSatisfiesExpression',
  'TSNonNullExpression',
  'TSInstantiationExpression',
  'TSTypeAssertion',
  'ParenthesizedExpression',
]);

/** Strips erasable TS and parenthesis wrappers to reach the runtime node. */
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

/** The source of a named or default import: its specifier and imported name. */
export type LocalImport = Readonly<{ specifier: string; imported: string }>;

/**
 * Maps each local name a named or default import introduces to its origin,
 * type-only imports included.
 */
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
 * The local names bound to `name` imported from a specifier that `pattern`
 * matches.
 */
export function importedLocals(
  imports: ReadonlyMap<string, LocalImport>,
  name: string,
  pattern: RegExp,
): ReadonlySet<string> {
  const locals = new Set<string>();
  for (const [local, imported] of imports) {
    if (imported.imported === name && pattern.test(imported.specifier)) {
      locals.add(local);
    }
  }

  return locals;
}

/** The identifier names a declaration introduces. */
function declaredNames(declaration: DeclarationLike): string[] {
  if (declaration.type === 'VariableDeclaration') {
    return (declaration.declarations ?? [])
      .map(({ id }) => (id.type === 'Identifier' ? id.name : null))
      .filter((name) => name !== null);
  }
  const { id } = declaration;

  return id?.type === 'Identifier' && id.name ? [id.name] : [];
}

/**
 * The names a module exports as its own bindings, through `export const X`,
 * `export class X` or `export { X }`, but not `export { X } from '…'`. Maps
 * each local name to the names it is exported as.
 */
export function collectExportedNames(
  program: Program,
): Map<string, readonly string[]> {
  const names = new Map<string, string[]>();
  const add = (local: string, exported: string): void => {
    names.set(local, [...(names.get(local) ?? []), exported]);
  };

  for (const node of program.body) {
    if (node.type === 'ExportDefaultDeclaration') {
      const { id } = node.declaration as { id?: { name?: string } | null };
      if (id?.name) {
        add(id.name, 'default');
      }
      continue;
    }
    if (node.type !== 'ExportNamedDeclaration') {
      continue;
    }
    if (node.declaration) {
      for (const name of declaredNames(node.declaration)) {
        add(name, name);
      }
    } else if (!node.source) {
      for (const spec of node.specifiers) {
        if (spec.local.type === 'Identifier') {
          add(
            spec.local.name,
            spec.exported.type === 'Identifier'
              ? spec.exported.name
              : spec.exported.value,
          );
        }
      }
    }
  }

  return names;
}

/** A top-level `const`, `let` or `var` binding whose name is an identifier. */
export type TopBinding = Readonly<{
  declarator: VariableDeclarator;
  /** The statement that declares it, `export` included. */
  statement: Statement;
  exported: boolean;
}>;

/** A top-level class declaration, or a variable bound to a class expression. */
export type TopClass = Readonly<{
  node: Class;
  /** The statement that declares it, `export` included. */
  statement: Statement;
  exported: boolean;
}>;

/** The statement each top-level declaration sits in, unwrapping `export`. */
function topDeclarations(
  program: Program,
): ReadonlyArray<readonly [DeclarationLike, Statement]> {
  return program.body.map((node): readonly [DeclarationLike, Statement] => [
    ((node.type === 'ExportNamedDeclaration' ||
      node.type === 'ExportDefaultDeclaration') &&
    node.declaration
      ? node.declaration
      : node) as unknown as DeclarationLike,
    node,
  ]);
}

/** Indexes the top-level variable bindings whose names are identifiers. */
export function collectTopBindings(program: Program): Map<string, TopBinding> {
  const exported = collectExportedNames(program);
  const bindings = new Map<string, TopBinding>();

  for (const [declaration, statement] of topDeclarations(program)) {
    if (declaration.type !== 'VariableDeclaration') {
      continue;
    }
    for (const declarator of declaration.declarations ?? []) {
      if (declarator.id.type === 'Identifier') {
        bindings.set(declarator.id.name, {
          declarator,
          statement,
          exported: exported.has(declarator.id.name),
        });
      }
    }
  }

  return bindings;
}

/**
 * Indexes the top-level classes by name: `class X`, `export class X`,
 * `export default class X`, and `var X = class …`, which a bundler emits.
 */
export function collectTopClasses(program: Program): Map<string, TopClass> {
  const exported = collectExportedNames(program);
  const classes = new Map<string, TopClass>();

  for (const [declaration, statement] of topDeclarations(program)) {
    if (declaration.type === 'ClassDeclaration') {
      const node = declaration as unknown as Class;
      if (node.id) {
        classes.set(node.id.name, {
          node,
          statement,
          exported: exported.has(node.id.name),
        });
      }
    } else if (declaration.type === 'VariableDeclaration') {
      for (const declarator of declaration.declarations ?? []) {
        const init = declarator.init ? unwrapTS(declarator.init) : null;
        if (
          declarator.id.type === 'Identifier' &&
          init?.type === 'ClassExpression'
        ) {
          classes.set(declarator.id.name, {
            node: init,
            statement,
            exported: exported.has(declarator.id.name),
          });
        }
      }
    }
  }

  return classes;
}

/**
 * Every runtime name a module declares at top level: imports of every form,
 * variables of every pattern, functions, classes, enums and namespaces.
 */
export function collectTopLevelNames(program: Program): Set<string> {
  const names = new Set<string>();
  const addPattern = (pattern: Node): void => {
    walk(pattern, (node) => {
      if (node.type === 'Identifier') {
        names.add(node.name);
      }
    });
  };

  for (const node of program.body) {
    if (node.type === 'ImportDeclaration') {
      for (const spec of node.specifiers) {
        names.add(spec.local.name);
      }
    }
  }
  for (const [declaration] of topDeclarations(program)) {
    if (declaration.type === 'VariableDeclaration') {
      for (const declarator of declaration.declarations ?? []) {
        addPattern(declarator.id);
      }
      continue;
    }
    const { id } = declaration;
    if (id?.type === 'Identifier' && id.name) {
      names.add(id.name);
    }
  }

  return names;
}

/**
 * Static name of a class member key or a member expression's property: an
 * identifier that isn't computed, or a string literal. `undefined` otherwise.
 */
export function staticKeyName(
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
 * Deterministic, collision-free name of a build-only export.
 *
 * It is derived from the name it stands for only, not from the module id. A
 * trait module's own transform runs while its package builds, over its
 * source, and a consumer in another package reads the built module at another
 * path, so hashing the name lets both sides agree across that boundary.
 */
export function syntheticExportName(local: string): string {
  const hash = createHash('sha1').update(local).digest('hex').slice(0, 8);
  const safe = local.replace(/[^\w$]/gu, '_');

  return `__mxflat_${safe}_${hash}`;
}

/** A module id's file extension, without the dot. */
export function extensionOf(id: string): string {
  return /\.([^./]+)$/u.exec(id)?.[1] ?? '';
}

/**
 * Host-provided resolution and loading, so analysis doesn't hard-code the
 * bundler's module graph or filesystem access.
 */
export interface ModuleLoader {
  /** Resolves `specifier` from `importer` to an absolute module id. */
  resolve(specifier: string, importer: string): Promise<string | null>;
  /** Loads a module's source text, as the analysis reads it. */
  load(id: string): Promise<string>;
}
