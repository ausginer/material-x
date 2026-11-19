import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {
  RolldownMagicString,
  type Plugin as RolldownPlugin,
  type PluginContext,
} from 'rolldown';
import type { Plugin } from 'vite';
import { importsAttributes, lowerAttributes } from './attributes/lower.ts';
import {
  findSites,
  resolveTraits,
  type Site,
} from './composition/annotation.ts';
import {
  lowerCompositions,
  type AnalyzedComposition,
} from './composition/lower.ts';
import {
  checkLanguages,
  checkLayers,
  checkMemberScope,
  staticKinds,
} from './composition/rules.ts';
import {
  moduleCtx,
  normalizeTraitClass,
  type ModuleCtx,
  type Resolver,
} from './composition/trait-class.ts';
import {
  isCompositionModule,
  transformTraitModule,
} from './composition/trait-module.ts';
import {
  diagnosticText,
  FlattenerError,
  type FlattenerWarning,
} from './diagnostics.ts';
import type { TraitIR } from './ir.ts';
import { invalidateModule, parseModule, type ModuleLoader } from './syntax.ts';

/** Only JavaScript and TypeScript modules are candidates. */
const CANDIDATE = /\.[cm]?[jt]sx?$/u;

/**
 * How the host builds. Only an application build deletes a trait's instance
 * members, because nothing copies from its output; a library's output is what
 * another package copies from, and the dev server serves source.
 */
export type BuildKind = 'library' | 'application' | 'serve';

type Emitted = Readonly<{ code: RolldownMagicString | string; map?: string }>;

/**
 * A transform's result. The dev server's plugin container passes `code` on to
 * native transforms that read only a string, so it gets a string and a source
 * map; a build keeps rolldown's native magic string.
 */
function emit(
  magic: RolldownMagicString,
  id: string,
  kind: BuildKind,
): Emitted {
  return kind === 'serve'
    ? {
        code: magic.toString(),
        map: magic
          .generateMap({ source: id, includeContent: true, hires: true })
          .toString(),
      }
    : { code: magic };
}

function isCandidate(id: string): boolean {
  return CANDIDATE.test(id) && !id.includes('/node_modules/.vite/');
}

/** A module's text as the flattener reads it: with layer (b) lowered. */
function lowered(id: string, code: string): string {
  if (!code.includes('attributes(')) {
    return code;
  }
  const program = parseModule(id, code);

  return importsAttributes(program)
    ? (lowerAttributes(code, program)?.toString() ?? code)
    : code;
}

/** A loader through the host's resolver, and Node's for `@ydinjs/*` packages. */
function hostLoader(context: PluginContext): ModuleLoader {
  return {
    resolve: async (specifier, importer) => {
      const resolved = await context.resolve(specifier, importer, {
        skipSelf: true,
      });
      if (resolved && !resolved.external) {
        const onDisk = resolved.id.split('?', 1)[0]!;
        if (onDisk.startsWith('/')) {
          return onDisk;
        }
      }
      // A workspace package is external to a consumer's build, so the bundler
      // gives no file to read. Its built modules are on disk, and Node finds
      // them.
      if (specifier.startsWith('@ydinjs/')) {
        try {
          return fileURLToPath(import.meta.resolve(specifier));
        } catch {
          return null;
        }
      }
      return null;
    },
    load: async (id) => lowered(id, await readFile(id, 'utf8')),
  };
}

/** Analyzes one composition into what lowering reads. */
async function analyzeSite(
  r: Resolver,
  ctx: ModuleCtx,
  site: Site,
  warnings: FlattenerWarning[],
): Promise<AnalyzedComposition> {
  const pos = site.declarator.start;
  const refs = await resolveTraits(r, ctx, site);
  const traits: TraitIR[] = [];
  for (const ref of refs) {
    // oxlint-disable-next-line no-await-in-loop
    traits.push(await normalizeTraitClass(r, ref));
  }
  checkLanguages(refs, traits, ctx.id, pos);
  warnings.push(...checkLayers(site.consumer, traits, pos));
  checkMemberScope(ctx, site.consumer, traits, pos);
  const base = site.call.arguments[0]!;
  const superClass = site.consumer.superClass!;

  return {
    traits,
    kinds: staticKinds(traits, pos),
    baseSource: ctx.code.slice(base.start, base.end),
    declarationSpan: [site.statement.start, site.statement.end],
    superClassSpan: [superClass.start, superClass.end],
    consumer: site.consumer,
  };
}

/** What step 2 does to one module. */
export type FlattenResult = Readonly<{
  /** The edited module, or `null` when nothing changed. */
  magic: RolldownMagicString | null;
  warnings: readonly FlattenerWarning[];
  /** Modules the analysis read, for watch tracking. */
  dependencies: readonly string[];
}>;

/**
 * Step 2 for one module, whose layer (b) is already lowered: its trait
 * classes' transform, then the flattening of its compositions. Throws a
 * {@link FlattenerError} for a build error.
 *
 * @param loader - Reads other modules, with layer (b) lowered.
 */
export async function flattenModule(
  code: string,
  id: string,
  kind: BuildKind,
  loader: ModuleLoader,
): Promise<FlattenResult> {
  const program = parseModule(id, code);
  const ctx = moduleCtx(id, code, program);
  const transformed = transformTraitModule(
    code,
    program,
    kind === 'application',
  );
  const sites = findSites(ctx);
  if (sites.length === 0) {
    return { magic: transformed, warnings: [], dependencies: [] };
  }

  const magic = transformed ?? new RolldownMagicString(code);
  const r: Resolver = {
    consumerId: id,
    loader,
    ctxCache: new Map([[id, ctx]]),
    rebaseCache: new Map(),
    dependencies: new Set(),
  };
  const warnings: FlattenerWarning[] = [];
  const compositions: AnalyzedComposition[] = [];
  for (const site of sites) {
    // oxlint-disable-next-line no-await-in-loop
    compositions.push(await analyzeSite(r, ctx, site, warnings));
  }
  const implSpecifier = [...ctx.imports.values()].find(
    ({ imported, specifier }) =>
      imported === 'compose' && isCompositionModule(specifier),
  )!.specifier;
  lowerCompositions(magic, code, compositions, implSpecifier);

  return { magic, warnings, dependencies: [...r.dependencies] };
}

/** A module's text as the flattener reads it: with layer (b) lowered. */
export function lowerForAnalysis(id: string, code: string): string {
  return lowered(id, code);
}

/**
 * Builds the trait flattener: two `enforce: 'pre'` plugins, in this order.
 *
 * 1. `trait-attributes` lowers layer (b) in a trait's own module.
 * 2. `trait-flattener` transforms each trait module, so that a component can
 *    link its brand and statics, and then flattens each composition.
 *
 * The flattener reads every other module through a loader that applies step
 * 1, so a trait from the same package is read already lowered. An error fails
 * the build, and a conflict between two traits warns.
 */
export function viteTraitsPlugin(): Array<Plugin & RolldownPlugin> {
  let kind: BuildKind = 'library';

  const report = (
    context: PluginContext,
    id: string,
    error: unknown,
  ): never => {
    if (error instanceof FlattenerError) {
      return context.error({
        message: diagnosticText(error.code, error.message),
        id,
        pos: error.pos,
      });
    }
    throw error;
  };

  const attributes: Plugin & RolldownPlugin = {
    name: 'trait-attributes',
    configResolved(config) {
      if (config.command === 'serve') {
        kind = 'serve';
      } else {
        kind = config.build.lib ? 'library' : 'application';
      }
    },
    transform(code, id) {
      const cleanId = id.split('?', 1)[0]!;
      if (!isCandidate(cleanId) || !code.includes('attributes(')) {
        return null;
      }
      try {
        const magic = lowerAttributes(code, parseModule(cleanId, code));

        return magic ? emit(magic, cleanId, kind) : null;
      } catch (error) {
        return report(this, cleanId, error);
      }
    },
  } satisfies Plugin;

  const flattener: Plugin & RolldownPlugin = {
    name: 'trait-flattener',
    watchChange(id) {
      invalidateModule(id);
    },
    async transform(code, id) {
      const cleanId = id.split('?', 1)[0]!;
      if (
        !isCandidate(cleanId) ||
        (!code.includes('trait(') && !code.includes('compose('))
      ) {
        return null;
      }
      try {
        const result = await flattenModule(
          code,
          cleanId,
          kind,
          hostLoader(this),
        );
        for (const dependency of result.dependencies) {
          this.addWatchFile(dependency);
        }
        for (const warning of result.warnings) {
          this.warn({
            message: diagnosticText(warning.code, warning.message),
            id: cleanId,
            pos: warning.pos,
          });
        }

        return result.magic ? emit(result.magic, cleanId, kind) : null;
      } catch (error) {
        return report(this, cleanId, error);
      }
    },
  } satisfies Plugin;

  attributes.enforce = 'pre';
  flattener.enforce = 'pre';

  return [attributes, flattener];
}
