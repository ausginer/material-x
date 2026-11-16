import { availableParallelism } from 'node:os';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { playwright } from '@vitest/browser-playwright';
import { webdriverio } from '@vitest/browser-webdriverio';
import type { ConfigEnv, UserConfig } from 'vite';
import {
  mergeConfig,
  type TestProjectInlineConfiguration,
} from 'vitest/config';
import type { BrowserCommand } from 'vitest/node';
// The rule lives with the package it resolves, and the package does not publish
// its tests.
// eslint-disable-next-line import-x/no-relative-packages
import { publishedEntries } from '../packages/drag/tests/support/published-entries.ts';
import { fitSafariWindow } from './safari-window.ts';
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
// Vitest's `cores - 1`, because several files in this group spawn work that uses
// more than the one core the worker holding it is counted as: `consumer.node`
// runs `npm pack` and `tsc`, and `size.node` bundles and compresses. At
// `cores - 1` the group oversubscribed badly enough to time out three tests;
// measured on all five node projects, 40 s with four failures against 45 s with
// none. It has not been repeated since.
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
 *
 * Every project also sets `extends: false`. This is the one funnel every config
 * passes through, and each project already holds its whole configuration. Since
 * Vitest 5 an inline project otherwise re-evaluates the file that declares it,
 * and each copy brings its own one-shot reporter.
 */
function assignGroupOrder(
  projects: readonly UserConfig[],
): TestProjectInlineConfiguration[] {
  const shared = projects.filter(isBrowserProjectConfig).length + 1;
  let browser = 0;

  return projects.map((project) => {
    let groupOrder = shared;

    if (isBrowserProjectConfig(project)) {
      browser += 1;
      groupOrder = browser;
    }

    return mergeConfig(project, {
      extends: false,
      test: { sequence: { groupOrder } },
    } satisfies TestProjectInlineConfiguration);
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
  globalSetup?: readonly string[];
}>;

/**
 * A build the node project needs before any of its files starts. One value so
 * that no config can take the global setup without the setup file that raises
 * its failure.
 */
type NodeProjectBuild = Readonly<{
  globalSetup: readonly string[];
  setupFiles: readonly string[];
}>;

/**
 * A browser project that runs a package's public browser tests against the files
 * its build emits for publication. `globalSetup` builds once, before any of the
 * project's files starts, and `setupFiles` raises a failed build in each file.
 * `sourceOnly` lists the browser files that read a development instrument or an
 * internal member, which the build folds away or does not publish.
 */
type ConsumerProject = Readonly<{
  sourceOnly: readonly string[];
  globalSetup: readonly string[];
  setupFiles: readonly string[];
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
  dragCommands: Readonly<Record<string, BrowserCommand<any[]>>>;
  coreRoot: URL;
  dragRoot: URL;
  tprocRoot: URL;
  viteTraitsPluginRoot: URL;
}>;

type Engine = 'chromium' | 'firefox' | 'safari';

const ENGINES: readonly Engine[] = ['chromium', 'firefox', 'safari'];

function isEngine(name: string): name is Engine {
  return (ENGINES as readonly string[]).includes(name);
}

/**
 * `MX_TEST_ENGINES`, a comma-separated list of engines, `chromium` by default.
 * Each browser project except visual is declared once per listed engine, and
 * visual is declared once, in Chromium, when the list names it.
 */
function resolveEngines(): readonly Engine[] {
  const names = (process.env['MX_TEST_ENGINES'] ?? 'chromium')
    .split(',')
    .map((name) => name.trim())
    .filter((name) => name !== '');

  if (names.length === 0) {
    throw new Error('MX_TEST_ENGINES lists no engine');
  }

  return names.map((name) => {
    if (!isEngine(name)) {
      throw new Error(
        `MX_TEST_ENGINES lists an unknown engine: ${name}. Known engines: ${ENGINES.join(', ')}`,
      );
    }

    return name;
  });
}

const engines = resolveEngines();

// Vitest project names must be unique. In per-package mode `scope` is undefined
// and the bare base name (e.g. 'browser') is fine; in the combined workspace
// run every package contributes projects, so each name is suffixed with the
// package scope (e.g. 'browser/material-x') to avoid collisions.
function scopedName(base: string, scope?: string): string {
  return scope ? `${base}/${scope}` : base;
}

/**
 * Chromium is Playwright's full build, in Chrome's new headless mode, which the
 * `chromium` channel selects. The `chromium-headless-shell` build that
 * Playwright starts otherwise is a separate implementation. Chromium and Firefox
 * are the builds that the exact `playwright` dependency pins; Safari isn't
 * pinned.
 */
function createChromiumProvider(
  launchArgs: readonly string[] = [],
): ReturnType<typeof playwright> {
  return playwright({
    contextOptions: { deviceScaleFactor: 1 },
    launchOptions: {
      channel: 'chromium',
      args: [
        ...(isDebug
          ? [
              '--remote-debugging-port=9222',
              '--remote-allow-origins=*',
              '--no-sandbox',
            ]
          : []),
        ...launchArgs,
      ],
    },
  });
}

/**
 * Each engine's provider. Chromium and Firefox are Playwright's builds, which the
 * exact `playwright` dependency pins. Safari is the browser on the macOS that
 * runs it, driven through its own `safaridriver`, because only WebDriver drives
 * Safari.
 */
function createEngineProvider(
  engine: Engine,
  launchArgs?: readonly string[],
): ReturnType<typeof playwright> | ReturnType<typeof webdriverio> {
  if (engine === 'chromium') {
    return createChromiumProvider(launchArgs);
  }

  if (engine === 'safari') {
    return webdriverio();
  }

  return playwright({ contextOptions: { deviceScaleFactor: 1 } });
}

function createBrowserTestConfig(
  engine: Engine,
  commands?: Record<string, BrowserCommand<any[]>>,
  options?: Readonly<{ launchArgs?: readonly string[] }>,
): UserConfig {
  const isChromium = engine === 'chromium';
  const isSafari = engine === 'safari';

  return {
    test: {
      // A page in the background gets no input in Firefox and Safari, and
      // Safari allows one WebDriver session at a time.
      fileParallelism: isChromium && !isDebug,
      maxWorkers: isChromium ? (requestedWorkers ?? BROWSER_WORKERS) : 1,
      browser: {
        enabled: true,
        // Safari has no headless mode.
        headless: !isSafari,
        // Recording a trace step serializes its locator, and the WebdriverIO
        // provider's locator throws when nothing matches, so every
        // `not.toBeInTheDocument()` would fail in Safari. CI keeps no trace.
        ...(isSafari ? { traceView: 'off' as const } : {}),
        // Curated baselines are the only screenshots we keep; don't auto-capture
        // rasters for failed/expected-fail assertions in the behavior/spec
        // projects, which would otherwise litter __screenshots__.
        screenshotFailures: false,
        provider: createEngineProvider(engine, options?.launchArgs),
        // Pin the viewport and device scale so raster output is reproducible
        // across machines and CI. Screenshots are only valid for a fixed
        // environment (see .agents/docs/test-architecture.md). The pin is also
        // why the browser UI stays off under `DEBUG`: the UI nulls the
        // viewport, and Playwright rejects a device scale against a null one,
        // so the context is never created and the debug run executes nothing.
        // The UI is unreachable behind headless mode in Chromium and Firefox in
        // any case; debugging attaches to the CDP port opened by Chromium's
        // launch arguments.
        instances: [
          { browser: engine, viewport: { width: 1280, height: 720 } },
        ],
        commands: isSafari ? { ...commands, fitSafariWindow } : commands,
      },
      // Runs before the project's own setup files.
      ...(isSafari
        ? {
            setupFiles: [
              fileURLToPath(
                new URL('safari-window.browser.ts', import.meta.url),
              ),
            ],
          }
        : {}),
    },
  } satisfies UserConfig;
}

function createTestBaseConfig(root: URL): UserConfig {
  return {
    root: fileURLToPath(root),
    // Every project derives from here, which is what puts the one-shot contract
    // into the node and declaration projects: they carry no other plugins, and
    // `configureVitest` hooks are gathered per project.
    plugins: [oneShotTestExecution()],
    test: {
      maxWorkers: requestedWorkers ?? NON_BROWSER_WORKERS,
      tags: [
        {
          name: 'measurement',
          description:
            'Compares a size, an allocation or a time with a budget. CI reports it and never fails on it.',
        },
      ],
      coverage: {
        enabled: false,
        provider: 'v8',
        // The packages' source: `packages/*/src` from the root, `src` from a
        // package. Not tests, fixtures, tooling, build output or dependencies.
        include: ['packages/*/src/**', 'src/**'],
        reportsDirectory: '.coverage',
        // CI uploads coverage on every run, including one whose tests failed.
        reportOnFailure: true,
        clean: true,
        reporter: isCI ? ['lcov'] : ['html'],
      },
      includeTaskLocation: !isCI,
    },
  } satisfies UserConfig;
}

/**
 * One browser project in one engine. A Chromium project keeps its name, and
 * another engine's project is named `<name>/<engine>`. Only Chromium takes the
 * launch arguments, which are Chromium flags.
 */
function createBrowserTestProject(
  options: BrowserTestProjectOptions,
  engine: Engine,
): UserConfig {
  const baseConfig = mergeConfig(
    options.viteConfig ?? {},
    createTestBaseConfig(options.root),
  );

  return mergeConfig(
    mergeConfig(
      baseConfig,
      createBrowserTestConfig(engine, options.commands, {
        launchArgs: options.launchArgs,
      }),
    ),
    {
      test: {
        name:
          engine === 'chromium' ? options.name : `${options.name}/${engine}`,
        include: [...options.include],
        exclude: options.exclude ? [...options.exclude] : [],
        setupFiles: options.setupFiles ? [...options.setupFiles] : [],
      },
    },
  );
}

/** The browser project once per engine that `MX_TEST_ENGINES` lists. */
function createEngineTestProjects(
  options: BrowserTestProjectOptions,
): UserConfig[] {
  return engines.map((engine) => createBrowserTestProject(options, engine));
}

/**
 * `MX_TEST_VISUAL=1` declares the visual project. Its baselines are recorded and
 * compared on GitHub's runner only, so the gate's `chromium` job and the
 * recording workflow set it, and no local run does.
 */
const isVisual = process.env['MX_TEST_VISUAL'] === '1';

/**
 * The visual project, in Chromium only, because only Chromium baselines exist.
 * It is declared when `MX_TEST_VISUAL=1` and `MX_TEST_ENGINES` lists Chromium.
 */
function createVisualTestProjects(
  options: BrowserTestProjectOptions,
): UserConfig[] {
  return isVisual && engines.includes('chromium')
    ? [createBrowserTestProject(options, 'chromium')]
    : [];
}

function createNodeTestProject(options: NodeTestProjectOptions): UserConfig {
  return mergeConfig(createTestBaseConfig(options.root), {
    test: {
      name: options.name,
      include: [...options.include],
      setupFiles: options.setupFiles ? [...options.setupFiles] : [],
      globalSetup: options.globalSetup ? [...options.globalSetup] : [],
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
    ...createEngineTestProjects({
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
    ...createEngineTestProjects({
      name: scopedName('spec', scope),
      root,
      include: ['tests/**/*.spec.browser.test.ts'],
      setupFiles: ['tests/support/browser-setup.ts'],
      commands,
      viteConfig: createMaterialXViteConfig(env, root),
    }),
    ...createVisualTestProjects({
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
    ...createEngineTestProjects({
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

/** `@ydinjs/drag`'s source projects install the oracles on `src`. */
const DRAG_SOURCE_SETUP_FILES: readonly string[] = [
  'tests/support/oracles.source.ts',
];

function createDragBrowserTestProjects(
  root: URL,
  name: string,
  include: readonly string[],
  exclude: readonly string[],
  setupFiles: readonly string[],
  commands?: Record<string, BrowserCommand<any[]>>,
): UserConfig[] {
  return createEngineTestProjects({
    name,
    root,
    include,
    exclude,
    setupFiles,
    // M-6's census drives Playwright's own input pipeline; a dispatched event
    // never reaches the coalescing decision the measurement is about.
    commands,
    // The phase 11 measurement suites need a deterministic heap: `gc()` to
    // settle it before a sample, and precise `performance.memory` rather than
    // the 100kB-quantized figure Chrome reports by default. Both are inert for
    // every other test in the project.
    launchArgs: ['--js-flags=--expose-gc', '--enable-precise-memory-info'],
    viteConfig: mergeConfig(createCoreViteConfig(root), {
      // The React fixtures (`tests/**/react*.browser.test.ts`) need exactly
      // one copy of React: without deduping, the optimizer gives `react-dom`
      // its own inlined `react`, the hook dispatcher is null in the second
      // copy, and every render throws. Harmless for the packages themselves —
      // neither ships a React dependency.
      resolve: { dedupe: ['react', 'react-dom'] },
    } satisfies UserConfig),
  });
}

/**
 * `shipped` lists the browser files that count what the code a consumer installs
 * does at runtime. They run against `src` in a `shipped` browser project of their
 * own, without the test-side oracles, because the equivalence oracle's fresh
 * measurement is itself a layout read, and the ordinary browser project excludes
 * them. Every other browser project installs the oracles from its setup: on `src`
 * in the source projects, and on the emitted modules in the consumer project. The
 * `shipped` project exists only for a package that names such files, because a
 * project matching no file fails the run.
 */
function createDragTestProjects(
  root: URL,
  scope?: string,
  commands?: Record<string, BrowserCommand<any[]>>,
  shipped: readonly string[] = [],
  nodeBuild?: NodeProjectBuild,
  consumer?: ConsumerProject,
): UserConfig[] {
  return [
    ...createDragBrowserTestProjects(
      root,
      scopedName('browser', scope),
      ['tests/**/*.browser.test.ts'],
      shipped,
      DRAG_SOURCE_SETUP_FILES,
      commands,
    ),
    ...(shipped.length > 0
      ? createDragBrowserTestProjects(
          root,
          scopedName('shipped', scope),
          shipped,
          [],
          [],
          commands,
        )
      : []),
    ...(consumer
      ? createDragBrowserTestProjects(
          root,
          scopedName('consumer', scope),
          ['tests/**/*.browser.test.ts'],
          [...shipped, ...consumer.sourceOnly],
          consumer.setupFiles,
          commands,
        ).map((project) =>
          mergeConfig(project, {
            plugins: [publishedEntries(fileURLToPath(root))],
            test: {
              globalSetup: [...consumer.globalSetup],
            },
          } satisfies UserConfig),
        )
      : []),
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
      ...nodeBuild,
    }),
  ];
}

function createBoxQuadTestProjects(root: URL, scope?: string): UserConfig[] {
  return createEngineTestProjects({
    name: scopedName('browser', scope),
    root,
    include: ['tests/**/*.browser.test.ts'],
    viteConfig: createViteConfig(root),
  });
}

export function createBoxQuadTestConfig(root: URL): UserConfig {
  return {
    test: {
      projects: assignGroupOrder(createBoxQuadTestProjects(root)),
    },
  };
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

/**
 * `@ydinjs/drag`'s files for the `shipped` project: the hot-path census counts the
 * geometry reads and allocations a consumer's build performs, and the equivalence
 * oracle is itself such a read.
 */
export const DRAG_SHIPPED_BROWSER_TESTS: readonly string[] = [
  'tests/hot-path.browser.test.ts',
];

/**
 * `@ydinjs/drag`'s browser files that run in the source projects only, because
 * each test in them reads an internal member, which the package does not publish,
 * or the stories, which import `src`.
 */
export const DRAG_SOURCE_ONLY_BROWSER_TESTS: readonly string[] = [
  // `src/kernel/callbacks.ts`, which no entry publishes.
  'tests/callbacks.browser.test.ts',
  // The displacement sink's `report` and `displaced`, which only the unpublished
  // installer types declare.
  'tests/displacement-sink.browser.test.ts',
  // The stories, which import `src`.
  'tests/stories.browser.test.ts',
];

/** Raises a failed build before anything imports the emitted tree. */
const DRAG_REQUIRE_BUILD = 'tests/support/require-build.ts';

/**
 * `@ydinjs/drag`'s consumer project: the browser files apart from the `shipped`
 * and source-only ones, against the build that `just build` makes, with the
 * oracles installed on the emitted modules.
 */
export const DRAG_CONSUMER: ConsumerProject = {
  sourceOnly: DRAG_SOURCE_ONLY_BROWSER_TESTS,
  globalSetup: ['tests/support/build-package.node.ts'],
  setupFiles: [DRAG_REQUIRE_BUILD, 'tests/support/oracles.build.ts'],
};

/**
 * `@ydinjs/drag`'s node project reads the build that the consumer project reads,
 * because the size gate bundles the emitted tree. Both projects take the same
 * global setup, which builds once per run with either project or both.
 */
export const DRAG_NODE_BUILD: NodeProjectBuild = {
  globalSetup: DRAG_CONSUMER.globalSetup,
  setupFiles: [DRAG_REQUIRE_BUILD],
};

export function createDragTestConfig(
  root: URL,
  commands?: Record<string, BrowserCommand<any[]>>,
  shipped: readonly string[] = [],
  nodeBuild?: NodeProjectBuild,
  consumer?: ConsumerProject,
): UserConfig {
  return {
    test: {
      projects: assignGroupOrder(
        createDragTestProjects(
          root,
          undefined,
          commands,
          shipped,
          nodeBuild,
          consumer,
        ),
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
  // The repository's own tooling, such as the record resolver.
  const repoNode = createNodeTestProject({
    name: 'repo',
    root: options.root,
    include: ['.scripts/**/*.node.test.ts'],
  });

  return mergeConfig(createTestBaseConfig(options.root), {
    test: {
      projects: assignGroupOrder([
        ...createMaterialXTestProjects(
          env,
          options.materialXRoot,
          options.materialXCommands,
          'material-x',
        ),
        ...createCoreTestProjects(options.coreRoot, 'core'),
        ...createBoxQuadTestProjects(options.boxQuadRoot, 'box-quad'),
        ...createDragTestProjects(
          options.dragRoot,
          'drag',
          options.dragCommands,
          DRAG_SHIPPED_BROWSER_TESTS,
          DRAG_NODE_BUILD,
          DRAG_CONSUMER,
        ),
        ...createTprocTestProjects(options.tprocRoot, 'tproc'),
        ...createViteTraitsPluginTestProjects(
          options.viteTraitsPluginRoot,
          'vite-traits-plugin',
        ),
        repoNode,
      ]),
    },
  });
}
