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
  name: string;
  root: URL;
  include: readonly string[];
  exclude?: readonly string[];
  setupFiles?: readonly string[];
  viteConfig?: UserConfig;
  commands?: Record<string, BrowserCommand<any[]>>;
}>;

type NodeTestProjectOptions = Readonly<{
  name: string;
  root: URL;
  include: readonly string[];
  setupFiles?: readonly string[];
}>;

type DeclarationTestProjectOptions = Readonly<{
  name: string;
  root: URL;
  include: readonly string[];
  tsconfig: string;
}>;

type WorkspaceTestConfigOptions = Readonly<{
  root: URL;
  materialXRoot: URL;
  materialXCommands: Readonly<Record<string, BrowserCommand<any[]>>>;
  coreRoot: URL;
  dragRoot: URL;
  tprocRoot: URL;
  viteTraitsPluginRoot: URL;
}>;

function resolveChromeExecutable(): string {
  return process.env['CHROME_EXECUTABLE'] ?? '/usr/local/bin/chrome';
}

// Vitest project names must be unique. In per-package mode `scope` is undefined
// and the bare base name (e.g. 'browser') is fine; in the combined workspace
// run every package contributes projects, so each name is suffixed with the
// package scope (e.g. 'browser/material-x') to avoid collisions.
function scopedName(base: string, scope?: string): string {
  return scope ? `${base}/${scope}` : base;
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
        name: options.name,
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
      name: options.name,
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
      name: options.name,
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
  scope?: string,
): UserConfig[] {
  return [
    createBrowserTestProject({
      name: scopedName('browser', scope),
      root,
      include: ['tests/**/*.browser.test.ts'],
      exclude: [
        'tests/**/*.spec.browser.test.ts',
        'tests/**/*.visual.browser.test.ts',
      ],
      setupFiles: ['tests/support/browser-setup.ts'],
      commands,
      viteConfig: createMaterialXViteConfig(env, root),
    }),
    createBrowserTestProject({
      name: scopedName('spec', scope),
      root,
      include: ['tests/**/*.spec.browser.test.ts'],
      setupFiles: ['tests/support/browser-setup.ts'],
      commands,
      viteConfig: createMaterialXViteConfig(env, root),
    }),
    createBrowserTestProject({
      name: scopedName('visual', scope),
      root,
      include: ['tests/**/*.visual.browser.test.ts'],
      setupFiles: ['tests/support/browser-setup.ts'],
      commands,
      viteConfig: createMaterialXViteConfig(env, root),
    }),
    createNodeTestProject({
      name: scopedName('node', scope),
      root,
      include: ['tests/**/*.node.test.ts'],
    }),
  ];
}

function createCoreTestProjects(root: URL, scope?: string): UserConfig[] {
  return [
    createBrowserTestProject({
      name: scopedName('browser', scope),
      root,
      include: ['tests/**/*.browser.test.ts'],
      setupFiles: ['tests/setup.ts'],
      viteConfig: createCoreViteConfig(root),
    }),
    createDeclarationTestProject({
      name: scopedName('declaration', scope),
      root,
      include: ['tests/**/*.declaration.test.ts'],
      tsconfig: './tsconfig.json',
    }),
  ];
}

function createDragTestProjects(root: URL, scope?: string): UserConfig[] {
  return [
    createBrowserTestProject({
      name: scopedName('browser', scope),
      root,
      include: ['tests/**/*.browser.test.ts'],
      viteConfig: createCoreViteConfig(root),
    }),
    createDeclarationTestProject({
      name: scopedName('declaration', scope),
      root,
      include: ['tests/**/*.declaration.test.ts'],
      tsconfig: './tsconfig.json',
    }),
    createNodeTestProject({
      name: scopedName('node', scope),
      root,
      include: ['tests/**/*.node.test.ts'],
    }),
  ];
}

function createTprocTestProjects(root: URL, scope?: string): UserConfig[] {
  return [
    createNodeTestProject({
      name: scopedName('node', scope),
      root,
      include: ['tests/**/*.node.test.ts'],
      setupFiles: ['tests/setup.ts'],
    }),
  ];
}

function createViteTraitsPluginTestProjects(
  root: URL,
  scope?: string,
): UserConfig[] {
  return [
    createNodeTestProject({
      name: scopedName('node', scope),
      root,
      include: ['tests/**/*.node.test.ts'],
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

export function createDragTestConfig(root: URL): UserConfig {
  return {
    test: {
      projects: createDragTestProjects(root),
    },
  };
}

export function createTprocTestConfig(root: URL): UserConfig {
  return {
    test: {
      projects: createTprocTestProjects(root),
    },
  };
}

export function createViteTraitsPluginTestConfig(root: URL): UserConfig {
  return {
    test: {
      projects: createViteTraitsPluginTestProjects(root),
    },
  };
}

export function createWorkspaceTestConfig(
  env: ConfigEnv,
  options: WorkspaceTestConfigOptions,
): UserConfig {
  const [materialXBrowser, materialXSpec, materialXVisual, materialXNode] =
    createMaterialXTestProjects(
      env,
      options.materialXRoot,
      options.materialXCommands,
      'material-x',
    );
  const [coreBrowser, coreDeclaration] = createCoreTestProjects(
    options.coreRoot,
    'core',
  );
  const [dragBrowser, dragDeclaration, dragNode] = createDragTestProjects(
    options.dragRoot,
    'drag',
  );
  const [tprocNode] = createTprocTestProjects(options.tprocRoot, 'tproc');
  const [viteTraitsPluginNode] = createViteTraitsPluginTestProjects(
    options.viteTraitsPluginRoot,
    'vite-traits-plugin',
  );

  return mergeConfig(createTestBaseConfig(options.root), {
    test: {
      projects: [
        materialXBrowser,
        materialXSpec,
        materialXVisual,
        coreBrowser,
        materialXNode,
        coreDeclaration,
        dragBrowser,
        dragNode,
        dragDeclaration,
        tprocNode,
        viteTraitsPluginNode,
      ],
    },
  });
}
