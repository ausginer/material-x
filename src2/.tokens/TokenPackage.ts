import {
  buildSelector,
  cssify,
  type TokenSet,
  type VariantScope,
} from './utils.ts';

export class TokenPackage {
  readonly #scope?: VariantScope;
  readonly #nodes: Readonly<Record<string, TokenSet>>;
  readonly #order: readonly string[];

  /**
   * Stores deduped tokens for a single component scope.
   */
  constructor(
    scope: VariantScope | undefined,
    nodes: Readonly<Record<string, TokenSet>>,
    order: readonly string[],
  ) {
    this.#scope = scope;
    this.#nodes = nodes;
    this.#order = order;
  }

  get scope(): VariantScope | undefined {
    return this.#scope;
  }

  /**
   * Returns the deduped token map for a state path, if present.
   */
  state(path: string): TokenSet | undefined {
    return this.#nodes[path];
  }

  /**
   * Renders deduped tokens into a CSS string of :host blocks.
   */
  render(): string {
    const blocks: string[] = [];

    for (const key of this.#order) {
      const node = this.#nodes[key];

      if (!node) {
        continue;
      }

      const entries = Object.entries(node);

      if (entries.length === 0) {
        continue;
      }

      const selectorText = buildSelector(key, this.#scope);
      const declarations = entries
        .map(([name, value]) => `  --_${cssify(name)}: ${String(value)};`)
        .join('\n');

      blocks.push(`${selectorText} {\n${declarations}\n}`);
    }

    return blocks.join('\n\n');
  }
}
