import { fileURLToPath, pathToFileURL } from 'node:url';
import type { Plugin } from 'vite';

function normalizePath(target: string, base?: string): string {
  if (!base && !target.includes('?') && !target.includes('#')) {
    return target;
  }

  const url = new URL(
    target,
    base ? pathToFileURL(base) : pathToFileURL(process.cwd()),
  );

  url.search = '';
  url.hash = '';

  return fileURLToPath(url);
}

const CUSTOM_ELEMENTS_HMR_VIRTUAL_ID = 'virtual:mx-custom-elements-hmr';
const RESOLVED_CUSTOM_ELEMENTS_HMR_VIRTUAL_ID = `\0${CUSTOM_ELEMENTS_HMR_VIRTUAL_ID}`;
const CUSTOM_ELEMENTS_HMR_IMPORT = `import '${CUSTOM_ELEMENTS_HMR_VIRTUAL_ID}';`;
const CUSTOM_ELEMENTS_HMR_FILE = fileURLToPath(
  new URL('./ce-hmr.ts', import.meta.url),
);
const CUSTOM_ELEMENTS_HMR_TARGET_FILES = new Set([
  normalizePath(
    fileURLToPath(new URL('../packages/core/element.js', import.meta.url)),
  ),
  normalizePath(
    fileURLToPath(new URL('../packages/core/src/element.ts', import.meta.url)),
  ),
]);

export function constructCustomElementsHMR(): Plugin {
  return {
    name: 'vite-construct-custom-elements-hmr',
    apply: 'serve',
    enforce: 'pre',
    resolveId(id) {
      if (id === CUSTOM_ELEMENTS_HMR_VIRTUAL_ID) {
        return RESOLVED_CUSTOM_ELEMENTS_HMR_VIRTUAL_ID;
      }

      return null;
    },
    load(id) {
      if (id === RESOLVED_CUSTOM_ELEMENTS_HMR_VIRTUAL_ID) {
        return `import ${JSON.stringify(CUSTOM_ELEMENTS_HMR_FILE)};`;
      }

      return null;
    },
    transform: {
      filter: {
        id: {
          include: /@ydinjs\/core\/(?:src\/element\.ts|element\.js)/u,
        },
      },
      handler(code, id) {
        if (
          !CUSTOM_ELEMENTS_HMR_TARGET_FILES.has(normalizePath(id)) ||
          code.includes(CUSTOM_ELEMENTS_HMR_IMPORT)
        ) {
          return null;
        }

        return {
          code: `${CUSTOM_ELEMENTS_HMR_IMPORT}\n${code}`,
        };
      },
    },
  };
}
