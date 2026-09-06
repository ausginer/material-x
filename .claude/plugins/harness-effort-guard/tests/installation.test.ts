import { strictEqual } from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { isAbsolute, join, resolve } from 'node:path';
import { describe, it } from 'node:test';
import { PLUGIN_ROOT, REPO_ROOT } from './support.ts';

/**
 * The guard is loaded by an ordinary interactive session, not by a launcher
 * flag, and that loading rests on three checked-in files agreeing: the project
 * settings naming `<plugin>@<marketplace>`, the marketplace manifest declaring
 * that plugin's directory, and the plugin manifest claiming that name.
 *
 * A disagreement between them does not fail loudly — the session simply starts
 * without the guard, and an unguarded session looks exactly like a clean one.
 * These cases are the loud failure.
 */
const MARKETPLACE = 'material-x';
const PLUGIN = 'harness-effort-guard';

type Settings = Readonly<{
  enabledPlugins?: Readonly<Record<string, boolean>>;
  extraKnownMarketplaces?: Readonly<
    Record<string, Readonly<{ source: Readonly<Record<string, string>> }>>
  >;
}>;

type Marketplace = Readonly<{
  name: string;
  plugins: ReadonlyArray<Readonly<{ name: string; source: string }>>;
}>;

async function json<T>(...path: readonly string[]): Promise<T> {
  return JSON.parse(await readFile(join(...path), 'utf8')) as T;
}

describe('project settings', () => {
  it('should enable the guard against the repository marketplace', async () => {
    const settings = await json<Settings>(
      REPO_ROOT,
      '.claude',
      'settings.json',
    );

    strictEqual(settings.enabledPlugins?.[`${PLUGIN}@${MARKETPLACE}`], true);
  });

  it('should declare the marketplace as a local directory', async () => {
    const settings = await json<Settings>(
      REPO_ROOT,
      '.claude',
      'settings.json',
    );

    strictEqual(
      settings.extraKnownMarketplaces?.[MARKETPLACE]?.source.source,
      'directory',
    );
  });

  // A network source cannot be vouched for from project scope, and an absolute
  // one is true of exactly one machine. A checked-in file has to be neither.
  it('should locate the marketplace by a relative path', async () => {
    const settings = await json<Settings>(
      REPO_ROOT,
      '.claude',
      'settings.json',
    );
    const { path } =
      settings.extraKnownMarketplaces?.[MARKETPLACE]?.source ?? {};

    strictEqual(isAbsolute(path ?? ''), false);
  });

  it('should point at a directory that holds the marketplace manifest', async () => {
    const settings = await json<Settings>(
      REPO_ROOT,
      '.claude',
      'settings.json',
    );
    const { path } =
      settings.extraKnownMarketplaces?.[MARKETPLACE]?.source ?? {};
    const manifest = await json<Marketplace>(
      resolve(REPO_ROOT, path ?? ''),
      '.claude-plugin',
      'marketplace.json',
    );

    strictEqual(manifest.name, MARKETPLACE);
  });
});

describe('marketplace manifest', () => {
  it('should list the guard', async () => {
    const manifest = await json<Marketplace>(
      REPO_ROOT,
      '.claude-plugin',
      'marketplace.json',
    );

    strictEqual(
      manifest.plugins.some((entry) => entry.name === PLUGIN),
      true,
    );
  });

  it('should source the guard from the plugin directory in this checkout', async () => {
    const manifest = await json<Marketplace>(
      REPO_ROOT,
      '.claude-plugin',
      'marketplace.json',
    );
    const entry = manifest.plugins.find((plugin) => plugin.name === PLUGIN);
    const declared = resolve(REPO_ROOT, entry?.source ?? '');

    strictEqual(declared, resolve(PLUGIN_ROOT));
  });

  it('should agree with the name the plugin manifest claims', async () => {
    const plugin = await json<Readonly<{ name: string }>>(
      PLUGIN_ROOT,
      '.claude-plugin',
      'plugin.json',
    );

    strictEqual(plugin.name, PLUGIN);
  });
});

describe('hook wiring', () => {
  // The launcher is a diagnostic now, and nothing about loading may depend on
  // it. `${CLAUDE_PLUGIN_ROOT}` is what makes the hook addressable from a
  // marketplace install; a path relative to the repository would resolve
  // against whatever directory the session happened to start in.
  it('should address its scripts through the plugin root', async () => {
    const hooks = await readFile(
      join(PLUGIN_ROOT, 'hooks', 'hooks.json'),
      'utf8',
    );

    strictEqual(
      hooks.includes(`\${CLAUDE_PLUGIN_ROOT}/scripts/guard.ts`),
      true,
    );
  });

  it('should not reference the launcher from any hook', async () => {
    const hooks = await readFile(
      join(PLUGIN_ROOT, 'hooks', 'hooks.json'),
      'utf8',
    );

    strictEqual(hooks.includes('claude-role'), false);
  });
});
