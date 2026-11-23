import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Manifest } from '../../src/store/schema.ts';
import { loadStore, Store } from '../../src/store/Store.ts';
import { createContext, createToken, createTokenSet } from '../helpers.ts';

const STORE = new URL('../../tokens/', import.meta.url);

describe('Store', () => {
  const token = createToken({
    tokenName: 'md.comp.test.token',
    values: [
      { contextTags: { 'motion.scheme': 'standard' }, numeric: 1 },
      { contextTags: { 'motion.scheme': 'expressive' }, numeric: 2 },
    ],
    contextualReferenceTree: [
      {
        contextTags: { 'motion.scheme': 'standard' },
        value: 0,
        referenceTree: { tokenName: 'md.comp.test.token' },
        resolvedValue: { numeric: 1 },
      },
      {
        contextTags: { 'motion.scheme': 'expressive' },
        value: 1,
        referenceTree: { tokenName: 'md.comp.test.token' },
        resolvedValue: { numeric: 2 },
      },
    ],
  });
  const store = new Store({
    context: createContext(),
    sets: [
      createTokenSet({
        tokens: [
          token,
          createToken({
            tokenName: 'md.comp.test.plain',
            values: [{ numeric: 3 }],
          }),
        ],
      }),
      createTokenSet({
        tokenSetName: 'md.comp.old',
        displayName: '[Deprecated] Old',
        tokens: [createToken({ tokenName: 'md.comp.old.token' })],
      }),
    ],
  });

  it('should select the entry whose every tag the rendered context has', () => {
    const contexts = [
      { font: 'ios.bold', platform: 'web' },
      { font: 'static', platform: 'ios' },
      { font: 'static', platform: 'web' },
    ];
    const several = createToken({
      values: contexts.map((contextTags, i) => ({ contextTags, numeric: i })),
      contextualReferenceTree: contexts.map((contextTags, value) => ({
        contextTags,
        value,
        referenceTree: { tokenName: 'md.comp.test.token' },
        resolvedValue: { numeric: value },
      })),
    });

    expect(store.select(several)?.value.numeric).toBe(2);
  });

  it('should select the entry of another context that a caller names', () => {
    expect(
      store.select(token, { 'motion.scheme': 'standard' })?.value.numeric,
    ).toBe(1);
  });

  it('should keep the rendered tags of the groups a caller leaves out', () => {
    expect(store.select(token, { theme: 'dark' })?.value.numeric).toBe(2);
  });

  it('should select an entry that has no tag', () => {
    const untagged = createToken({
      values: [{ numeric: 4 }],
      contextualReferenceTree: [
        {
          value: 0,
          referenceTree: { tokenName: 'md.comp.test.token' },
          resolvedValue: { numeric: 4 },
        },
      ],
    });

    expect(store.select(untagged)?.value.numeric).toBe(4);
  });

  it('should select nothing when no entry matches the context', () => {
    expect(store.select(token, { 'motion.scheme': 'none' })).toBeUndefined();
  });

  it('should select the first value of a token with no tree', () => {
    const plain = store.getToken('md.comp.test.plain')!;
    expect(store.select(plain)).toEqual({ value: { numeric: 3 } });
  });

  it('should select nothing for a token with no value', () => {
    expect(store.select(store.getToken('md.comp.old.token')!)).toBeUndefined();
  });

  it("should find a token's set", () => {
    expect(store.getTokenSet(token).tokenSetName).toBe('md.comp.test');
  });

  it('should treat a token of a deprecated set as deprecated', () => {
    expect(store.isTokenDeprecated(store.getToken('md.comp.old.token')!)).toBe(
      true,
    );
  });
});

describe('loadStore', () => {
  let directory: string;

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'tproc-store-'));
  });

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  it('should load the committed store without a network request', async () => {
    vi.stubGlobal('fetch', () => {
      expect.fail('The store reader made a network request');
    });

    try {
      const store = await loadStore(STORE);
      expect(store.getToken('md.comp.checkbox.container.size')).toBeDefined();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('should name a missing store file', async () => {
    const manifest = JSON.parse(
      await readFile(new URL('manifest.json', STORE), 'utf8'),
    ) as Manifest;
    const [, first] = manifest.files as [unknown, Manifest['files'][number]];
    await cp(STORE, directory, {
      recursive: true,
      filter: (source) => !source.endsWith(first.path),
    });

    await expect(loadStore(pathToFileURL(`${directory}/`))).rejects.toThrow(
      `Token store file is missing: ${join(directory, first.path)}`,
    );
  });

  it('should name a store file that the manifest does not match', async () => {
    await cp(new URL('manifest.json', STORE), join(directory, 'manifest.json'));
    await cp(new URL('sets/', STORE), join(directory, 'sets'), {
      recursive: true,
    });
    await writeFile(join(directory, 'context.json'), '{}\n');

    await expect(loadStore(pathToFileURL(`${directory}/`))).rejects.toThrow(
      `Token store file doesn't match the manifest: ${join(directory, 'context.json')}`,
    );
  });
});
