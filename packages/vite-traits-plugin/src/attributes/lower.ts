/**
 * Layer (b), lowered in the trait's own build. In each class whose static block
 * calls `attributes(this, TABLE)`, with `attributes` imported from core's
 * `traits/attribute-traits`:
 *
 * - each `accessor name!: T` line becomes a getter and a setter that read and
 *   write the attribute through core's attribute operator and the table's
 *   converter;
 * - the `attributes` call is removed;
 * - a static `observedAttributes` lists the table's keys.
 *
 * The result is a plain layer (a) trait. TABLE is an object literal, whose
 * converters are identifiers or member expressions, or a module-scope `const`
 * bound to one, whose entries the accessors read as `TABLE.name`.
 */
import type {
  AccessorProperty,
  Class,
  Expression,
  ObjectExpression,
  Program,
  Statement,
} from '@oxc-project/types';
import { RolldownMagicString } from 'rolldown';
import { CODE, fail } from '../diagnostics.ts';
import {
  collectImports,
  collectTopBindings,
  collectTopClasses,
  importedLocals,
  staticKeyName,
  unwrapTS,
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

type TableCall = Readonly<{ statement: Statement; table: Expression }>;

/** The `attributes(this, TABLE)` statement in a class's static blocks. */
function findTableCall(
  node: Class,
  locals: ReadonlySet<string>,
): TableCall | null {
  for (const element of node.body.body) {
    if (element.type !== 'StaticBlock') {
      continue;
    }
    for (const statement of element.body) {
      const call =
        statement.type === 'ExpressionStatement'
          ? unwrapTS(statement.expression)
          : null;
      if (
        call?.type === 'CallExpression' &&
        call.callee.type === 'Identifier' &&
        locals.has(call.callee.name)
      ) {
        const [self, table] = call.arguments;
        if (
          self?.type !== 'ThisExpression' ||
          !table ||
          table.type === 'SpreadElement'
        ) {
          fail(
            CODE.ATTRIBUTE_TABLE,
            'attributes() takes this and a table',
            call.start,
          );
        }
        return { statement, table };
      }
    }
  }

  return null;
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
 * doesn't import `attributes` or calls it nowhere.
 */
export function lowerAttributes(
  code: string,
  program: Program,
): RolldownMagicString | null {
  const imports = collectImports(program);
  const locals = importedLocals(imports, 'attributes', ATTRIBUTE_TRAITS_MODULE);
  if (locals.size === 0) {
    return null;
  }
  const magic = new RolldownMagicString(code);
  let lowered = false;

  for (const { node } of collectTopClasses(program).values()) {
    const call = findTableCall(node, locals);
    if (!call) {
      continue;
    }
    const converters = readTable(code, program, call.table);
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
          call.table.start,
        );
      }
    }
    magic.remove(call.statement.start, call.statement.end);
    magic.appendRight(
      node.body.start + 1,
      `\n  static observedAttributes = ${JSON.stringify([...converters.keys()])};`,
    );
    lowered = true;
  }

  if (!lowered) {
    return null;
  }
  const { specifier } = [...imports.values()].find(
    ({ imported, specifier: from }) =>
      imported === 'attributes' && ATTRIBUTE_TRAITS_MODULE.test(from),
  )!;
  magic.prepend(
    `import ${OPERATOR_LOCAL} from ${JSON.stringify(operatorSpecifier(specifier))};\n`,
  );

  return magic;
}
