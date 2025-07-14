export default class TokenSetManager {
  readonly name: string;
  readonly #dependencies = new Set<string>();

  constructor(name: string) {
    this.name = name;
  }

  get dependencies(): readonly string[] {
    return [...this.#dependencies];
  }

  add(dependency: string): void {
    this.#dependencies.add(dependency);
  }
}
