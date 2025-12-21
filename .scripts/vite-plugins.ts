import { fileURLToPath, pathToFileURL } from 'node:url';
import { MessageChannel, Worker } from 'node:worker_threads';
import { computed, signal } from '@preact/signals-core';
import type { Plugin } from 'vite';
import { compileCSS } from './css/css.ts';
import { cssCache, type JSONModule } from './utils.ts';

export type ConstructCSSOptions = Readonly<{
  isProd: boolean;
}>;

const { default: propList }: JSONModule<Readonly<Record<string, string>>> =
  await import(fileURLToPath(new URL('css-private-props.json', cssCache)), {
    with: { type: 'json' },
  });

export function constructCSS(options?: ConstructCSSOptions): Plugin {
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

  const plugin: Plugin = {
    name: 'vite-construct-css',
    resolveId: {
      filter: {
        id: {
          include: /\.css\.ts/,
        },
      },
      order: 'pre',
      handler(source, importer) {
        const url = new URL(source, pathToFileURL(importer!));
        return fileURLToPath(url);
      },
    },
    load: {
      filter: {
        id: {
          include: /\.css\.ts/,
        },
      },
      async handler(id) {
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
                id,
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
          [id]: deps,
        };

        const { code, map } = await compileCSS(
          pathToFileURL(id.replace(/\.ts$/u, '')),
          result,
          options,
        );

        return {
          code: `${code}\n//# sourceMappingURL=${map?.toUrl() ?? ''}`,
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

  return plugin;
}
