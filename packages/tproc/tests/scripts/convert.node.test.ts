import { describe, expect, it } from 'vitest';
import { convert, type SourceTable } from '../../scripts/convert.ts';

const DS = 'designSystems/ds';
const GROUP = `${DS}/contextTagGroups/g1`;
const TAG = `${GROUP}/tags/t1`;
const SET = `${DS}/tokenSets/s1`;
const TOKEN = `${SET}/tokens/k1`;
const VALUE = `${TOKEN}/values/v1`;
const OTHER = `${SET}/tokens/k2`;
const OTHER_VALUE = `${OTHER}/values/v2`;

type Table = Readonly<Record<string, unknown>>;
type Path = ReadonlyArray<string | number>;

const TREE: Path = [
  'system',
  'contextualReferenceTrees',
  TOKEN,
  'contextualReferenceTree',
  0,
];

/** Reads the record at `path` inside upstream's untyped JSON. */
function at(table: Table, path: Path): object {
  return path.reduce<object>(
    (record, key) => Reflect.get(record, key) as object,
    table,
  );
}

/** Sets the field at `path`, or deletes it when `value` is `undefined`. */
function edit(table: Table, path: Path, value?: unknown): void {
  const record = at(table, path.slice(0, -1));
  const key = path.at(-1)!;
  if (value === undefined) {
    Reflect.deleteProperty(record, key);
  } else {
    Reflect.set(record, key, value);
  }
}

/** Renames the field at `path`. */
function rename(table: Table, path: Path, name: string): void {
  const value: unknown = Reflect.get(
    at(table, path.slice(0, -1)),
    path.at(-1)!,
  );
  edit(table, path);
  edit(table, [...path.slice(0, -1), name], value);
}

type StoredSetFile = Readonly<{
  tokens: ReadonlyArray<Readonly<Record<string, unknown>>>;
}>;

/**
 * A table holding `md.comp.test.a`, which references `md.comp.test.b`, with
 * the fields the converter drops beside the ones it keeps.
 */
function createTable(versionName = '1.0.0'): Table {
  return {
    system: {
      displayName: 'Test system',
      revisionAuthor: { emailAddress: 'someone@example.com' },
      version: {
        name: `${DS}/versions/ver1`,
        versionName,
        createTime: '2026-01-01T00:00:00Z',
      },
      components: [{ name: `${DS}/components/c1`, displayName: 'Test' }],
      contextTagGroups: [
        {
          name: GROUP,
          contextTagGroupName: 'motion.scheme',
          displayName: 'Motion scheme',
          specificity: 1,
          defaultTag: TAG,
          revisionId: 'r',
        },
      ],
      tags: [
        {
          name: TAG,
          tagName: 'expressive',
          displayName: 'Expressive',
          tagOrder: 0,
        },
      ],
      displayGroups: [{ name: `${DS}/displayGroups/d1`, displayName: 'Group' }],
      tokenSets: [
        {
          name: SET,
          tokenSetName: 'md.comp.test',
          displayName: 'Test',
          description: 'A test set',
          tokenType: 'TOKEN_TYPE_UNSPECIFIED',
          custom: { token_class: 'component' },
          order: 1,
          createTime: '2026-01-01T00:00:00Z',
        },
      ],
      tokens: [
        {
          name: TOKEN,
          tokenName: 'md.comp.test.a',
          tokenNameSuffix: 'a',
          displayName: 'A',
          tokenValueType: 'LENGTH',
          displayGroup: `${DS}/displayGroups/d1`,
          orderInDisplayGroup: 0,
          state: 'ACTIVE',
          revisionAuthor: { gaiaId: '1' },
        },
        {
          name: OTHER,
          tokenName: 'md.comp.test.b',
          tokenNameSuffix: 'b',
          displayName: 'B',
          tokenValueType: 'LENGTH',
        },
      ],
      values: [
        {
          name: VALUE,
          contextTags: [TAG],
          specificityScore: '1',
          tokenName: 'md.comp.test.b',
          revisionId: 'r',
        },
        { name: OTHER_VALUE, length: { value: 4, unit: 'DP' } },
      ],
      contextualReferenceTrees: {
        [TOKEN]: {
          contextualReferenceTree: [
            {
              contextTags: [TAG],
              referenceTree: {
                value: { name: VALUE, version: 'x', revisionId: 'y' },
                tokenName: 'md.comp.test.a',
                childNodes: [
                  {
                    value: { name: OTHER_VALUE },
                    tokenName: 'md.comp.test.b',
                  },
                ],
              },
              resolvedValue: { length: { value: 4, unit: 'DP' } },
            },
          ],
        },
      },
      settings: { updateEmailSettings: ['someone@example.com'] },
    },
  };
}

const source = (table: Table, componentId = 'c1'): SourceTable => ({
  kind: 'TOKEN_TABLE',
  componentId,
  table,
});

const options = { release: '2026-01-01_00-00-00', fetchDate: '2026-01-02' };

function setFile(tables: readonly Table[]): StoredSetFile {
  const { files } = convert(
    tables.map((table, i) => source(table, `c${i}`)),
    options,
  );
  return JSON.parse(files.get('sets/md.comp.test.json')!) as StoredSetFile;
}

describe('convert', () => {
  it('should write the store in its schema', () => {
    expect(setFile([createTable()])).toEqual({
      tokenSetName: 'md.comp.test',
      displayName: 'Test',
      description: 'A test set',
      tokenType: 'TOKEN_TYPE_UNSPECIFIED',
      custom: { token_class: 'component' },
      order: 1,
      tokens: [
        {
          tokenName: 'md.comp.test.a',
          displayName: 'A',
          tokenValueType: 'LENGTH',
          displayGroup: 'Group',
          orderInDisplayGroup: 0,
          values: [
            {
              contextTags: { 'motion.scheme': 'expressive' },
              specificityScore: '1',
              tokenName: 'md.comp.test.b',
            },
          ],
          contextualReferenceTree: [
            {
              contextTags: { 'motion.scheme': 'expressive' },
              value: 0,
              referenceTree: {
                tokenName: 'md.comp.test.a',
                childNodes: [{ tokenName: 'md.comp.test.b' }],
              },
              resolvedValue: { length: { value: 4, unit: 'DP' } },
            },
          ],
        },
        {
          tokenName: 'md.comp.test.b',
          displayName: 'B',
          tokenValueType: 'LENGTH',
          values: [{ length: { value: 4, unit: 'DP' } }],
        },
      ],
    });
  });

  it('should give byte-identical files for the same tables', () => {
    const first = convert([source(createTable())], options).files;
    const second = convert([source(createTable())], options).files;
    expect([...second]).toEqual([...first]);
  });

  it('should drop a field the schema does not name', () => {
    const table = createTable();
    edit(table, ['system', 'tokens', 0, 'upstreamAddedField'], 'x');
    expect(setFile([table]).tokens[0]).not.toHaveProperty('upstreamAddedField');
  });

  it('should keep no email address or gaiaId key', () => {
    const text = [
      ...convert([source(createTable())], options).files.values(),
    ].join('');
    expect(text).not.toMatch(/@example\.com|gaiaId/u);
  });

  it('should refuse a store that would hold an email address', () => {
    const table = createTable();
    edit(
      table,
      ['system', 'tokens', 0, 'description'],
      'Ask someone@example.com',
    );
    expect(() => convert([source(table)], options)).toThrow(
      'sets/md.comp.test.json: -: -: holds an email address or a gaiaId key',
    );
  });

  it('should record the manifest with each file hash', () => {
    const { manifest } = convert([source(createTable())], options);
    expect(manifest.source).toEqual({
      baseUrl: 'https://m3.material.io/_dsm/data/dsdb-m3/',
      release: '2026-01-01_00-00-00',
      databases: [
        {
          versionName: '1.0.0',
          versionId: 'ver1',
          publishTime: '2026-01-01T00:00:00Z',
        },
      ],
    });
    expect(manifest.tables).toEqual([
      { kind: 'TOKEN_TABLE', componentId: 'c1', componentName: 'Test' },
    ]);
    expect(manifest.files.map(({ path }) => path)).toEqual([
      'context.json',
      'sets/md.comp.test.json',
    ]);
  });

  it('should write the context groups with tag names', () => {
    const { files } = convert([source(createTable())], options);
    expect(JSON.parse(files.get('context.json')!)).toEqual({
      contextTagGroups: [
        {
          contextTagGroupName: 'motion.scheme',
          displayName: 'Motion scheme',
          specificity: 1,
          defaultTag: 'expressive',
          tags: [
            { tagName: 'expressive', displayName: 'Expressive', tagOrder: 0 },
          ],
        },
      ],
    });
  });

  it('should name a token that no set holds after its suffix', () => {
    const table = createTable();
    edit(table, ['system', 'tokens', 2], {
      name: `${DS}/tokens/k3`,
      tokenName: 'md.sys.loose.c',
      tokenNameSuffix: 'c',
      displayName: 'C',
      tokenValueType: 'LENGTH',
    });
    const { files } = convert([source(table)], options);
    expect(JSON.parse(files.get('sets/md.sys.loose.json')!)).toEqual({
      tokenSetName: 'md.sys.loose',
      tokens: [
        {
          tokenName: 'md.sys.loose.c',
          displayName: 'C',
          tokenValueType: 'LENGTH',
          values: [],
        },
      ],
    });
  });
});

describe('convert refusals', () => {
  const refuses = (table: Table, message: string): void => {
    expect(() => convert([source(table)], options)).toThrow(message);
  };

  it('should refuse a token without a field it reads', () => {
    const table = createTable();
    edit(table, ['system', 'tokens', 0, 'displayName']);
    refuses(
      table,
      'TOKEN_TABLE.c1: md.comp.test.a: displayName: is not a string',
    );
  });

  it('should refuse a removed contextualReferenceTree', () => {
    const table = createTable();
    edit(table, ['system', 'contextualReferenceTrees', TOKEN], {});
    refuses(
      table,
      'TOKEN_TABLE.c1: md.comp.test.a: contextualReferenceTree: is not an array of objects',
    );
  });

  it('should refuse a renamed resolvedValue', () => {
    const table = createTable();
    rename(table, [...TREE, 'resolvedValue'], 'resolved');
    refuses(
      table,
      'TOKEN_TABLE.c1: md.comp.test.a: contextualReferenceTree: has 0 resolved forms, not one',
    );
  });

  it('should refuse a value with no known value field', () => {
    const table = createTable();
    rename(table, ['system', 'values', 0, 'tokenName'], 'upstreamKind');
    refuses(
      table,
      'TOKEN_TABLE.c1: md.comp.test.a: values: has 0 value fields (), not one',
    );
  });

  it('should refuse a value with two value fields', () => {
    const table = createTable();
    edit(table, ['system', 'values', 0, 'numeric'], 1);
    refuses(
      table,
      'TOKEN_TABLE.c1: md.comp.test.a: values: has 2 value fields (tokenName, numeric), not one',
    );
  });

  it('should refuse a literal of another type', () => {
    const table = createTable();
    edit(table, ['system', 'values', 1, 'length'], 4);
    refuses(
      table,
      'TOKEN_TABLE.c1: md.comp.test.b: values.length: is not a object',
    );
  });

  it('should refuse a tag id that names no tag', () => {
    const table = createTable();
    edit(
      table,
      ['system', 'values', 0, 'contextTags'],
      [`${GROUP}/tags/missing`],
    );
    refuses(
      table,
      `TOKEN_TABLE.c1: md.comp.test.a: contextTags: ${GROUP}/tags/missing names no tag`,
    );
  });

  it("should refuse a tree that doesn't start at the token's own value", () => {
    const table = createTable();
    edit(table, [...TREE, 'referenceTree', 'value', 'name'], OTHER_VALUE);
    refuses(
      table,
      "TOKEN_TABLE.c1: md.comp.test.a: contextualReferenceTree.referenceTree.value: doesn't start at the token's own value",
    );
  });

  it('should refuse a one-hop reference to a missing token', () => {
    const table = createTable();
    edit(table, ['system', 'values', 0, 'tokenName'], 'md.comp.test.missing');
    refuses(
      table,
      'TOKEN_TABLE.c1: md.comp.test.a: values.tokenName: names md.comp.test.missing, not in the store',
    );
  });

  it('should refuse a tree node naming a missing token', () => {
    const table = createTable();
    edit(
      table,
      [...TREE, 'referenceTree', 'childNodes', 0, 'tokenName'],
      'md.comp.test.missing',
    );
    refuses(
      table,
      'TOKEN_TABLE.c1: md.comp.test.a: contextualReferenceTree.referenceTree: names md.comp.test.missing, not in the store',
    );
  });

  it('should refuse a customComposite property naming a missing token', () => {
    const table = createTable();
    edit(table, ['system', 'values', 0, 'tokenName']);
    edit(table, ['system', 'values', 0, 'customComposite'], {
      properties: { damping: { tokenName: 'md.comp.test.missing' } },
    });
    refuses(
      table,
      'TOKEN_TABLE.c1: md.comp.test.a: values.customComposite.properties.damping: names md.comp.test.missing, not in the store',
    );
  });

  it('should refuse two tables of different versions', () => {
    expect(() =>
      convert(
        [
          source(createTable('1.0.0'), 'c1'),
          source(createTable('2.0.0'), 'c2'),
        ],
        options,
      ),
    ).toThrow(
      'TOKEN_TABLE.c2: -: system.version.versionName: is 2.0.0, and TOKEN_TABLE.c1 is 1.0.0',
    );
  });

  it('should refuse a token that two tables convert differently', () => {
    const other = createTable();
    edit(other, ['system', 'tokens', 0, 'displayName'], 'Other');
    expect(() =>
      convert([source(createTable(), 'c1'), source(other, 'c2')], options),
    ).toThrow(
      'TOKEN_TABLE.c2: md.comp.test.a: token: converts differently in TOKEN_TABLE.c1',
    );
  });
});

describe('convert legacy', () => {
  it('should keep the first table and list a token two tables convert differently', () => {
    const other = createTable('2.0.0');
    edit(other, ['system', 'tokens', 0, 'displayName'], 'Other');
    const { conflicts, files, manifest } = convert(
      [source(createTable(), 'c1'), source(other, 'c2')],
      { release: null, fetchDate: null, legacy: true },
    );

    expect(conflicts).toEqual([
      {
        kind: 'token',
        name: 'md.comp.test.a',
        keptTable: 'TOKEN_TABLE.c1',
        otherTable: 'TOKEN_TABLE.c2',
      },
    ]);
    expect(
      (JSON.parse(files.get('sets/md.comp.test.json')!) as StoredSetFile)
        .tokens[0]?.['displayName'],
    ).toBe('A');
    expect(manifest.source.databases.map((d) => d.versionName)).toEqual([
      '1.0.0',
      '2.0.0',
    ]);
  });
});
