import { describe, expect, it } from 'vitest';
import type { Conversion } from '../../scripts/convert.ts';
import { diffStores, report, storeFromFiles } from '../../scripts/report.ts';
import type { Manifest, StoredSet } from '../../src/store/schema.ts';
import { Store } from '../../src/store/Store.ts';
import { createContext, createToken, createTokenSet } from '../helpers.ts';

const SET = 'md.comp.test';

function storeOf(...sets: readonly StoredSet[]): Store {
  return new Store({ context: createContext(), sets });
}

/** A token whose expressive value is `expressive` and standard value 1. */
function contextual(tokenName: string, expressive: string): StoredSet {
  return createTokenSet({
    tokens: [
      createToken({
        tokenName,
        values: [
          { contextTags: { 'motion.scheme': 'standard' }, numeric: 1 },
          {
            contextTags: { 'motion.scheme': 'expressive' },
            tokenName: expressive,
          },
        ],
        contextualReferenceTree: [
          {
            contextTags: { 'motion.scheme': 'standard' },
            value: 0,
            referenceTree: { tokenName },
            resolvedValue: { numeric: 1 },
          },
          {
            contextTags: { 'motion.scheme': 'expressive' },
            value: 1,
            referenceTree: { tokenName },
            resolvedValue: { numeric: 2 },
          },
        ],
      }),
    ],
  });
}

function section(lines: readonly string[], heading: string): string[] {
  const start = lines.findIndex((line) => line.startsWith(`## ${heading}:`));
  const end = lines.findIndex((line, i) => i > start && line.startsWith('## '));
  return lines.slice(start, end < 0 ? undefined : end).filter(Boolean);
}

const MANIFEST: Manifest = {
  storeVersion: 1,
  source: {
    baseUrl: 'https://example.test/',
    release: '2026-01-01_00-00-00',
    databases: [{ versionName: '1.0.0', versionId: 'v1', publishTime: 't' }],
  },
  fetchDate: '2026-01-01',
  tables: [],
  files: [],
};

describe('diffStores', () => {
  it('should list a token added, by set', () => {
    const lines = diffStores(
      storeOf(createTokenSet()),
      storeOf(createTokenSet({ tokens: [createToken({ tokenName: 'a' })] })),
    );

    expect(section(lines, 'Tokens added')).toEqual([
      '## Tokens added: 1',
      `### \`${SET}\``,
      '- `a`',
    ]);
  });

  it('should list a token removed, by its old set', () => {
    const lines = diffStores(
      storeOf(createTokenSet({ tokens: [createToken({ tokenName: 'a' })] })),
      storeOf(createTokenSet()),
    );

    expect(section(lines, 'Tokens removed')).toEqual([
      '## Tokens removed: 1',
      `### \`${SET}\``,
      '- `a`',
    ]);
  });

  it('should list a deprecation added, with its replacement', () => {
    const lines = diffStores(
      storeOf(createTokenSet({ tokens: [createToken({ tokenName: 'a' })] })),
      storeOf(
        createTokenSet({
          tokens: [
            createToken({
              tokenName: 'a',
              deprecationMessage: { message: 'm', replacementTokenName: 'b' },
            }),
          ],
        }),
      ),
    );

    expect(section(lines, 'Deprecations added')).toEqual([
      '## Deprecations added: 1',
      `### \`${SET}\``,
      '- `a`, replaced by `b`',
    ]);
  });

  it("should list a token deprecated by its set's display name", () => {
    const token = createToken({ tokenName: 'a' });
    const lines = diffStores(
      storeOf(createTokenSet({ tokens: [token] })),
      storeOf(
        createTokenSet({ displayName: '[Deprecated] Test', tokens: [token] }),
      ),
    );

    expect(section(lines, 'Deprecations added')[0]).toBe(
      '## Deprecations added: 1',
    );
  });

  it('should list a changed selected value with its old and new value', () => {
    const lines = diffStores(
      storeOf(contextual('a', 'md.sys.old')),
      storeOf(contextual('a', 'md.sys.new')),
    );

    expect(
      section(lines, 'Selected values changed, in the rendered context'),
    ).toEqual([
      '## Selected values changed, in the rendered context: 1',
      `### \`${SET}\``,
      '- `a`: `{"tokenName":"md.sys.old"}` → `{"tokenName":"md.sys.new"}`',
    ]);
  });

  it('should not list a change to a value that is not selected', () => {
    const before = contextual('a', 'md.sys.same');
    const after = contextual('a', 'md.sys.same');
    const [token] = after.tokens as [StoredSet['tokens'][number]];
    const changed = createTokenSet({
      tokens: [
        {
          ...token,
          values: [{ ...token.values[0], numeric: 3 }, token.values[1]!],
        },
      ],
    });

    expect(diffStores(storeOf(before), storeOf(changed))).toContain(
      '## Selected values changed, in the rendered context: 0',
    );
  });
});

describe('report', () => {
  const after = createTokenSet({ tokens: [createToken({ tokenName: 'a' })] });
  const conversion: Conversion = {
    files: new Map([
      ['manifest.json', '{}'],
      ['context.json', JSON.stringify(createContext())],
      [`sets/${SET}.json`, JSON.stringify(after)],
    ]),
    manifest: MANIFEST,
    conflicts: [],
    covered: { copies: 0, tokens: 0 },
  };

  it('should compare against the store it replaces', () => {
    const text = report(conversion, {
      manifest: MANIFEST,
      store: storeOf(createTokenSet()),
    });

    expect(text).toContain(
      'Against the store it replaces: release 2026-01-01_00-00-00, database 1.0.0.',
    );
    expect(text).toContain('## Tokens added: 1');
  });

  it('should leave out the differences with no store to replace', () => {
    expect(report(conversion)).not.toContain('## Tokens added');
  });
});

describe('storeFromFiles', () => {
  it('should read the sets and the context back', () => {
    const store = storeFromFiles(
      new Map([
        ['context.json', JSON.stringify(createContext())],
        [`sets/${SET}.json`, JSON.stringify(createTokenSet())],
      ]),
    );

    expect([store.sets.length, store.tagGroups.length]).toEqual([1, 1]);
  });
});
