/**
 * The rules that keep each trait's and the component's members meaning what
 * they meant once they are joined in one class body, and the conflict
 * warning.
 *
 * The flattened class holds every trait's members in list order, before the
 * component's own, and its `super` is the base. A key that two traits supply
 * takes the later trait's member, as object assignment does; the warning
 * names the pair unless the component declares the key itself.
 */
import type { Class, Program } from '@oxc-project/types';
import { CODE, fail, type FlattenerWarning } from '../diagnostics.ts';
import type { MemberIR, StaticKind, TraitIR } from '../ir.ts';
import { staticKeyName, unwrapTS, walk } from '../syntax.ts';
import { canCopy } from './copy.ts';
import type { ModuleCtx, TraitRef } from './trait-class.ts';

type Slot = 'accessor' | 'method' | 'value';

/** A key of one layer, instance or static. */
type LayerKey = Readonly<{ key: string; static: boolean }>;

function slotKey({ key, static: isStatic }: LayerKey): string {
  return `${isStatic ? 'static ' : ''}${key}`;
}

/** The keys each kind of member of `members` declares, by slot key. */
function layer(
  members: ReadonlyArray<Pick<MemberIR, 'key' | 'kind' | 'static'>>,
): Map<
  string,
  Readonly<{ get: boolean; set: boolean; method: boolean; key: string }>
> {
  const keys = new Map<
    string,
    { get: boolean; set: boolean; method: boolean; key: string }
  >();
  for (const member of members) {
    const slot = slotKey(member);
    const entry = keys.get(slot) ?? {
      get: false,
      set: false,
      method: false,
      key: member.key,
    };
    entry[member.kind === 'method' ? 'method' : member.kind] = true;
    keys.set(slot, entry);
  }

  return keys;
}

/** The members and static fields the component declares itself. */
export function componentLayer(consumer: Class): Readonly<{
  members: ReadonlyArray<Pick<MemberIR, 'key' | 'kind' | 'static'>>;
  /** Slot keys of every member and field. */
  declared: ReadonlySet<string>;
}> {
  const members: Array<Pick<MemberIR, 'key' | 'kind' | 'static'>> = [];
  const declared = new Set<string>();
  for (const element of consumer.body.body) {
    if (
      element.type !== 'MethodDefinition' &&
      element.type !== 'PropertyDefinition' &&
      element.type !== 'AccessorProperty'
    ) {
      continue;
    }
    const key =
      element.key.type === 'PrivateIdentifier'
        ? undefined
        : staticKeyName(element.key, element.computed);
    if (key === undefined) {
      continue;
    }
    declared.add(slotKey({ key, static: element.static }));
    if (element.type === 'MethodDefinition' && element.kind !== 'constructor') {
      members.push({ key, kind: element.kind, static: element.static });
    }
  }

  return { members, declared };
}

/** The warning for a key that two traits supply. */
function conflict(
  earlier: string,
  later: string,
  key: string,
  pos: number,
): FlattenerWarning {
  return {
    code: CODE.TRAIT_MEMBER_CONFLICT,
    message: `traits ${earlier} and ${later} both supply ${key}; ${later}'s wins`,
    pos,
  };
}

/**
 * Applies the layer rules to a composition and returns its conflict warnings.
 * A lone getter or setter over an earlier layer's pair is an error, because
 * it would join halves from two layers.
 */
export function checkLayers(
  consumer: Class,
  traits: readonly TraitIR[],
  pos: number,
): FlattenerWarning[] {
  const warnings: FlattenerWarning[] = [];
  const own = componentLayer(consumer);
  const supplied = new Map<string, Readonly<{ slot: Slot; trait: string }>>();

  const enter = (
    keys: ReturnType<typeof layer>,
    trait: string | null,
  ): void => {
    for (const [slot, entry] of keys) {
      const earlier = supplied.get(slot);
      const half = entry.get !== entry.set && !entry.method;
      if (half && earlier?.slot === 'accessor') {
        fail(
          trait === null ? CODE.CLASS_ACCESSOR_HALF : CODE.TRAIT_ACCESSOR_HALF,
          `${trait === null ? 'the component' : `trait ${trait}`} declares one half of ${entry.key}, which trait ${earlier.trait} supplies as an accessor`,
          pos,
        );
      }
      if (trait === null) {
        continue;
      }
      if (earlier && !own.declared.has(slot)) {
        warnings.push(conflict(earlier.trait, trait, entry.key, pos));
      }
      supplied.set(slot, { slot: entry.method ? 'method' : 'accessor', trait });
    }
  };

  const simple = new Map<string, string>();
  for (const trait of traits) {
    enter(layer(trait.members), trait.name);
    for (const value of trait.statics) {
      const slot = slotKey({ key: value.key, static: true });
      if (value.kind !== 'simple') {
        continue;
      }
      const earlier = simple.get(slot) ?? supplied.get(slot)?.trait;
      if (earlier !== undefined && !own.declared.has(slot)) {
        warnings.push(conflict(earlier, trait.name, value.key, pos));
      }
      simple.set(slot, trait.name);
    }
  }
  enter(layer(own.members), null);

  const traitKeys = new Set(
    traits.flatMap((trait) => [
      ...trait.members.map((member) => member.key),
      ...trait.statics.map((value) => value.key),
    ]),
  );
  walk(consumer.body, (node) => {
    if (node.type !== 'MemberExpression' || node.object.type !== 'Super') {
      return;
    }
    if (node.computed) {
      fail(
        CODE.CLASS_COMPUTED_SUPER,
        'the component uses a computed super member',
        node.start,
      );
    }
    const key = staticKeyName(node.property, false);
    if (key !== undefined && traitKeys.has(key)) {
      fail(
        CODE.CLASS_SUPER_TRAIT_MEMBER,
        `the component uses super.${key}, which a trait supplies`,
        node.start,
      );
    }
  });

  return warnings;
}

/** Each static key's kind, checked to agree across the traits. */
export function staticKinds(
  traits: readonly TraitIR[],
  pos: number,
): Map<string, StaticKind> {
  const kinds = new Map<
    string,
    Readonly<{ kind: StaticKind; trait: string }>
  >();
  for (const trait of traits) {
    for (const value of trait.statics) {
      const earlier = kinds.get(value.key);
      if (earlier && earlier.kind !== value.kind) {
        fail(
          CODE.STATIC_KIND_MISMATCH,
          `${value.key} is ${earlier.kind} in ${earlier.trait} and ${value.kind} in ${trait.name}`,
          pos,
        );
      }
      kinds.set(value.key, { kind: value.kind, trait: trait.name });
    }
  }

  return new Map([...kinds].map(([key, { kind }]) => [key, kind]));
}

/** Whether `consumer` is declared at module scope. */
function isModuleScoped(program: Program, consumer: Class): boolean {
  return program.body.some((node) => {
    const declaration =
      node.type === 'ExportNamedDeclaration' ||
      node.type === 'ExportDefaultDeclaration'
        ? node.declaration
        : node;
    if (declaration === consumer) {
      return true;
    }

    return (
      declaration?.type === 'VariableDeclaration' &&
      declaration.declarations.some(
        ({ init }) => init !== null && unwrapTS(init) === consumer,
      )
    );
  });
}

/**
 * Fails when a name a copied member reads would resolve to another binding in
 * the component: a global the component's module binds, a name kept in place
 * that the class's own name shadows, or any such name when the class isn't
 * module-scoped.
 */
export function checkMemberScope(
  ctx: ModuleCtx,
  consumer: Class,
  traits: readonly TraitIR[],
  pos: number,
): void {
  const globals = new Set<string>();
  const kept = new Set<string>();
  for (const member of traits.flatMap((trait) => trait.members)) {
    for (const name of member.globals) {
      globals.add(name);
      kept.add(name);
    }
    for (const { name, ref } of member.links) {
      if (ref.local) {
        kept.add(name);
      }
    }
  }
  if (kept.size === 0) {
    return;
  }
  if (!isModuleScoped(ctx.program, consumer)) {
    fail(
      CODE.TRAIT_BINDING_SHADOWED,
      'the component class is not module-scoped, so a scope around it may bind a name a trait member reads',
      pos,
    );
  }
  const className = consumer.id?.name;
  if (className !== undefined && kept.has(className)) {
    fail(
      CODE.TRAIT_BINDING_SHADOWED,
      `a trait member reads ${className}, which names the component`,
      pos,
    );
  }
  const shadowed = globals.values().find((name) => ctx.topLevel.has(name));
  if (shadowed !== undefined) {
    fail(
      CODE.TRAIT_BINDING_SHADOWED,
      `a trait member reads the global ${shadowed}, which the component's module binds`,
      pos,
    );
  }
}

/** Fails when a member's text can't be copied into the component's language. */
export function checkLanguages(
  refs: readonly TraitRef[],
  traits: readonly TraitIR[],
  consumerId: string,
  pos: number,
): void {
  traits.forEach((trait, index) => {
    const originId = refs[index]!.ctx.id;
    for (const member of trait.members) {
      if (!canCopy(member.source, originId, consumerId)) {
        fail(
          CODE.TRAIT_SOURCE_LANGUAGE,
          `${trait.name}.${member.key} doesn't parse to the same tree in ${originId.split('.').at(-1)} and ${consumerId.split('.').at(-1)}`,
          pos,
        );
      }
    }
  });
}
