import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import {
  STORE_VERSION,
  type ContextTags,
  type ContextualEntry,
  type Literal,
  type Manifest,
  type ManifestDatabase,
  type ManifestTable,
  type ReferenceTree,
  type StoredContext,
  type StoredSet,
  type StoredTag,
  type StoredTagGroup,
  type StoredToken,
  type StoredValue,
} from '../src/store/schema.ts';

export const SITE_BASE_URL = 'https://m3.material.io/_dsm/data/dsdb-m3/';

/** One downloaded database table, read in the order `tables` lists them. */
export type SourceTable = Readonly<{
  kind: string;
  componentId: string;
  /** The parsed table: upstream's JSON, typed only as far as it's checked. */
  table: unknown;
}>;

export type ConvertOptions = Readonly<{
  release: string | null;
  fetchDate: string | null;
  /**
   * The conversion of the snapshot committed before the store: its tables come
   * from two database versions, so a token two tables convert differently is
   * listed instead of refused, and the first table's copy is kept.
   */
  legacy?: boolean;
}>;

/** A token or context group that two tables convert differently. */
export type Conflict = Readonly<{
  kind: 'token' | 'set' | 'context';
  name: string;
  keptTable: string;
  otherTable: string;
}>;

export type Conversion = Readonly<{
  /** Store paths relative to the store directory, with their contents. */
  files: ReadonlyMap<string, string>;
  manifest: Manifest;
  conflicts: readonly Conflict[];
}>;

const LITERAL_TYPES = {
  color: 'object',
  length: 'object',
  shape: 'object',
  type: 'object',
  opacity: 'number',
  numeric: 'number',
  durationMs: 'number',
  cubicBezier: 'object',
  motionPath: 'object',
  customComposite: 'object',
  axisValue: 'object',
  textTransform: 'string',
  fontNames: 'object',
  fontWeight: 'number',
  fontSize: 'object',
  fontTracking: 'object',
  lineHeight: 'object',
  elevation: 'object',
  svgPath: 'string',
  undefined: 'boolean',
} as const satisfies Record<keyof Literal, string>;

const LITERAL_FIELDS: readonly string[] = Object.keys(LITERAL_TYPES);

const VALUE_FIELDS: readonly string[] = ['tokenName', ...LITERAL_FIELDS];

const EMAIL_ADDRESS = /[\w.%+-]+@[\w-]+(?:\.[\w-]+)*\.[a-z]{2,}/iu;

type RawObject = Readonly<Record<string, unknown>>;

function isObject(value: unknown): value is RawObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** A refusal names the table, the token and the field. */
function refuse(
  table: string,
  token: string,
  field: string,
  problem: string,
): never {
  throw new Error(`${table}: ${token}: ${field}: ${problem}`);
}

function serialize(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

/** The id of the record an id like `…/tokens/<id>/values/<id>` belongs to. */
function parentId(id: string, segment: string): string {
  return id.slice(0, id.lastIndexOf(`/${segment}/`));
}

type TagIndex = ReadonlyMap<string, Readonly<{ group: string; tag: string }>>;

/** Reads one table's fields and converts its tokens, with the input checks. */
class TableReader {
  readonly name: string;
  readonly system: RawObject;
  readonly tags: TagIndex;
  readonly #valuesByToken = new Map<string, RawObject[]>();
  readonly #displayGroups: ReadonlyMap<string, string>;

  constructor(
    { kind, componentId, table }: SourceTable,
    displayGroups: ReadonlyMap<string, string>,
  ) {
    this.name = `${kind}.${componentId}`;
    this.#displayGroups = displayGroups;

    const system = isObject(table) ? table['system'] : undefined;
    if (!isObject(system)) {
      refuse(this.name, '-', 'system', 'is not an object');
    }
    this.system = system;

    for (const field of [
      'tokenSets',
      'tokens',
      'values',
      'contextTagGroups',
      'tags',
    ]) {
      this.array(field);
    }
    this.object('-', system, 'contextualReferenceTrees');
    const version = this.object('-', system, 'version');
    this.string('-', version, 'versionName');

    const groups = new Map<string, string>();
    for (const group of this.array('contextTagGroups')) {
      const id = this.string('-', group, 'name');
      groups.set(id, this.string(id, group, 'contextTagGroupName'));
    }

    const tags = new Map<string, { group: string; tag: string }>();
    for (const tag of this.array('tags')) {
      const id = this.string('-', tag, 'name');
      const group = groups.get(parentId(id, 'tags'));
      if (group == null) {
        refuse(this.name, id, 'tags', 'names no context tag group');
      }
      tags.set(id, { group, tag: this.string(id, tag, 'tagName') });
    }
    this.tags = tags;

    for (const value of this.array('values')) {
      const id = parentId(this.string('-', value, 'name'), 'values');
      let list = this.#valuesByToken.get(id);
      if (!list) {
        list = [];
        this.#valuesByToken.set(id, list);
      }
      list.push(value);
    }
  }

  array(field: string): readonly RawObject[] {
    const value = this.system[field];
    if (!Array.isArray(value) || !value.every(isObject)) {
      refuse(this.name, '-', field, 'is not an array of objects');
    }
    return value;
  }

  object(token: string, record: RawObject, field: string): RawObject {
    const value = record[field];
    if (!isObject(value)) {
      refuse(this.name, token, field, 'is not an object');
    }
    return value;
  }

  string(token: string, record: RawObject, field: string): string {
    const value = record[field];
    if (typeof value !== 'string') {
      refuse(this.name, token, field, 'is not a string');
    }
    return value;
  }

  optionalString(
    token: string,
    record: RawObject,
    field: string,
  ): string | undefined {
    const value = record[field];
    if (value != null && typeof value !== 'string') {
      refuse(this.name, token, field, 'is not a string');
    }
    return value ?? undefined;
  }

  optionalNumber(
    token: string,
    record: RawObject,
    field: string,
  ): number | undefined {
    const value = record[field];
    if (value != null && typeof value !== 'number') {
      refuse(this.name, token, field, 'is not a number');
    }
    return value ?? undefined;
  }

  contextTags(token: string, record: RawObject): ContextTags | undefined {
    const ids = record['contextTags'];
    if (ids == null) {
      return undefined;
    }
    if (!Array.isArray(ids)) {
      refuse(this.name, token, 'contextTags', 'is not an array');
    }

    const entries: Array<[string, string]> = [];
    for (const id of ids) {
      const tag = typeof id === 'string' ? this.tags.get(id) : undefined;
      if (!tag) {
        refuse(this.name, token, 'contextTags', `${String(id)} names no tag`);
      }
      if (entries.some(([group]) => group === tag.group)) {
        refuse(this.name, token, 'contextTags', `two tags of ${tag.group}`);
      }
      entries.push([tag.group, tag.tag]);
    }

    return Object.fromEntries(
      entries.toSorted(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
    );
  }

  /** Copies the one value field of a value or resolved value. */
  valueField(
    token: string,
    record: RawObject,
    field: string,
    fields: readonly string[],
  ): RawObject {
    const present = fields.filter((name) => record[name] != null);
    if (present.length !== 1) {
      refuse(
        this.name,
        token,
        field,
        `has ${present.length} value fields (${present.join(', ')}), not one`,
      );
    }

    const [name] = present as [string];
    const value = record[name];
    const expected =
      name === 'tokenName'
        ? 'string'
        : LITERAL_TYPES[name as keyof typeof LITERAL_TYPES];
    if (
      typeof value !== expected ||
      (expected === 'object' && !isObject(value))
    ) {
      refuse(this.name, token, `${field}.${name}`, `is not a ${expected}`);
    }

    return { [name]: structuredClone(value) };
  }

  referenceTree(token: string, node: unknown, field: string): ReferenceTree {
    if (!isObject(node)) {
      refuse(this.name, token, field, 'is not an object');
    }
    const tokenName = this.string(token, node, 'tokenName');
    const children = node['childNodes'];
    if (children == null) {
      return { tokenName };
    }
    if (!Array.isArray(children)) {
      refuse(this.name, token, `${field}.childNodes`, 'is not an array');
    }
    return {
      tokenName,
      childNodes: children.map((child) =>
        this.referenceTree(token, child, `${field}.childNodes`),
      ),
    };
  }

  entry(
    token: string,
    raw: RawObject,
    values: readonly RawObject[],
  ): ContextualEntry {
    const tree = this.object(token, raw, 'referenceTree');
    const rootValue = this.string(
      token,
      this.object(token, tree, 'value'),
      'name',
    );
    const index = values.findIndex(({ name }) => name === rootValue);
    if (index < 0) {
      refuse(
        this.name,
        token,
        'contextualReferenceTree.referenceTree.value',
        "doesn't start at the token's own value",
      );
    }

    const resolved = ['resolvedValue', 'resolvedCustomCompositeValue'].filter(
      (name) => raw[name] != null,
    );
    if (resolved.length !== 1) {
      refuse(
        this.name,
        token,
        'contextualReferenceTree',
        `has ${resolved.length} resolved forms, not one`,
      );
    }

    const contextTags = this.contextTags(token, raw);
    const referenceTree = this.referenceTree(
      token,
      tree,
      'contextualReferenceTree.referenceTree',
    );

    return {
      ...(contextTags && { contextTags }),
      value: index,
      referenceTree,
      ...(raw['resolvedValue'] != null
        ? {
            resolvedValue: this.valueField(
              token,
              this.object(token, raw, 'resolvedValue'),
              'contextualReferenceTree.resolvedValue',
              LITERAL_FIELDS,
            ),
          }
        : {
            resolvedCustomCompositeValue: structuredClone(
              this.object(token, raw, 'resolvedCustomCompositeValue'),
            ) as ContextualEntry['resolvedCustomCompositeValue'],
          }),
    };
  }

  /** Converts one token record, in the store's key order. */
  token(raw: RawObject): readonly [id: string, token: StoredToken] {
    const id = this.string('-', raw, 'name');
    const tokenName = this.string(id, raw, 'tokenName');
    const displayName = this.string(tokenName, raw, 'displayName');
    const tokenValueType = this.string(tokenName, raw, 'tokenValueType');
    const description = this.optionalString(tokenName, raw, 'description');

    const displayGroupId = this.optionalString(tokenName, raw, 'displayGroup');
    const displayGroup =
      displayGroupId == null
        ? undefined
        : this.#displayGroups.get(displayGroupId);
    if (displayGroupId != null && displayGroup == null) {
      refuse(this.name, tokenName, 'displayGroup', 'names no display group');
    }

    const orderInDisplayGroup = this.optionalNumber(
      tokenName,
      raw,
      'orderInDisplayGroup',
    );

    let deprecationMessage: StoredToken['deprecationMessage'];
    if (raw['deprecationMessage'] != null) {
      const deprecation = this.object(tokenName, raw, 'deprecationMessage');
      const replacementTokenName = this.optionalString(
        tokenName,
        deprecation,
        'replacementTokenName',
      );
      deprecationMessage = {
        message: this.string(tokenName, deprecation, 'message'),
        ...(replacementTokenName != null && { replacementTokenName }),
      };
    }

    const rawValues = this.#valuesByToken.get(id) ?? [];
    const values = rawValues.map((value): StoredValue => {
      const contextTags = this.contextTags(tokenName, value);
      const specificityScore = this.optionalString(
        tokenName,
        value,
        'specificityScore',
      );
      return {
        ...(contextTags && { contextTags }),
        ...(specificityScore != null && { specificityScore }),
        ...this.valueField(tokenName, value, 'values', VALUE_FIELDS),
      };
    });

    const trees = this.object('-', this.system, 'contextualReferenceTrees');
    const tree = trees[id];
    let contextualReferenceTree: ContextualEntry[] | undefined;
    if (tree != null) {
      const entries = isObject(tree)
        ? tree['contextualReferenceTree']
        : undefined;
      if (!Array.isArray(entries) || !entries.every(isObject)) {
        refuse(
          this.name,
          tokenName,
          'contextualReferenceTree',
          'is not an array of objects',
        );
      }
      contextualReferenceTree = entries.map((entry) =>
        this.entry(tokenName, entry, rawValues),
      );
    }

    return [
      id,
      {
        tokenName,
        displayName,
        tokenValueType,
        ...(description != null && { description }),
        ...(displayGroup != null && { displayGroup }),
        ...(orderInDisplayGroup != null && { orderInDisplayGroup }),
        ...(deprecationMessage && { deprecationMessage }),
        values,
        ...(contextualReferenceTree && { contextualReferenceTree }),
      },
    ];
  }

  /** Converts one set record without its tokens, in the store's key order. */
  set(raw: RawObject): readonly [id: string, set: Omit<StoredSet, 'tokens'>] {
    const id = this.string('-', raw, 'name');
    const tokenSetName = this.string(id, raw, 'tokenSetName');
    const tokenType = this.optionalString(tokenSetName, raw, 'tokenType');
    const order = this.optionalNumber(tokenSetName, raw, 'order');
    let custom: StoredSet['custom'];
    if (raw['custom'] != null) {
      const tokenClass = this.optionalString(
        tokenSetName,
        this.object(tokenSetName, raw, 'custom'),
        'token_class',
      );
      custom = tokenClass == null ? {} : { token_class: tokenClass };
    }

    return [
      id,
      {
        tokenSetName,
        displayName: this.string(tokenSetName, raw, 'displayName'),
        description: this.string(tokenSetName, raw, 'description'),
        ...(tokenType != null && { tokenType }),
        ...(custom && { custom }),
        ...(order != null && { order }),
      },
    ];
  }

  /** Converts the context tag groups, with tag ids replaced by names. */
  tagGroups(): readonly StoredTagGroup[] {
    const tagsByGroup = new Map<string, StoredTag[]>();
    for (const tag of this.array('tags')) {
      const id = this.string('-', tag, 'name');
      const { group, tag: tagName } = this.tags.get(id)!;
      let list = tagsByGroup.get(group);
      if (!list) {
        list = [];
        tagsByGroup.set(group, list);
      }
      const { tagOrder } = tag;
      if (typeof tagOrder !== 'number') {
        refuse(this.name, id, 'tagOrder', 'is not a number');
      }
      list.push({
        tagName,
        displayName: this.string(id, tag, 'displayName'),
        tagOrder,
      });
    }

    return this.array('contextTagGroups').map((group) => {
      const id = this.string('-', group, 'name');
      const contextTagGroupName = this.string(id, group, 'contextTagGroupName');
      const defaultTagId = this.string(id, group, 'defaultTag');
      const defaultTag = this.tags.get(defaultTagId);
      if (!defaultTag) {
        refuse(this.name, id, 'defaultTag', 'names no tag');
      }
      const { specificity } = group;
      if (typeof specificity !== 'number') {
        refuse(this.name, id, 'specificity', 'is not a number');
      }
      return {
        contextTagGroupName,
        displayName: this.string(id, group, 'displayName'),
        specificity,
        defaultTag: defaultTag.tag,
        tags: tagsByGroup.get(contextTagGroupName) ?? [],
      };
    });
  }

  database(): ManifestDatabase {
    const version = this.object('-', this.system, 'version');
    const versionId = this.string('-', version, 'name');
    return {
      versionName: this.string('-', version, 'versionName'),
      versionId: versionId.slice(versionId.lastIndexOf('/') + 1),
      publishTime: this.string('-', version, 'createTime'),
    };
  }

  /** The component's name, or the design system's for a system table. */
  componentName(): string {
    const { components } = this.system;
    if (Array.isArray(components) && components.length === 1) {
      const [component] = components as [unknown];
      if (isObject(component)) {
        return this.string('-', component, 'displayName');
      }
    }
    return this.string('-', this.system, 'displayName');
  }
}

function orphanSetName(raw: RawObject, token: StoredToken): string {
  const suffix = `.${String(raw['tokenNameSuffix'])}`;
  return token.tokenName.endsWith(suffix)
    ? token.tokenName.slice(0, -suffix.length)
    : token.tokenName;
}

function checkReferences(
  tokens: ReadonlyMap<string, Readonly<{ table: string; token: StoredToken }>>,
): void {
  const names = new Set(
    Iterator.from(tokens.values()).map(({ token }) => token.tokenName),
  );

  for (const { table, token } of tokens.values()) {
    const check = (name: string, field: string): void => {
      if (!names.has(name)) {
        refuse(
          table,
          token.tokenName,
          field,
          `names ${name}, not in the store`,
        );
      }
    };

    for (const value of token.values) {
      if (value.tokenName != null) {
        check(value.tokenName, 'values.tokenName');
      }
      for (const [property, { tokenName }] of Object.entries(
        value.customComposite?.properties ?? {},
      )) {
        check(tokenName, `values.customComposite.properties.${property}`);
      }
    }

    const walk = (node: ReferenceTree): void => {
      check(node.tokenName, 'contextualReferenceTree.referenceTree');
      node.childNodes?.forEach(walk);
    };
    for (const entry of token.contextualReferenceTree ?? []) {
      walk(entry.referenceTree);
    }
  }
}

/**
 * Converts database tables into tproc's store, in memory. The tables are read
 * in the given order, and a record that several tables carry is taken from the
 * first. Nothing the store's schema doesn't name is written.
 */
export function convert(
  sources: readonly SourceTable[],
  { release, fetchDate, legacy = false }: ConvertOptions,
): Conversion {
  // Display groups are named across tables: a token that a table carries only
  // as a reference keeps its group's id from the table that defines it.
  const displayGroups = new Map<string, string>();
  for (const { table } of sources) {
    const system = isObject(table) ? table['system'] : undefined;
    const groups = isObject(system) ? system['displayGroups'] : undefined;
    for (const group of Array.isArray(groups) ? groups : []) {
      if (
        isObject(group) &&
        typeof group['name'] === 'string' &&
        typeof group['displayName'] === 'string' &&
        !displayGroups.has(group['name'])
      ) {
        displayGroups.set(group['name'], group['displayName']);
      }
    }
  }

  const readers = sources.map(
    (source) => new TableReader(source, displayGroups),
  );
  const databases: ManifestDatabase[] = [];
  for (const reader of readers) {
    const database = reader.database();
    if (!databases.some((d) => isDeepStrictEqual(d, database))) {
      databases.push(database);
    }
  }
  if (!legacy && new Set(databases.map((d) => d.versionName)).size > 1) {
    const [first] = readers as [TableReader];
    const other = readers.find(
      (reader) => reader.database().versionName !== databases[0]!.versionName,
    )!;
    refuse(
      other.name,
      '-',
      'system.version.versionName',
      `is ${other.database().versionName}, and ${first.name} is ${databases[0]!.versionName}`,
    );
  }

  const conflicts: Conflict[] = [];
  const conflict = (
    kind: Conflict['kind'],
    name: string,
    keptTable: string,
    otherTable: string,
  ): void => {
    if (!legacy) {
      refuse(otherTable, name, kind, `converts differently in ${keptTable}`);
    }
    conflicts.push({ kind, name, keptTable, otherTable });
  };

  const sets = new Map<
    string,
    { table: string; set: Omit<StoredSet, 'tokens'> }
  >();
  const tokens = new Map<
    string,
    { table: string; token: StoredToken; raw: RawObject }
  >();
  const groups = new Map<
    string,
    { table: string; group: StoredTagGroup; tags: StoredTag[] }
  >();

  for (const reader of readers) {
    for (const raw of reader.array('tokenSets')) {
      const [id, set] = reader.set(raw);
      const kept = sets.get(id);
      if (!kept) {
        sets.set(id, { table: reader.name, set });
      } else if (!isDeepStrictEqual(kept.set, set)) {
        conflict('set', set.tokenSetName, kept.table, reader.name);
      }
    }

    for (const raw of reader.array('tokens')) {
      const [id, token] = reader.token(raw);
      const kept = tokens.get(id);
      if (!kept) {
        tokens.set(id, { table: reader.name, token, raw });
      } else if (!isDeepStrictEqual(kept.token, token)) {
        conflict('token', token.tokenName, kept.table, reader.name);
      }
    }

    for (const group of reader.tagGroups()) {
      const kept = groups.get(group.contextTagGroupName);
      if (!kept) {
        groups.set(group.contextTagGroupName, {
          table: reader.name,
          group,
          tags: [...group.tags],
        });
        continue;
      }
      const { tags: _keptTags, ...keptFields } = kept.group;
      const { tags, ...fields } = group;
      let differs = !isDeepStrictEqual(keptFields, fields);
      for (const tag of tags) {
        const keptTag = kept.tags.find(
          ({ tagName }) => tagName === tag.tagName,
        );
        if (!keptTag) {
          kept.tags.push(tag);
        } else if (!isDeepStrictEqual(keptTag, tag)) {
          differs = true;
        }
      }
      if (differs) {
        conflict('context', group.contextTagGroupName, kept.table, reader.name);
      }
    }
  }

  checkReferences(tokens);

  // A token belongs to the first set whose id prefixes its id. A token that no
  // set holds forms a set named after it.
  const setIds = [...sets.keys()];
  const members = new Map<string, StoredToken[]>(setIds.map((id) => [id, []]));
  const orphans = new Map<string, StoredToken[]>();
  for (const [id, { token, raw, table }] of tokens) {
    const setId = setIds.find((setId) => id.startsWith(setId));
    if (setId != null) {
      members.get(setId)!.push(token);
      continue;
    }
    const name = orphanSetName(raw, token);
    if (
      Iterator.from(sets.values()).some(({ set }) => set.tokenSetName === name)
    ) {
      refuse(
        table,
        token.tokenName,
        'tokenSet',
        `no set holds it, and ${name} is another set`,
      );
    }
    let list = orphans.get(name);
    if (!list) {
      list = [];
      orphans.set(name, list);
    }
    list.push(token);
  }

  const storedSets: StoredSet[] = [
    ...setIds.map((id) => ({ ...sets.get(id)!.set, tokens: members.get(id)! })),
    ...Iterator.from(orphans).map(([tokenSetName, list]) => ({
      tokenSetName,
      tokens: list,
    })),
  ];

  const names = new Set<string>();
  for (const { tokenSetName } of storedSets) {
    if (names.has(tokenSetName)) {
      refuse('-', '-', 'tokenSetName', `${tokenSetName} names two sets`);
    }
    names.add(tokenSetName);
  }

  const context: StoredContext = {
    contextTagGroups: [...groups.values()].map(({ group, tags }) => ({
      ...group,
      tags,
    })),
  };

  const files = new Map<string, string>([
    ['context.json', serialize(context)],
    ...storedSets.map(
      (set) => [`sets/${set.tokenSetName}.json`, serialize(set)] as const,
    ),
  ]);

  for (const [path, text] of files) {
    if (EMAIL_ADDRESS.test(text) || text.includes('"gaiaId"')) {
      refuse(path, '-', '-', 'holds an email address or a gaiaId key');
    }
  }

  const tables: ManifestTable[] = sources.map(({ kind, componentId }, i) => ({
    kind,
    componentId,
    componentName: readers[i]!.componentName(),
  }));

  const manifest: Manifest = {
    storeVersion: STORE_VERSION,
    source: {
      baseUrl: SITE_BASE_URL,
      release,
      ...(legacy && {
        note: 'Converted from the tables committed before RD-28. Their release is unknown.',
      }),
      databases,
    },
    fetchDate,
    tables,
    files: [...files].map(([path, text]) => ({ path, sha256: sha256(text) })),
  };

  return {
    files: new Map([['manifest.json', serialize(manifest)], ...files]),
    manifest,
    conflicts,
  };
}
