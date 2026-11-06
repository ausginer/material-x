/* eslint-disable import-x/no-relative-packages */
import { defineConfig, type UserConfigFnObject } from 'vite';
import { createCoreViteConfig } from '../../.scripts/vite-config.ts';

const config: UserConfigFnObject = defineConfig(() =>
  createCoreViteConfig(new URL('./', import.meta.url)),
);

export default config;
