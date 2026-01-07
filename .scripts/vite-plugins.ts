import { fileURLToPath, pathToFileURL } from 'node:url';
import { MessageChannel, Worker } from 'node:worker_threads';
import { computed, signal } from '@preact/signals-core';
import type { Plugin } from 'vite';
import { compileCSS } from './css/css.ts';
import { compileHTML } from './html.ts';
import { cssCache, type JSONModule } from './utils.ts';

export type ConstructCSSTokensOptions = Readonly<{
  isProd: boolean;
}>;

export type ConstructCSSStylesOptions = Readonly<{
  isProd: boolean;
}>;

export type ConstructHTMLTemplateOptions = Readonly<{
  isProd: boolean;
}>;

const { default: propList }: JSONModule<Readonly<Record<string, string>>> =
  await import(fileURLToPath(new URL('css-private-props.json', cssCache)), {
    with: { type: 'json' },
  });

function normalizePath(target: string, base?: string): string {
  if (!base && !target.includes('?') && !target.includes('#')) {
    return target;
  }

  const url = new URL(
    target,
    base ? pathToFileURL(base) : pathToFileURL(import.meta.dirname),
  );

  url.search = '';
  url.hash = '';

  return fileURLToPath(url);
}

export function constructCSSStyles(
  options?: ConstructCSSStylesOptions,
): Plugin {
  return {
    name: 'vite-construct-css-styles',
    enforce: 'pre',
    resolveId: {
      filter: {
        id: {
          include: /\.ctr\.css(?:[?#].*)?$/,
        },
      },
      order: 'pre',
      async handler(source, importer) {
        return await this.resolve(source + '?raw', importer, {
          ...options,
          skipSelf: true,
        });
      },
    },
    load: {
      filter: {
        id: {
          include: /\.ctr\.css(?:[?#].*)?$/,
        },
      },
      async handler(id) {
        const cleanId = normalizePath(id);
        const source = await this.fs.readFile(cleanId, { encoding: 'utf8' });
        const { code, map } = await compileCSS(
          pathToFileURL(cleanId),
          source,
          options,
        );

        this.addWatchFile(cleanId);

        return {
          code,
          map,
        };
      },
    },
  };
}

export function constructHTMLTemplate(
  options?: ConstructHTMLTemplateOptions,
): Plugin {
  return {
    name: 'vite-construct-html-template',
    enforce: 'pre',
    resolveId: {
      filter: {
        id: {
          include: /\.tpl\.html(?:[?#].*)?$/,
        },
      },
      order: 'pre',
      async handler(source, importer) {
        return await this.resolve(source + '?raw', importer, {
          ...options,
          skipSelf: true,
        });
      },
    },
    load: {
      filter: {
        id: {
          include: /\.tpl\.html(?:[?#].*)?$/,
        },
      },
      async handler(id) {
        const cleanId = normalizePath(id);
        const source = await this.fs.readFile(cleanId, { encoding: 'utf8' });
        const { code, map } = await compileHTML(source, cleanId);

        this.addWatchFile(cleanId);

        return {
          code,
          map,
        };
      },
    },
  };
}

export function constructCSSTokens(
  options?: ConstructCSSTokensOptions,
): Plugin {
  const trackedFiles = signal<Record<string, Set<string>>>({});
  const dependencies = computed(() =>
    Object.entries(trackedFiles.value).reduce<Record<string, Set<string>>>(
      (acc, [id, dependencies]) => {
        for (const d of dependencies) {
          acc[d] ??= new Set();
          acc[d].add(id);
        }

        return acc;
      },
      {},
    ),
  );

  const replaceList = Object.entries(propList).map(
    ([name, value]) => [new RegExp(`['"]${name}['"]`, 'gu'), value] as const,
  );

  return {
    name: 'vite-construct-css-tokens',
    resolveId: {
      filter: {
        id: {
          include: /\.css\.ts/,
        },
      },
      order: 'pre',
      handler(source, importer) {
        return normalizePath(source, importer);
      },
    },
    load: {
      filter: {
        id: {
          include: /\.css\.ts/,
        },
      },
      async handler(id) {
        const cleanId = normalizePath(id);
        const { port1, port2 } = new MessageChannel();
        const deps = new Set<string>();

        port1.on('message', (module: string) => {
          deps.add(module);
          this.addWatchFile(module);
        });

        const result = await new Promise<string>((resolve, reject) => {
          const worker = new Worker(
            new URL('./css/css-worker.ts', import.meta.url),
            {
              execArgv: [
                '--import',
                fileURLToPath(
                  new URL('./css/deps-tracker.ts', import.meta.url),
                ),
              ],
              workerData: {
                id: cleanId,
                monitorPort: port2,
              },
              transferList: [port2],
            },
          );

          worker.on('message', resolve);
          worker.on('error', reject);
          worker.on('exit', (code) => {
            if (code !== 0)
              reject(new Error(`Worker stopped with exit code ${code}`));
          });
        });

        trackedFiles.value = {
          ...trackedFiles.peek(),
          [cleanId]: deps,
        };

        const { code, map } = await compileCSS(
          // Removing TS to avoid oxfmt hiccup
          pathToFileURL(cleanId.substring(0, cleanId.length - 3)),
          result,
          options,
        );

        this.addWatchFile(cleanId);

        return {
          code,
          map,
        };
      },
    },
    ...(options?.isProd
      ? {
          transform: {
            filter: {
              id: {
                include: /\.(?:ts|tsx)/,
                exclude: /\.css\.ts/,
              },
            },
            handler(code) {
              return {
                code: replaceList.reduce(
                  (acc, [pattern, short]) => acc.replace(pattern, `'${short}'`),
                  code,
                ),
              };
            },
          },
        }
      : {}),
    handleHotUpdate: {
      handler({ file, server, timestamp }) {
        if (file in dependencies.value) {
          return dependencies.value[file]
            ?.values()
            .flatMap((file) => [
              ...(server.moduleGraph.getModulesByFile(file) ?? []),
            ])
            .map((mod) => {
              server.moduleGraph.invalidateModule(
                mod,
                undefined,
                timestamp,
                true,
              );
              return mod;
            })
            .toArray();
        }

        return undefined;
      },
    },
  };
}
