import { rejects, strictEqual } from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { findProjectRoot, resolveRole } from '../scripts/resolve-role.ts';
import { definition, project, run, SCRIPTS } from './support.ts';

const RESOLVER = join(SCRIPTS, 'resolve-role.ts');

describe('resolveRole', () => {
  it('should resolve a declared effort', async () => {
    const root = await project({
      'architect.md': definition('name: architect\nmodel: opus\neffort: high'),
    });

    strictEqual((await resolveRole(root, 'architect')).kind, 'declared');
  });

  it('should report a definition carrying no effort as undeclared', async () => {
    const root = await project({
      'architect.md': definition('name: architect\nmodel: opus'),
    });

    strictEqual((await resolveRole(root, 'architect')).kind, 'undeclared');
  });

  it('should report a name it does not own as out-of-domain', async () => {
    const root = await project({
      'architect.md': definition('name: architect\neffort: high'),
    });

    strictEqual(
      (await resolveRole(root, 'general-purpose')).kind,
      'out-of-domain',
    );
  });

  it('should resolve a haiku definition carrying no effort as exempt', async () => {
    const root = await project({
      'explore.md': definition('name: Explore\nmodel: haiku'),
    });

    strictEqual((await resolveRole(root, 'Explore')).kind, 'exempt');
  });

  it('should keep an exempt role distinct from an undeclared one', async () => {
    const root = await project({
      'explore.md': definition('name: Explore\nmodel: haiku'),
      'cleanup.md': definition('name: cleanup\nmodel: sonnet'),
    });

    const exempt = await resolveRole(root, 'Explore');
    const undeclared = await resolveRole(root, 'cleanup');

    strictEqual(exempt.kind === undeclared.kind, false);
  });

  it('should throw for a haiku definition that also declares an effort', async () => {
    const root = await project({
      'explore.md': definition('name: Explore\nmodel: haiku\neffort: high'),
    });

    await rejects(resolveRole(root, 'Explore'), /never be reported/u);
  });

  it('should throw when two definitions claim one name', async () => {
    const root = await project({
      'a.md': definition('name: architect\neffort: high'),
      'b.md': definition('name: architect\neffort: low'),
    });

    await rejects(resolveRole(root, 'architect'), /more than one definition/u);
  });

  it('should match the frontmatter name rather than the filename', async () => {
    const root = await project({
      'explore.md': definition('name: Explore\nmodel: haiku'),
    });

    strictEqual((await resolveRole(root, 'explore')).kind, 'out-of-domain');
  });

  it('should exempt a quoted haiku model', async () => {
    const root = await project({
      'explore.md': definition("name: Explore\nmodel: 'haiku'"),
    });

    strictEqual((await resolveRole(root, 'Explore')).kind, 'exempt');
  });

  it('should hold a model merely containing haiku to the invariant', async () => {
    const root = await project({
      'explore.md': definition('name: Explore\nmodel: claude-haiku-4'),
    });

    strictEqual((await resolveRole(root, 'Explore')).kind, 'undeclared');
  });
});

describe('findProjectRoot', () => {
  it('should find the nearest ancestor holding a definitions directory', async () => {
    const root = await project({
      'architect.md': definition('name: architect\neffort: high'),
    });
    const nested = join(root, 'packages', 'core', 'src');

    await mkdir(nested, { recursive: true });

    strictEqual(await findProjectRoot(nested), root);
  });

  it('should return null when no ancestor holds one', async () => {
    strictEqual(await findProjectRoot('/'), null);
  });
});

describe('resolve-role CLI', () => {
  it('should print the root and the level for a declared role', async () => {
    const root = await project({
      'architect.md': definition('name: architect\neffort: high'),
    });
    const { code, stdout } = await run('node', [RESOLVER, 'architect', root]);

    strictEqual(code, 0);
    strictEqual(stdout, `${root}\thigh\n`);
  });

  it('should print an empty level for an exempt role', async () => {
    const root = await project({
      'explore.md': definition('name: Explore\nmodel: haiku'),
    });
    const { code, stdout } = await run('node', [RESOLVER, 'Explore', root]);

    strictEqual(code, 0);
    strictEqual(stdout, `${root}\t\n`);
  });

  it('should exit non-zero for an undeclared role', async () => {
    const root = await project({
      'cleanup.md': definition('name: cleanup\nmodel: sonnet'),
    });

    strictEqual((await run('node', [RESOLVER, 'cleanup', root])).code, 68);
  });

  it('should exit non-zero for a role it does not own', async () => {
    const root = await project({
      'architect.md': definition('name: architect\neffort: high'),
    });

    strictEqual((await run('node', [RESOLVER, 'nobody', root])).code, 67);
  });

  it('should exit non-zero for a haiku definition that also declares an effort', async () => {
    const root = await project({
      'explore.md': definition('name: Explore\nmodel: haiku\neffort: high'),
    });
    const { code, stderr } = await run('node', [RESOLVER, 'Explore', root]);

    strictEqual(code === 0, false);
    strictEqual(stderr.includes('never be reported'), true);
  });
});
