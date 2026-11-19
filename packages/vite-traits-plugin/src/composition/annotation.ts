/**
 * Finds a module's compositions, `const X: Composed<B, [...]> = compose(B)`
 * extended by one class, and resolves each one's trait list from the
 * annotation: `typeof T`, a tuple alias, local or imported, a spread of one,
 * and a supertrait's own list, expanded before the supertrait.
 */
import type {
  CallExpression,
  Class,
  Statement,
  TSType,
  TSTypeReference,
  VariableDeclarator,
} from '@oxc-project/types';
import { CODE, fail } from '../diagnostics.ts';
import { unwrapTS, walk } from '../syntax.ts';
import {
  declarationsOf,
  resolveAlias,
  type DeclarationScope,
} from './declarations.ts';
import {
  consumerSpecifier,
  findTrait,
  loadCtx,
  type ModuleCtx,
  type Resolver,
  type TraitRef,
} from './trait-class.ts';
import { findTraitInstall, isCompositionModule } from './trait-module.ts';

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
    if (node.type === 'Identifier') {
      references.set(node.name, (references.get(node.name) ?? 0) + 1);
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
    if (!findTraitInstall(consumer, ctx.traitLocals)) {
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
      `${name} isn't a class whose static block calls trait(this)`,
      x.pos,
    );
  }

  const key = `${ctx.id}\0${className}`;
  if (x.path.has(key)) {
    fail(CODE.TRAIT_LIST, `${name} composes itself`, x.pos);
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
