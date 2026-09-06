import { strictEqual } from 'node:assert/strict';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { definition, project, run } from './support.ts';

const LAUNCHER = join(
  import.meta.dirname,
  '..',
  '..',
  '..',
  '..',
  '.scripts',
  'claude-role.sh',
);

async function launch(
  root: string,
  role: string,
  env: Readonly<Record<string, string | undefined>> = {},
): Promise<Readonly<{ code: number; stdout: string; stderr: string }>> {
  return await run(LAUNCHER, [role], {
    cwd: root,
    env: {
      CLAUDE_ROLE_PRINT_ARGV: '1',
      CLAUDE_CODE_EFFORT_LEVEL: undefined,
      ...env,
    },
  });
}

const ROLES = {
  'architect.md': definition('name: architect\nmodel: opus\neffort: high'),
  'explore.md': definition('name: Explore\nmodel: haiku'),
  'cleanup.md': definition('name: cleanup\nmodel: sonnet'),
};

/**
 * The exact command line the launcher would exec, so a case can assert the
 * boundary between the two resolver fields rather than that a substring
 * survived somewhere in it.
 */
function argv(root: string, stdout: string): string {
  const [directory, command] = stdout.split('\n');

  strictEqual(directory, `cwd=${root}`);

  return command ?? '';
}

describe('claude-role.sh', () => {
  it('should pin the declared effort of a governed role', async () => {
    const root = await project(ROLES);
    const { code, stdout } = await launch(root, 'architect');

    strictEqual(code, 0);
    strictEqual(
      argv(root, stdout).endsWith(' --agent architect --effort high'),
      true,
    );
  });

  // The resolver's two fields are separated by a tab, and nothing else about
  // the line marks the boundary. A split on any other character would still
  // produce a plausible-looking argv — a truncated root, or a level built from
  // the tail of a path — so these two cases pin the separator itself.
  it('should read the level from beyond the separator, not from the root', async () => {
    const root = await project(ROLES, 'harness-effort-guard-letter-t-');
    const { stdout } = await launch(root, 'architect');

    strictEqual(argv(root, stdout).endsWith('--effort high'), true);
  });

  it('should cut at the last separator when the root holds one', async () => {
    const root = await project(ROLES, 'harness-effort-guard-\tseparator-');
    const { code, stdout } = await launch(root, 'architect');

    strictEqual(code, 0);
    strictEqual(argv(root, stdout).endsWith('--effort high'), true);
  });

  it('should omit the effort flag for a role outside the invariant', async () => {
    const { code, stdout } = await launch(await project(ROLES), 'Explore');

    strictEqual(code, 0);
    strictEqual(stdout.includes('--effort'), false);
  });

  it('should still pass the role and the plugin for an exempt role', async () => {
    const { stdout } = await launch(await project(ROLES), 'Explore');

    strictEqual(stdout.includes('--agent Explore'), true);
    strictEqual(stdout.includes('--plugin-dir'), true);
  });

  it('should start an exempt role from the resolved project root', async () => {
    const root = await project(ROLES);
    const { stdout } = await launch(root, 'Explore');

    strictEqual(stdout.includes(`cwd=${root}`), true);
  });

  it('should refuse a role that declares no effort', async () => {
    strictEqual(
      (await launch(await project(ROLES), 'cleanup')).code === 0,
      false,
    );
  });

  it('should refuse a role it does not own', async () => {
    strictEqual(
      (await launch(await project(ROLES), 'nobody')).code === 0,
      false,
    );
  });

  it('should refuse when a process-wide override is set', async () => {
    const { code } = await launch(await project(ROLES), 'Explore', {
      CLAUDE_CODE_EFFORT_LEVEL: 'medium',
    });

    strictEqual(code, 78);
  });
});
