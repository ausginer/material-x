import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { StorybookConfig } from '@storybook/react-vite';

const root = new URL('../', import.meta.url);
const apiStaticDir = process.env['MATERIAL_X_API_STATIC_DIR'];
const videosDir = fileURLToPath(new URL('.docs/videos', root));

const config: StorybookConfig = {
  stories: [
    fileURLToPath(new URL('packages/material-x/src/**/*.mdx', root)),
    fileURLToPath(new URL('packages/material-x/src/**/*.stories.tsx', root)),
  ],
  staticDirs: [
    ...(existsSync(videosDir) ? [{ from: videosDir, to: '/videos' }] : []),
    ...(apiStaticDir ? [{ from: apiStaticDir, to: '/api' }] : []),
  ],
  addons: ['@storybook/addon-docs', '@storybook/addon-links'],
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
