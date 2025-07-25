import SystemToken from './SystemToken.ts';
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
import { distinct } from './utils.ts';

export default class SystemUnifier {
  readonly allowedTags: readonly string[];
  readonly #systems: readonly TokenSystem[];

  constructor(systems: readonly TokenSystem[], allowedTags: readonly string[]) {
    this.#systems = systems;
    this.allowedTags = allowedTags;
  }

  get tokens(): IteratorObject<SystemToken> {
    return this.rawTokens.map((token) => new SystemToken(token, this));
  }

  get rawTagGroups(): IteratorObject<ContextTagGroup> {
    return distinct(
      Iterator.from(this.#systems).flatMap((system) => system.contextTagGroups),
      (group) => group.name,
    );
  }

  get rawTags(): IteratorObject<ContextTag> {
    return distinct(
      Iterator.from(this.#systems).flatMap((system) => system.tags),
      (tag) => tag.name,
    );
  }

  get rawTokenSets(): IteratorObject<TokenSet> {
    return distinct(
      Iterator.from(this.#systems).flatMap((system) => system.tokenSets),
      (set) => set.name,
    );
  }

  get rawTokens(): IteratorObject<Token> {
    return distinct(
      Iterator.from(this.#systems).flatMap((system) => system.tokens),
      (token) => token.name,
    );
  }

  get rawValues(): IteratorObject<Value> {
    return distinct(
      Iterator.from(this.#systems).flatMap((system) => system.values),
      (value) => value.name,
    );
  }

  getReferenceTreeAndResolvedValue(
    name: string,
    tags: readonly string[],
  ): readonly [ReferenceTree, ResolvedValue] | undefined {
    for (const system of this.#systems) {
      const tokenTree = system.contextualReferenceTrees[name];
      if (tokenTree) {
        const { referenceTree, resolvedValue } =
          tokenTree.contextualReferenceTree.find(({ contextTags }) =>
            tags.some((tag) => contextTags?.includes(tag)),
          ) ?? tokenTree.contextualReferenceTree[0];
        return [referenceTree, resolvedValue];
      }
    }

    return undefined;
  }
}
