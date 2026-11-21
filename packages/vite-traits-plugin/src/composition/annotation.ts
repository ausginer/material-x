/**
 * Finds a module's compositions, `const X: Composed<B, [...]> = compose(B)`
 * extended by one class, and resolves each one's trait list from the
 * annotation: `typeof T`, a tuple alias, local or imported, a spread of one,
 * and a supertrait's own list, expanded before the supertrait. The expanded
 * list keeps each trait's first occurrence, the only order that keeps every
 * supertrait ahead of each trait that extends it.
 */
import type {
  CallExpression,
  Class,
  Expression,
  Statement,
  TSType,
  TSTypeReference,
  VariableDeclarator,
} from '@oxc-project/types';
import { CODE, fail } from '../diagnostics.ts';
import type { StaticKind } from '../ir.ts';
import {
  forEachValueReference,
  unwrapTS,
  walk,
  type TopClass,
} from '../syntax.ts';
import {
  declarationsOf,
  resolveAlias,
  staticTypes,
  type DeclarationScope,
} from './declarations.ts';
import { kindOfType, kindOfValue } from './statics.ts';
import {
  consumerSpecifier,
  findTrait,
  loadCtx,
  type ModuleCtx,
  type Resolver,
  type TraitRef,
} from './trait-class.ts';
import {
  brandName,
  findTraitInstall,
  isCompositionModule,
} from './trait-module.ts';

/** A composition and the class that extends it. */
export type Site = Readonly<{
  name: string;
  statement: Statement;
  declarator: VariableDeclarator;
  call: CallExpression;
  /** The annotation's type arguments: the base and the trait list. */
  list: TSType;
  consumer: Class;
}>;

/** The locals bound to `name` imported from core's layer (a). */
function localsOf(ctx: ModuleCtx, name: string): Set<string> {
  return new Set(
    [...ctx.imports]
      .filter(
        ([, imported]) =>
          imported.imported === name && isCompositionModule(imported.specifier),
      )
      .map(([local]) => local),
  );
}

/** The `Composed` and `compose` locals a module imports from core. */
export function compositionLocals(ctx: ModuleCtx): Readonly<{
  compose: ReadonlySet<string>;
  composed: ReadonlySet<string>;
}> {
  return {
    compose: localsOf(ctx, 'compose'),
    composed: localsOf(ctx, 'Composed'),
  };
}

/** The `Composed<B, L>` annotation of a declarator, if it has one. */
function composedAnnotation(
  declarator: VariableDeclarator,
  composed: ReadonlySet<string>,
): TSTypeReference | null {
  const type = declarator.id.typeAnnotation?.typeAnnotation;

  return type?.type === 'TSTypeReference' &&
    type.typeName.type === 'Identifier' &&
    composed.has(type.typeName.name)
    ? type
    : null;
}

/**
 * The module's compositions that a component extends. A composition that a
 * trait class extends, a supertrait's, stays at runtime, where it returns the
 * bound. Any other call of `compose` is a `composition-shape` error.
 */
export function findSites(ctx: ModuleCtx): readonly Site[] {
  const locals = compositionLocals(ctx);
  if (locals.compose.size === 0) {
    return [];
  }

  const shaped = new Map<CallExpression, Omit<Site, 'consumer'>>();
  for (const [name, binding] of ctx.bindings) {
    const init = binding.declarator.init
      ? unwrapTS(binding.declarator.init)
      : null;
    const annotation = composedAnnotation(binding.declarator, locals.composed);
    const list = annotation?.typeArguments?.params[1];
    if (
      init?.type === 'CallExpression' &&
      init.callee.type === 'Identifier' &&
      locals.compose.has(init.callee.name) &&
      annotation &&
      list &&
      init.arguments.length === 1 &&
      init.arguments[0]!.type !== 'SpreadElement' &&
      !binding.exported
    ) {
      shaped.set(init, {
        name,
        statement: binding.statement,
        declarator: binding.declarator,
        call: init,
        list,
      });
    }
  }

  const references = new Map<string, number>();
  const consumers = new Map<string, Class[]>();
  walk(ctx.program, (node) => {
    if (
      node.type === 'CallExpression' &&
      node.callee.type === 'Identifier' &&
      locals.compose.has(node.callee.name) &&
      !shaped.has(node)
    ) {
      fail(
        CODE.COMPOSITION_SHAPE,
        'compose() initializes a module-scope const X: Composed<B, [...]>, and nothing else',
        node.start,
      );
    }
    if (
      (node.type === 'ClassDeclaration' || node.type === 'ClassExpression') &&
      node.superClass?.type === 'Identifier'
    ) {
      consumers.set(node.superClass.name, [
        ...(consumers.get(node.superClass.name) ?? []),
        node,
      ]);
    }
  });

  forEachValueReference(ctx.program, ({ name }) => {
    references.set(name, (references.get(name) ?? 0) + 1);
  });

  const sites: Site[] = [];
  for (const site of shaped.values()) {
    const classes = consumers.get(site.name) ?? [];
    if (classes.length !== 1 || references.get(site.name) !== 2) {
      fail(
        CODE.COMPOSITION_SHAPE,
        `${site.name} is used as the superclass of one class, and nowhere else`,
        site.declarator.start,
      );
    }
    const consumer = classes[0]!;
    if (!findTraitInstall(consumer, ctx.traitLocals, ctx.brands)) {
      sites.push({ ...site, consumer });
    }
  }

  return sites;
}

/** State of one list's expansion. */
type Expansion = Readonly<{
  r: Resolver;
  out: TraitRef[];
  /** Aliases and supertraits being expanded, for cycles. */
  path: Set<string>;
  pos: number;
}>;

/** Expands a list type into trait references, in order. */
async function expandList(
  x: Expansion,
  scope: DeclarationScope,
  type: TSType,
): Promise<void> {
  const refuse = (detail: string): never =>
    fail(CODE.TRAIT_LIST, detail, x.pos);

  if (type.type === 'TSTypeOperator') {
    if (type.operator !== 'readonly') {
      refuse(`a ${type.operator} type isn't a trait list`);
    }
    await expandList(x, scope, type.typeAnnotation);
    return;
  }
  if (type.type === 'TSTupleType') {
    for (const element of type.elementTypes) {
      if (element.type === 'TSTypeQuery') {
        if (element.exprName.type !== 'Identifier') {
          refuse('a trait is named by typeof and an identifier');
          return;
        }
        // oxlint-disable-next-line no-await-in-loop, no-use-before-define -- a list and a supertrait's list expand each other
        await addTrait(x, scope, element.exprName.name);
      } else if (element.type === 'TSRestType') {
        // oxlint-disable-next-line no-await-in-loop
        await expandList(x, scope, element.typeAnnotation);
      } else {
        refuse('a list element is typeof T or a spread of a list');
      }
    }
    return;
  }
  if (type.type !== 'TSTypeReference') {
    refuse(
      'the trait list is a tuple of typeof T and spreads of tuple aliases',
    );
    return;
  }
  if (type.typeName.type !== 'Identifier' || type.typeArguments) {
    refuse('a trait list alias is a plain name');
    return;
  }
  const key = `${scope.moduleId}\0type ${type.typeName.name}`;
  if (x.path.has(key)) {
    refuse(`${type.typeName.name} refers to itself`);
  }
  const alias = await resolveAlias(x.r.loader, scope, type.typeName.name);
  if (!alias) {
    refuse(`${type.typeName.name} isn't a tuple alias that can be read`);
    return;
  }
  x.path.add(key);
  await expandList(x, alias.scope, alias.type);
  x.path.delete(key);
}

/** Resolves `typeof name` in `scope` to a trait class and appends it. */
async function addTrait(
  x: Expansion,
  scope: DeclarationScope,
  name: string,
): Promise<void> {
  let ctx = await loadCtx(x.r, scope.moduleId);
  let className = name;
  let rawSpecifier = '';
  if (!ctx.classes.has(name)) {
    const imported = scope.imports.get(name);
    const id = imported
      ? await x.r.loader.resolve(imported.specifier, scope.moduleId)
      : null;
    if (!imported || !id) {
      fail(CODE.TRAIT_UNRESOLVED, `trait ${name} can't be resolved`, x.pos);
    }
    ctx = await loadCtx(x.r, id);
    className =
      imported.imported === 'default'
        ? ([...ctx.exported].find(([, names]) =>
            names.includes('default'),
          )?.[0] ?? name)
        : imported.imported;
    rawSpecifier = imported.specifier;
  }
  const found = findTrait(ctx, className);
  if (!found) {
    fail(
      CODE.TRAIT_UNRESOLVED,
      `${name} isn't a class decorated @trait`,
      x.pos,
    );
  }

  const key = `${ctx.id}\0${className}`;
  if (x.path.has(key)) {
    fail(CODE.TRAIT_LIST, `${name} composes itself`, x.pos);
  }
  if (x.out.some((ref) => ref.ctx.id === ctx.id && ref.name === className)) {
    return;
  }
  const { superClass } = found.cls.node;
  if (superClass?.type === 'Identifier') {
    const binding = ctx.bindings.get(superClass.name);
    const annotation = binding?.declarator.id.typeAnnotation?.typeAnnotation;
    const init = binding?.declarator.init
      ? unwrapTS(binding.declarator.init)
      : null;
    if (
      annotation?.type === 'TSTypeReference' &&
      init?.type === 'CallExpression' &&
      annotation.typeArguments?.params[1]
    ) {
      const scopeOfTrait = await declarationsOf(x.r.loader, ctx.id, ctx.code);
      if (scopeOfTrait) {
        x.path.add(key);
        await expandList(x, scopeOfTrait, annotation.typeArguments.params[1]);
        x.path.delete(key);
      }
    }
  }

  x.out.push({
    name: className,
    ctx,
    specifier: consumerSpecifier(x.r, ctx.id, rawSpecifier),
    install: found.install,
    cls: found.cls,
  });
}

/** The traits of a site, in order, supertraits expanded. */
export async function resolveTraits(
  r: Resolver,
  ctx: ModuleCtx,
  site: Site,
): Promise<readonly TraitRef[]> {
  const scope = await declarationsOf(r.loader, ctx.id, ctx.code);
  const x: Expansion = {
    r,
    out: [],
    path: new Set(),
    pos: site.declarator.start,
  };
  await expandList(x, scope!, site.list);

  return x.out;
}

/** The class `name` names in module `ctx`, followed through one import. */
async function heritageClass(
  r: Resolver,
  ctx: ModuleCtx,
  name: string,
): Promise<
  Readonly<{ ctx: ModuleCtx; name: string; cls: TopClass }> | 'global' | null
> {
  const local = ctx.classes.get(name);
  if (local) {
    return { ctx, name, cls: local };
  }
  const imported = ctx.imports.get(name);
  if (!imported) {
    // A name the module binds otherwise isn't a class the walk can read; a
    // name it binds nowhere is a global, such as `HTMLElement`.
    return ctx.topLevel.has(name) ? null : 'global';
  }
  const id = await r.loader.resolve(imported.specifier, ctx.id);
  if (!id) {
    return null;
  }
  const origin = await loadCtx(r, id);
  const className =
    imported.imported === 'default'
      ? [...origin.exported].find(([, names]) => names.includes('default'))?.[0]
      : imported.imported;
  const cls =
    className === undefined ? undefined : origin.classes.get(className);

  return cls && className !== undefined
    ? { ctx: origin, name: className, cls }
    : null;
}

/**
 * The kind that the base declares for static `key`: that of the nearest
 * `static key` declaration in its class chain, from `compose`'s argument
 * through each `extends`. A chain that ends at a global, or at a class with no
 * superclass, declares nothing, and `null` is returned: an absent value is
 * empty. A heritage the walk can't read is a `static-kind` error.
 */
export async function baseStaticKind(
  r: Resolver,
  ctx: ModuleCtx,
  site: Site,
  key: string,
): Promise<StaticKind | null> {
  const base = site.call.arguments[0]!;
  const where = `${ctx.code.slice(base.start, base.end)}.${key}`;
  const refuse = (): never =>
    fail(
      CODE.STATIC_KIND,
      `${where}: the base's class chain can't be read to find its kind`,
      site.declarator.start,
    );
  let module = ctx;
  let heritage = unwrapTS(base as Expression);
  for (;;) {
    if (heritage.type !== 'Identifier') {
      return refuse();
    }
    // oxlint-disable-next-line no-await-in-loop
    const found = await heritageClass(r, module, heritage.name);
    if (found === 'global') {
      return null;
    }
    if (!found) {
      return refuse();
    }
    // oxlint-disable-next-line no-await-in-loop
    const scope = await declarationsOf(r.loader, found.ctx.id, found.ctx.code);
    const types = scope ? staticTypes(scope, found.name) : null;
    const runtime = found.cls.node.body.body.find(
      (element) =>
        element.type === 'PropertyDefinition' &&
        element.static &&
        !element.computed &&
        element.key.type === 'Identifier' &&
        element.key.name === key,
    );
    const type = types?.get(key);
    if (scope && type) {
      // oxlint-disable-next-line no-await-in-loop
      return (await kindOfType(r.loader, scope, type, where)) ?? null;
    }
    if (
      runtime?.type === 'PropertyDefinition' &&
      runtime.value &&
      (types === null || types.has(key))
    ) {
      return kindOfValue(runtime.value, where);
    }
    if (types?.has(key)) {
      return null;
    }
    if (!found.cls.node.superClass) {
      return null;
    }
    module = found.ctx;
    heritage = unwrapTS(found.cls.node.superClass);
  }
}

/**
 * How a trait is named across modules: its module and each name its brand is
 * exported as. A built base names a trait by the brand it passes to `impl`.
 */
function brandIdentities(ctx: ModuleCtx, brand: string): string[] {
  return (ctx.exported.get(brand) ?? [brand]).map(
    (exported) => `${ctx.id}\0${exported}`,
  );
}

/** The identities of trait `ref`'s brand, as {@link brandIdentities}. */
export function traitIdentities(ref: TraitRef): string[] {
  const brand =
    ref.install.kind === 'method'
      ? ref.install.brand
      : brandName(ref.cls.node.id?.name ?? ref.name, ref.ctx.topLevel);

  return brandIdentities(ref.ctx, brand);
}

/** The brands a flattened class passes to `impl` in its static block. */
async function implBrands(
  r: Resolver,
  ctx: ModuleCtx,
  cls: Class,
): Promise<string[]> {
  const identities: string[] = [];
  for (const element of cls.body.body) {
    if (element.type !== 'StaticBlock') {
      continue;
    }
    for (const statement of element.body) {
      const call =
        statement.type === 'ExpressionStatement' ? statement.expression : null;
      const callee =
        call?.type === 'CallExpression' && call.callee.type === 'Identifier'
          ? ctx.imports.get(call.callee.name)
          : undefined;
      if (
        callee?.imported !== 'impl' ||
        !isCompositionModule(callee.specifier)
      ) {
        continue;
      }
      for (const argument of (call as CallExpression).arguments.slice(1)) {
        if (argument.type !== 'Identifier') {
          continue;
        }
        const imported = ctx.imports.get(argument.name);
        if (!imported) {
          identities.push(...brandIdentities(ctx, argument.name));
          continue;
        }
        // oxlint-disable-next-line no-await-in-loop
        const id = await r.loader.resolve(imported.specifier, ctx.id);
        if (id) {
          identities.push(`${id}\0${imported.imported}`);
        }
      }
    }
  }

  return identities;
}

/**
 * The traits that the base's class chain already composes, by identity: the
 * list of each composition in a source chain, and the brands that each built
 * flattened class passes to `impl`. The walk starts at `compose`'s argument
 * and follows each `extends` to a global or a class with no superclass. A
 * heritage it can't read is a `trait-list` error, because the caller asks only
 * when the list has a trait that a second copy would break.
 */
export async function chainTraits(
  r: Resolver,
  ctx: ModuleCtx,
  site: Site,
): Promise<ReadonlySet<string>> {
  const identities = new Set<string>();
  const refuse = (): never =>
    fail(
      CODE.TRAIT_LIST,
      "the base's class chain can't be read to find the traits it composes",
      site.declarator.start,
    );
  let module = ctx;
  let heritage = unwrapTS(site.call.arguments[0] as Expression);
  for (;;) {
    if (heritage.type !== 'Identifier') {
      return refuse();
    }
    const binding = module.bindings.get(heritage.name);
    const annotation = binding?.declarator.id.typeAnnotation?.typeAnnotation;
    const init = binding?.declarator.init
      ? unwrapTS(binding.declarator.init)
      : null;
    if (
      annotation?.type === 'TSTypeReference' &&
      annotation.typeArguments?.params[1] &&
      init?.type === 'CallExpression' &&
      init.arguments.length === 1 &&
      compositionLocals(module).compose.has(
        init.callee.type === 'Identifier' ? init.callee.name : '',
      )
    ) {
      // A composition in the chain's source: its list, then its base.
      // oxlint-disable-next-line no-await-in-loop
      const scope = await declarationsOf(r.loader, module.id, module.code);
      if (!scope) {
        return refuse();
      }
      const x: Expansion = {
        r,
        out: [],
        path: new Set(),
        pos: site.declarator.start,
      };
      // oxlint-disable-next-line no-await-in-loop
      await expandList(x, scope, annotation.typeArguments.params[1]);
      for (const identity of x.out.flatMap(traitIdentities)) {
        identities.add(identity);
      }
      heritage = unwrapTS(init.arguments[0] as Expression);
      continue;
    }
    // oxlint-disable-next-line no-await-in-loop
    const found = await heritageClass(r, module, heritage.name);
    if (found === 'global') {
      return identities;
    }
    if (!found) {
      return refuse();
    }
    // oxlint-disable-next-line no-await-in-loop
    for (const identity of await implBrands(r, found.ctx, found.cls.node)) {
      identities.add(identity);
    }
    if (!found.cls.node.superClass) {
      return identities;
    }
    module = found.ctx;
    heritage = unwrapTS(found.cls.node.superClass);
  }
}
