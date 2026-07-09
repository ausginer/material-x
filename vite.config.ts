import { defineConfig, type UserConfigFnObject } from 'vite';
import { createViteConfig } from './.scripts/vite-config.ts';

const config: UserConfigFnObject = defineConfig(() =>
  createViteConfig(new URL('./', import.meta.url)),
);

export default config;
