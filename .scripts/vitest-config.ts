import { fileURLToPath } from 'node:url';
import { playwright } from '@vitest/browser-playwright';
import type { ConfigEnv, UserConfig } from 'vite';
import { mergeConfig } from 'vitest/config';
import {
  createMaterialXViteConfig,
  createYdinViteConfig,
} from './vite-config.ts';

const isCI = process.env['CI'] === 'true';
const isDebug = process.env['DEBUG'] === '1';

type BrowserTestProjectOptions = Readonly<{
  name?: string;
  root: URL;
  include: readonly string[];
  setupFiles?: readonly string[];
  viteConfig?: UserConfig;
}>;

type NodeTestProjectOptions = Readonly<{
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
  ydinRoot: URL;
}>;

function resolveChromeExecutable(): string {
  return process.env['CHROME_EXECUTABLE'] ?? '/usr/local/bin/chrome';
}

function createBrowserTestConfig(): UserConfig {
  return {
    test: {
      fileParallelism: !isDebug,
      browser: {
        enabled: true,
        headless: true,
        ui: isDebug,
        api: {
          host: '0.0.0.0',
          port: 9876,
          allowExec: true,
          // strictPort: true,
        },
        provider: playwright({
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
        instances: [{ browser: 'chromium' }],
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

  return mergeConfig(mergeConfig(baseConfig, createBrowserTestConfig()), {
    test: {
      name: options.name ?? 'browser',
      include: [...options.include],
      setupFiles: options.setupFiles ? [...options.setupFiles] : [],
    },
  });
}

function createNodeTestProject(options: NodeTestProjectOptions): UserConfig {
  return mergeConfig(createTestBaseConfig(options.root), {
    test: {
      name: 'node',
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
  browserName?: string,
): UserConfig[] {
  return [
    createBrowserTestProject({
      name: browserName,
      root,
      include: ['src/**/*.browser.test.ts'],
      viteConfig: createMaterialXViteConfig(env, root),
    }),
    createNodeTestProject({
      root,
      include: ['src/.tproc/**/*.node.test.ts'],
      setupFiles: ['src/.tproc/__tests__/setup.ts'],
    }),
  ];
}

function createYdinTestProjects(root: URL, browserName?: string): UserConfig[] {
  return [
    createBrowserTestProject({
      name: browserName,
      root,
      include: ['tests/**/*.browser.test.ts'],
      setupFiles: ['tests/setup.ts'],
      viteConfig: createYdinViteConfig(root),
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
): UserConfig {
  return {
    test: {
      projects: createMaterialXTestProjects(env, root),
    },
  };
}

export function createYdinTestConfig(root: URL): UserConfig {
  return {
    test: {
      projects: createYdinTestProjects(root),
    },
  };
}

export function createWorkspaceTestConfig(
  env: ConfigEnv,
  options: WorkspaceTestConfigOptions,
): UserConfig {
  const [materialXBrowser, materialXNode] = createMaterialXTestProjects(
    env,
    options.materialXRoot,
    'browser/material-x',
  );
  const [ydinBrowser, ydinDeclaration] = createYdinTestProjects(
    options.ydinRoot,
    'browser/ydin',
  );

  return mergeConfig(createTestBaseConfig(options.root), {
    test: {
      projects: [materialXBrowser, ydinBrowser, materialXNode, ydinDeclaration],
    },
  });
}
