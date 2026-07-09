/* eslint-disable import-x/no-relative-packages */
import { defineConfig, type UserConfigFnObject } from 'vite';
import { createMaterialXViteConfig } from '../../.scripts/vite-config.ts';

const config: UserConfigFnObject = defineConfig((env) =>
  createMaterialXViteConfig(env, new URL('./', import.meta.url)),
);

export default config;
