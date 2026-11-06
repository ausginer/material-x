import { readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const here = fileURLToPath(new URL('./', import.meta.url));
const pages = (await readdir(`${here}pages`)).filter((name) =>
  name.endsWith('.html'),
);

/** Pages import the library the way a consumer would. */
export const alias = [
  { find: /^@ydinjs\/drag\/(.*)\.js$/u, replacement: `${here}src/$1.ts` },
  {
    find: '@ydinjs/box-quad',
    replacement: `${here}../../box-quad/src/index.ts`,
  },
];

export default defineConfig({
  root: here,
  cacheDir: `${here}../../../node_modules/.vite/drag-prototype`,
  define: { __DEV__: 'true' },
  resolve: { alias },
  server: { port: 5191, host: true, fs: { allow: [`${here}../..`] } },
  build: {
    rolldownOptions: {
      input: [
        `${here}index.html`,
        ...pages.map((name) => `${here}pages/${name}`),
      ],
    },
  },
});
