import { defineConfig, type UserConfig } from 'tsdown';

const config: UserConfig = defineConfig({
  entry: ['src/index.ts'],
  dts: true,
  format: 'esm',
  sourcemap: true,
  target: 'esnext',
  outDir: '.',
  fixedExtension: false,
  clean: false,
  unbundle: false,
  // Keep Rolldown (and its native bindings) external — bundling its napi
  // loader inlines relative `.node` paths that break at runtime.
  deps: {
    neverBundle: [/^rolldown/, /^@rolldown/, '@size-limit/file'],
  },
});

export default config;
