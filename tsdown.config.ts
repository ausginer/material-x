import type { Rolldown } from 'tsdown';
import {
  constructCSSStyles,
  constructCSSTokens,
  constructHTMLTemplate,
} from './.scripts/vite-plugins.ts';

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
