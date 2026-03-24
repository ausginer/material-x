import { posix } from 'node:path/posix';
import type { Rolldown, UserConfig } from 'tsdown';
import {
  constructCSSStyles,
  constructCSSTokens,
  constructHTMLTemplate,
} from './.scripts/vite-plugins.ts';

export type PackageExportDefinition = Readonly<{
  path: string;
  typeOnly?: boolean;
}>;

export type PackageExportsMap = Readonly<
  Record<string, string | PackageExportDefinition>
>;

function normalizeOutputPath(path: string): string {
  return posix
    .normalize(path)
    .replace(/^\.?\//u, '')
    .replace(/(?:\.d)?\.(?:t|j)s$/u, '');
}

function normalizeExportKey(key: string): string {
  if (key === '.' || key.endsWith('.json') || key.endsWith('.js')) {
    return key;
  }

  return `${key}.js`;
}

export function classVarCleanupPlugin(): Rolldown.Plugin {
  return {
    name: 'tsdown:class-var-cleanup',
    renderChunk(code: string, _, __, { magicString }) {
      if (!magicString) {
        return null;
      }

      const matches = [...code.matchAll(/\bvar\s+([\w$]*)\s*=\s*class\b/gu)];

      if (matches.length === 0) {
        return null;
      }

      for (const match of matches.toReversed()) {
        const { index } = match;

        magicString.overwrite(
          index,
          index + match[0].length,
          `class ${match[1]}`,
        );
      }

      return {
        code: magicString,
      };
    },
  };
}

export function dropEmptyChunksPlugin(): Rolldown.Plugin {
  return {
    name: 'tsdown:drop-empty-chunks',
    generateBundle(_, bundle) {
      for (const [fileName, output] of Object.entries(bundle)) {
        if (output.type !== 'chunk' || output.code.trim() !== '') {
          continue;
        }

        // oxlint-disable-next-line typescript/no-dynamic-delete
        delete bundle[fileName];
        delete bundle[`${fileName}.map`];
      }
    },
  };
}

export function createPackageCustomExports(
  exportsMap: PackageExportsMap,
): UserConfig['exports'] {
  return {
    customExports() {
      return Object.fromEntries(
        Object.entries(exportsMap).map(([key, definition]) => {
          if (key.endsWith('.json')) {
            return [
              key,
              typeof definition === 'string' ? definition : definition.path,
            ];
          }

          const { path, typeOnly = false } =
            typeof definition === 'string' ? { path: definition } : definition;
          const normalizedPath = normalizeOutputPath(path);
          const outputPath = `./${normalizedPath}.js`;

          return [
            normalizeExportKey(key),
            {
              types: `./${normalizedPath}.d.ts`,
              ...(typeOnly ? {} : { default: outputPath }),
            },
          ];
        }),
      );
    },
  };
}

export function constructLibraryTsdownPlugins(): Rolldown.Plugin[] {
  return [dropEmptyChunksPlugin(), classVarCleanupPlugin()];
}

function asRolldownPlugin(plugin: unknown): Rolldown.Plugin {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
  return plugin as Rolldown.Plugin;
}

export function constructComponentTsdownPlugins(): Rolldown.Plugin[] {
  return [
    ...constructLibraryTsdownPlugins(),
    asRolldownPlugin(constructCSSStyles({ isProd: true })),
    asRolldownPlugin(constructHTMLTemplate()),
    asRolldownPlugin(constructCSSTokens({ isProd: true })),
  ];
}
