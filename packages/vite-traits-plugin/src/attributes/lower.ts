/**
 * Layer (b), lowered in the trait's own build. In each module-scope class
 * declaration decorated `@trait` and then `@attributes(TABLE)`, with
 * `attributes` imported from core's `traits/attribute-traits` and `trait` from
 * its `traits/composition`:
 *
 * - each `accessor name!: T` line becomes a getter and a setter that read and
 *   write the attribute through core's attribute operator and the table's
 *   converter;
 * - the `@attributes(TABLE)` decorator is removed, and `@trait` stays for the
 *   trait module's transform;
 * - a static `observedAttributes` lists the table's keys.
 *
 * The result is a plain layer (a) trait. TABLE is an object literal, whose
 * converters are identifiers or member expressions, or a module-scope `const`
 * bound to one, whose entries the accessors read as `TABLE.name`.
 */
import type {
  AccessorProperty,
  CallExpression,
  Class,
  Decorator,
  Expression,
  ObjectExpression,
  Program,
} from '@oxc-project/types';
import { RolldownMagicString } from 'rolldown';
import { traitLocalsOf } from '../composition/trait-module.ts';
import { CODE, fail } from '../diagnostics.ts';
import {
  collectImports,
  collectTopBindings,
  collectTopClasses,
  forEachValueReference,
  importedLocals,
  addImportRemovals,
  removeImports,
  type ImportRemovals,
  staticKeyName,
  unwrapTS,
  walk,
} from '../syntax.ts';

/** The specifier of core's layer (b), `traits/attribute-traits`. */
const ATTRIBUTE_TRAITS_MODULE = /(?:^|\/)attribute-traits(?:\.[cm]?[jt]sx?)?$/u;

/** The local name the lowered module binds core's attribute operator to. */
const OPERATOR_LOCAL = '__mxflat_attr';

/**
 * The specifier of core's attribute operator, beside the module that
 * `attributes` is imported from: `…/traits/attribute-traits.js` gives
 * `…/attribute.js`, and core's own `./attribute-traits.ts` gives
 * `../attribute.ts`.
 */
export function operatorSpecifier(attributesSpecifier: string): string {
  const inPackage = /^(.*)traits\/attribute-traits(\.[cm]?[jt]sx?)?$/u.exec(
    attributesSpecifier,
  );
  if (inPackage) {
    return `${inPackage[1]}attribute${inPackage[2] ?? ''}`;
  }
  const sibling = /^\.\/attribute-traits(\.[cm]?[jt]sx?)?$/u.exec(
    attributesSpecifier,
  );

  return sibling
    ? `../attribute${sibling[1] ?? ''}`
    : '@ydinjs/core/attribute.js';
}

/** Whether a module imports `attributes` from core's layer (b). */
export function importsAttributes(program: Program): boolean {
  return (
    importedLocals(
      collectImports(program),
      'attributes',
      ATTRIBUTE_TRAITS_MODULE,
    ).size > 0
  );
}

/** A class's `@attributes(TABLE)` decorator and its table. */
type TableDecorator = Readonly<{ decorator: Decorator; table: Expression }>;

/** Whether `decorator` is `@trait`, bare. */
function isTraitDecorator(
  decorator: Decorator | undefined,
  traitLocals: ReadonlySet<string>,
): boolean {
  return (
    decorator?.expression.type === 'Identifier' &&
    traitLocals.has(decorator.expression.name)
  );
}

/**
 * Checks that the module uses `attributes` only as `@attributes(TABLE)`, the
 * second decorator of a module-scope class declaration whose first is
 * `@trait`, and fails with `attributes-decorator` otherwise. Returns each
 * such class's decorator and table. A decorator after the two is left to the
 * trait module's transform, which refuses it.
 */
function tableDecorators(
  program: Program,
  locals: ReadonlySet<string>,
  traitLocals: ReadonlySet<string>,
): Map<Class, TableDecorator> {
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
    Readonly<{ decorator: Decorator; call: CallExpression | null }>
  >();
  walk(program, (node) => {
    if (node.type !== 'Decorator') {
      return;
    }
    const { expression } = node;
    if (expression.type === 'Identifier') {
      decorated.set(expression, { decorator: node, call: null });
    } else if (
      expression.type === 'CallExpression' &&
      expression.callee.type === 'Identifier'
    ) {
      decorated.set(expression.callee, { decorator: node, call: expression });
    }
  });

  const tables = new Map<Class, TableDecorator>();
  forEachValueReference(program, (reference) => {
    const { name } = reference;
    if (!locals.has(name)) {
      return;
    }
    const use = decorated.get(reference);
    if (!use) {
      fail(
        CODE.ATTRIBUTES_DECORATOR,
        `${name} is used only as @${name}(TABLE) above a class`,
        reference.start,
      );
    }
    const { decorator, call } = use;
    const [table, ...rest] = call?.arguments ?? [];
    if (!table || table.type === 'SpreadElement' || rest.length > 0) {
      fail(
        CODE.ATTRIBUTES_DECORATOR,
        `the decorator takes one table: @${name}(TABLE)`,
        decorator.start,
      );
    }
    const node = moduleScope.get(decorator);
    if (!node) {
      fail(
        CODE.ATTRIBUTES_DECORATOR,
        `@${name} decorates a module-scope class declaration`,
        decorator.start,
      );
    }
    const [first, second] = node.decorators;
    if (
      !node.decorators.some((other) => isTraitDecorator(other, traitLocals))
    ) {
      fail(
        CODE.ATTRIBUTES_DECORATOR,
        `@${name} decorates a @trait class`,
        decorator.start,
      );
    }
    if (!isTraitDecorator(first, traitLocals) || second !== decorator) {
      fail(
        CODE.ATTRIBUTES_DECORATOR,
        `@trait comes first, then one @${name}(TABLE)`,
        decorator.start,
      );
    }
    tables.set(node, { decorator, table });
  });

  return tables;
}

/** Each table key's converter expression, in table order. */
function readTable(
  code: string,
  program: Program,
  table: Expression,
): Map<string, string> {
  const node = unwrapTS(table);
  let object: ObjectExpression;
  let prefix: string | null = null;
  if (node.type === 'ObjectExpression') {
    object = node;
  } else if (node.type === 'Identifier') {
    const init = collectTopBindings(program).get(node.name)?.declarator.init;
    const literal = init ? unwrapTS(init) : null;
    if (literal?.type !== 'ObjectExpression') {
      return fail(
        CODE.ATTRIBUTE_TABLE,
        `${node.name} isn't a module-scope const bound to an object literal`,
        table.start,
      );
    }
    object = literal;
    prefix = node.name;
  } else {
    return fail(
      CODE.ATTRIBUTE_TABLE,
      'the table is an object literal or a module-scope const bound to one',
      table.start,
    );
  }

  const converters = new Map<string, string>();
  for (const property of object.properties) {
    const key =
      property.type === 'Property' && !property.computed
        ? staticKeyName(property.key, false)
        : undefined;
    if (property.type !== 'Property' || key === undefined) {
      return fail(
        CODE.ATTRIBUTE_TABLE,
        'a table key is static',
        property.start,
      );
    }
    if (prefix !== null) {
      converters.set(
        key,
        /^[A-Za-z_$][\w$]*$/u.test(key)
          ? `${prefix}.${key}`
          : `${prefix}[${JSON.stringify(key)}]`,
      );
      continue;
    }
    const value = unwrapTS(property.value);
    if (value.type !== 'Identifier' && value.type !== 'MemberExpression') {
      return fail(
        CODE.ATTRIBUTE_TABLE,
        `the converter of ${key} is an identifier or a member expression`,
        property.value.start,
      );
    }
    converters.set(key, code.slice(value.start, value.end));
  }

  return converters;
}

/** An `accessor name!: T` line's name. */
function accessorName(element: AccessorProperty): string {
  const name = element.computed ? undefined : staticKeyName(element.key, false);
  if (
    name === undefined ||
    element.key.type !== 'Identifier' ||
    element.static ||
    element.value !== null ||
    !element.definite
  ) {
    return fail(
      CODE.ATTRIBUTE_ACCESSOR,
      'an attribute is declared as accessor name!: T, with no initializer',
      element.start,
    );
  }

  return name;
}

/**
 * Lowers each attribute trait of a module. Returns `null` when the module
 * doesn't import `attributes` or decorates no class with it.
 *
 * @param createMagic - Gives the magic string of `code` that the edits go to.
 */
export function lowerAttributes(
  code: string,
  program: Program,
  createMagic: () => RolldownMagicString = () => new RolldownMagicString(code),
): RolldownMagicString | null {
  const imports = collectImports(program);
  const locals = importedLocals(imports, 'attributes', ATTRIBUTE_TRAITS_MODULE);
  if (locals.size === 0) {
    return null;
  }
  const tables = tableDecorators(program, locals, traitLocalsOf(program));
  if (tables.size === 0) {
    return null;
  }
  const magic = createMagic();

  for (const [node, { decorator, table }] of tables) {
    const converters = readTable(code, program, table);
    const accessors = node.body.body.filter(
      (element): element is AccessorProperty =>
        element.type === 'AccessorProperty',
    );
    const names = new Set<string>();
    for (const element of accessors) {
      const name = accessorName(element);
      const converter = converters.get(name);
      if (converter === undefined) {
        fail(
          CODE.ATTRIBUTE_TABLE,
          `the table has no entry for accessor ${name}`,
          element.start,
        );
      }
      names.add(name);
      const attribute = JSON.stringify(name);
      magic.overwrite(
        element.start,
        element.end,
        `get ${name}() { return ${OPERATOR_LOCAL}.get(this, ${attribute}, ${converter}); }\n  set ${name}(value) { ${OPERATOR_LOCAL}.set(this, ${attribute}, value, ${converter}); }`,
      );
    }
    for (const key of converters.keys()) {
      if (!names.has(key)) {
        fail(
          CODE.ATTRIBUTE_TABLE,
          `the table's ${key} has no accessor`,
          table.start,
        );
      }
    }
    const [space] = /^\s*/u.exec(code.slice(decorator.end))!;
    magic.remove(decorator.start, decorator.end + space.length);
    magic.appendRight(
      node.body.start + 1,
      `\n  static observedAttributes = ${JSON.stringify([...converters.keys()])};`,
    );
  }

  // Every other use of `attributes` is an error, so the lowered module has
  // none left.
  const removals: ImportRemovals = new Map();
  for (const node of program.body) {
    if (node.type === 'ImportDeclaration') {
      addImportRemovals(removals, node, locals);
    }
  }
  removeImports(magic, code, removals);
  const { specifier } = [...imports.values()].find(
    ({ imported, specifier: from }) =>
      imported === 'attributes' && ATTRIBUTE_TRAITS_MODULE.test(from),
  )!;
  magic.prepend(
    `import ${OPERATOR_LOCAL} from ${JSON.stringify(operatorSpecifier(specifier))};\n`,
  );

  return magic;
}
