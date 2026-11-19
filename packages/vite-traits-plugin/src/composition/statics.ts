/**
 * The kind of a static, read syntactically from its declared type, and how a
 * key's contributors merge.
 *
 * - **array:** an array type, `readonly T[]`, `T[]`, `ReadonlyArray<T>` or
 *   `Array<T>`. The values concatenate.
 * - **object:** an object literal type, `Readonly<…>` of one, or `Record<…>`.
 *   The values spread shallowly.
 * - **simple:** a primitive or a literal. The last value wins.
 *
 * `T | null`, `T | undefined` and an optional field take `T`'s kind, and an
 * absent value counts as empty. A local or imported alias is followed. Any
 * other shape is a build error: a tuple, every `as const` array, a class
 * instance, a function, a mixed union, `typeof`, and an alias that only a type
 * checker could resolve.
 */
import type { Expression, TSType, TSTypeReference } from '@oxc-project/types';
import { CODE, fail } from '../diagnostics.ts';
import type { StaticKind } from '../ir.ts';
import { type ModuleLoader, unwrapTS } from '../syntax.ts';
import { resolveAlias, type DeclarationScope } from './declarations.ts';

const ARRAY_REFERENCES = new Set(['ReadonlyArray', 'Array']);
const OBJECT_REFERENCES = new Set(['Record']);
const SIMPLE_KEYWORDS = new Set([
  'TSStringKeyword',
  'TSNumberKeyword',
  'TSBooleanKeyword',
  'TSBigIntKeyword',
  'TSLiteralType',
  'TSTemplateLiteralType',
]);
const EMPTY_KEYWORDS = new Set(['TSNullKeyword', 'TSUndefinedKeyword']);

/** What a declared type is, for a diagnostic. */
function describe(type: TSType): string {
  return type.type.replace(/^TS/u, '');
}

/**
 * The kind of a declared type, or `null` for a type that is only `null` or
 * `undefined`.
 *
 * @param where - What the diagnostic names, `Trait.key`.
 */
export async function kindOfType(
  loader: ModuleLoader,
  scope: DeclarationScope,
  type: TSType,
  where: string,
): Promise<StaticKind | null> {
  const refuse = (shape: string): never =>
    fail(
      CODE.STATIC_KIND,
      `${where} is declared as ${shape}, which doesn't merge`,
    );

  if (type.type === 'TSArrayType') {
    return 'array';
  }
  if (type.type === 'TSTypeLiteral') {
    return 'object';
  }
  if (type.type === 'TSParenthesizedType') {
    return await kindOfType(loader, scope, type.typeAnnotation, where);
  }
  if (type.type === 'TSTypeOperator') {
    if (type.operator !== 'readonly') {
      return refuse(`a ${type.operator} type`);
    }
    return type.typeAnnotation.type === 'TSArrayType'
      ? 'array'
      : refuse('a tuple');
  }
  if (type.type === 'TSTupleType') {
    return refuse('a tuple');
  }
  if (type.type === 'TSUnionType') {
    const kinds = new Set<StaticKind>();
    for (const member of type.types) {
      // oxlint-disable-next-line no-await-in-loop
      const kind = await kindOfType(loader, scope, member, where);
      if (kind !== null) {
        kinds.add(kind);
      }
    }
    if (kinds.size > 1) {
      refuse('a mixed union');
    }
    return kinds.values().next().value ?? null;
  }
  if (type.type === 'TSTypeReference') {
    // oxlint-disable-next-line no-use-before-define -- an alias's kind is its type's
    return await kindOfReference(loader, scope, type, where);
  }
  if (SIMPLE_KEYWORDS.has(type.type)) {
    return 'simple';
  }
  if (EMPTY_KEYWORDS.has(type.type)) {
    return null;
  }

  return refuse(describe(type));
}

/** The kind of a type reference: a known generic, or an alias followed. */
async function kindOfReference(
  loader: ModuleLoader,
  scope: DeclarationScope,
  type: TSTypeReference,
  where: string,
): Promise<StaticKind | null> {
  const refuse = (shape: string): never =>
    fail(
      CODE.STATIC_KIND,
      `${where} is declared as ${shape}, which doesn't merge`,
    );
  if (type.typeName.type !== 'Identifier') {
    return refuse('a qualified type');
  }
  const { name } = type.typeName;
  const args = type.typeArguments?.params ?? [];
  if (ARRAY_REFERENCES.has(name)) {
    return 'array';
  }
  if (OBJECT_REFERENCES.has(name)) {
    return 'object';
  }
  if (name === 'Readonly' && args.length === 1) {
    const inner = await kindOfType(loader, scope, args[0]!, where);
    return inner === 'array' || inner === 'object'
      ? inner
      : refuse('Readonly of a simple type');
  }
  const alias =
    args.length === 0 ? await resolveAlias(loader, scope, name) : null;
  if (!alias) {
    return refuse(`${name}, a class instance or an alias that can't be read`);
  }

  return await kindOfType(loader, alias.scope, alias.type, where);
}

/**
 * The kind of a static's literal value, for a static with no declared type,
 * such as layer (b)'s generated `observedAttributes`.
 *
 * @param where - What the diagnostic names, `Trait.key`.
 */
export function kindOfValue(value: Expression, where: string): StaticKind {
  const node = unwrapTS(value);
  if (
    value.type === 'TSAsExpression' &&
    value.typeAnnotation.type === 'TSTypeReference' &&
    value.typeAnnotation.typeName.type === 'Identifier' &&
    value.typeAnnotation.typeName.name === 'const' &&
    node.type === 'ArrayExpression'
  ) {
    return fail(
      CODE.STATIC_KIND,
      `${where} is an \`as const\` array, which is a tuple`,
    );
  }
  if (node.type === 'ArrayExpression') {
    return 'array';
  }
  if (node.type === 'ObjectExpression') {
    return 'object';
  }
  if (
    node.type === 'Literal' ||
    node.type === 'TemplateLiteral' ||
    (node.type === 'UnaryExpression' && node.argument.type === 'Literal')
  ) {
    return 'simple';
  }

  return fail(
    CODE.STATIC_KIND,
    `${where} has a value whose kind can't be read`,
  );
}
