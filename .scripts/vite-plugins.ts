import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { Plugin } from 'vite';
import { compileCSS, parseCSSImports } from './css.ts';

// export function constructCss(): Plugin {
//   const css = new Map<string, string | undefined>();

//   return {
//     enforce: 'post',
//     name: 'vite-construct-css',
//     async load(id) {
//       if (id.endsWith('.ts')) {
//         const url = pathToFileURL(id);
//         const content = await readFile(url, 'utf8');
//         const { code, files } = parseCSSImports(content);

//         for (const file of files) {
//           css.set(fileURLToPath(new URL(file, new URL('./', url))), undefined);
//         }

//         return { code };
//       }

//       if (css.has(id)) {
//         const content = await readFile(pathToFileURL(id), 'utf8');
//         css.set(id, content);
//         return { code: '' };
//       }

//       return null;
//     },
//     async transform(_, id) {
//       if (css.has(id)) {
//         const { code, map, urls } = await compileCSS(
//           pathToFileURL(id),
//           css.get(id)!,
//         );

//         if (urls) {
//           urls.forEach((url) => {
//             this.addWatchFile(fileURLToPath(url));
//           });
//         }

//         return {
//           code: `${code}\n//# sourceMappingURL=${map?.toUrl() ?? ''}`,
//         };
//       }

//       return null;
//     },
//   };
// }

export function constructCss(): Plugin {
  const css = new Map<string, string | undefined>();

  return {
    enforce: 'post',
    name: 'vite-construct-css',
    async load(id) {
      if (id.endsWith('.ts')) {
        const url = pathToFileURL(id);
        const content = await readFile(url, 'utf8');
        const { code, files } = parseCSSImports(content);

        for (const file of files) {
          css.set(fileURLToPath(new URL(file, new URL('./', url))), undefined);
        }

        return { code };
      }

      if (css.has(id)) {
        const contents = await readFile(id, 'utf8');
        css.set(id, contents);
        return { code: '' };
      }

      return null;
    },
    async transform(_, id) {
      if (css.has(id)) {
        const { code, map } = await compileCSS(pathToFileURL(id), css.get(id)!);

        return {
          code: `${code}\n//# sourceMappingURL=${map?.toUrl() ?? ''}`,
        };
      }

      return null;
    },
  };
}
