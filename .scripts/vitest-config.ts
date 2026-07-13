import { fileURLToPath } from 'node:url';
import { playwright } from '@vitest/browser-playwright';
import type { ConfigEnv, UserConfig } from 'vite';
import { mergeConfig } from 'vitest/config';
import type { BrowserCommand } from 'vitest/node';
import {
  createMaterialXViteConfig,
  createCoreViteConfig,
} from './vite-config.ts';

const isCI = process.env['CI'] === 'true';
const isDebug = process.env['DEBUG'] === '1';

type BrowserTestProjectOptions = Readonly<{
  name?: string;
  root: URL;
  include: readonly string[];
  exclude?: readonly string[];
  setupFiles?: readonly string[];
  viteConfig?: UserConfig;
  commands?: Record<string, BrowserCommand<any[]>>;
}>;

type NodeTestProjectOptions = Readonly<{
  name?: string;
  root: URL;
  include: readonly string[];
  setupFiles?: readonly string[];
}>;

type DeclarationTestProjectOptions = Readonly<{
  root: URL;
  include: readonly string[];
  tsconfig: string;
}>;

type WorkspaceTestConfigOptions = Readonly<{
  root: URL;
  materialXRoot: URL;
  materialXCommands: Record<string, BrowserCommand<any[]>>;
  coreRoot: URL;
}>;

function resolveChromeExecutable(): string {
  return process.env['CHROME_EXECUTABLE'] ?? '/usr/local/bin/chrome';
}

function createBrowserTestConfig(
  commands?: Record<string, BrowserCommand<any[]>>,
): UserConfig {
  return {
    test: {
      fileParallelism: !isDebug,
      browser: {
        enabled: true,
        headless: true,
        // Curated baselines are the only screenshots we keep; don't auto-capture
        // rasters for failed/expected-fail assertions in the behavior/spec
        // projects, which would otherwise litter __screenshots__.
        screenshotFailures: false,
        ui: isDebug,
        api: {
          host: '0.0.0.0',
          port: 9876,
          allowExec: true,
          // strictPort: true,
        },
        provider: playwright({
          contextOptions: { deviceScaleFactor: 1 },
          launchOptions: {
            executablePath: resolveChromeExecutable(),
            args: isDebug
              ? [
                  '--remote-debugging-port=9222',
                  '--remote-allow-origins=*',
                  '--no-sandbox',
                ]
              : [],
          },
        }),
        // Pin the viewport and device scale so raster output is reproducible
        // across machines and CI. Screenshots are only valid for a fixed
        // environment (see .agents/docs/test-architecture.md).
        instances: [
          {
            browser: 'chromium',
            viewport: { width: 1280, height: 720 },
          },
        ],
        commands,
      },
    },
  } satisfies UserConfig;
}

function createTestBaseConfig(root: URL): UserConfig {
  return {
    root: fileURLToPath(root),
    test: {
      coverage: {
        enabled: false,
        provider: 'v8',
        reportsDirectory: '.coverage',
        clean: true,
        reporter: isCI ? ['lcov'] : ['html'],
      },
      includeTaskLocation: !isCI,
    },
  } satisfies UserConfig;
}

function createBrowserTestProject(
  options: BrowserTestProjectOptions,
): UserConfig {
  const baseConfig = mergeConfig(
    options.viteConfig ?? {},
    createTestBaseConfig(options.root),
  );

  return mergeConfig(
    mergeConfig(baseConfig, createBrowserTestConfig(options.commands)),
    {
      test: {
        name: options.name ?? 'browser',
        include: [...options.include],
        exclude: options.exclude ? [...options.exclude] : [],
        setupFiles: options.setupFiles ? [...options.setupFiles] : [],
      },
    },
  );
}

function createNodeTestProject(options: NodeTestProjectOptions): UserConfig {
  return mergeConfig(createTestBaseConfig(options.root), {
    test: {
      name: options.name ?? 'node',
      include: [...options.include],
      setupFiles: options.setupFiles ? [...options.setupFiles] : [],
    },
  });
}

function createDeclarationTestProject(
  options: DeclarationTestProjectOptions,
): UserConfig {
  return mergeConfig(createTestBaseConfig(options.root), {
    test: {
      name: 'declaration',
      typecheck: {
        enabled: true,
        only: true,
        checker: 'tsc',
        include: [...options.include],
        ignoreSourceErrors: true,
        tsconfig: options.tsconfig,
      },
    },
  });
}

function createMaterialXTestProjects(
  env: ConfigEnv,
  root: URL,
  commands: Record<string, BrowserCommand<any[]>>,
  browserName?: string,
): UserConfig[] {
  return [
    createBrowserTestProject({
      name: browserName,
      root,
      include: ['test/**/*.browser.test.ts', 'src/**/*.browser.test.ts'],
      exclude: [
        'test/**/*.spec.browser.test.ts',
        'test/**/*.visual.browser.test.ts',
      ],
      setupFiles: ['test/support/browser-setup.ts'],
      commands,
      viteConfig: createMaterialXViteConfig(env, root),
    }),
    createBrowserTestProject({
      name: browserName ? 'spec/material-x' : 'spec',
      root,
      include: ['test/**/*.spec.browser.test.ts'],
      setupFiles: ['test/support/browser-setup.ts'],
      commands,
      viteConfig: createMaterialXViteConfig(env, root),
    }),
    createBrowserTestProject({
      name: browserName ? 'visual/material-x' : 'visual',
      root,
      include: ['test/**/*.visual.browser.test.ts'],
      setupFiles: ['test/support/browser-setup.ts'],
      commands,
      viteConfig: createMaterialXViteConfig(env, root),
    }),
    createNodeTestProject({
      root,
      include: ['src/.tproc/**/*.node.test.ts'],
      setupFiles: ['src/.tproc/__tests__/setup.ts'],
    }),
    createNodeTestProject({
      name: browserName ? 'node/material-x-support' : 'node-support',
      root,
      include: ['test/**/*.node.test.ts'],
    }),
  ];
}

function createCoreTestProjects(root: URL, browserName?: string): UserConfig[] {
  return [
    createBrowserTestProject({
      name: browserName,
      root,
      include: ['tests/**/*.browser.test.ts'],
      setupFiles: ['tests/setup.ts'],
      viteConfig: createCoreViteConfig(root),
    }),
    createDeclarationTestProject({
      root,
      include: ['tests/**/*.declaration.test.ts'],
      tsconfig: './tsconfig.json',
    }),
  ];
}

export function createMaterialXTestConfig(
  env: ConfigEnv,
  root: URL,
  commands: Record<string, BrowserCommand<any[]>>,
): UserConfig {
  return {
    test: {
      projects: createMaterialXTestProjects(env, root, commands),
    },
  };
}

export function createCoreTestConfig(root: URL): UserConfig {
  return {
    test: {
      projects: createCoreTestProjects(root),
    },
  };
}

export function createWorkspaceTestConfig(
  env: ConfigEnv,
  options: WorkspaceTestConfigOptions,
): UserConfig {
  const [
    materialXBrowser,
    materialXSpec,
    materialXVisual,
    materialXNode,
    materialXSupportNode,
  ] = createMaterialXTestProjects(
    env,
    options.materialXRoot,
    options.materialXCommands,
    'browser/material-x',
  );
  const [coreBrowser, coreDeclaration] = createCoreTestProjects(
    options.coreRoot,
    'browser/core',
  );

  return mergeConfig(createTestBaseConfig(options.root), {
    test: {
      projects: [
        materialXBrowser,
        materialXSpec,
        materialXVisual,
        coreBrowser,
        materialXNode,
        materialXSupportNode,
        coreDeclaration,
      ],
    },
  });
}
