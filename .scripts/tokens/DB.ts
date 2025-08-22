import type { SetRequired } from 'type-fest';
import type {
  ContextTag,
  ContextTagGroup,
  ReferenceTree,
  ResolvedValue,
  Token,
  TokenSet,
  TokenSystem,
  Value,
} from './TokenTable.ts';
import { distinct, getSetName } from './utils.ts';

export type MaybeOrphanTokenSet = SetRequired<
  Partial<TokenSet>,
  'tokenSetName'
>;

export type ExtendedValue = Readonly<{
  value: Value;
  resolvedValue?: ResolvedValue;
  order: number;
}>;

export default class DB {
  readonly #allowedTags: readonly string[];
  readonly #valuesMap = new WeakMap<Token, ExtendedValue>();
  readonly #setsMap = new WeakMap<Token, MaybeOrphanTokenSet>();
  readonly #systems: readonly TokenSystem[];

  constructor(systems: readonly TokenSystem[], allowedTags: readonly string[]) {
    this.#systems = systems;
    this.#allowedTags = allowedTags;
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
    return this.tokens.find((token) => token.tokenName === name);
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
          order: getOrder(referenceTree),
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

function getOrder(referenceTree?: ReferenceTree): number {
  if (!referenceTree) {
    return 0;
  }

  let _tree = referenceTree;
  let order = 0;

  while ('childNodes' in _tree && _tree.childNodes.length > 0) {
    _tree = _tree.childNodes[0]!;
    order += 1;
  }

  return order;
}
