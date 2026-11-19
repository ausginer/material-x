/**
 * Emits a flattened component. The composition's constant is removed, the
 * class extends the base, and at the start of its body, before its own
 * members, go:
 *
 * - each merged static: an array concatenates the base's value, each trait's
 *   and the component's own, in that order; an object spreads them; any other
 *   kind takes the last trait's value unless the component declares the key;
 * - each trait's members, in list order;
 * - `static { impl(this, …brands); }`.
 *
 * A trait's value and brand are linked, never copied, so its module stays the
 * one source of each.
 */
import { createHash } from 'node:crypto';
import type { Class } from '@oxc-project/types';
import type { RolldownMagicString } from 'rolldown';
import type { BindingRef, MemberIR, StaticKind, TraitIR } from '../ir.ts';
import { staticKeyName, type Span } from '../syntax.ts';

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
 * Rewrites a component module, flattening every analyzed composition, and
 * adds the imports their links need once at the top.
 *
 * @param implSpecifier - The specifier `impl` is imported from: the one the
 *   module imports `compose` from.
 */
export function lowerCompositions(
  magic: RolldownMagicString,
  code: string,
  compositions: readonly AnalyzedComposition[],
  implSpecifier: string,
): void {
  const links = new Map<string, BindingRef>();

  for (const analyzed of compositions) {
    const { fields, folded } = mergedStatics(code, analyzed);
    const members = analyzed.traits.flatMap((trait) =>
      trait.members.map(memberSource),
    );
    const brands = analyzed.traits
      .map((trait) => linkLocal(trait.brand))
      .join(', ');

    magic.remove(...analyzed.declarationSpan);
    magic.overwrite(...analyzed.superClassSpan, analyzed.baseSource);
    for (const span of folded) {
      magic.remove(...span);
    }
    magic.appendRight(
      analyzed.consumer.body.start + 1,
      `\n${[...fields, ...members, `  static {\n    ${IMPL_LOCAL}(this, ${brands});\n  }`].join('\n')}\n`,
    );

    for (const ref of compositionLinks(analyzed.traits)) {
      if (!ref.local) {
        links.set(linkLocal(ref), ref);
      }
    }
  }

  const imports = [
    `import { impl as ${IMPL_LOCAL} } from ${JSON.stringify(implSpecifier)};`,
    ...[...links].map(
      ([local, ref]) =>
        `import { ${ref.exportName} as ${local} } from ${JSON.stringify(ref.specifier)};`,
    ),
  ];
  magic.prepend(`${imports.join('\n')}\n`);
}
