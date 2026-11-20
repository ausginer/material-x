// Builds one package with tsdown under one of the probe's modes, into an
// output directory of its own. The package's tsdown.config.ts is used as is,
// except for its plugins, its outDir, and its package.json exports and publint
// steps, which are off. Run from the worktree root:
//
//   node .plan/trait-jsdoc-probe-1/probes/build.ts <mode> <core|material-x> <outDir>
//
// Modes:
//   real        the package's own plugins (today's flattener)
//   standin     the probe's stand-in plugins, with no early step
//   control     the stand-in's @trait step in a transform, as the plugin will
//   control-pre the same with `order: 'pre'`
//   way1        @trait and @attributes rewritten in a load hook, before dts
//   way2        the whole trait transform in a load hook, before dts
//   way3a       the JSDoc moved below the decorators in a load hook
//   way3b       the JSDoc re-attached to the class in the emitted .d.ts
//   form        control's plugins, on sources written `export @trait class`
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import remapping from '@jridgewell/remapping';
import { RolldownMagicString } from 'rolldown';
import type { Rolldown, UserConfig } from 'tsdown';
import { build } from 'tsdown';
import { lowerAttributes } from '../../../packages/vite-traits-plugin/src/attributes/lower.ts';
import {
  flattenModule,
  lowerForAnalysis,
} from '../../../packages/vite-traits-plugin/src/plugin.ts';
import { parseModule } from '../../../packages/vite-traits-plugin/src/syntax.ts';
import type { ModuleLoader } from '../../../packages/vite-traits-plugin/src/syntax.ts';
import {
  classVarCleanupPlugin,
  dropEmptyChunksPlugin,
} from '../../../.scripts/tsdown-library.ts';
import {
  constructCSSStyles,
  constructCSSTokens,
  constructHTMLTemplate,
} from '@ydinjs/vite-custom-element-assets';
import {
  decoratedDocs,
  desugar,
  moveDocBelowDecorators,
} from './decorators.ts';

type Mode =
  | 'real'
  | 'standin'
  | 'control'
  | 'control-pre'
  | 'way1'
  | 'way2'
  | 'way3a'
  | 'way3b'
  | 'form';

const [mode, pkg, outDir] = process.argv.slice(2) as [Mode, string, string];
const root = resolve(import.meta.dirname, '../../..');
const pkgDir = resolve(root, 'packages', pkg);

const CANDIDATE = /\.[cm]?[jt]sx?$/u;
const isCandidate = (id: string): boolean =>
  CANDIDATE.test(id) &&
  !id.includes('/node_modules/') &&
  !/\.d\.[cm]?ts$/u.test(id);
const clean = (id: string): string => id.split('?', 1)[0]!;

/** The plugin's host loader, reading the decorator form through the stand-in. */
function loader(context: Rolldown.PluginContext): ModuleLoader {
  return {
    resolve: async (specifier, importer) => {
      const resolved = await context.resolve(specifier, importer, {
        skipSelf: true,
      });
      if (resolved && !resolved.external) {
        const onDisk = clean(resolved.id);
        if (onDisk.startsWith('/')) {
          return onDisk;
        }
      }
      if (specifier.startsWith('@ydinjs/')) {
        try {
          return new URL(import.meta.resolve(specifier)).pathname;
        } catch {
          return null;
        }
      }
      return null;
    },
    load: async (id) => {
      const code = await readFile(id, 'utf8');
      return lowerForAnalysis(id, desugar(id, code)?.toString() ?? code);
    },
  };
}

/** The stand-in's @trait step: the decorator form to today's static block. */
function desugarPlugin(order?: 'pre'): Rolldown.Plugin {
  return {
    name: 'probe:trait-desugar',
    transform: {
      order,
      handler(code, rawId) {
        const id = clean(rawId);
        const magic = isCandidate(id) ? desugar(id, code) : null;
        return magic ? { code: magic } : null;
      },
    },
  };
}

/** plugin.ts's two transforms, with the stand-in's loader. */
function traitPlugins(): Rolldown.Plugin[] {
  return [
    {
      name: 'probe:trait-attributes',
      transform(code, rawId) {
        const id = clean(rawId);
        if (!isCandidate(id) || !code.includes('attributes(')) {
          return null;
        }
        const magic = lowerAttributes(code, parseModule(id, code));
        return magic ? { code: magic } : null;
      },
    },
    {
      name: 'probe:trait-flattener',
      async transform(code, rawId) {
        const id = clean(rawId);
        if (
          !isCandidate(id) ||
          (!code.includes('trait(') &&
            !code.includes('compose(') &&
            !code.includes('Symbol.hasInstance'))
        ) {
          return null;
        }
        const result = await flattenModule(code, id, 'library', loader(this));
        for (const warning of result.warnings) {
          this.warn(warning.message);
        }
        return result.magic ? { code: result.magic } : null;
      },
    },
  ];
}

type Step = (id: string, code: string) => Promise<Edit | null> | Edit | null;
type Edit = Readonly<{ code: string; map: string }>;

const map = (
  magic: { generateMap: Function; toString(): string },
  id: string,
): Edit => ({
  code: magic.toString(),
  map: magic
    .generateMap({ source: id, includeContent: true, hires: true })
    .toString(),
});

/** An early step: runs in a load hook, which precedes every transform. */
function loadPlugin(step: Step): Rolldown.Plugin {
  return {
    name: 'probe:early-load',
    load: {
      filter: { id: CANDIDATE },
      async handler(rawId) {
        const id = clean(rawId);
        if (!isCandidate(id) || id !== rawId) {
          return null;
        }
        const code = await readFile(id, 'utf8');
        return await step(id, code);
      },
    },
  };
}

/** Way 3b: puts each trait's JSDoc back in front of its declared class. */
function reattachPlugin(): Rolldown.Plugin {
  return {
    name: 'probe:dts-reattach',
    transform: {
      // Before rolldown-plugin-dts:fake-js, which has no order.
      order: 'pre',
      filter: { id: /\.d\.[cm]?ts$/u },
      async handler(code, id) {
        if (id.includes('/node_modules/')) {
          return null;
        }
        const sourceId = id.replace(/\.d\.([cm]?)ts$/u, '.$1ts');
        let source: string;
        try {
          source = await readFile(sourceId, 'utf8');
        } catch {
          return null;
        }
        const magic = new RolldownMagicString(code);
        let changed = false;
        for (const [name, doc] of decoratedDocs(sourceId, source)) {
          const at = new RegExp(
            `^(?:export )?declare (?:abstract )?class ${name}\\b`,
            'mu',
          ).exec(code)?.index;
          if (at === undefined || code.slice(0, at).trimEnd().endsWith('*/')) {
            continue;
          }
          magic.prependRight(at, `${doc}\n`);
          changed = true;
        }
        return changed ? { code: magic } : null;
      },
    },
  };
}

/** Way 2's early step: the stand-in's whole trait transform. */
async function wholeTransform(
  context: Rolldown.PluginContext,
  id: string,
  code: string,
): Promise<Edit | null> {
  const edits: Edit[] = [];
  let current = code;
  const desugared = desugar(id, current);
  if (desugared) {
    edits.push(map(desugared, id));
    current = edits.at(-1)!.code;
  }
  if (current.includes('attributes(')) {
    const lowered = lowerAttributes(current, parseModule(id, current));
    if (lowered) {
      edits.push(map(lowered, id));
      current = edits.at(-1)!.code;
    }
  }
  if (
    current.includes('trait(') ||
    current.includes('compose(') ||
    current.includes('Symbol.hasInstance')
  ) {
    const result = await flattenModule(current, id, 'library', loader(context));
    if (result.magic) {
      edits.push(map(result.magic, id));
      current = edits.at(-1)!.code;
    }
  }
  if (edits.length === 0) {
    return null;
  }
  const composed = remapping(
    edits.toReversed().map((edit) => edit.map),
    () => null,
  );
  composed.sourcesContent = [code];
  return { code: current, map: JSON.stringify(composed) };
}

function probePlugins(): Rolldown.Plugin[] {
  switch (mode) {
    case 'standin':
    case 'control':
    case 'form':
      return [desugarPlugin(), ...traitPlugins()];
    case 'control-pre':
      return [desugarPlugin('pre'), ...traitPlugins()];
    case 'way1':
      return [
        loadPlugin((id, code) => {
          const magic = desugar(id, code);
          return magic ? map(magic, id) : null;
        }),
        ...traitPlugins(),
      ];
    case 'way2': {
      const early = loadPlugin(() => null);
      const load = early.load as { handler: Function };
      // The step needs the plugin context, for the flattener's resolver.
      const handler = async function (
        this: Rolldown.PluginContext,
        rawId: string,
      ): Promise<Edit | null> {
        const id = clean(rawId);
        if (!isCandidate(id) || id !== rawId) {
          return null;
        }
        return await wholeTransform(this, id, await readFile(id, 'utf8'));
      };
      load.handler = handler;
      return [early];
    }
    case 'way3a':
      return [
        loadPlugin((id, code) => {
          const magic = moveDocBelowDecorators(id, code);
          return magic ? map(magic, id) : null;
        }),
        desugarPlugin(),
        ...traitPlugins(),
      ];
    case 'way3b':
      return [desugarPlugin(), ...traitPlugins(), reattachPlugin()];
    default:
      throw new Error(`unknown mode ${mode}`);
  }
}

process.chdir(pkgDir);
const { default: config } = (await import(
  pathToFileURL(resolve(pkgDir, 'tsdown.config.ts')).href
)) as { default: UserConfig };

const plugins =
  mode === 'real'
    ? config.plugins
    : [
        ...probePlugins(),
        dropEmptyChunksPlugin(),
        classVarCleanupPlugin(),
        ...(pkg === 'material-x'
          ? [
              constructCSSStyles({ isProd: true }),
              constructHTMLTemplate(),
              constructCSSTokens({ isProd: true }),
            ]
          : []),
      ];

await build({
  ...config,
  config: false,
  plugins,
  outDir: resolve(outDir),
  exports: false,
  publint: false,
  logLevel: 'warn',
});
