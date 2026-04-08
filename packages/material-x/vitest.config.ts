/* eslint-disable import-x/no-relative-packages */
import type { UserConfig, UserConfigFnObject } from 'vite';
import { defineConfig, mergeConfig } from 'vitest/config';
import vitestConfig from '../../vitest.config.ts';
import viteConfig from './vite.config.ts';

const config: UserConfigFnObject = defineConfig((env) =>
  mergeConfig(mergeConfig(viteConfig(env), vitestConfig(env)), {
    test: {
      include: ['src/.tproc/**/*.(spec|test).ts'],
      setupFiles: ['src/.tproc/__tests__/setup.ts'],
    },
  } satisfies UserConfig),
);

export default config;
