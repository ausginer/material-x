import { availableParallelism } from 'node:os';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { playwright } from '@vitest/browser-playwright';
import type { ConfigEnv, UserConfig } from 'vite';
import { mergeConfig } from 'vitest/config';
import type { BrowserCommand } from 'vitest/node';
import {
  createViteConfig,
  createMaterialXViteConfig,
  createCoreViteConfig,
} from './vite-config.ts';
import { oneShotTestExecution } from './vitest-one-shot.ts';

const isCI = process.env['CI'] === 'true';
const isDebug = process.env['DEBUG'] === '1';

// Pages per browser project. The CPU-derived default oversubscribes: on a
// Chromium-dominated package an explicit bound is both faster and lighter.
// Two, rather than four, because the editor cannot separate processes and the
// root configuration is what it loads.
const BROWSER_WORKERS = 2;

// Files at once across the whole non-browser group, which shares one
// `groupOrder` and therefore one resolved bound. Half the cores rather than
// Vitest's `cores - 1`, because several files in this group spawn a build of
// their own — tsdown, Rolldown, Brotli — and each of those uses more than the
// one core the worker holding it is counted as. At `cores - 1` the group
// oversubscribes badly enough to time out three tests that do no more than read
// what they just built; measured on all five node projects, 40 s with four
// failures against 45 s with none.
const NON_BROWSER_WORKERS = Math.max(Math.floor(availableParallelism() / 2), 1);

/**
 * `--maxWorkers` from the command line, because a root-level `maxWorkers` and
 * the CLI flag both fail to reach a browser project: only the project level
 * reaches `getThreadsCount`. Applied to every project, so that projects sharing
 * a group keep the equal resolved value `groupSpecs` requires.
 *
 * `VITEST_MAX_WORKERS` needs nothing here — Vitest applies it inside each
 * project's own `resolveConfig`, after every other resolution. It is a bare
 * `parseInt` there, so `50%` means fifty workers rather than half of them.
 *
 * `strict: false` because Vitest passes many flags this does not declare.
 */
function resolveRequestedWorkers(): number | string | undefined {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: { maxWorkers: { type: 'string' } },
    allowPositionals: true,
    strict: false,
  });
  const requested = values.maxWorkers;

  if (requested == null) {
    return undefined;
  }

  if (typeof requested !== 'string' || !/^\d+%?$/u.test(requested)) {
    throw new Error(
      `--maxWorkers must be a positive integer or a percentage, got ${String(requested)}`,
    );
  }

  if (requested.endsWith('%')) {
    return requested;
  }

  const count = Number(requested);

  if (count < 1) {
    throw new Error(`--maxWorkers must be at least 1, got ${requested}`);
  }

  return count;
}

const requestedWorkers = resolveRequestedWorkers();

function isBrowserProjectConfig(project: UserConfig): boolean {
  return project.test?.browser?.enabled === true;
}

/**
 * Serializes the browser projects, one per group, **from 1**.
 *
 * Group 0 is Vitest's default sentinel: a project carrying it alongside
 * `isolate` and a single worker is diverted into a trailing catch-all group
 * appended after every other, which destroys the ordering it appears to
 * express. Holes in the numbering are skipped, so contiguity buys nothing.
 *
 * Every non-browser project shares the highest group. They hold no provider,
 * and their being last is what releases the final browser project: a boundary
 * is another group starting, so a project in the final group is never released
 * by one.
 */
function assignGroupOrder(projects: readonly UserConfig[]): UserConfig[] {
  const shared = projects.filter(isBrowserProjectConfig).length + 1;
  let browser = 0;

  return projects.map((project) => {
    let groupOrder = shared;

    if (isBrowserProjectConfig(project)) {
      browser += 1;
      groupOrder = browser;
    }

    return mergeConfig(project, {
      test: { sequence: { groupOrder } },
    } satisfies UserConfig);
  });
}

type BrowserTestProjectOptions = Readonly<{
  name: string;
  root: URL;
  include: readonly string[];
  exclude?: readonly string[];
  setupFiles?: readonly string[];
  viteConfig?: UserConfig;
  commands?: Record<string, BrowserCommand<any[]>>;
  /** Extra Chrome flags. Used by the drag measurement suites (M-1/M-2). */
  launchArgs?: readonly string[];
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
  boxQuadRoot: URL;
  materialXRoot: URL;
  materialXCommands: Readonly<Record<string, BrowserCommand<any[]>>>;
  drag2Commands: Readonly<Record<string, BrowserCommand<any[]>>>;
  coreRoot: URL;
  dragRoot: URL;
  drag2Root: URL;
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
  options?: Readonly<{ launchArgs?: readonly string[] }>,
): UserConfig {
  return {
    test: {
      fileParallelism: !isDebug,
      maxWorkers: requestedWorkers ?? BROWSER_WORKERS,
      browser: {
        enabled: true,
        headless: true,
        // Curated baselines are the only screenshots we keep; don't auto-capture
        // rasters for failed/expected-fail assertions in the behavior/spec
        // projects, which would otherwise litter __screenshots__.
        screenshotFailures: false,
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
            args: [
              ...(isDebug
                ? [
                    '--remote-debugging-port=9222',
                    '--remote-allow-origins=*',
                    '--no-sandbox',
                  ]
                : []),
              ...(options?.launchArgs ?? []),
            ],
          },
        }),
        // Pin the viewport and device scale so raster output is reproducible
        // across machines and CI. Screenshots are only valid for a fixed
        // environment (see .agents/docs/test-architecture.md). The pin is also
        // why the browser UI stays off under `DEBUG`: the UI nulls the
        // viewport, and Playwright rejects a device scale against a null one,
        // so the context is never created and the debug run executes nothing.
        // The UI is unreachable behind the unconditional headless mode in any
        // case; debugging attaches to the CDP port opened by the launch
        // arguments above.
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
    // See `createViteConfig`. Declared here as well so the node and
    // declaration projects, which do not take a vite config, still resolve it.
    define: { __DEV__: 'true' },
    // Every project derives from here, which is what puts the one-shot contract
    // into the node and declaration projects: they carry no other plugins, and
    // `configureVitest` hooks are gathered per project.
    plugins: [oneShotTestExecution()],
    test: {
      maxWorkers: requestedWorkers ?? NON_BROWSER_WORKERS,
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
    mergeConfig(
      baseConfig,
      createBrowserTestConfig(options.commands, {
        launchArgs: options.launchArgs,
      }),
    ),
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
): [UserConfig, UserConfig, UserConfig, UserConfig] {
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

function createCoreTestProjects(
  root: URL,
  scope?: string,
): [UserConfig, UserConfig] {
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

function createDragTestProjects(
  root: URL,
  scope?: string,
  commands?: Record<string, BrowserCommand<any[]>>,
): [UserConfig, UserConfig, UserConfig] {
  return [
    createBrowserTestProject({
      name: scopedName('browser', scope),
      root,
      include: ['tests/**/*.browser.test.ts'],
      // M-6's census drives Playwright's own input pipeline; a dispatched event
      // never reaches the coalescing decision the measurement is about.
      commands,
      // The phase 11 measurement suites need a deterministic heap: `gc()` to
      // settle it before a sample, and precise `performance.memory` rather than
      // the 100kB-quantized figure Chrome reports by default. Both are inert
      // for every other test in the project.
      launchArgs: ['--js-flags=--expose-gc', '--enable-precise-memory-info'],
      viteConfig: mergeConfig(createCoreViteConfig(root), {
        // The React fixtures (`tests/**/react*.browser.test.ts`) need exactly
        // one copy of React: without deduping, the optimizer gives `react-dom`
        // its own inlined `react`, the hook dispatcher is null in the second
        // copy, and every render throws. Harmless for the packages themselves —
        // neither ships a React dependency.
        resolve: { dedupe: ['react', 'react-dom'] },
      } satisfies UserConfig),
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

export function createBoxQuadTestConfig(root: URL): UserConfig {
  return {
    test: {
      projects: assignGroupOrder([
        createBrowserTestProject({
          name: 'browser',
          root,
          include: ['tests/**/*.browser.test.ts'],
          viteConfig: createViteConfig(root),
        }),
      ]),
    },
  };
}

function createBoxQuadTestProjects(root: URL, scope?: string): [UserConfig] {
  return [
    createBrowserTestProject({
      name: scopedName('browser', scope),
      root,
      include: ['tests/**/*.browser.test.ts'],
      viteConfig: createViteConfig(root),
    }),
  ];
}

function createTprocTestProjects(root: URL, scope?: string): [UserConfig] {
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
): [UserConfig] {
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
      projects: assignGroupOrder(
        createMaterialXTestProjects(env, root, commands),
      ),
    },
  };
}

export function createCoreTestConfig(root: URL): UserConfig {
  return {
    test: {
      projects: assignGroupOrder(createCoreTestProjects(root)),
    },
  };
}

export function createDragTestConfig(
  root: URL,
  commands?: Record<string, BrowserCommand<any[]>>,
): UserConfig {
  return {
    test: {
      projects: assignGroupOrder(
        createDragTestProjects(root, undefined, commands),
      ),
    },
  };
}

export function createTprocTestConfig(root: URL): UserConfig {
  return {
    test: {
      projects: assignGroupOrder(createTprocTestProjects(root)),
    },
  };
}

export function createViteTraitsPluginTestConfig(root: URL): UserConfig {
  return {
    test: {
      projects: assignGroupOrder(createViteTraitsPluginTestProjects(root)),
    },
  };
}

export function createWorkspaceTestConfig(
  env: ConfigEnv,
  options: WorkspaceTestConfigOptions,
): UserConfig {
  const [boxQuadBrowser] = createBoxQuadTestProjects(
    options.boxQuadRoot,
    'box-quad',
  );
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
  const [drag2Browser, drag2Declaration, drag2Node] = createDragTestProjects(
    options.drag2Root,
    'drag2',
    options.drag2Commands,
  );
  const [tprocNode] = createTprocTestProjects(options.tprocRoot, 'tproc');
  const [viteTraitsPluginNode] = createViteTraitsPluginTestProjects(
    options.viteTraitsPluginRoot,
    'vite-traits-plugin',
  );

  return mergeConfig(createTestBaseConfig(options.root), {
    test: {
      projects: assignGroupOrder([
        materialXBrowser,
        materialXSpec,
        materialXVisual,
        coreBrowser,
        materialXNode,
        coreDeclaration,
        boxQuadBrowser,
        dragBrowser,
        dragNode,
        dragDeclaration,
        drag2Browser,
        drag2Node,
        drag2Declaration,
        tprocNode,
        viteTraitsPluginNode,
      ]),
    },
  });
}
