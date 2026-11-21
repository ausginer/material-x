/**
 * Emits a flattened component. The composition's constant is removed, the
 * class extends the base, and at the start of its body, before its own
 * members, go:
 *
 * - each merged static: an array concatenates the base's value, each trait's
 *   and the component's own, in that order; an object spreads them; any other
 *   kind takes the last trait's value unless the component declares the key;
 * - each trait's members, in list order;
 * - `static { impl(this, …brands); }`, when the list has a trait. An empty
 *   list brands nothing, so it gets neither the block nor the import.
 *
 * `compose`'s import goes when nothing in the module references it after
 * lowering, so a module whose compositions are all lowered doesn't import
 * the module it came from unless it needs `impl`.
 *
 * A trait's value and brand are linked, never copied, so its module stays the
 * one source of each.
 */
import { createHash } from 'node:crypto';
import type { Class, Program } from '@oxc-project/types';
import type { RolldownMagicString } from 'rolldown';
import type { BindingRef, MemberIR, StaticKind, TraitIR } from '../ir.ts';
import {
  addImportRemovals,
  collectImports,
  forEachValueReference,
  staticKeyName,
  type ImportRemovals,
  type Span,
} from '../syntax.ts';
import { isCompositionModule } from './trait-module.ts';

/** The local name the flattened module binds `impl` to. */
const IMPL_LOCAL = '__mxflat_impl';

/** A composition, analyzed and ready to emit. */
export type AnalyzedComposition = Readonly<{
  traits: readonly TraitIR[];
  kinds: ReadonlyMap<string, StaticKind>;
  /** The source of the base expression, `compose`'s argument. */
  baseSource: string;
  /** The composition's statement, removed. */
  declarationSpan: Span;
  /** The class's superclass reference, which becomes the base. */
  superClassSpan: Span;
  consumer: Class;
}>;

/**
 * The name the flattened module refers to a link by: a binding in the
 * module's own scope keeps its name, and any other gets an import alias,
 * unique per specifier and export.
 */
function linkLocal(ref: BindingRef): string {
  if (ref.local) {
    return ref.exportName;
  }
  const hash = createHash('sha1')
    .update(ref.specifier)
    .update('\0')
    .update(ref.exportName)
    .digest('hex')
    .slice(0, 8);

  return `__mxflat_lnk_${hash}`;
}

/** A member's source, each linked name rewritten to its local name. */
function memberSource(member: MemberIR): string {
  const edits = member.links
    .filter(({ ref }) => !ref.local)
    .flatMap(({ name, ref, occurrences }) =>
      occurrences.map(({ start, end, shorthand }) => ({
        start,
        end,
        text: shorthand ? `${name}: ${linkLocal(ref)}` : linkLocal(ref),
      })),
    )
    .sort((a, b) => b.start - a.start);

  let { source } = member;
  for (const { start, end, text } of edits) {
    source = source.slice(0, start) + text + source.slice(end);
  }

  return `  ${source}`;
}

/** The component's own static fields with a value, by key. */
function ownStatics(
  consumer: Class,
): Map<string, Readonly<{ span: Span; value: Span }>> {
  const statics = new Map<string, Readonly<{ span: Span; value: Span }>>();
  for (const element of consumer.body.body) {
    if (
      (element.type === 'PropertyDefinition' ||
        element.type === 'MethodDefinition' ||
        element.type === 'AccessorProperty') &&
      element.static &&
      element.key.type !== 'PrivateIdentifier'
    ) {
      const key = staticKeyName(element.key, element.computed);
      if (key !== undefined) {
        const value =
          element.type === 'PropertyDefinition' ? element.value : null;
        statics.set(key, {
          span: [element.start, element.end],
          value: value ? [value.start, value.end] : [0, 0],
        });
      }
    }
  }

  return statics;
}

/** The merged static fields, and the component's own fields they fold in. */
function mergedStatics(
  code: string,
  analyzed: AnalyzedComposition,
): Readonly<{ fields: string[]; folded: Span[] }> {
  const own = ownStatics(analyzed.consumer);
  const fields: string[] = [];
  const folded: Span[] = [];

  for (const [key, kind] of analyzed.kinds) {
    const values = analyzed.traits.flatMap((trait) =>
      trait.statics
        .filter((value) => value.key === key)
        .map((value) => linkLocal(value.value)),
    );
    const mine = own.get(key);
    const property = /^[A-Za-z_$][\w$]*$/u.test(key)
      ? key
      : JSON.stringify(key);
    if (kind === 'simple') {
      if (!mine) {
        fields.push(`  static ${property} = ${values.at(-1)!};`);
      }
      continue;
    }
    const read = property === key ? `.${key}` : `[${property}]`;
    const parts = [
      `(${analyzed.baseSource}${read} ?? ${kind === 'array' ? '[]' : '{}'})`,
      ...values,
    ];
    if (mine && mine.value[1] > mine.value[0]) {
      parts.push(`(${code.slice(...mine.value)})`);
      folded.push(mine.span);
    }
    const spread = parts.map((part) => `...${part}`).join(', ');
    fields.push(
      `  static ${property} = ${kind === 'array' ? `[${spread}]` : `{ ${spread} }`};`,
    );
  }

  return { fields, folded };
}

/** Every link a composition reads: values, brands and members' bindings. */
function compositionLinks(traits: readonly TraitIR[]): readonly BindingRef[] {
  return traits.flatMap((trait) => [
    trait.brand,
    ...trait.statics.map((value) => value.value),
    ...trait.members.flatMap((member) => member.links.map(({ ref }) => ref)),
  ]);
}

/**
 * Adds `compose`'s import to `removals` when no reference to it is left
 * outside the removed compositions. A supertrait's composition stays, and
 * keeps it.
 */
function removeUnusedCompose(
  removals: ImportRemovals,
  program: Program,
  composeLocals: ReadonlySet<string>,
  compositions: readonly AnalyzedComposition[],
): void {
  let references = 0;
  forEachValueReference(program.body, ({ name, start }) => {
    if (
      composeLocals.has(name) &&
      !compositions.some(
        ({ declarationSpan: [from, to] }) => start >= from && start < to,
      )
    ) {
      references += 1;
    }
  });
  if (references > 0) {
    return;
  }
  for (const node of program.body) {
    if (node.type === 'ImportDeclaration') {
      addImportRemovals(removals, node, composeLocals);
    }
  }
}

/**
 * Rewrites a component module, flattening every analyzed composition, and
 * adds the imports their links need once at the top. `impl` is imported from
 * the specifier the module imports `compose` from.
 *
 * @param removals - Receives `compose`'s import when no reference to it is
 *   left. The caller removes it with `removeImports`.
 */
export function lowerCompositions(
  magic: RolldownMagicString,
  code: string,
  program: Program,
  compositions: readonly AnalyzedComposition[],
  removals: ImportRemovals,
): void {
  const composeLocals = new Set<string>();
  let implSpecifier = '';
  for (const [local, { imported, specifier }] of collectImports(program)) {
    if (imported === 'compose' && isCompositionModule(specifier)) {
      composeLocals.add(local);
      implSpecifier ||= specifier;
    }
  }
  removeUnusedCompose(removals, program, composeLocals, compositions);
  const links = new Map<string, BindingRef>();
  let branded = false;

  for (const analyzed of compositions) {
    const { fields, folded } = mergedStatics(code, analyzed);
    const members = analyzed.traits.flatMap((trait) =>
      trait.members.map(memberSource),
    );
    const brands = analyzed.traits.map((trait) => linkLocal(trait.brand));
    const install =
      brands.length > 0
        ? [`  static {\n    ${IMPL_LOCAL}(this, ${brands.join(', ')});\n  }`]
        : [];
    branded ||= brands.length > 0;

    magic.remove(...analyzed.declarationSpan);
    magic.overwrite(...analyzed.superClassSpan, analyzed.baseSource);
    for (const span of folded) {
      magic.remove(...span);
    }
    magic.appendRight(
      analyzed.consumer.body.start + 1,
      `\n${[...fields, ...members, ...install].join('\n')}\n`,
    );

    for (const ref of compositionLinks(analyzed.traits)) {
      if (!ref.local) {
        links.set(linkLocal(ref), ref);
      }
    }
  }

  const imports = [
    ...(branded
      ? [
          `import { impl as ${IMPL_LOCAL} } from ${JSON.stringify(implSpecifier)};`,
        ]
      : []),
    ...[...links].map(
      ([local, ref]) =>
        `import { ${ref.exportName} as ${local} } from ${JSON.stringify(ref.specifier)};`,
    ),
  ];
  if (imports.length > 0) {
    magic.prepend(`${imports.join('\n')}\n`);
  }
}
