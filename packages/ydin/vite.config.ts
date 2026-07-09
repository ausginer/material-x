/* eslint-disable import-x/no-relative-packages */
import { defineConfig, type UserConfigFnObject } from 'vite';
import { createYdinViteConfig } from '../../.scripts/vite-config.ts';

const config: UserConfigFnObject = defineConfig(() =>
  createYdinViteConfig(new URL('./', import.meta.url)),
);

export default config;
