import type SystemUnifier from './SystemUnifier.ts';
import type { TokenSet } from './TokenTable.ts';

export type MaybeOrphanTokenSet = Required<Pick<TokenSet, 'tokenSetName'>> &
  Partial<Omit<TokenSet, 'tokenSetName'>>;

export default class SystemTokenSet {
  readonly #set: MaybeOrphanTokenSet;
  readonly #unifier: SystemUnifier;

  constructor(set: MaybeOrphanTokenSet, unifier: SystemUnifier) {
    this.#set = set;
    this.#unifier = unifier;
  }

  get deprecated(): boolean {
    return !!this.#set.displayName?.startsWith('[Deprecated]');
  }

  valueOf(): MaybeOrphanTokenSet {
    return this.#set;
  }
}
