import { defineConfig, mergeConfig, type UserConfigFnObject } from 'vite';
import inspect from 'vite-plugin-inspect';
import defaultConfig, { cliOptions } from './.scripts/vite.base.config.js';

const inspectEnabled =
  process.env['MX_VITE_INSPECT'] === 'true' || cliOptions.inspect === true;

const config: UserConfigFnObject = defineConfig((env) =>
  mergeConfig(defaultConfig(env), {
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:52187',
          changeOrigin: true,
        },
      },
    },
    plugins: [
      inspectEnabled
        ? inspect({
            include: [/\.css\.ts/],
            build: true,
          })
        : null,
    ],
  }),
);

export default config;
