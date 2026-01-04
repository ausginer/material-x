import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { SetRequired } from 'type-fest';
import type { MaterialTheme } from '../MaterialTheme.ts';
import type {
  ContextTag,
  ContextTagGroup,
  ReferenceTree,
  ResolvedValue,
  Token,
  TokenSet,
  TokenSystem,
  TokenTable,
  Value,
} from '../TokenTable.ts';
import { distinct, getSetName, root, type JSONModule } from '../utils.ts';

const DEFAULT_THEME_URL = new URL('../default-theme.json', import.meta.url);
const CACHE_DIR = new URL('.data/tokens/', root);
function isTokenTable(value: unknown): value is TokenTable {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  if (!Object.hasOwn(value, 'system')) {
    return false;
  }

  const system = Reflect.get(value, 'system');
  return typeof system === 'object' && system !== null;
}

async function download(url: URL): Promise<TokenTable> {
  const cacheFile = new URL(
    url.pathname.substring(url.pathname.lastIndexOf('/') + 1),
    CACHE_DIR,
  );

  try {
    const contents: JSONModule<TokenTable> = await import(
      fileURLToPath(cacheFile),
      { with: { type: 'json' } }
    );
    return contents.default;
  } catch {
    console.log(`Caching tokens from ${url}`);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch tokens from ${url}: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.text();
    let parsed: unknown;

    try {
      parsed = JSON.parse(data);
    } catch (error) {
      throw new Error(`Invalid token payload from ${url}`, { cause: error });
    }

    if (!isTokenTable(parsed)) {
      throw new Error(`Invalid token payload from ${url}`);
    }

    await mkdir(new URL('./', cacheFile), { recursive: true });
    await writeFile(cacheFile, data, 'utf8');

    return parsed;
  }
}

export type MaybeOrphanTokenSet = SetRequired<
  Partial<TokenSet>,
  'tokenSetName'
>;

export type ExtendedValue = Readonly<{
  value: Value;
  resolvedValue?: ResolvedValue;
}>;

export class DB {
  readonly #allowedTags: readonly string[];
  readonly #setsMap = new WeakMap<Token, MaybeOrphanTokenSet>();
  readonly #systems: readonly TokenSystem[];
  readonly #theme: MaterialTheme;
  readonly #tokensByName = new Map<string, Token>();
  readonly #valuesMap = new WeakMap<Token, ExtendedValue>();

  static async load(): Promise<DB> {
    const [theme, ...systems] = await Promise.all([
      import(String(DEFAULT_THEME_URL), { with: { type: 'json' } }).then(
        (mod: JSONModule<MaterialTheme>) => mod.default,
      ),
      ...[
        'https://m3.material.io/_dsm/data/dsdb-m3/latest/COLOR.20543ce18892f7d9.json',
        'https://m3.material.io/_dsm/data/dsdb-m3/latest/ELEVATION.20543ce18892f7d9.json',
        'https://m3.material.io/_dsm/data/dsdb-m3/latest/TOKEN_TYPE_UNSPECIFIED.20543ce18892f7d9.json',
        'https://m3.material.io/_dsm/data/dsdb-m3/latest/TYPOGRAPHY.20543ce18892f7d9.json',
        // Buttons
        'https://m3.material.io/_dsm/data/dsdb-m3/latest/TOKEN_TABLE.1c4257f8804f9478.json',
        // FABs
        'https://m3.material.io/_dsm/data/dsdb-m3/latest/TOKEN_TABLE.41587918e51cca98.json',
        // Text Fields
        'https://m3.material.io/_dsm/data/dsdb-m3/latest/TOKEN_TABLE.60990dd98dea0998.json',
        // Extended FABs
        'https://m3.material.io/_dsm/data/dsdb-m3/latest/TOKEN_TABLE.36500f77b86d20a5.json',
        // Icon Buttons
        'https://m3.material.io/_dsm/data/dsdb-m3/latest/TOKEN_TABLE.0fe2282006ae098b.json',
        // Button Groups
        'https://m3.material.io/_dsm/data/dsdb-m3/latest/TOKEN_TABLE.082d7fd6e058b011.json',
        // Split Buttons
        'https://m3.material.io/_dsm/data/dsdb-m3/latest/TOKEN_TABLE.624e8f2da4007fc8.json',
      ].map(async (url) => (await download(new URL(url))).system),
    ]);

    return new DB(theme, systems, ['expressive', 'web']);
  }

  constructor(
    theme: MaterialTheme,
    systems: readonly TokenSystem[],
    allowedTags: readonly string[],
  ) {
    this.#theme = theme;
    this.#systems = systems;
    this.#allowedTags = allowedTags;

    for (const token of this.tokens) {
      this.#tokensByName.set(token.tokenName, token);
    }
  }

  get theme(): MaterialTheme {
    return this.#theme;
  }

  get tagGroups(): IteratorObject<ContextTagGroup> {
    return distinct(
      Iterator.from(this.#systems).flatMap((system) => system.contextTagGroups),
      (group) => group.name,
    );
  }

  get tags(): IteratorObject<ContextTag> {
    return distinct(
      Iterator.from(this.#systems).flatMap((system) => system.tags),
      (tag) => tag.name,
    );
  }

  get tokenSets(): IteratorObject<TokenSet> {
    return distinct(
      Iterator.from(this.#systems).flatMap((system) => system.tokenSets),
      (set) => set.name,
    );
  }

  get tokens(): IteratorObject<Token> {
    return distinct(
      Iterator.from(this.#systems).flatMap((system) => system.tokens),
      (token) => token.name,
    );
  }

  get values(): IteratorObject<Value> {
    return distinct(
      Iterator.from(this.#systems).flatMap((system) => system.values),
      (value) => value.name,
    );
  }

  getToken(name: string): Token | undefined {
    return this.#tokensByName.get(name);
  }

  getValue(token: Token): ExtendedValue | undefined {
    if (!this.#valuesMap.has(token)) {
      const tags = this.tags.filter(({ tagName }) =>
        this.#allowedTags.includes(tagName),
      );

      const [referenceTree, resolvedValue] =
        this.getReferenceTreeAndResolvedValue(
          token.name,
          tags.map(({ name }) => name).toArray(),
        ) ?? [];

      const value = this.values.find((value) =>
        referenceTree
          ? value.name === referenceTree.value.name
          : value.name.startsWith(token.name),
      );

      if (value) {
        this.#valuesMap.set(token, {
          value,
          resolvedValue,
        });
      }
    }

    return this.#valuesMap.get(token);
  }

  isTokenDeprecated(token: Token): boolean {
    return (
      token.deprecationMessage != null ||
      isTokenSetDeprecated(this.getSet(token))
    );
  }

  getSet(token: Token): MaybeOrphanTokenSet {
    if (!this.#setsMap.has(token)) {
      const tokenSet = this.tokenSets.find((set) =>
        token.name.startsWith(set.name),
      );

      const set = tokenSet ?? {
        tokenSetName: getSetName(token),
      };

      this.#setsMap.set(token, set);
    }

    return this.#setsMap.get(token)!;
  }

  getSetTokens(set: TokenSet): readonly Token[] {
    return this.tokens
      .filter((token) => token.name.startsWith(set.name))
      .toArray();
  }

  getReferenceTreeAndResolvedValue(
    name: string,
    tags: readonly string[],
  ): readonly [ReferenceTree, ResolvedValue] | undefined {
    for (const system of this.#systems) {
      const tokenTree = system.contextualReferenceTrees[name];
      if (tokenTree) {
        const result =
          tokenTree.contextualReferenceTree.find(({ contextTags }) =>
            tags.some((tag) => contextTags?.includes(tag)),
          ) ?? tokenTree.contextualReferenceTree[0];

        if (!result) {
          continue;
        }

        return [result.referenceTree, result.resolvedValue];
      }
    }

    return undefined;
  }
}

function isTokenSetDeprecated(set?: MaybeOrphanTokenSet): boolean {
  return !!set?.displayName?.startsWith('[Deprecated]');
}
