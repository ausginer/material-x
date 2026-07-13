import { defineConfig, type UserConfig } from 'tsdown';

const config: UserConfig = defineConfig({
  entry: {
    index: 'src/index.ts',
    'css/css-worker': 'src/css/css-worker.ts',
    'css/deps-tracker': 'src/css/deps-tracker.ts',
    'css/format': 'src/css/format.ts',
    'css/styles-import': 'src/css/styles-import.ts',
    'css/transform': 'src/css/transform.ts',
  },
  dts: true,
  format: 'esm',
  sourcemap: true,
  target: 'esnext',
  outDir: '.',
  fixedExtension: false,
  clean: false,
  unbundle: false,
});

export default config;
