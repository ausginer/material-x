import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import type {
  ContextTags,
  ContextualEntry,
  Manifest,
  StoredContext,
  StoredSet,
  StoredTagGroup,
  StoredToken,
  StoredValue,
} from './schema.ts';

/** The context tag groups that upstream's tables name. */
export type ContextTagGroupName =
  | 'platform'
  | 'audience'
  | 'motion.scheme'
  | 'theme'
  | 'contrast'
  | 'device'
  | 'language.height'
  | 'ios.dark.theme.elevation'
  | 'ios.weight.setting'
  | 'font';

/**
 * The context the CSS layer renders: one tag of every context tag group. The
 * tags that are upstream's defaults are written out too, so that a change of
 * upstream's default doesn't change what is rendered.
 */
export const RENDERED_CONTEXT: Readonly<Record<ContextTagGroupName, string>> = {
  platform: 'web',
  audience: '3p',
  'motion.scheme': 'expressive',
  theme: 'light',
  contrast: 'default',
  device: 'mobile',
  'language.height': 'small',
  'ios.dark.theme.elevation': 'none',
  'ios.weight.setting': 'default',
  font: 'static',
};

/** The context tag groups whose tag differs from the rendered context's. */
export type ContextChanges = Readonly<
  Partial<Record<ContextTagGroupName, string>>
>;

/** Whether `context` has each of the entry's tags. */
export function matchesContext(
  { contextTags }: ContextualEntry,
  context: ContextTags,
): boolean {
  return (
    !contextTags ||
    Object.entries(contextTags).every(([group, tag]) => context[group] === tag)
  );
}

export type StoreData = Readonly<{
  context: StoredContext;
  sets: readonly StoredSet[];
}>;

export type Selection = Readonly<{
  /** The value entry the selected tree starts from. */
  value: StoredValue;
  /** The selected contextual entry, absent for a token with no tree. */
  entry?: ContextualEntry;
}>;

async function readStoreFile(
  directory: URL,
  path: string,
  sha256?: string,
): Promise<unknown> {
  const url = new URL(path, directory);
  let text: string;

  try {
    text = await readFile(url, 'utf8');
  } catch (error) {
    throw new Error(`Token store file is missing: ${url.pathname}`, {
      cause: error,
    });
  }

  if (
    sha256 != null &&
    createHash('sha256').update(text).digest('hex') !== sha256
  ) {
    throw new Error(
      `Token store file doesn't match the manifest: ${url.pathname}`,
    );
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Token store file isn't valid JSON: ${url.pathname}`, {
      cause: error,
    });
  }
}

/**
 * Reads tproc's committed token store. It has no network path: a missing or
 * changed store file fails the load and names the file.
 */
export async function loadStore(directory: URL): Promise<Store> {
  const manifest = (await readStoreFile(
    directory,
    'manifest.json',
  )) as Manifest;

  const files = await Promise.all(
    manifest.files.map(
      async ({ path, sha256 }) =>
        [path, await readStoreFile(directory, path, sha256)] as const,
    ),
  );

  let context: StoredContext | undefined;
  const sets: StoredSet[] = [];

  for (const [path, contents] of files) {
    if (path === 'context.json') {
      context = contents as StoredContext;
    } else {
      sets.push(contents as StoredSet);
    }
  }

  if (!context) {
    throw new Error(
      `Token store manifest names no context.json: ${new URL('manifest.json', directory).pathname}`,
    );
  }

  return new Store({ context, sets });
}

/** The typed query API over the token store. */
export class Store {
  readonly #context: StoredContext;
  readonly #sets: readonly StoredSet[];
  readonly #setsByName = new Map<string, StoredSet>();
  readonly #setsByToken = new Map<StoredToken, StoredSet>();
  readonly #tokensByName = new Map<string, StoredToken>();

  constructor({ context, sets }: StoreData) {
    this.#context = context;
    this.#sets = sets;

    for (const set of sets) {
      this.#setsByName.set(set.tokenSetName, set);

      for (const token of set.tokens) {
        this.#setsByToken.set(token, set);
        this.#tokensByName.set(token.tokenName, token);
      }
    }
  }

  /** The token sets, in the store's order. */
  get sets(): readonly StoredSet[] {
    return this.#sets;
  }

  /** Every token, set by set. */
  get tokens(): IteratorObject<StoredToken> {
    return Iterator.from(this.#sets).flatMap((set) => set.tokens);
  }

  get tagGroups(): readonly StoredTagGroup[] {
    return this.#context.contextTagGroups;
  }

  getSet(tokenSetName: string): StoredSet | undefined {
    return this.#setsByName.get(tokenSetName);
  }

  getToken(tokenName: string): StoredToken | undefined {
    return this.#tokensByName.get(tokenName);
  }

  /** The set that holds `token`, which must be one of this store's. */
  getTokenSet(token: StoredToken): StoredSet {
    return this.#setsByToken.get(token)!;
  }

  isTokenDeprecated(token: StoredToken): boolean {
    return (
      token.deprecationMessage != null ||
      !!this.getTokenSet(token).displayName?.startsWith('[Deprecated]')
    );
  }

  /**
   * Selects the token's contextual entry for the rendered context, with the
   * tags that `changes` gives in place of its own. It selects nothing when the
   * token has a tree and no entry for that context. A token with no tree
   * selects its first value.
   */
  // A query of the reader, beside the ones that read its indexes.
  // oxlint-disable-next-line class-methods-use-this
  select(token: StoredToken, changes?: ContextChanges): Selection | undefined {
    const tree = token.contextualReferenceTree;

    if (!tree) {
      const [value] = token.values;
      return value && { value };
    }

    const context = { ...RENDERED_CONTEXT, ...changes };
    const entry = tree.find((candidate) => matchesContext(candidate, context));

    return entry && { value: token.values[entry.value]!, entry };
  }
}
