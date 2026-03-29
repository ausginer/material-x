import { fileURLToPath } from 'node:url';
import type { StorybookConfig } from '@storybook/react-vite';

const root = new URL('../', import.meta.url);
const apiStaticDir = process.env['MATERIAL_X_API_STATIC_DIR'];

const config: StorybookConfig = {
  stories: [
    fileURLToPath(new URL('packages/material-x/src/**/*.mdx', root)),
    fileURLToPath(new URL('packages/material-x/src/**/*.stories.tsx', root)),
  ],
  staticDirs: apiStaticDir
    ? [
        {
          from: apiStaticDir,
          to: '/api',
        },
      ]
    : [],
  addons: ['@storybook/addon-docs', '@storybook/addon-themes'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  core: {
    disableTelemetry: true,
    builder: {
      name: '@storybook/builder-vite',
      options: {
        viteConfigPath: fileURLToPath(
          new URL('packages/material-x/vite.config.ts', root),
        ),
      },
    },
  },
  viteFinal(viteConfig, { configType }) {
    if (configType === 'PRODUCTION') {
      viteConfig.base = '/material-x/';
    }

    return viteConfig;
  },
};

export default config;
