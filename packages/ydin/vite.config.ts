import { fileURLToPath } from 'node:url';
import { defineConfig, mergeConfig, type UserConfigFnObject } from 'vite';
import viteConfig from '../../vite.config.ts';

const config: UserConfigFnObject = defineConfig((env) =>
  mergeConfig(viteConfig(env), {
    root: fileURLToPath(new URL('./', import.meta.url)),
  }),
);

export default config;
