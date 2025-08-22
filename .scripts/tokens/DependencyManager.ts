import { sassName } from './utils.ts';

export default class DependencyManager {
  readonly set: string;
  readonly #dependencies = new Set<string>();

  constructor(set: string) {
    this.set = set;
  }

  get dependencies(): IteratorObject<string> {
    return Iterator.from(this.#dependencies);
  }

  get statements(): IteratorObject<string> {
    return this.dependencies.map(
      (dependency) => `@use "${sassName(dependency)}";`,
    );
  }

  add(dependency: string): void {
    this.#dependencies.add(dependency);
  }
}
