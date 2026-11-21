/**
 * A trait module's own transform, and how a trait class is recognized.
 *
 * In source, a trait class is a module-scope class declaration whose one
 * decorator is `@trait`, with `trait` imported from core's `composition`
 * module. In built JavaScript it has the method this transform generates,
 * recognized only in exactly that form. The transform:
 *
 * - checks that the module uses `trait` only as such a decorator;
 * - hoists the brand into an exported module-level `Symbol` named after the
 *   class, removes the decorator and puts a static method in the class,
 *   `static [Symbol.hasInstance](o) { return o != null && o[$brand] === true; }`.
 *   A bundle that never uses `instanceof` drops the class, and one that uses
 *   it keeps the method;
 * - hoists each static field's value into an exported module-level constant,
 *   so a component links the value without retaining the trait class;
 * - exports, under build-only names, each private binding a member reads;
 * - in an application build, deletes the trait class's instance members,
 *   because nothing copies them from that output.
 *
 * Each step leaves its result recognizable, so the transform of an already
 * transformed module, another package's build, changes only what is missing.
 */
import type {
  Class,
  ClassElement,
  Decorator,
  Expression,
  MethodDefinition,
  Program,
  VariableDeclarator,
} from '@oxc-project/types';
import { RolldownMagicString } from 'rolldown';
import { CODE, fail } from '../diagnostics.ts';
import { collectReferences } from '../free-references.ts';
import {
  collectExportedNames,
  collectImports,
  collectTopBindings,
  collectTopClasses,
  collectTopLevelNames,
  forEachValueReference,
  importedLocals,
  addImportRemovals,
  type ImportRemovals,
  syntheticExportName,
  unwrapTS,
  walk,
  type TopClass,
} from '../syntax.ts';

/** The specifier of core's layer (a), `traits/composition`. */
const COMPOSITION_MODULE = /(?:^|\/)composition(?:\.[cm]?[jt]sx?)?$/u;

/**
 * How a trait class installs its brand: the `@trait` decorator in its source,
 * or, once its own build has run, the generated `static [Symbol.hasInstance](o)`
 * method, which names the brand.
 */
export type TraitInstall = Readonly<
  | { kind: 'decorator'; decorator: Decorator }
  | { kind: 'method'; method: MethodDefinition; brand: string }
>;

/**
 * The class's `@trait` decorator, when it is the one decorator of a class
 * declaration. Any other use is a `trait-decorator` error in the trait's own
 * build.
 */
function traitDecorator(
  node: Class,
  traitLocals: ReadonlySet<string>,
): Decorator | null {
  const [decorator, ...rest] = node.decorators;

  return node.type === 'ClassDeclaration' &&
    rest.length === 0 &&
    decorator?.expression.type === 'Identifier' &&
    traitLocals.has(decorator.expression.name)
    ? decorator
    : null;
}

/**
 * Checks that the module uses `trait` only as the one decorator of a
 * module-scope class declaration, and fails with `trait-decorator` otherwise.
 */
function checkTraitReferences(
  program: Program,
  traitLocals: ReadonlySet<string>,
): void {
  const moduleScope = new Map<Decorator, Class>();
  for (const { node } of collectTopClasses(program).values()) {
    if (node.type === 'ClassDeclaration') {
      for (const decorator of node.decorators) {
        moduleScope.set(decorator, node);
      }
    }
  }
  // The decorator each identifier is the expression or the callee of.
  const decorated = new Map<
    object,
    Readonly<{ decorator: Decorator; called: boolean }>
  >();
  walk(program, (node) => {
    if (node.type !== 'Decorator') {
      return;
    }
    const { expression } = node;
    if (expression.type === 'Identifier') {
      decorated.set(expression, { decorator: node, called: false });
    } else if (
      expression.type === 'CallExpression' &&
      expression.callee.type === 'Identifier'
    ) {
      decorated.set(expression.callee, { decorator: node, called: true });
    }
  });

  forEachValueReference(program, (reference) => {
    if (!traitLocals.has(reference.name)) {
      return;
    }
    const use = decorated.get(reference);
    if (!use) {
      fail(
        CODE.TRAIT_DECORATOR,
        `${reference.name} is used only as @${reference.name} above a class`,
        reference.start,
      );
    }
    const { decorator, called } = use;
    if (called) {
      fail(
        CODE.TRAIT_DECORATOR,
        `the decorator is used bare: @${reference.name}`,
        decorator.start,
      );
    }
    const node = moduleScope.get(decorator);
    if (!node) {
      fail(
        CODE.TRAIT_DECORATOR,
        `@${reference.name} decorates a module-scope class declaration`,
        decorator.start,
      );
    }
    // Layer (b) has already removed `@attributes(TABLE)`.
    if (node.decorators.length !== 1) {
      fail(
        CODE.TRAIT_DECORATOR,
        `@${reference.name} is the class's first decorator, and the only other is @attributes(TABLE)`,
        decorator.start,
      );
    }
  });
}

/** Whether `node` is the identifier `name`. */
function isName(
  node: Readonly<{ type: string; name?: unknown }>,
  name: string,
): boolean {
  return node.type === 'Identifier' && node.name === name;
}

/** Adds each identifier a write target binds or assigns to `into`. */
function addTargetNames(target: unknown, into: Set<string>): void {
  if (!target || typeof target !== 'object') {
    return;
  }
  const node = target as Readonly<Record<string, unknown>> & { type?: string };
  switch (node.type ?? '') {
    case 'Identifier':
      into.add(node['name'] as string);
      return;
    case 'ArrayPattern':
      for (const element of (node['elements'] as unknown[] | undefined) ?? []) {
        addTargetNames(element, into);
      }
      return;
    case 'ObjectPattern':
      for (const property of (node['properties'] as unknown[] | undefined) ??
        []) {
        const entry = property as Readonly<Record<string, unknown>> & {
          type?: string;
        };
        addTargetNames(
          entry.type === 'Property' ? entry['value'] : entry,
          into,
        );
      }
      return;
    case 'AssignmentPattern':
      addTargetNames(node['left'], into);
      return;
    case 'RestElement':
      addTargetNames(node['argument'], into);
      return;
    default:
      // A member expression writes a property, not a binding. A TypeScript
      // wrapper around a target writes what it wraps.
      if (node['expression']) {
        addTargetNames(node['expression'], into);
      }
  }
}

/**
 * The module-scope names that the module writes after declaring them: any
 * assignment or update target, including each name in a destructuring
 * pattern, the left side of a `for…in` or `for…of` that isn't a declaration,
 * and a name that the module declares more than once, counting every `var`
 * in a block or a loop head, which hoists to the module's scope.
 */
function assignedNames(program: Program): Set<string> {
  const names = new Set<string>();
  walk(program, (node) => {
    if (node.type === 'AssignmentExpression') {
      addTargetNames(node.left, names);
    } else if (node.type === 'UpdateExpression') {
      addTargetNames(node.argument, names);
    } else if (
      (node.type === 'ForInStatement' || node.type === 'ForOfStatement') &&
      node.left.type !== 'VariableDeclaration'
    ) {
      addTargetNames(node.left, names);
    }
  });
  const declared = new Set<string>();
  const declare = (id: string): void => {
    if (declared.has(id)) {
      names.add(id);
    }
    declared.add(id);
  };
  // Every `var` hoists to the module's scope, from a block or a loop head as
  // much as from the top level, so each one is a declaration of its names.
  const vars = new Set<VariableDeclarator>();
  walk(program, (node) => {
    if (node.type === 'VariableDeclaration' && node.kind === 'var') {
      for (const declarator of node.declarations) {
        vars.add(declarator);
      }
    }
  });
  for (const statement of program.body) {
    const declaration =
      statement.type === 'ExportNamedDeclaration' ||
      statement.type === 'ExportDefaultDeclaration'
        ? statement.declaration
        : statement;
    if (declaration?.type === 'VariableDeclaration') {
      for (const declarator of declaration.declarations) {
        if (vars.has(declarator)) {
          continue;
        }
        const local = new Set<string>();
        addTargetNames(declarator.id, local);
        local.forEach(declare);
      }
    } else if (
      (declaration?.type === 'FunctionDeclaration' ||
        declaration?.type === 'ClassDeclaration') &&
      declaration.id
    ) {
      declare(declaration.id.name);
    }
  }
  for (const declarator of vars) {
    const local = new Set<string>();
    addTargetNames(declarator.id, local);
    local.forEach(declare);
  }

  return names;
}

/**
 * The module's possible brands: each exported module-scope variable that is
 * initialized with `Symbol(<string literal>)` and never assigned again. A
 * bundler may emit the brand's `const` as `var`, as Vite's library build does.
 */
export function brandConstants(program: Program): ReadonlySet<string> {
  const exported = collectExportedNames(program);
  const assigned = assignedNames(program);
  const brands = new Set<string>();
  for (const [name, { declarator, statement }] of collectTopBindings(program)) {
    const declaration =
      statement.type === 'ExportNamedDeclaration'
        ? statement.declaration
        : statement;
    const { init } = declarator;
    const [description, ...rest] =
      init?.type === 'CallExpression' ? init.arguments : [];
    if (
      declaration?.type === 'VariableDeclaration' &&
      (declaration.kind === 'const' || !assigned.has(name)) &&
      exported.has(name) &&
      init?.type === 'CallExpression' &&
      isName(init.callee, 'Symbol') &&
      rest.length === 0 &&
      description?.type === 'Literal' &&
      typeof description.value === 'string'
    ) {
      brands.add(name);
    }
  }

  return brands;
}

/**
 * The brand that a generated `static [Symbol.hasInstance](p)` method reads,
 * when the method is exactly the generated one: one identifier parameter, and
 * a body of one `return p != null && p[B] === true`, where `B` is one of
 * `brands`. Any other method makes no trait class, so the transform leaves
 * another library's class alone.
 */
function hasInstanceBrand(
  element: ClassElement,
  brands: ReadonlySet<string>,
): string | null {
  if (
    element.type !== 'MethodDefinition' ||
    element.kind !== 'method' ||
    !element.static ||
    !element.computed ||
    element.key.type !== 'MemberExpression' ||
    element.key.computed ||
    !isName(element.key.object, 'Symbol') ||
    !isName(element.key.property, 'hasInstance')
  ) {
    return null;
  }
  const { params, body } = element.value;
  const [param] = params;
  const [statement] = body?.body ?? [];
  if (
    params.length !== 1 ||
    param?.type !== 'Identifier' ||
    body?.body.length !== 1 ||
    statement?.type !== 'ReturnStatement'
  ) {
    return null;
  }
  const test = statement.argument;
  if (test?.type !== 'LogicalExpression' || test.operator !== '&&') {
    return null;
  }
  const { left, right } = test;
  if (
    left.type !== 'BinaryExpression' ||
    left.operator !== '!=' ||
    !isName(left.left, param.name) ||
    left.right.type !== 'Literal' ||
    left.right.value !== null ||
    right.type !== 'BinaryExpression' ||
    right.operator !== '===' ||
    right.right.type !== 'Literal' ||
    right.right.value !== true ||
    right.left.type !== 'MemberExpression' ||
    !right.left.computed ||
    !isName(right.left.object, param.name) ||
    right.left.property.type !== 'Identifier' ||
    !brands.has(right.left.property.name)
  ) {
    return null;
  }

  return right.left.property.name;
}

/** How class `node` installs its brand, if it is a trait class. */
export function findTraitInstall(
  node: Class,
  traitLocals: ReadonlySet<string>,
  brands: ReadonlySet<string>,
): TraitInstall | null {
  const decorator = traitDecorator(node, traitLocals);
  if (decorator) {
    return { kind: 'decorator', decorator };
  }
  for (const element of node.body.body) {
    const brand = hasInstanceBrand(element, brands);
    if (brand !== null && element.type === 'MethodDefinition') {
      return { kind: 'method', method: element, brand };
    }
  }

  return null;
}

/** The brand install that the build puts in a `@trait` class. */
function hasInstanceMethod(brand: string): string {
  return `static [Symbol.hasInstance](o) {\n    return o != null && o[${brand}] === true;\n  }`;
}

/**
 * The name of a trait's hoisted brand: `$` and the class name with a lower-case
 * first letter, prefixed with `_` while the module already binds the name.
 * The trait module's transform and a consumer reading the same text agree.
 */
export function brandName(
  className: string,
  topLevel: ReadonlySet<string>,
): string {
  let name = `$${className.charAt(0).toLowerCase()}${className.slice(1)}`;
  while (topLevel.has(name)) {
    name = `_${name}`;
  }

  return name;
}

/** The name of a trait static's hoisted value. */
export function staticValueName(className: string, key: string): string {
  return syntheticExportName(`${className}.${key}`);
}

/** Whether `specifier` names core's layer (a), `traits/composition`. */
export function isCompositionModule(specifier: string): boolean {
  return COMPOSITION_MODULE.test(specifier);
}

/** The local names bound to core's `trait`. */
export function traitLocalsOf(program: Program): ReadonlySet<string> {
  return importedLocals(collectImports(program), 'trait', COMPOSITION_MODULE);
}

/** The module's top-level trait classes, by name. */
export function collectTraitClasses(
  program: Program,
  traitLocals: ReadonlySet<string>,
  brands: ReadonlySet<string> = brandConstants(program),
): Map<string, TopClass & Readonly<{ trait: TraitInstall }>> {
  const traits = new Map<
    string,
    TopClass & Readonly<{ trait: TraitInstall }>
  >();
  for (const [name, top] of collectTopClasses(program)) {
    const install = findTraitInstall(top.node, traitLocals, brands);
    if (install) {
      traits.set(name, { ...top, trait: install });
    }
  }

  return traits;
}

/** Whether a class element is a static field with a value. */
export function isStaticValue(
  element: ClassElement,
): element is ClassElement & { type: 'PropertyDefinition'; value: Expression } {
  return (
    element.type === 'PropertyDefinition' &&
    element.static &&
    !element.declare &&
    element.value !== null
  );
}

/** Whether a class element is an instance member, which a component copies. */
function isInstanceMember(element: ClassElement): boolean {
  return (
    (element.type === 'MethodDefinition' ||
      element.type === 'PropertyDefinition' ||
      element.type === 'AccessorProperty' ||
      element.type === 'TSAbstractMethodDefinition' ||
      element.type === 'TSAbstractPropertyDefinition') &&
    !element.static
  );
}

/** Whether `value` reads the class or `this`, which a hoisted value can't. */
function readsClass(value: Expression, className: string): boolean {
  let reads = false;
  walk(value, (node) => {
    if (
      node.type === 'ThisExpression' ||
      node.type === 'Super' ||
      (node.type === 'Identifier' && node.name === className)
    ) {
      reads = true;
    }
  });

  return reads;
}

/**
 * Adds the import of `trait` to `removals` when the removed decorators were
 * its only uses: a built trait module doesn't need layer (a)'s runtime.
 */
function removeUnusedImports(
  removals: ImportRemovals,
  program: Program,
  traitLocals: ReadonlySet<string>,
  replaced: ReadonlySet<Decorator>,
): void {
  if (replaced.size === 0) {
    return;
  }
  const uses = new Map<string, number>();
  for (const node of program.body) {
    if (node.type !== 'ImportDeclaration') {
      walk(node, (child) => {
        if (child.type === 'Identifier' && traitLocals.has(child.name)) {
          uses.set(child.name, (uses.get(child.name) ?? 0) + 1);
        }
      });
    }
  }
  for (const decorator of replaced) {
    const { name } = decorator.expression as { name: string };
    uses.set(name, (uses.get(name) ?? 0) - 1);
  }
  const unused = new Set(
    [...traitLocals].filter((name) => (uses.get(name) ?? 0) <= 0),
  );
  for (const node of program.body) {
    if (node.type === 'ImportDeclaration') {
      addImportRemovals(removals, node, unused);
    }
  }
}

/**
 * The private module bindings that a trait class's copied source reads: its
 * methods and accessors, its private fields' initializers and its
 * constructor's body after `super();`. Source outside the subset is skipped
 * here; a component that composes the trait reports it.
 */
function privateReads(
  node: Class,
  bindings: ReturnType<typeof collectTopBindings>,
): Set<string> {
  const names = new Set<string>();
  const unmodeled = (): never => {
    throw new Error('unmodeled');
  };
  for (const element of node.body.body) {
    let found: ReadonlyArray<{ name: string }> = [];
    try {
      if (element.type === 'MethodDefinition' && element.value.body) {
        found =
          element.kind === 'constructor'
            ? collectReferences(
                element.value.body.body.slice(1),
                'constructor',
                unmodeled,
              ).references
            : collectReferences(element.value, 'member', unmodeled).references;
      } else if (
        element.type === 'PropertyDefinition' &&
        !element.static &&
        element.key.type === 'PrivateIdentifier' &&
        element.value
      ) {
        found = collectReferences(
          element.value,
          'initializer',
          unmodeled,
        ).references;
      }
    } catch {
      // Reported where a component composes the trait.
    }
    for (const { name } of found) {
      if (bindings.get(name)?.exported === false) {
        names.add(name);
      }
    }
  }

  return names;
}

/**
 * Transforms a trait module. Returns `null` when the module has no trait
 * class or nothing is missing.
 *
 * @param applicationBuild - The output is an application's, so no consumer
 *   copies from it and each trait class's instance members are deleted.
 * @param removals - Receives the import specifiers that the transform leaves
 *   unused. The caller removes them with `removeImports`, after its other
 *   edits to the module.
 * @param createMagic - Gives the magic string of `code` that the edits go to.
 */
export function transformTraitModule(
  code: string,
  program: Program,
  applicationBuild: boolean,
  removals: ImportRemovals,
  createMagic: () => RolldownMagicString = () => new RolldownMagicString(code),
): RolldownMagicString | null {
  const traitLocals = traitLocalsOf(program);
  if (traitLocals.size > 0) {
    checkTraitReferences(program, traitLocals);
  }
  const traits = collectTraitClasses(program, traitLocals);
  if (traits.size === 0) {
    return null;
  }

  const magic = createMagic();
  const exported = collectExportedNames(program);
  const bindings = collectTopBindings(program);
  const topLevel = collectTopLevelNames(program);
  const exports = new Set<string>();
  const replaced = new Set<Decorator>();
  let changed = false;

  const exportBinding = (local: string, as: string): void => {
    if (!exported.get(local)?.includes(as)) {
      exports.add(local === as ? local : `${local} as ${as}`);
    }
  };

  for (const [className, { node, statement, trait }] of traits) {
    const before: string[] = [];
    // In `@trait export class`, the decorator lies before the statement, so
    // the hoisted declarations go before the decorator.
    let insertAt = statement.start;

    if (trait.kind === 'decorator') {
      const brand = brandName(className, topLevel);
      const { decorator } = trait;
      before.push(
        `export const ${brand} = Symbol(${JSON.stringify(className)});`,
      );
      insertAt = Math.min(insertAt, decorator.start);
      const [space] = /^\s*/u.exec(code.slice(decorator.end))!;
      magic.remove(decorator.start, decorator.end + space.length);
      // The method goes after the `static observedAttributes` that layer (b)
      // puts first in the body, or else first.
      const [first] = node.body.body;
      const observed =
        first?.type === 'PropertyDefinition' &&
        first.static &&
        isName(first.key, 'observedAttributes')
          ? first
          : null;
      if (observed) {
        magic.appendLeft(observed.end, `\n  ${hasInstanceMethod(brand)}\n`);
      } else {
        magic.appendLeft(
          node.body.start + 1,
          `\n  ${hasInstanceMethod(brand)}\n`,
        );
      }
      replaced.add(decorator);
      changed = true;
    } else {
      exportBinding(trait.brand, trait.brand);
    }

    for (const element of node.body.body) {
      if (isStaticValue(element)) {
        const key = element.key.type === 'Identifier' ? element.key.name : null;
        if (key === null || element.computed) {
          continue;
        }
        const name = staticValueName(className, key);
        const value = unwrapTS(element.value);
        if (value.type === 'Identifier' && value.name === name) {
          exportBinding(name, name);
          continue;
        }
        if (readsClass(element.value, className)) {
          continue;
        }
        before.push(
          `const ${name} = ${code.slice(element.value.start, element.value.end)};`,
        );
        magic.overwrite(element.value.start, element.value.end, name);
        exports.add(name);
      }
    }

    for (const name of privateReads(node, bindings)) {
      exportBinding(name, syntheticExportName(name));
      exportBinding(name, name);
    }

    if (applicationBuild) {
      for (const element of node.body.body) {
        if (isInstanceMember(element)) {
          magic.remove(element.start, element.end);
          changed = true;
        }
      }
    }

    if (before.length > 0) {
      magic.appendLeft(insertAt, `${before.join('\n')}\n`);
      changed = true;
    }
  }

  removeUnusedImports(removals, program, traitLocals, replaced);

  if (exports.size > 0) {
    magic.append(`\nexport { ${[...exports].join(', ')} };\n`);
    changed = true;
  }

  return changed ? magic : null;
}

export type { TopClass };
