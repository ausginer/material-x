import { existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { StorybookConfig } from '@storybook/react-vite';

const root = new URL('../', import.meta.url);
const apiStaticDir = process.env['MATERIAL_X_API_STATIC_DIR'];
const videosDir = fileURLToPath(new URL('.docs/videos', root));

// Demos live beside the package they exercise; the root Storybook aggregates
// every package's stories so all demos share one place. Each package that has a
// `src` directory contributes one specifier with a concrete (glob-free)
// directory — a wildcard in the directory itself would break Storybook's
// auto-title derivation. New packages are picked up with no config change.
const packagesDir = new URL('packages/', root);
const stories: StorybookConfig['stories'] = readdirSync(
  fileURLToPath(packagesDir),
  { withFileTypes: true },
)
  .filter(
    (entry) =>
      entry.isDirectory() &&
      existsSync(fileURLToPath(new URL(`${entry.name}/src/`, packagesDir))),
  )
  .map((entry) => ({
    directory: fileURLToPath(new URL(`${entry.name}/src`, packagesDir)),
    files: '**/*.@(mdx|stories.tsx)',
    titlePrefix: '',
  }));

const config: StorybookConfig = {
  stories,
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
    allowedHosts: true,
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

    // The Vite config is rooted in `packages/material-x`, but stories in other
    // packages import their own source, so let the dev server read the whole
    // monorepo.
    viteConfig.server ??= {};
    viteConfig.server.fs ??= {};
    viteConfig.server.fs.allow = [
      ...(viteConfig.server.fs.allow ?? []),
      fileURLToPath(root),
    ];

    return viteConfig;
  },
};

export default config;
