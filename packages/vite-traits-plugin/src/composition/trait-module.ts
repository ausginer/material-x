/**
 * A trait module's own transform, and how a trait class is recognized.
 *
 * In source, a trait class has a static block that calls `trait(this)`, with
 * `trait` imported from core's `composition` module. In built JavaScript it
 * has the method this transform generates, recognized only in exactly that
 * form. The transform:
 *
 * - hoists the brand into an exported module-level `Symbol` named after the
 *   class, and replaces `trait(this)` with a static method,
 *   `static [Symbol.hasInstance](o) { return o != null && o[$brand] === true; }`.
 *   `trait` is never called with a brand. A bundle that never uses
 *   `instanceof` drops the class, and one that uses it keeps the method;
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
  CallExpression,
  Class,
  ClassElement,
  Expression,
  ImportDeclaration,
  MethodDefinition,
  Program,
  Statement,
  StaticBlock,
  VariableDeclarator,
} from '@oxc-project/types';
import { RolldownMagicString } from 'rolldown';
import { collectFreeReferences } from '../free-references.ts';
import {
  collectExportedNames,
  collectImports,
  collectTopBindings,
  collectTopClasses,
  collectTopLevelNames,
  importedLocals,
  syntheticExportName,
  unwrapTS,
  walk,
  type TopClass,
} from '../syntax.ts';

/** The specifier of core's layer (a), `traits/composition`. */
const COMPOSITION_MODULE = /(?:^|\/)composition(?:\.[cm]?[jt]sx?)?$/u;

/**
 * How a trait class installs its brand: the `trait(this[, brand])` call in a
 * static block of its source, or, once its own build has run, the generated
 * `static [Symbol.hasInstance](o)` method, which names the brand.
 */
export type TraitInstall = Readonly<
  | {
      kind: 'call';
      block: StaticBlock;
      statement: Statement;
      call: CallExpression;
      /** The brand's binding, when the call passes one. */
      brand: string | null;
    }
  | { kind: 'method'; method: MethodDefinition; brand: string }
>;

/** The `trait(this[, brand])` statement in `block`, if any. */
function traitStatement(
  block: StaticBlock,
  traitLocals: ReadonlySet<string>,
): Readonly<{ statement: Statement; call: CallExpression }> | null {
  for (const statement of block.body) {
    const call =
      statement.type === 'ExpressionStatement'
        ? unwrapTS(statement.expression)
        : null;
    if (
      call?.type === 'CallExpression' &&
      call.callee.type === 'Identifier' &&
      traitLocals.has(call.callee.name) &&
      call.arguments[0]?.type === 'ThisExpression'
    ) {
      return { statement, call };
    }
  }

  return null;
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
  for (const element of node.body.body) {
    if (element.type === 'StaticBlock') {
      const found = traitStatement(element, traitLocals);
      if (found) {
        const [, brand] = found.call.arguments;
        return {
          kind: 'call',
          block: element,
          ...found,
          brand: brand?.type === 'Identifier' ? brand.name : null,
        };
      }
    }
    const brand = hasInstanceBrand(element, brands);
    if (brand !== null && element.type === 'MethodDefinition') {
      return { kind: 'method', method: element, brand };
    }
  }

  return null;
}

/** Whether a static block holds only `trait(this[, brand])` calls. */
export function isTraitBlock(
  block: StaticBlock,
  traitLocals: ReadonlySet<string>,
): boolean {
  return block.body.every((statement) => {
    const call =
      statement.type === 'ExpressionStatement'
        ? unwrapTS(statement.expression)
        : null;

    return (
      call?.type === 'CallExpression' &&
      call.callee.type === 'Identifier' &&
      traitLocals.has(call.callee.name)
    );
  });
}

/** The brand install that replaces `trait(this)`. */
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

/** Removes some of an import's specifiers, with their commas. */
function removeSpecifiers(
  magic: RolldownMagicString,
  code: string,
  unused: ImportDeclaration['specifiers'],
): void {
  for (const spec of unused) {
    const after = /^\s*,\s*/u.exec(code.slice(spec.end));
    magic.remove(spec.start, spec.end + (after?.[0].length ?? 0));
  }
}

/**
 * Removes the import of `trait` when the replaced calls were its only uses: a
 * built trait module doesn't need layer (a)'s runtime.
 */
function removeUnusedImports(
  magic: RolldownMagicString,
  program: Program,
  code: string,
  traitLocals: ReadonlySet<string>,
  replaced: ReadonlySet<CallExpression>,
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
  for (const call of replaced) {
    const { name } = call.callee as { name: string };
    uses.set(name, (uses.get(name) ?? 0) - 1);
  }
  for (const node of program.body) {
    if (node.type !== 'ImportDeclaration') {
      continue;
    }
    const unused = node.specifiers.filter(
      (spec) =>
        traitLocals.has(spec.local.name) &&
        (uses.get(spec.local.name) ?? 0) <= 0,
    );
    if (unused.length === 0) {
      continue;
    }
    if (unused.length === node.specifiers.length) {
      magic.remove(node.start, node.end);
      continue;
    }
    removeSpecifiers(magic, code, unused);
  }
}

/**
 * The private module bindings that a trait class's methods and accessors
 * read. A member outside the subset is skipped here; a component that
 * composes the trait reports it.
 */
function privateReads(
  node: Class,
  bindings: ReturnType<typeof collectTopBindings>,
): Set<string> {
  const names = new Set<string>();
  for (const element of node.body.body) {
    if (
      element.type !== 'MethodDefinition' ||
      element.kind === 'constructor' ||
      element.value.body === null
    ) {
      continue;
    }
    try {
      for (const { name } of collectFreeReferences(element.value, () => {
        throw new Error('unmodeled');
      })) {
        if (bindings.get(name)?.exported === false) {
          names.add(name);
        }
      }
    } catch {
      // Reported where a component composes the trait.
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
 */
export function transformTraitModule(
  code: string,
  program: Program,
  applicationBuild: boolean,
): RolldownMagicString | null {
  const traitLocals = traitLocalsOf(program);
  const traits = collectTraitClasses(program, traitLocals);
  if (traits.size === 0) {
    return null;
  }

  const magic = new RolldownMagicString(code);
  const exported = collectExportedNames(program);
  const bindings = collectTopBindings(program);
  const topLevel = collectTopLevelNames(program);
  const exports = new Set<string>();
  const replaced = new Set<CallExpression>();
  let changed = false;

  const exportBinding = (local: string, as: string): void => {
    if (!exported.get(local)?.includes(as)) {
      exports.add(local === as ? local : `${local} as ${as}`);
    }
  };

  for (const [className, { node, statement, trait }] of traits) {
    const before: string[] = [];

    if (trait.kind === 'call') {
      const brand = trait.brand ?? brandName(className, topLevel);
      if (trait.brand === null) {
        before.push(
          `export const ${brand} = Symbol(${JSON.stringify(className)});`,
        );
      } else {
        exportBinding(brand, brand);
      }
      if (isTraitBlock(trait.block, traitLocals)) {
        magic.overwrite(
          trait.block.start,
          trait.block.end,
          hasInstanceMethod(brand),
        );
      } else {
        magic.remove(trait.statement.start, trait.statement.end);
        magic.appendLeft(trait.block.start, `${hasInstanceMethod(brand)}\n  `);
      }
      replaced.add(trait.call);
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
      magic.appendLeft(statement.start, `${before.join('\n')}\n`);
      changed = true;
    }
  }

  removeUnusedImports(magic, program, code, traitLocals, replaced);

  if (exports.size > 0) {
    magic.append(`\nexport { ${[...exports].join(', ')} };\n`);
    changed = true;
  }

  return changed ? magic : null;
}

export type { TopClass };
