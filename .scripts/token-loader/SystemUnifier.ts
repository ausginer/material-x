import type {
  ReferenceTree,
  Token,
  TokenSet,
  TokenSystem,
  Value,
} from './TokenTable.ts';
import { distinct } from './utils.ts';

export default class SystemUnifier {
  readonly #systems: readonly TokenSystem[];

  constructor(systems: readonly TokenSystem[]) {
    this.#systems = systems;
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

  getReferenceTree(name: string): ReferenceTree | undefined {
    for (const system of this.#systems) {
      const tokenTree = system.contextualReferenceTrees[name];
      if (tokenTree) {
        const [{ referenceTree }] = tokenTree.contextualReferenceTree;
        return referenceTree;
      }
    }

    return undefined;
  }
}
