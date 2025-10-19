import { fork } from 'node:child_process';
import type { Readable } from 'node:stream';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { signal, computed } from '@preact/signals-core';
import { build } from 'esbuild';
import type { Plugin } from 'vite';
import { compileCSS } from './css.ts';
import { root, src } from './utils.ts';

async function streamToString(stream: Readable | null): Promise<string> {
  if (!stream) {
    return '';
  }

  const chunks = [];

  // eslint-disable-next-line @typescript-eslint/await-thenable
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString('utf-8');
}

export function constructCss(): Plugin {
  const css = new Set<string>();
  const trackedFiles = signal<Record<string, Set<string>>>({});
  const dependencies = computed(() =>
    Object.entries(trackedFiles.value).reduce<Record<string, Set<string>>>(
      (acc, [id, dependencies]) => {
        for (const d of dependencies) {
          if (acc[d]) {
            acc[d].add(id);
          } else {
            acc[d] = new Set([id]);
          }
        }

        return acc;
      },
      {},
    ),
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
      order: 'post',
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
            new URL('./css-printer.ts', import.meta.url),
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
                      new Error('Reading worker output failed', {
                        cause: err,
                      }),
                    ),
                  );
              } else {
                streamToString(child.stderr)
                  .then((str) =>
                    reject(new Error('Worker failed', { cause: str })),
                  )
                  .catch((err: unknown) =>
                    reject(
                      new Error('Reading worker output failed', { cause: err }),
                    ),
                  );
              }
            }),
          );

          const { code, map } = await compileCSS(
            pathToFileURL(id.replace(/\.ts$/u, '')),
            result,
          );

          return {
            code: `${code}\n//# sourceMappingURL=${map?.toUrl() ?? ''}`,
          };
        }

        return null;
      },
    },
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
