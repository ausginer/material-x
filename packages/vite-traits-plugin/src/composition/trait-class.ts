/**
 * Normalizes a trait class into Trait IR: its brand, its methods and accessors
 * as copyable members, and its static value fields with their kinds. Every
 * name a member reads that crosses a module boundary becomes a link.
 */
import { dirname, join, relative } from 'node:path';
import type {
  ClassElement,
  Expression,
  MethodDefinition,
  Program,
} from '@oxc-project/types';
import { CODE, fail } from '../diagnostics.ts';
import { collectFreeReferences } from '../free-references.ts';
import type {
  BindingRef,
  MemberIR,
  MemberLinkIR,
  StaticIR,
  StaticKind,
  TraitIR,
} from '../ir.ts';
import {
  collectExportedNames,
  collectImports,
  collectTopBindings,
  collectTopClasses,
  collectTopLevelNames,
  parseModule,
  staticKeyName,
  syntheticExportName,
  unwrapTS,
  walk,
  type LocalImport,
  type ModuleLoader,
  type TopBinding,
  type TopClass,
} from '../syntax.ts';
import {
  declarationsOf,
  staticTypes,
  type DeclarationScope,
} from './declarations.ts';
import { kindOfType, kindOfValue } from './statics.ts';
import {
  brandConstants,
  brandName,
  findTraitInstall,
  staticValueName,
  traitLocalsOf,
  type TraitInstall,
} from './trait-module.ts';

/** A module as the analysis reads it, indexed once. */
export type ModuleCtx = Readonly<{
  id: string;
  code: string;
  program: Program;
  imports: ReadonlyMap<string, LocalImport>;
  bindings: ReadonlyMap<string, TopBinding>;
  classes: ReadonlyMap<string, TopClass>;
  exported: ReadonlyMap<string, readonly string[]>;
  topLevel: ReadonlySet<string>;
  traitLocals: ReadonlySet<string>;
  /** The exported `Symbol(<string>)` constants a built trait class can name. */
  brands: ReadonlySet<string>;
}>;

/** Indexes a parsed module. */
export function moduleCtx(
  id: string,
  code: string,
  program: Program,
): ModuleCtx {
  return {
    id,
    code,
    program,
    imports: collectImports(program),
    bindings: collectTopBindings(program),
    classes: collectTopClasses(program),
    exported: collectExportedNames(program),
    topLevel: collectTopLevelNames(program),
    traitLocals: traitLocalsOf(program),
    brands: brandConstants(program),
  };
}

/** State shared by the analysis of one consumer module. */
export type Resolver = Readonly<{
  consumerId: string;
  loader: ModuleLoader;
  ctxCache: Map<string, ModuleCtx>;
  /** Per origin module: its relative import specifiers, rebased onto a package. */
  rebaseCache: Map<string, ReadonlyMap<string, string | null>>;
  /** Modules the analysis read, for watch tracking. */
  dependencies: Set<string>;
}>;

/** Loads, parses and indexes a module, once per analysis. */
export async function loadCtx(r: Resolver, id: string): Promise<ModuleCtx> {
  const cached = r.ctxCache.get(id);
  if (cached) {
    return cached;
  }
  r.dependencies.add(id);
  const code = await r.loader.load(id);
  const ctx = moduleCtx(id, code, parseModule(id, code));
  r.ctxCache.set(id, ctx);

  return ctx;
}

/**
 * The specifier the consumer imports module `originId` through: empty for the
 * consumer itself, a package specifier as it is, and otherwise a path from
 * the consumer.
 */
export function consumerSpecifier(
  r: Resolver,
  originId: string,
  rawSpecifier: string,
): string {
  if (originId === r.consumerId) {
    return '';
  }
  if (rawSpecifier && !rawSpecifier.startsWith('.')) {
    return rawSpecifier;
  }
  const path = relative(dirname(r.consumerId), originId).replaceAll('\\', '/');

  return path.startsWith('.') ? path : `./${path}`;
}

/**
 * A relative import of an origin module, as a specifier the consumer can use:
 * its path from the consumer when both are in one package, and otherwise
 * `<name>/<path from the package root>`, through the nearest `package.json`.
 * `null` when no package is found.
 */
async function rebase(
  r: Resolver,
  originId: string,
  specifier: string,
): Promise<string | null> {
  const id = await r.loader.resolve(specifier, originId);
  if (!id) {
    return null;
  }
  for (let dir = dirname(id); ; dir = dirname(dir)) {
    let name: string | undefined;
    try {
      // The nearest manifest is found by walking up, one read at a time.
      // oxlint-disable-next-line no-await-in-loop
      const manifest = await r.loader.load(join(dir, 'package.json'));
      ({ name } = JSON.parse(manifest) as { name?: string });
    } catch {
      name = undefined;
    }
    if (name) {
      // A consumer in the same package reaches the module by its path.
      if (r.consumerId.startsWith(`${dir}/`)) {
        const path = relative(dirname(r.consumerId), id).replaceAll('\\', '/');
        return path.startsWith('.') ? path : `./${path}`;
      }
      const path = relative(dir, id).replaceAll('\\', '/');
      return path ? `${name}/${path}` : name;
    }
    if (dirname(dir) === dir) {
      return null;
    }
  }
}

/** Every relative import of module `ctx`, rebased onto a package. */
async function rebases(
  r: Resolver,
  ctx: ModuleCtx,
): Promise<ReadonlyMap<string, string | null>> {
  const cached = r.rebaseCache.get(ctx.id);
  if (cached) {
    return cached;
  }
  const specifiers = new Set(
    [...ctx.imports.values()]
      .map(({ specifier }) => specifier)
      .filter((specifier) => specifier.startsWith('.')),
  );
  const map = new Map(
    await Promise.all(
      [...specifiers].map(
        async (specifier) =>
          [specifier, await rebase(r, ctx.id, specifier)] as const,
      ),
    ),
  );
  r.rebaseCache.set(ctx.id, map);

  return map;
}

/** How a name of the trait's module is reached from the consumer. */
type Linker = (name: string) => BindingRef;

/**
 * A linker for module `ctx`, reached from the consumer through `specifier`:
 *
 * - a value the module imports through a package specifier is imported from
 *   it again, and one imported relatively through its rebased specifier;
 * - a binding the module exports is imported from it;
 * - a private binding is imported under the build-only name the trait
 *   module's transform exports it as;
 * - in the consumer itself, every binding is used by its name.
 */
function linker(
  ctx: ModuleCtx,
  specifier: string,
  rebased: ReadonlyMap<string, string | null>,
  traitName: string,
): Linker {
  return (name) => {
    if (specifier === '') {
      return { specifier: '', exportName: name, local: true };
    }
    const imported = ctx.imports.get(name);
    if (imported) {
      const target = imported.specifier.startsWith('.')
        ? rebased.get(imported.specifier)
        : imported.specifier;
      if (!target) {
        return fail(
          CODE.TRAIT_UNRESOLVED,
          `${traitName} reads ${name}, imported from ${imported.specifier}, which no package specifier reaches`,
        );
      }
      return { specifier: target, exportName: imported.imported };
    }
    const exported = ctx.exported.get(name);
    if (exported) {
      return {
        specifier,
        exportName: exported.includes(name) ? name : exported[0]!,
      };
    }
    if (!ctx.bindings.has(name)) {
      return fail(
        CODE.TRAIT_MEMBER,
        `${traitName} reads ${name}, which isn't an import or a module variable`,
      );
    }

    return {
      specifier,
      exportName: syntheticExportName(name),
      synthetic: name,
    };
  };
}

/** A trait class found in module `ctx`, and how the consumer reaches it. */
export type TraitRef = Readonly<{
  name: string;
  ctx: ModuleCtx;
  /** Specifier the consumer imports the module through; empty for itself. */
  specifier: string;
  install: TraitInstall;
  cls: TopClass;
}>;

/** Whether a member's body reads a private name, which can't be copied. */
function readsPrivateName(element: ClassElement): boolean {
  let reads = false;
  walk(element, (node) => {
    if (node.type === 'PrivateIdentifier') {
      reads = true;
    }
  });

  return reads;
}

/** One copyable member: a method or an accessor half, static or not. */
function normalizeMember(
  ref: TraitRef,
  element: MethodDefinition,
  link: Linker,
  local: boolean,
): MemberIR {
  const where = `${ref.name}.${staticKeyName(element.key, element.computed) ?? '[computed]'}`;
  const refuse = (detail: string): never =>
    fail(CODE.TRAIT_MEMBER, `${where}: ${detail}`, element.start);

  if (element.kind === 'constructor') {
    refuse('a trait has no constructor');
  }
  if (element.decorators.length > 0) {
    refuse('a member has a decorator');
  }
  const key =
    element.key.type === 'PrivateIdentifier'
      ? undefined
      : staticKeyName(element.key, element.computed);
  if (key === undefined) {
    return refuse('its key is private or computed');
  }
  if (readsPrivateName(element)) {
    refuse('it reads a private name');
  }

  const references = collectFreeReferences(element.value, refuse);
  const className = ref.cls.node.id?.name;
  const links = new Map<string, MemberLinkIR>();
  const globals = new Set<string>();
  for (const reference of references) {
    const { name } = reference;
    if (name === className) {
      refuse(`it reads ${name}, the trait class`);
    }
    if (!ref.ctx.topLevel.has(name)) {
      globals.add(name);
      continue;
    }
    if (reference.write && !local) {
      refuse(`it assigns ${name}, which an import can't assign`);
    }
    const linked = links.get(name) ?? {
      name,
      ref: link(name),
      occurrences: [],
    };
    links.set(name, {
      ...linked,
      occurrences: [
        ...linked.occurrences,
        {
          start: reference.start - element.start,
          end: reference.end - element.start,
          shorthand: reference.shorthand,
        },
      ],
    });
  }

  return {
    key,
    kind: element.kind as MemberIR['kind'],
    static: element.static,
    source: ref.ctx.code.slice(element.start, element.end),
    links: [...links.values()],
    globals: [...globals],
  };
}

/** The value a static field's kind is read from when nothing declares it. */
function literalValue(ctx: ModuleCtx, value: Expression): Expression {
  const node = unwrapTS(value);
  if (node.type === 'Identifier') {
    const init = ctx.bindings.get(node.name)?.declarator.init;
    if (init) {
      return init;
    }
  }

  return value;
}

/**
 * Normalizes trait `ref` into Trait IR.
 *
 * @param r - The analysis state.
 * @param ref - The trait class.
 */
export async function normalizeTraitClass(
  r: Resolver,
  ref: TraitRef,
): Promise<TraitIR> {
  const { ctx, cls, name } = ref;
  const local = ref.specifier === '';
  const link = linker(ctx, ref.specifier, await rebases(r, ctx), name);
  const members: MemberIR[] = [];
  const statics: StaticIR[] = [];
  let scope: DeclarationScope | null | undefined;

  for (const element of cls.node.body.body) {
    switch (element.type) {
      case 'StaticBlock':
        // Layer (b) leaves its block empty, and the trait's own build
        // removes it.
        if (element.body.length > 0) {
          fail(
            CODE.TRAIT_MEMBER,
            `${name}: a trait's static block holds only attributes(this, …)`,
            element.start,
          );
        }
        break;
      case 'MethodDefinition':
        // The generated brand install is neither copied nor merged.
        if (
          element !==
            (ref.install.kind === 'method' ? ref.install.method : null) &&
          element.value.type !== 'TSEmptyBodyFunctionExpression'
        ) {
          members.push(normalizeMember(ref, element, link, local));
        }
        break;
      case 'PropertyDefinition': {
        if (element.declare) {
          break;
        }
        if (!element.static) {
          if (
            element.key.type === 'PrivateIdentifier' &&
            element.value === null
          ) {
            break;
          }
          fail(
            CODE.TRAIT_FIELD,
            `${name}: an instance field can't be copied; declare it, or write an accessor`,
            element.start,
          );
        }
        if (element.value === null) {
          break;
        }
        const key = staticKeyName(element.key, element.computed);
        if (key === undefined || element.key.type === 'PrivateIdentifier') {
          fail(
            CODE.TRAIT_MEMBER,
            `${name}: a static field's key is private or computed`,
            element.start,
          );
        }
        // oxlint-disable-next-line no-await-in-loop
        scope ??= await declarationsOf(r.loader, ctx.id, ctx.code);
        const type = scope
          ? staticTypes(scope, cls.node.id?.name ?? name).get(key)
          : undefined;
        const where = `${name}.${key}`;
        let kind: StaticKind | null;
        if (scope && type) {
          // oxlint-disable-next-line no-await-in-loop
          kind = (await kindOfType(r.loader, scope, type, where)) ?? 'simple';
        } else {
          kind = kindOfValue(literalValue(ctx, element.value), where);
        }
        const hoisted = staticValueName(cls.node.id?.name ?? name, key);
        statics.push({
          key,
          kind,
          value: local
            ? { specifier: '', exportName: hoisted, local: true }
            : { specifier: ref.specifier, exportName: hoisted },
        });
        break;
      }
      case 'AccessorProperty':
        return fail(
          CODE.TRAIT_MEMBER,
          `${name}: an accessor field; attributes(this, …) declares it`,
          element.start,
        );
      case 'TSAbstractAccessorProperty':
      case 'TSAbstractMethodDefinition':
      case 'TSAbstractPropertyDefinition':
      case 'TSIndexSignature':
        break;
      default:
        break;
    }
  }

  let brand: BindingRef;
  if (ref.install.kind === 'method') {
    brand = link(ref.install.brand);
  } else {
    const exportName = brandName(cls.node.id?.name ?? name, ctx.topLevel);
    brand = local
      ? { specifier: '', exportName, local: true }
      : { specifier: ref.specifier, exportName };
  }

  return {
    name,
    brand,
    members,
    statics,
  };
}

/** Finds trait class `name` in module `ctx`. */
export function findTrait(
  ctx: ModuleCtx,
  name: string,
): Readonly<{ cls: TopClass; install: TraitInstall }> | null {
  const cls = ctx.classes.get(name);
  const install = cls
    ? findTraitInstall(cls.node, ctx.traitLocals, ctx.brands)
    : null;

  return cls && install ? { cls, install } : null;
}
