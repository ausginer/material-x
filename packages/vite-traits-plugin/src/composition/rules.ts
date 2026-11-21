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
import type {
  Class,
  MethodDefinition,
  Node,
  Program,
  Statement,
} from '@oxc-project/types';
import { CODE, fail, type FlattenerWarning } from '../diagnostics.ts';
import { addPatternNames } from '../free-references.ts';
import type {
  ConstructorIR,
  CopiedSourceIR,
  MemberIR,
  StaticKind,
  TraitIR,
} from '../ir.ts';
import { staticKeyName, unwrapTS, walk } from '../syntax.ts';
import { canCopy } from './copy.ts';
import { linkLocal, type ConstructorSite } from './lower.ts';
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

/** A trait's members with a public key: a renamed private name never conflicts. */
function publicMembers(trait: TraitIR): readonly MemberIR[] {
  return trait.members.filter((member) => !member.private);
}

/** Every piece of source a trait's copy carries. */
function copiedSources(trait: TraitIR): readonly CopiedSourceIR[] {
  return [
    ...trait.members,
    ...trait.fields,
    ...(trait.constructorBody ? [trait.constructorBody] : []),
  ];
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
    enter(layer(publicMembers(trait)), trait.name);
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
      ...publicMembers(trait).map((member) => member.key),
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

/**
 * Each static key's kind, checked to agree across the base and the traits. The
 * base's declared kind, when it declares the key, is the first contributor.
 *
 * @param base - The base's name, and its declared kind of each key the traits
 *   contribute, `null` where it declares none.
 */
export function staticKinds(
  traits: readonly TraitIR[],
  base: Readonly<{
    name: string;
    kinds: ReadonlyMap<string, StaticKind | null>;
  }>,
  pos: number,
): Map<string, StaticKind> {
  const kinds = new Map<
    string,
    Readonly<{ kind: StaticKind; trait: string }>
  >();
  for (const [key, kind] of base.kinds) {
    if (kind !== null) {
      kinds.set(key, { kind, trait: `the base ${base.name}` });
    }
  }
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

  return new Map(
    [...kinds]
      .filter(([key]) =>
        traits.some((trait) =>
          trait.statics.some((value) => value.key === key),
        ),
      )
      .map(([key, { kind }]) => [key, kind]),
  );
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
  for (const member of traits.flatMap(copiedSources)) {
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
    const copied = [
      ...trait.members.map(
        (member) =>
          [`${member.private ? '#' : ''}${member.key}`, member.source] as const,
      ),
      ...trait.fields.map((field) => [`#${field.name}`, field.source] as const),
      ...(trait.constructorBody
        ? [
            [
              'constructor',
              `constructor() ${withoutSuperCall(trait.constructorBody)}`,
            ] as const,
          ]
        : []),
    ];
    for (const [key, source] of copied) {
      if (!canCopy(source, originId, consumerId)) {
        fail(
          CODE.TRAIT_SOURCE_LANGUAGE,
          `${trait.name}.${key} doesn't parse to the same tree in ${originId.split('.').at(-1)} and ${consumerId.split('.').at(-1)}`,
          pos,
        );
      }
    }
  });
}

/** A constructor's body without its `super();`, as the component runs it. */
function withoutSuperCall(body: ConstructorIR): string {
  const [start, end] = body.superCall;

  return body.source.slice(0, start) + body.source.slice(end);
}

/**
 * Whether a second copy of `trait` in one instance would break it: it has a
 * constructor, whose body would run twice, or private instance members, which
 * a second set would duplicate.
 */
export function copiesInstanceState(trait: TraitIR): boolean {
  return (
    trait.constructorBody !== null ||
    trait.fields.length > 0 ||
    trait.members.some((member) => member.private)
  );
}

/**
 * Fails when a trait's renamed private name equals another private name the
 * component's class body declares: the component's own, or another trait's.
 */
export function checkPrivateNames(
  consumer: Class,
  traits: readonly TraitIR[],
  pos: number,
): void {
  const declared = new Map<string, string>();
  for (const element of consumer.body.body) {
    if ('key' in element && element.key.type === 'PrivateIdentifier') {
      declared.set(element.key.name, 'the component');
    }
  }
  for (const trait of traits) {
    const names = new Set([
      ...trait.fields.map((field) => field.name),
      ...trait.members
        .filter((member) => member.private)
        .map((member) => member.key),
    ]);
    for (const name of names) {
      const renamed = `${name}${trait.privateSuffix}`;
      const other = declared.get(renamed);
      if (other !== undefined) {
        fail(
          CODE.TRAIT_BINDING_SHADOWED,
          `${trait.name}'s #${name} is renamed #${renamed}, which ${other} already declares`,
          pos,
        );
      }
      declared.set(renamed, `trait ${trait.name}`);
    }
  }
}

/** Whether any trait of the list has a constructor. */
function hasTraitConstructor(traits: readonly TraitIR[]): boolean {
  return traits.some((trait) => trait.constructorBody !== null);
}

/**
 * Fails when an instance field initializer of the component references `this`
 * or `super` while the list has a trait with a constructor: the initializer
 * runs before every trait's constructor body, so what it reads isn't set up
 * yet. An arrow function and a nested function count, because a callee can
 * call one at once.
 */
export function checkComponentFields(
  consumer: Class,
  traits: readonly TraitIR[],
): void {
  if (!hasTraitConstructor(traits)) {
    return;
  }
  for (const element of consumer.body.body) {
    if (
      (element.type !== 'PropertyDefinition' &&
        element.type !== 'AccessorProperty') ||
      element.static ||
      !element.value
    ) {
      continue;
    }
    walk(element.value, (node) => {
      if (node.type === 'ThisExpression' || node.type === 'Super') {
        fail(
          CODE.COMPONENT_FIELD,
          `the component's field initializer reads ${node.type === 'Super' ? 'super' : 'this'}, before the traits' constructors run; initialize the field in the constructor, after super(…)`,
          node.start,
        );
      }
    });
  }
}

/** Whether `statement` is `super(…);`. */
function isSuperStatement(statement: Statement): boolean {
  return (
    statement.type === 'ExpressionStatement' &&
    statement.expression.type === 'CallExpression' &&
    statement.expression.callee.type === 'Super'
  );
}

/** Adds each name a `var` declares inside `root`, outside nested functions. */
function addVarNames(root: Node, into: Set<string>): void {
  const refuse = (): never => {
    throw new Error('unreachable');
  };
  const visit = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (!node || typeof node !== 'object') {
      return;
    }
    const { type } = node as { type?: unknown };
    if (
      type === 'FunctionDeclaration' ||
      type === 'FunctionExpression' ||
      type === 'ArrowFunctionExpression'
    ) {
      return;
    }
    if (
      type === 'VariableDeclaration' &&
      (node as { kind: string }).kind === 'var'
    ) {
      for (const declarator of (node as { declarations: Array<{ id: Node }> })
        .declarations) {
        addPatternNames(declarator.id, into, refuse);
      }
    }
    for (const [key, value] of Object.entries(node)) {
      if (key !== 'type' && key !== 'start' && key !== 'end') {
        visit(value);
      }
    }
  };
  visit(root);
}

/** The names the component's constructor binds that a block inside it sees. */
function constructorBindings(constructor: MethodDefinition): Set<string> {
  const names = new Set<string>();
  const refuse = (): never => {
    throw new Error('unreachable');
  };
  for (const param of constructor.value.params) {
    addPatternNames(
      param.type === 'TSParameterProperty' ? param.parameter : param,
      names,
      refuse,
    );
  }
  for (const statement of constructor.value.body?.body ?? []) {
    if (statement.type === 'VariableDeclaration') {
      for (const declarator of statement.declarations) {
        addPatternNames(declarator.id, names, refuse);
      }
    } else if (
      (statement.type === 'FunctionDeclaration' ||
        statement.type === 'ClassDeclaration') &&
      statement.id
    ) {
      names.add(statement.id.name);
    }
  }
  addVarNames(constructor.value.body as Node, names);

  return names;
}

/**
 * Where the traits' constructor bodies go, when the list has a trait with a
 * constructor: right after the component's `super(…)` statement, or in a
 * generated constructor when the component has none. The component's
 * constructor has exactly one `super(…)` call, counting nested functions, as
 * the whole expression of a statement at its top level; otherwise no single
 * point follows every path, and it is a `component-constructor` error. A name
 * a body reads, with its link's generated alias, may not be one the
 * component's constructor binds: `trait-binding-shadowed`.
 */
export function constructorSite(
  consumer: Class,
  traits: readonly TraitIR[],
  pos: number,
): ConstructorSite | null {
  if (!hasTraitConstructor(traits)) {
    return null;
  }
  const constructor = consumer.body.body.find(
    (element): element is MethodDefinition =>
      element.type === 'MethodDefinition' &&
      element.kind === 'constructor' &&
      element.value.body !== null,
  );
  let site: ConstructorSite;
  let bound: Set<string>;
  if (constructor) {
    const calls: number[] = [];
    walk(constructor.value.body as Node, (node) => {
      if (node.type === 'CallExpression' && node.callee.type === 'Super') {
        calls.push(node.start);
      }
    });
    calls.sort((a, b) => a - b);
    if (calls.length === 0) {
      fail(
        CODE.COMPONENT_CONSTRUCTOR,
        "the component's constructor calls super(…) once, so the traits' constructors run after it",
        constructor.start,
      );
    }
    if (calls.length > 1) {
      fail(
        CODE.COMPONENT_CONSTRUCTOR,
        "the component's constructor calls super(…) more than once; compute the arguments first and call super(…) once",
        calls[1],
      );
    }
    const statement = constructor.value.body!.body.find(isSuperStatement);
    if (!statement) {
      fail(
        CODE.COMPONENT_CONSTRUCTOR,
        "super(…) is the whole expression of a statement at the top level of the component's constructor, so the traits' constructors run after it",
        calls[0],
      );
    }
    site = { at: statement.end };
    bound = constructorBindings(constructor);
  } else {
    site = { at: null };
    bound = new Set(['args']);
  }

  for (const trait of traits) {
    const body = trait.constructorBody;
    if (!body) {
      continue;
    }
    const reads = [
      ...body.globals,
      ...body.links.map(({ name, ref }) => (ref.local ? name : linkLocal(ref))),
    ];
    const shadowed = reads.find((name) => bound.has(name));
    if (shadowed !== undefined) {
      fail(
        CODE.TRAIT_BINDING_SHADOWED,
        `${trait.name}'s constructor reads ${shadowed}, which the component's constructor binds`,
        pos,
      );
    }
  }

  return site;
}
