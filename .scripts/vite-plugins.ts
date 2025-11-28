import { fork } from 'node:child_process';
import type { Readable } from 'node:stream';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { signal, computed } from '@preact/signals-core';
import { build } from 'esbuild';
import type { Plugin } from 'vite';
import { compileCSS } from './css/css.ts';
import { cssCache, root, src, type JSONModule } from './utils.ts';

async function streamToString(stream: Readable | null): Promise<string> {
  if (!stream) {
    return '';
  }

  const chunks = [];

  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString('utf-8');
}

export type ConstructCSSOptions = Readonly<{
  isProd: boolean;
}>;

const { default: propList }: JSONModule<Readonly<Record<string, string>>> =
  await import(fileURLToPath(new URL('css-private-props.json', cssCache)), {
    with: { type: 'json' },
  });

export function constructCSS(options?: ConstructCSSOptions): Plugin {
  const css = new Set<string>();
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
      order: 'pre',
      handler(source, importer) {
        if (importer && source.startsWith('.')) {
          const url = new URL(source, pathToFileURL(importer));

          if (url.searchParams.get('type') === 'css') {
            const id = fileURLToPath(url);
            css.add(id);
            return id;
          }
        }

        return null;
      },
    },
    load: {
      async handler(id) {
        if (css.has(id)) {
          if (!trackedFiles.value[id]) {
            const { metafile } = await build({
              format: 'esm',
              entryPoints: [id],
              bundle: true,
              metafile: true,
              write: false,
              target: 'esnext',
              external: ['node:*'],
              supported: {
                'top-level-await': true,
              },
            });

            trackedFiles.value = {
              ...trackedFiles.value,
              [id]: new Set(
                Object.keys(metafile.inputs)
                  .map((file) => new URL(file, root))
                  .filter((url) => url.toString().startsWith(src.toString()))
                  .map((url) => fileURLToPath(url))
                  .map((file) => {
                    this.addWatchFile(file);
                    return file;
                  }),
              ),
            };
          }

          const child = fork(
            new URL('./css/css-printer.ts', import.meta.url),
            [id],
            { silent: true },
          );

          const result = await new Promise<string>((resolve, reject) =>
            child.on('exit', (code) => {
              if (!code) {
                streamToString(child.stdout)
                  .then((str) => resolve(str))
                  .catch((err: unknown) =>
                    reject(
                      new Error(`Reading output for "${id}" failed`, {
                        cause: err,
                      }),
                    ),
                  );
              } else {
                streamToString(child.stderr)
                  .then((str) =>
                    reject(new Error(`Processing "${id}" failed\n\n${str}`)),
                  )
                  .catch((err: unknown) =>
                    reject(
                      new Error(`Reading error output for "${id}" failed`, {
                        cause: err,
                      }),
                    ),
                  );
              }
            }),
          );

          const { code, map } = await compileCSS(
            pathToFileURL(id.replace(/\.ts$/u, '')),
            result,
            options,
          );

          return {
            code: `${code}\n//# sourceMappingURL=${map?.toUrl() ?? ''}`,
          };
        }

        return null;
      },
    },
    ...(options?.isProd
      ? {
          transform: {
            handler(code, id) {
              if (id.endsWith('.ts') || id.endsWith('.tsx')) {
                return {
                  code: replaceList.reduce(
                    (acc, [pattern, short]) =>
                      acc.replace(pattern, `'${short}'`),
                    code,
                  ),
                };
              }

              return null;
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
