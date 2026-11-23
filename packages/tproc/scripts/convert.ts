import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import {
  STORE_VERSION,
  TextTransform,
  TokenShapeFamily,
  type ContextTags,
  type ContextualEntry,
  type DisplayGroupPath,
  type Literal,
  type ResolvedCustomCompositeValue,
  type ResolvedLiteral,
  type Manifest,
  type ManifestDatabase,
  type ManifestTable,
  type ReferenceTree,
  type StoredContext,
  type StoredDisplayGroup,
  type StoredSet,
  type StoredTag,
  type StoredTagGroup,
  type StoredToken,
  type StoredValue,
} from '../src/store/schema.ts';
import { matchesContext, RENDERED_CONTEXT } from '../src/store/Store.ts';

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
   * from two database versions, so a record that two tables convert
   * differently, and a token that no copy covers, is listed instead of refused,
   * and the first table's copy is kept.
   */
  legacy?: boolean;
}>;

/**
 * A record that two tables convert differently, a token that no copy covers,
 * or a child node whose value isn't one of its token's kept values. For a
 * `value` conflict, `name` is the
 * tree's token and the child's, `keptTable` the table the child's token is
 * kept from, and `otherTable` the tree's.
 */
export type Conflict = Readonly<{
  kind: 'token' | 'set' | 'context' | 'group' | 'value';
  name: string;
  keptTable: string;
  otherTable: string;
}>;

export type Conversion = Readonly<{
  /** Store paths relative to the store directory, with their contents. */
  files: ReadonlyMap<string, string>;
  manifest: Manifest;
  conflicts: readonly Conflict[];
  /**
   * The copies of a token that another table's copy covers and that differ
   * from it, and how many tokens they are copies of.
   */
  covered: Readonly<{ copies: number; tokens: number }>;
}>;

/**
 * The shape of a value field's contents, as `src/store/schema.ts` gives it: a
 * primitive's `typeof`, a one-element tuple for an array of that element, a set
 * of the strings allowed, `OneOf` for an object with exactly one of some
 * fields, or an object naming each key. An object's key ends in `?` when it's
 * optional, and `*` stands for any key.
 */
type Spec =
  | 'string'
  | 'number'
  | 'boolean'
  | readonly [Spec]
  | ReadonlySet<string>
  | OneOf
  | Readonly<{ [key: string]: Spec }>;

/** An object with exactly one of `fields`, and no other key. */
class OneOf {
  readonly fields: () => Readonly<Record<string, Spec>>;

  constructor(fields: () => Readonly<Record<string, Spec>>) {
    this.fields = fields;
  }
}

const LENGTH: Spec = { 'value?': 'number', 'unit?': 'string' };

const FONT_NAMES: Spec = { values: ['string'] };

function variationAxes(axis: Spec): Spec {
  return {
    wght: axis,
    GRAD: axis,
    wdth: axis,
    ROND: axis,
    opsz: axis,
    CRSV: axis,
    slnt: axis,
    'FILL?': axis,
    'HEXP?': axis,
  };
}

const LITERALS = {
  color: {
    'red?': 'number',
    'green?': 'number',
    'blue?': 'number',
    'alpha?': 'number',
  },
  length: LENGTH,
  shape: {
    family: new Set<string>(Object.values(TokenShapeFamily)),
    'defaultSize?': LENGTH,
    'top?': LENGTH,
    'bottom?': LENGTH,
    'left?': LENGTH,
    'right?': LENGTH,
    'topLeft?': LENGTH,
    'topRight?': LENGTH,
    'bottomLeft?': LENGTH,
    'bottomRight?': LENGTH,
  },
  type: {
    fontNameTokenName: 'string',
    fontWeightTokenName: 'string',
    fontSizeTokenName: 'string',
    fontTrackingTokenName: 'string',
    lineHeightTokenName: 'string',
    'variationAxes?': variationAxes({ axisValueTokenName: 'string' }),
  },
  opacity: 'number',
  numeric: 'number',
  durationMs: 'number',
  cubicBezier: {
    'x0?': 'number',
    'y0?': 'number',
    'x1?': 'number',
    'y1?': 'number',
  },
  motionPath: { standardPath: 'string' },
  customComposite: {
    properties: { '*': new OneOf(() => VALUE_FIELDS) },
  },
  axisValue: { tag: 'string', 'value?': 'number' },
  textTransform: new Set<string>(Object.values(TextTransform)),
  fontNames: FONT_NAMES,
  fontWeight: 'number',
  fontSize: LENGTH,
  fontTracking: LENGTH,
  lineHeight: LENGTH,
  elevation: LENGTH,
  svgPath: 'string',
  undefined: 'boolean',
} as const satisfies Record<keyof Literal, Spec>;

const VALUE_FIELDS: Readonly<Record<string, Spec>> = {
  tokenName: 'string',
  ...LITERALS,
};

const RESOLVED_LITERALS = {
  ...LITERALS,
  type: {
    fontNames: FONT_NAMES,
    fontWeight: 'number',
    fontSize: LENGTH,
    fontTracking: LENGTH,
    lineHeight: LENGTH,
    'variationAxes?': variationAxes({ axisValue: 'number' }),
  },
} as const satisfies Record<keyof ResolvedLiteral, Spec>;

const RESOLVED_VALUE = new OneOf(() => RESOLVED_LITERALS);

const RESOLVED_CUSTOM_COMPOSITE_VALUE: Spec = {
  properties: { '*': { resolvedValue: RESOLVED_VALUE } },
};

const REVISION = ['createTime', 'revisionCreateTime', 'revisionId', 'state'];

/**
 * Every key the converter meets outside a value field, by record: the keys it
 * keeps or reads, and the keys it drops. A key in neither refuses the
 * conversion, so a field upstream adds is ruled on before it's kept or
 * dropped. A value field has no drop list: its keys are `Spec`'s.
 */
const RECORD_KEYS = {
  table: { kept: ['system'], dropped: [] },
  system: {
    kept: [
      'tokenSets',
      'tokens',
      'values',
      'contextTagGroups',
      'tags',
      'contextualReferenceTrees',
      'displayGroups',
      'version',
      // A component table's component, and a system table's own displayName,
      // give the manifest's componentName.
      'components',
      'displayName',
    ],
    dropped: [
      '_isResolved',
      'author',
      'carbonProject',
      'componentDisplayGroups',
      'connections',
      'createTime',
      'custom',
      'description',
      'dsdbVersion',
      'name',
      // The guideline site's page tree, not token data.
      'navigation',
      'parentVersions',
      'parentVersionsMapping',
      'revisionAuthor',
      'revisionCreateTime',
      'revisionId',
      'settings',
      'state',
      'tokenNamePrefix',
      'versions',
    ],
  },
  version: {
    kept: ['name', 'versionName', 'createTime'],
    dropped: [
      'description',
      'revisionAuthor',
      'revisionCreateTime',
      'revisionId',
      'state',
    ],
  },
  component: {
    kept: ['displayName'],
    dropped: [
      'name',
      'alternativeNames',
      'componentDisplayGroup',
      'componentImage',
      'connectedPage',
      'definition',
      'tokenSets',
      ...REVISION,
    ],
  },
  tokenSet: {
    kept: [
      'name',
      'tokenSetName',
      'displayName',
      'description',
      'tokenType',
      'custom',
      'order',
    ],
    dropped: ['tokenSetNameSuffix', ...REVISION],
  },
  custom: { kept: ['token_class'], dropped: [] },
  displayGroup: {
    kept: [
      'name',
      'displayName',
      'parentGroup',
      'description',
      'orderInParentTokenSet',
      'orderInParentDisplayGroup',
    ],
    dropped: REVISION,
  },
  token: {
    kept: [
      'name',
      'tokenName',
      'displayName',
      'tokenValueType',
      'description',
      'displayGroup',
      'orderInDisplayGroup',
      'deprecationMessage',
    ],
    // tokenNameSuffix isn't stored. It names a set that no table carries.
    dropped: ['tokenNameSuffix', ...REVISION],
  },
  deprecationMessage: {
    kept: ['message', 'replacementTokenName'],
    dropped: [],
  },
  value: {
    kept: [
      'name',
      'contextTags',
      'specificityScore',
      ...Object.keys(VALUE_FIELDS),
    ],
    dropped: REVISION,
  },
  contextTagGroup: {
    kept: [
      'name',
      'contextTagGroupName',
      'displayName',
      'description',
      'specificity',
      'defaultTag',
    ],
    dropped: REVISION,
  },
  tag: {
    kept: ['name', 'tagName', 'displayName', 'description', 'tagOrder'],
    dropped: REVISION,
  },
  tree: { kept: ['contextualReferenceTree'], dropped: [] },
  entry: {
    kept: [
      'contextTags',
      'referenceTree',
      'resolvedValue',
      'resolvedCustomCompositeValue',
    ],
    dropped: [],
  },
  node: {
    kept: ['tokenName', 'value', 'fieldNames', 'childNodes'],
    dropped: [],
  },
  nodeValue: { kept: ['name'], dropped: ['revisionId', 'version'] },
} as const satisfies Record<
  string,
  Readonly<{ kept: readonly string[]; dropped: readonly string[] }>
>;

type RecordKind = keyof typeof RECORD_KEYS;

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

/** A display group row, with its ids. */
type GroupRow = Readonly<{
  id: string;
  displayName: string;
  parentGroup?: string;
  description?: string;
  orderInParentTokenSet?: number;
  orderInParentDisplayGroup?: number;
}>;

/** What converting a token reads from every table. */
type Lookups = Readonly<{
  /** Each display group's set id and path, by group id. */
  groups: ReadonlyMap<
    string,
    Readonly<{ setId: string; path: DisplayGroupPath }>
  >;
  /** The value ids of each token's kept copy, by token name. */
  values: ReadonlyMap<
    string,
    Readonly<{ table: string; ids: readonly string[] }>
  >;
}>;

/** A converted token, and the child nodes whose value isn't in the store. */
type TokenConversion = readonly [
  id: string,
  token: StoredToken,
  unresolved: readonly string[],
];

/** Reads one table's fields and converts its records, with the input checks. */
class TableReader {
  readonly name: string;
  readonly system: RawObject;
  readonly tags: TagIndex;
  readonly #valuesByToken = new Map<string, RawObject[]>();

  constructor({ kind, componentId, table }: SourceTable) {
    this.name = `${kind}.${componentId}`;

    if (!isObject(table)) {
      refuse(this.name, '-', '-', 'is not an object');
    }
    this.ruled('-', table, 'table', '');
    const { system } = table;
    if (!isObject(system)) {
      refuse(this.name, '-', 'system', 'is not an object');
    }
    this.system = system;
    this.ruled('-', system, 'system', 'system');

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
    this.ruled('-', version, 'version', 'system.version');
    this.string('-', version, 'versionName');
    for (const component of this.optionalArray('components')) {
      this.ruled('-', component, 'component', 'system.components');
    }

    const groups = new Map<string, string>();
    for (const group of this.array('contextTagGroups')) {
      const id = this.string('-', group, 'name');
      this.ruled(id, group, 'contextTagGroup', 'contextTagGroups');
      groups.set(id, this.string(id, group, 'contextTagGroupName'));
    }

    const tags = new Map<string, { group: string; tag: string }>();
    for (const tag of this.array('tags')) {
      const id = this.string('-', tag, 'name');
      this.ruled(id, tag, 'tag', 'tags');
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

  /** Refuses a key of `record` that `RECORD_KEYS[kind]` neither keeps nor drops. */
  ruled(
    token: string,
    record: RawObject,
    kind: RecordKind,
    path: string,
  ): void {
    const { kept, dropped } = RECORD_KEYS[kind];
    for (const key of Object.keys(record)) {
      if (
        !(kept as readonly string[]).includes(key) &&
        !(dropped as readonly string[]).includes(key)
      ) {
        refuse(
          this.name,
          token,
          path ? `${path}.${key}` : key,
          'is neither kept nor dropped',
        );
      }
    }
  }

  array(field: string): readonly RawObject[] {
    const value = this.system[field];
    if (!Array.isArray(value) || !value.every(isObject)) {
      refuse(this.name, '-', field, 'is not an array of objects');
    }
    return value;
  }

  optionalArray(field: string): readonly RawObject[] {
    return this.system[field] == null ? [] : this.array(field);
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

  /** The ids of a token's values in this table, in upstream order. */
  valueIds(id: string): readonly string[] {
    return (this.#valuesByToken.get(id) ?? []).map(
      ({ name }) => name as string,
    );
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

  /** Copies a value field's contents, which must match `spec` exactly. */
  copy(token: string, value: unknown, spec: Spec, path: string): unknown {
    if (typeof spec === 'string') {
      if (typeof value !== spec) {
        refuse(this.name, token, path, `is not a ${spec}`);
      }
      return value;
    }
    if (spec instanceof Set) {
      if (typeof value !== 'string' || !spec.has(value)) {
        refuse(this.name, token, path, `is not one of ${[...spec].join(', ')}`);
      }
      return value;
    }
    if (Array.isArray(spec)) {
      if (!Array.isArray(value)) {
        refuse(this.name, token, path, 'is not an array');
      }
      const [item] = spec;
      return value.map((element, i) =>
        this.copy(token, element, item, `${path}.${i}`),
      );
    }
    if (!isObject(value)) {
      refuse(this.name, token, path, 'is not an object');
    }
    if (spec instanceof OneOf) {
      const fields = spec.fields();
      for (const key of Object.keys(value)) {
        if (!Object.hasOwn(fields, key)) {
          refuse(this.name, token, `${path}.${key}`, 'is not in the schema');
        }
      }
      return this.valueField(token, value, fields, path);
    }

    const keys = spec as Readonly<Record<string, Spec>>;
    const copy: Record<string, unknown> = {};
    for (const [key, element] of Object.entries(value)) {
      const name = [key, `${key}?`, '*'].find((k) => Object.hasOwn(keys, k));
      if (name == null) {
        refuse(this.name, token, `${path}.${key}`, 'is not in the schema');
      }
      copy[key] = this.copy(token, element, keys[name]!, `${path}.${key}`);
    }
    for (const key of Object.keys(keys)) {
      if (key !== '*' && !key.endsWith('?') && !Object.hasOwn(value, key)) {
        refuse(this.name, token, `${path}.${key}`, 'is missing');
      }
    }
    return copy;
  }

  /** Copies the one value field of `record`, of `fields`. */
  valueField(
    token: string,
    record: RawObject,
    fields: Readonly<Record<string, Spec>>,
    path: string,
  ): RawObject {
    const present = Object.keys(fields).filter((name) => record[name] != null);
    if (present.length !== 1) {
      refuse(
        this.name,
        token,
        path,
        `has ${present.length} value fields (${present.join(', ')}), not one`,
      );
    }

    const [name] = present as [string];
    return {
      [name]: this.copy(token, record[name], fields[name]!, `${path}.${name}`),
    };
  }

  referenceTree(
    token: string,
    node: unknown,
    path: string,
    lookups: Lookups,
    unresolved: string[],
  ): ReferenceTree {
    if (!isObject(node)) {
      refuse(this.name, token, path, 'is not an object');
    }
    this.ruled(token, node, 'node', path);
    const tokenName = this.string(token, node, 'tokenName');

    // A child node's value is one of its token's values. The root's is the
    // entry's, which entry() reads.
    let value: number | undefined;
    if (path.endsWith('.childNodes')) {
      let id: string | undefined;
      if (node['value'] != null) {
        const record = this.object(token, node, 'value');
        this.ruled(token, record, 'nodeValue', `${path}.value`);
        id = this.optionalString(token, record, 'name');
      }
      const index =
        id == null
          ? -1
          : (lookups.values.get(tokenName)?.ids.indexOf(id) ?? -1);
      if (index < 0) {
        unresolved.push(tokenName);
      } else {
        value = index;
      }
    }

    const fieldNames =
      node['fieldNames'] == null
        ? undefined
        : (this.copy(
            token,
            node['fieldNames'],
            ['string'],
            `${path}.fieldNames`,
          ) as string[]);

    const children = node['childNodes'];
    if (children != null && !Array.isArray(children)) {
      refuse(this.name, token, `${path}.childNodes`, 'is not an array');
    }

    return {
      tokenName,
      ...(value != null && { value }),
      ...(fieldNames && { fieldNames }),
      ...(children && {
        childNodes: children.map((child) =>
          this.referenceTree(
            token,
            child,
            `${path}.childNodes`,
            lookups,
            unresolved,
          ),
        ),
      }),
    };
  }

  entry(
    token: string,
    raw: RawObject,
    values: readonly RawObject[],
    lookups: Lookups,
    unresolved: string[],
  ): ContextualEntry {
    this.ruled(token, raw, 'entry', 'contextualReferenceTree');
    const tree = this.object(token, raw, 'referenceTree');
    const root = this.object(token, tree, 'value');
    this.ruled(
      token,
      root,
      'nodeValue',
      'contextualReferenceTree.referenceTree.value',
    );
    const rootValue = this.string(token, root, 'name');
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
      lookups,
      unresolved,
    );

    return {
      ...(contextTags && { contextTags }),
      value: index,
      referenceTree,
      ...(raw['resolvedValue'] != null
        ? {
            resolvedValue: this.copy(
              token,
              raw['resolvedValue'],
              RESOLVED_VALUE,
              'contextualReferenceTree.resolvedValue',
            ) as ResolvedLiteral,
          }
        : {
            resolvedCustomCompositeValue: this.copy(
              token,
              raw['resolvedCustomCompositeValue'],
              RESOLVED_CUSTOM_COMPOSITE_VALUE,
              'contextualReferenceTree.resolvedCustomCompositeValue',
            ) as ResolvedCustomCompositeValue,
          }),
    };
  }

  /** Converts one token record, in the store's key order. */
  token(raw: RawObject, lookups: Lookups): TokenConversion {
    const id = this.string('-', raw, 'name');
    const tokenName = this.string(id, raw, 'tokenName');
    this.ruled(tokenName, raw, 'token', 'tokens');
    const displayName = this.string(tokenName, raw, 'displayName');
    const tokenValueType = this.string(tokenName, raw, 'tokenValueType');
    const description = this.optionalString(tokenName, raw, 'description');

    const groupId = this.optionalString(tokenName, raw, 'displayGroup');
    let displayGroup: DisplayGroupPath | undefined;
    if (groupId != null) {
      const group = lookups.groups.get(groupId);
      if (!group) {
        refuse(this.name, tokenName, 'displayGroup', 'names no display group');
      }
      if (group.setId !== parentId(id, 'tokens')) {
        refuse(
          this.name,
          tokenName,
          'displayGroup',
          'is a group of another set',
        );
      }
      displayGroup = group.path;
    }

    const orderInDisplayGroup = this.optionalNumber(
      tokenName,
      raw,
      'orderInDisplayGroup',
    );

    let deprecationMessage: StoredToken['deprecationMessage'];
    if (raw['deprecationMessage'] != null) {
      const deprecation = this.object(tokenName, raw, 'deprecationMessage');
      this.ruled(
        tokenName,
        deprecation,
        'deprecationMessage',
        'deprecationMessage',
      );
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
      this.ruled(tokenName, value, 'value', 'values');
      const contextTags = this.contextTags(tokenName, value);
      const specificityScore = this.optionalString(
        tokenName,
        value,
        'specificityScore',
      );
      return {
        ...(contextTags && { contextTags }),
        ...(specificityScore != null && { specificityScore }),
        ...this.valueField(tokenName, value, VALUE_FIELDS, 'values'),
      };
    });

    const trees = this.object('-', this.system, 'contextualReferenceTrees');
    const tree = trees[id];
    const unresolved: string[] = [];
    let contextualReferenceTree: ContextualEntry[] | undefined;
    if (tree != null) {
      if (!isObject(tree)) {
        refuse(
          this.name,
          tokenName,
          'contextualReferenceTrees',
          'is not an object',
        );
      }
      this.ruled(tokenName, tree, 'tree', 'contextualReferenceTrees');
      const entries = tree['contextualReferenceTree'];
      if (!Array.isArray(entries) || !entries.every(isObject)) {
        refuse(
          this.name,
          tokenName,
          'contextualReferenceTree',
          'is not an array of objects',
        );
      }
      contextualReferenceTree = entries.map((entry) =>
        this.entry(tokenName, entry, rawValues, lookups, unresolved),
      );
    }

    return [
      id,
      {
        tokenName,
        displayName,
        tokenValueType,
        ...(description != null && { description }),
        ...(displayGroup && { displayGroup }),
        ...(orderInDisplayGroup != null && { orderInDisplayGroup }),
        ...(deprecationMessage && { deprecationMessage }),
        values,
        ...(contextualReferenceTree && { contextualReferenceTree }),
      },
      unresolved,
    ];
  }

  /** Converts one set record without its tokens, in the store's key order. */
  set(raw: RawObject): readonly [id: string, set: Omit<StoredSet, 'tokens'>] {
    const id = this.string('-', raw, 'name');
    const tokenSetName = this.string(id, raw, 'tokenSetName');
    this.ruled(tokenSetName, raw, 'tokenSet', 'tokenSets');
    const tokenType = this.optionalString(tokenSetName, raw, 'tokenType');
    const order = this.optionalNumber(tokenSetName, raw, 'order');
    let custom: StoredSet['custom'];
    if (raw['custom'] != null) {
      const record = this.object(tokenSetName, raw, 'custom');
      this.ruled(tokenSetName, record, 'custom', 'tokenSets.custom');
      const tokenClass = this.optionalString(
        tokenSetName,
        record,
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

  /** Reads the display group rows, with their ids. */
  displayGroups(): readonly GroupRow[] {
    return this.optionalArray('displayGroups').map((raw) => {
      const id = this.string('-', raw, 'name');
      this.ruled(id, raw, 'displayGroup', 'displayGroups');
      const parentGroup = this.optionalString(id, raw, 'parentGroup');
      const description = this.optionalString(id, raw, 'description');
      const orderInParentTokenSet = this.optionalNumber(
        id,
        raw,
        'orderInParentTokenSet',
      );
      const orderInParentDisplayGroup = this.optionalNumber(
        id,
        raw,
        'orderInParentDisplayGroup',
      );
      return {
        id,
        displayName: this.string(id, raw, 'displayName'),
        ...(parentGroup != null && { parentGroup }),
        ...(description != null && { description }),
        ...(orderInParentTokenSet != null && { orderInParentTokenSet }),
        ...(orderInParentDisplayGroup != null && { orderInParentDisplayGroup }),
      };
    });
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
      const description = this.optionalString(id, tag, 'description');
      list.push({
        tagName,
        displayName: this.string(id, tag, 'displayName'),
        ...(description != null && { description }),
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
      const description = this.optionalString(id, group, 'description');
      return {
        contextTagGroupName,
        displayName: this.string(id, group, 'displayName'),
        ...(description != null && { description }),
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

/**
 * Whether copy `a` of a token covers copy `b`: the two are identical, or `b`
 * has no tree, equals `a` in every field but `values`, and has only values
 * that each equal a different one of `a`'s, in any order.
 */
function covers(a: StoredToken, b: StoredToken): boolean {
  if (isDeepStrictEqual(a, b)) {
    return true;
  }
  if (b.contextualReferenceTree) {
    return false;
  }
  const { values: aValues, contextualReferenceTree: _tree, ...aFields } = a;
  const { values: bValues, ...bFields } = b;
  if (!isDeepStrictEqual(aFields, bFields)) {
    return false;
  }
  const matched = new Set<number>();
  return bValues.every((value) => {
    const index = aValues.findIndex(
      (candidate, i) => !matched.has(i) && isDeepStrictEqual(candidate, value),
    );
    matched.add(index);
    return index >= 0;
  });
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
        if (tokenName != null) {
          check(tokenName, `values.customComposite.properties.${property}`);
        }
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
 * Refuses a token with a tree for which the rendered context doesn't have
 * exactly one entry. The reader selects the entry that matches, so a second one
 * would leave the choice to the order of the entries.
 */
function checkSelections(
  tokens: ReadonlyMap<string, Readonly<{ table: string; token: StoredToken }>>,
): void {
  for (const { table, token } of tokens.values()) {
    const count = token.contextualReferenceTree?.filter((entry) =>
      matchesContext(entry, RENDERED_CONTEXT),
    ).length;
    if (count != null && count !== 1) {
      refuse(
        table,
        token.tokenName,
        'contextualReferenceTree',
        `has ${count} entries for the rendered context, not one`,
      );
    }
  }
}

/**
 * Converts database tables into tproc's store, in memory. The tables are read
 * in the given order. A token that several tables carry is taken from the copy
 * that covers every other, and any other record from the first table. Nothing
 * the store's schema doesn't name is written.
 */
export function convert(
  sources: readonly SourceTable[],
  { release, fetchDate, legacy = false }: ConvertOptions,
): Conversion {
  const readers = sources.map((source) => new TableReader(source));
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
      refuse(
        otherTable,
        name,
        kind,
        kind === 'token'
          ? `no copy covers both this one and the one in ${keptTable}`
          : `converts differently in ${keptTable}`,
      );
    }
    conflicts.push({ kind, name, keptTable, otherTable });
  };

  // Display groups are read across tables, as tokens are: a token that a
  // table carries only as a reference keeps its group from the table that
  // defines it.
  const groupRows = new Map<string, { table: string; row: GroupRow }>();
  for (const reader of readers) {
    for (const row of reader.displayGroups()) {
      const kept = groupRows.get(row.id);
      if (!kept) {
        groupRows.set(row.id, { table: reader.name, row });
      } else if (!isDeepStrictEqual(kept.row, row)) {
        conflict('group', row.id, kept.table, reader.name);
      }
    }
  }

  const groups = new Map<
    string,
    { setId: string; path: DisplayGroupPath; group: StoredDisplayGroup }
  >();
  const group = (
    id: string,
    ancestors: ReadonlySet<string>,
  ): Readonly<{ setId: string; path: DisplayGroupPath }> => {
    const known = groups.get(id);
    if (known) {
      return known;
    }
    const { table, row } = groupRows.get(id)!;
    const setId = parentId(id, 'displayGroups');
    let parentPath: DisplayGroupPath | undefined;
    if (row.parentGroup != null) {
      if (!groupRows.has(row.parentGroup)) {
        refuse(table, id, 'parentGroup', 'names no display group');
      }
      if (ancestors.has(row.parentGroup)) {
        refuse(table, id, 'parentGroup', 'is its own ancestor');
      }
      const parent = group(row.parentGroup, new Set([...ancestors, id]));
      if (parent.setId !== setId) {
        refuse(table, id, 'parentGroup', 'is a group of another set');
      }
      parentPath = parent.path;
    }
    const { id: _id, parentGroup: _parentGroup, displayName, ...fields } = row;
    const resolved = {
      setId,
      path: [...(parentPath ?? []), displayName],
      group: {
        displayName,
        ...(parentPath && { parentGroup: parentPath }),
        ...fields,
      },
    };
    groups.set(id, resolved);
    return resolved;
  };
  for (const id of groupRows.keys()) {
    group(id, new Set());
  }

  // Each token's copies, by id, in the tables' order.
  const copies = new Map<
    string,
    Array<{ reader: TableReader; raw: RawObject }>
  >();
  for (const reader of readers) {
    for (const raw of reader.array('tokens')) {
      const id = reader.string('-', raw, 'name');
      let list = copies.get(id);
      if (!list) {
        list = [];
        copies.set(id, list);
      }
      list.push({ reader, raw });
    }
  }

  // A child node's value is an index into its token's kept values. The kept
  // copy is chosen first, with each token's first copy standing in for those
  // indexes: the choice compares a copy with no tree, or two identical
  // copies, so the indexes don't change it. Then the kept copies convert again
  // with their own values.
  const valuesOf = (
    chosen: (
      list: ReadonlyArray<{ reader: TableReader; raw: RawObject }>,
      id: string,
    ) => TableReader,
  ): Map<string, { table: string; ids: readonly string[] }> => {
    const values = new Map<string, { table: string; ids: readonly string[] }>();
    for (const [id, list] of copies) {
      const tokenName = list[0]!.reader.string(id, list[0]!.raw, 'tokenName');
      if (!values.has(tokenName)) {
        const reader = chosen(list, id);
        values.set(tokenName, { table: reader.name, ids: reader.valueIds(id) });
      }
    }
    return values;
  };
  const provisional: Lookups = {
    groups,
    values: valuesOf(([first]) => first!.reader),
  };

  const keptCopies = new Map<string, TableReader>();
  let coveredCopies = 0;
  let coveredTokens = 0;
  for (const [id, list] of copies) {
    const converted = list.map(({ reader, raw }) => ({
      table: reader.name,
      reader,
      token: reader.token(raw, provisional)[1],
    }));
    let kept = converted.find((a) =>
      converted.every((b) => covers(a.token, b.token)),
    );
    if (!kept) {
      const [first] = converted as [(typeof converted)[0]];
      const candidate =
        converted.find((c) => c.token.contextualReferenceTree) ?? first;
      const other = converted.find((c) => !covers(candidate.token, c.token))!;
      conflict('token', first.token.tokenName, candidate.table, other.table);
      kept = first;
    }
    const covered = converted.filter(
      (c) => !isDeepStrictEqual(c.token, kept.token),
    ).length;
    if (covered > 0) {
      coveredCopies += covered;
      coveredTokens += 1;
    }
    keptCopies.set(id, kept.reader);
  }

  const keptValues = valuesOf((_list, id) => keptCopies.get(id)!);
  const lookups: Lookups = { groups, values: keptValues };

  const tokens = new Map<
    string,
    { table: string; token: StoredToken; raw: RawObject }
  >();
  const unresolvedChildren: Array<{
    table: string;
    token: StoredToken;
    child: string;
  }> = [];
  for (const [id, list] of copies) {
    const reader = keptCopies.get(id)!;
    const { raw } = list.find((copy) => copy.reader === reader)!;
    const [, token, unresolved] = reader.token(raw, lookups);
    tokens.set(id, { table: reader.name, token, raw });
    for (const child of unresolved) {
      unresolvedChildren.push({ table: reader.name, token, child });
    }
  }

  const sets = new Map<
    string,
    { table: string; set: Omit<StoredSet, 'tokens'> }
  >();
  const tagGroups = new Map<
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

    for (const group of reader.tagGroups()) {
      const kept = tagGroups.get(group.contextTagGroupName);
      if (!kept) {
        tagGroups.set(group.contextTagGroupName, {
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

  for (const [name, { table }] of tagGroups) {
    if (!Object.hasOwn(RENDERED_CONTEXT, name)) {
      refuse(
        table,
        name,
        'contextTagGroups',
        'is not a group of the rendered context',
      );
    }
  }

  checkSelections(tokens);

  for (const { table, token, child } of unresolvedChildren) {
    if (!legacy) {
      refuse(
        table,
        token.tokenName,
        'contextualReferenceTree.referenceTree.childNodes.value',
        `names no value of ${child} in the store`,
      );
    }
    conflicts.push({
      kind: 'value',
      name: `${token.tokenName} → ${child}`,
      keptTable: keptValues.get(child)!.table,
      otherTable: table,
    });
  }

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

  const setGroups = new Map<string, StoredDisplayGroup[]>(
    setIds.map((id) => [id, []]),
  );
  const paths = new Set<string>();
  for (const [id, { table }] of groupRows) {
    const { setId, path, group: stored } = groups.get(id)!;
    const list = setGroups.get(setId);
    if (!list) {
      refuse(table, id, 'name', 'is a group of no token set');
    }
    const key = JSON.stringify([setId, ...path]);
    if (paths.has(key)) {
      refuse(table, id, 'displayName', 'has the path of another group');
    }
    paths.add(key);
    list.push(stored);
  }

  const storedSets: StoredSet[] = [
    ...setIds.map((id) => {
      const displayGroups = setGroups.get(id)!;
      return {
        ...sets.get(id)!.set,
        ...(displayGroups.length > 0 && { displayGroups }),
        tokens: members.get(id)!,
      };
    }),
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
    contextTagGroups: [...tagGroups.values()].map(({ group, tags }) => ({
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
    covered: { copies: coveredCopies, tokens: coveredTokens },
  };
}
