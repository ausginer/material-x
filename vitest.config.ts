import type { UserConfig, UserConfigFnObject } from 'vite';
import { mergeConfig } from 'vitest/config';
import defaultConfig from './.scripts/vitest.base.config.ts';

const config: UserConfigFnObject = (env) =>
  mergeConfig(defaultConfig(env), {
    test: {
      include: ['src/.tproc/**/*.(spec|test).ts'],
      setupFiles: ['src/.tproc/__tests__/setup.ts'],
    },
  } satisfies UserConfig);

export default config;
