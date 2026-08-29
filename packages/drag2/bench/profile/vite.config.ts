/**
 * The profiling fixture's own Vite config — **separate from the package's**,
 * and that is the point.
 *
 * A profile is only readable if the page is the only thing in it, so this
 * derives from the repository's base config and adds no plugin: no traits
 * transform, no inspector, no React, no HMR client. `__DEV__` folds to `false`,
 * as it does in a published build, so the one dev-only instrument this package
 * carries is not in the trace.
 *
 * ```sh
 * npx just profile-build   # production build, source maps on
 * npx just profile         # build, then serve it at http://localhost:4180/
 * ```
 *
 * Output goes to the package's ignored `.vite/` directory rather than beside
 * the fixture, because `bench/**` is exempt from the repository's build-output
 * ignore rules and a `dist/` here would be committed.
 */
/* eslint-disable import-x/no-relative-packages -- the base config is a repo script, and every package's own config reaches it this way. */
import { fileURLToPath } from 'node:url';
import { defineConfig, mergeConfig, type UserConfigFnObject } from 'vite';
import { createViteConfig } from '../../../../.scripts/vite-config.ts';

const config: UserConfigFnObject = defineConfig(() =>
  mergeConfig(createViteConfig(new URL('./', import.meta.url)), {
    // The published build folds this to `false`; a profile taken against `true`
    // would be measuring an assertion that never ships.
    define: { __DEV__: 'false' },
    cacheDir: fileURLToPath(
      new URL('../../.vite/profile-cache', import.meta.url),
    ),
    build: {
      outDir: fileURLToPath(new URL('../../.vite/profile', import.meta.url)),
      // Outside the fixture root, so Vite asks before clearing it.
      emptyOutDir: true,
      sourcemap: true,
    },
    // **`host` is not a convenience here.** Vite's default binds loopback
    // only, and in this container that resolves to `::1` alone — so the port
    // is unreachable over IPv4, which is what an editor's port forwarding and
    // a browser on the host both use. Binding every interface is what makes
    // the served URL work from outside the container at all.
    preview: { host: true, port: 4180, strictPort: true },
  }),
);

export default config;
