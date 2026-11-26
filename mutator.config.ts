/**
 * How `@ydinjs/mutator` runs this repository's tests: the setup of a fresh copy,
 * the variable that selects an engine, and the packages that a test reads built.
 * material-x's own source runs through Vite, and needs no rebuild.
 */
import type { Config } from '@ydinjs/mutator';

const build = (project: string): readonly string[] => [
  'aube',
  'exec',
  '--',
  'nx',
  'run',
  `${project}:build`,
  '--skipNxCache',
];

const config: Config = {
  setup: [
    ['aube', 'install', '--frozen-lockfile'],
    ['aube', 'exec', 'just', '_test-builds'],
  ],
  engines: {
    chromium: { env: { MX_TEST_ENGINES: 'chromium' } },
    firefox: { env: { MX_TEST_ENGINES: 'firefox' } },
    webkit: { env: { MX_TEST_ENGINES: 'webkit' } },
  },
  rebuilds: [
    { files: 'packages/box-quad/src/**', command: build('@ydinjs/box-quad') },
    { files: 'packages/core/src/**', command: build('@ydinjs/core') },
    { files: 'packages/drag/src/**', command: build('@ydinjs/drag') },
    { files: 'packages/tproc/src/**', command: build('@ydinjs/tproc') },
    {
      files: 'packages/vite-custom-element-assets/src/**',
      command: build('@ydinjs/vite-custom-element-assets'),
    },
    {
      files: 'packages/vite-traits-plugin/src/**',
      command: build('@ydinjs/vite-traits-plugin'),
    },
  ],
};

export default config;
