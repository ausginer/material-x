import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: [
    '../packages/material-x/src/**/*.mdx',
    '../packages/material-x/src/**/*.stories.tsx',
  ],
  addons: ['@storybook/addon-docs', '@storybook/addon-themes'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  core: {
    disableTelemetry: true,
  },
  viteFinal(viteConfig, { configType }) {
    if (configType === 'PRODUCTION') {
      viteConfig.base = '/material-x/';
    }

    return viteConfig;
  },
};

export default config;
