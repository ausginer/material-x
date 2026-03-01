import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.tsx'],
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

    const blocksAlias = {
      find: '@storybook/blocks',
      replacement: '@storybook/addon-docs/blocks',
    };
    viteConfig.resolve ??= {};

    if (Array.isArray(viteConfig.resolve.alias)) {
      viteConfig.resolve.alias = [...viteConfig.resolve.alias, blocksAlias];
    } else {
      viteConfig.resolve.alias = {
        ...(viteConfig.resolve.alias ?? {}),
        '@storybook/blocks': '@storybook/addon-docs/blocks',
      };
    }

    return viteConfig;
  },
};

export default config;
