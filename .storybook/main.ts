import type { StorybookConfig } from '@storybook/react-vite';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);

const config: StorybookConfig = {
  stories: [
    fileURLToPath(new URL('packages/material-x/src/**/*.mdx', root)),
    fileURLToPath(new URL('packages/material-x/src/**/*.stories.tsx', root)),
  ],
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
