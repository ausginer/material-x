import SystemTokenSet from './SystemTokenSet.ts';
import type SystemUnifier from './SystemUnifier.ts';
import SystemValue from './SystemValue.ts';
import type { Token } from './TokenTable.ts';
import { extractSetName } from './utils.ts';

export default class SystemToken {
  readonly #token: Token;
  readonly #unifier: SystemUnifier;
  #value?: SystemValue | null;
  #set?: SystemTokenSet;

  constructor(token: Token, unifier: SystemUnifier) {
    this.#token = token;
    this.#unifier = unifier;
  }

  get deprecated(): boolean {
    return this.#token.deprecationMessage != null && !this.set.deprecated;
  }

  get set(): SystemTokenSet {
    if (this.#set === undefined) {
      const tokenSet = this.#unifier.rawTokenSets.find((set) =>
        this.#token.name.startsWith(set.name),
      );

      const set = tokenSet ?? {
        tokenSetName: extractSetName(
          this.#token.tokenName,
          this.#token.tokenNameSuffix,
        ),
      };

      this.#set = new SystemTokenSet(set, this.#unifier);
    }

    return this.#set;
  }

  get value(): SystemValue | null {
    if (this.#value === undefined) {
      const { allowedTags } = this.#unifier;
      const tags = this.#unifier.rawTags.filter(({ tagName }) =>
        allowedTags.includes(tagName),
      );

      const [referenceTree, resolvedValue] =
        this.#unifier.getReferenceTreeAndResolvedValue(
          this.#token.name,
          tags.map(({ name }) => name).toArray(),
        ) ?? [];

      const value = referenceTree
        ? this.#unifier.rawValues.find(
            ({ name }) => referenceTree.value.name === name,
          )
        : this.#unifier.rawValues.find((value) =>
            value.name.startsWith(this.#token.name),
          );

      this.#value = value
        ? new SystemValue(value, resolvedValue ?? null)
        : null;
    }

    return this.#value;
  }

  valueOf(): Token {
    return this.#token;
  }
}
