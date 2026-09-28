import { strictEqual } from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { isAbsolute, join, resolve } from 'node:path';
import { describe, it } from 'node:test';
import { resolveRole } from '../scripts/resolve-role.ts';
import { DISPATCH_TOPOLOGY } from '../scripts/verdict.ts';
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
  agent?: string;
  env?: Readonly<Record<string, string>>;
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
type Hooks = Readonly<{
  hooks: Readonly<
    Record<
      string,
      ReadonlyArray<
        Readonly<{
          hooks: ReadonlyArray<
            Readonly<{ command: string; args?: readonly string[] }>
          >;
        }>
      >
    >
  >;
}>;

/**
 * The events the guard is wired to, and what each invocation passes.
 *
 * Named event by event rather than matched as a substring of the file. A
 * substring assertion survives the deletion of a whole event block, and
 * deleting the `PreToolUse` block is the one edit that turns the guard from
 * something that blocks into something that only watches.
 */
async function wiring(): Promise<Hooks['hooks']> {
  return (
    JSON.parse(
      await readFile(join(PLUGIN_ROOT, 'hooks', 'hooks.json'), 'utf8'),
    ) as Hooks
  ).hooks;
}

function invocations(wired: Hooks['hooks']): readonly string[] {
  return Object.values(wired).flatMap((matchers) =>
    matchers.flatMap((matcher) =>
      matcher.hooks.map((hook) => (hook.args ?? []).join(' ')),
    ),
  );
}

describe('hook wiring', () => {
  it('should wire exactly the five events the guard reasons about', async () => {
    strictEqual(
      Object.keys(await wiring())
        .sort()
        .join(),
      'PreToolUse,SessionStart,Stop,SubagentStart,SubagentStop',
    );
  });

  // The only event at which a denial can be applied. Losing this block leaves
  // the guard loaded, announcing and logging, and enforcing nothing.
  it('should wire PreToolUse, which is where enforcement happens', async () => {
    strictEqual('PreToolUse' in (await wiring()), true);
  });

  it('should run the guard on every wired event', async () => {
    const args = invocations(await wiring());

    strictEqual(args.length, 5);
    strictEqual(
      args.every((one) =>
        one.includes(`\${CLAUDE_PLUGIN_ROOT}/scripts/guard.ts`),
      ),
      true,
    );
  });

  // The fallback that absorbed a missing --data-dir is gone, so an event that
  // does not name one records nothing at all.
  it('should pass a data directory on every wired event', async () => {
    strictEqual(
      invocations(await wiring()).every((one) => one.includes('--data-dir')),
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

describe('tracked guard mode', () => {
  // Whether the invariant is enforced is a property of the checkout. A tracked
  // env block is what stops two sessions on one commit disagreeing about it.
  it('should declare the guard mode in the tracked settings file', async () => {
    const settings = await json<Settings>(
      REPO_ROOT,
      '.claude',
      'settings.json',
    );

    strictEqual(
      typeof settings.env?.HARNESS_EFFORT_GUARD_MODE === 'string',
      true,
    );
  });
});

/**
 * The owner selects the role a session runs as, and no tracked setting selects
 * one for them.
 *
 * A tracked `agent` would apply to every session started at the checkout root,
 * including one the owner meant to run as some other role: the flag they pass
 * would be overriding a default rather than making a choice, and a session
 * where they passed nothing would silently be a role. The setting's absence is
 * what makes the role an owner decision, so it is asserted rather than assumed.
 */
describe('tracked main-thread default', () => {
  it('should pin no main-thread agent in the tracked settings', async () => {
    const settings = await json<Settings>(
      REPO_ROOT,
      '.claude',
      'settings.json',
    );

    strictEqual(settings.agent, undefined);
  });
});

/**
 * The roles an owner starts directly, and what the guard must make of each.
 *
 * `declared` is the whole operating contract: a role resolving that way is one
 * the guard holds to a level, so a session started at the wrong effort denies
 * its first tool call instead of reasoning cheaper than its definition
 * requires. A role that quietly stopped resolving would be governed in the
 * documentation and unguarded in the session, and nothing in a transcript says
 * which.
 */
describe('direct role resolution', () => {
  const EFFORT_BEARING = [
    'architect',
    'implementer',
    'consolidator',
    'reviewer',
    'integrity',
    'cleanup',
    'der',
  ];

  it('should resolve every effort-bearing role to a declared level', async () => {
    const resolved = await Promise.all(
      EFFORT_BEARING.map((role) => resolveRole(REPO_ROOT, role)),
    );

    resolved.forEach((resolution, index) => {
      strictEqual(resolution.kind, 'declared', EFFORT_BEARING[index]);
    });
  });

  // The one project role outside the effort invariant. It has to stay
  // resolvable — exempt is governed, and an out-of-domain answer would mean the
  // guard had stopped owning the name rather than stopped holding it to a level.
  it('should resolve the haiku role as exempt', async () => {
    strictEqual((await resolveRole(REPO_ROOT, 'Explore')).kind, 'exempt');
  });

  // The model invariant is only executable where the definitions state a model,
  // and a role that states none is outside it without saying so.
  it('should resolve every effort-bearing role to a declared model', async () => {
    const resolved = await Promise.all(
      EFFORT_BEARING.map((role) => resolveRole(REPO_ROOT, role)),
    );

    resolved.forEach((resolution, index) => {
      strictEqual(
        resolution.kind !== 'out-of-domain' && resolution.model != null,
        true,
        EFFORT_BEARING[index],
      );
    });
  });

  it('should own no role definition for the retired router', async () => {
    strictEqual(
      (await resolveRole(REPO_ROOT, 'agent-router')).kind,
      'out-of-domain',
    );
  });
});

/**
 * The dispatch topology is written in the plugin and the roles it names live in
 * the checkout, so the two can drift: renaming or retiring a role leaves the map
 * permitting a `subagent_type` that selects nothing.
 *
 * Only this direction is checkable. A role no dispatcher may select is ordinary
 * — `Explore` is one — so the reverse is not a defect.
 */
describe('dispatch topology', () => {
  const defines = async (roles: readonly string[]): Promise<void> => {
    const resolved = await Promise.all(
      roles.map((role) => resolveRole(REPO_ROOT, role)),
    );

    resolved.forEach((resolution, index) => {
      strictEqual(resolution.kind === 'out-of-domain', false, roles[index]);
    });
  };

  it('should permit only roles this checkout defines', async () => {
    await defines([...DISPATCH_TOPOLOGY.values()].flatMap((set) => [...set]));
  });

  it('should constrain only roles this checkout defines', async () => {
    await defines([...DISPATCH_TOPOLOGY.keys()]);
  });
});
