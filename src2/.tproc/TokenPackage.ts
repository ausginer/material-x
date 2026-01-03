import {
  buildSelector,
  cssify,
  type TokenSet,
  type VariantScope,
} from './utils.ts';

export type RenderBlock = Readonly<{
  path: string;
  selector: string;
  declarations: string;
}>;

export type RenderAdjuster = (
  block: RenderBlock,
) => RenderBlock | readonly RenderBlock[] | null | undefined;

export type TokenPackageOptions = Readonly<{
  scope?: VariantScope;
  nodes: Readonly<Record<string, TokenSet>>;
  effective: Readonly<Record<string, TokenSet>>;
  order: readonly string[];
  renderAdjusters?: readonly RenderAdjuster[];
}>;

export class TokenPackage {
  readonly #scope?: VariantScope;
  readonly #nodes: Readonly<Record<string, TokenSet>>;
  readonly #effective: Readonly<Record<string, TokenSet>>;
  readonly #order: readonly string[];
  readonly #renderAdjusters: readonly RenderAdjuster[];

  /**
   * Stores deduped tokens for a single component scope.
   */
  constructor({
    scope,
    nodes,
    effective,
    order,
    renderAdjusters = [],
  }: TokenPackageOptions) {
    this.#scope = scope;
    this.#nodes = nodes;
    this.#effective = effective;
    this.#order = order;
    this.#renderAdjusters = renderAdjusters;
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
   * Returns the fully resolved token map for a state path, if present.
   */
  effective(path: string): TokenSet | undefined {
    return this.#effective[path];
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

      const selector = buildSelector(key, this.#scope);
      const declarations = entries
        .map(([name, value]) => `  --_${cssify(name)}: ${String(value)};`)
        .join('\n');

      const baseBlock: RenderBlock = {
        path: key,
        selector,
        declarations,
      };

      let renderBlocks = [baseBlock];

      for (const adjuster of this.#renderAdjusters) {
        renderBlocks = renderBlocks.flatMap((block) => {
          const adjusted = adjuster(block);

          if (adjusted === null) {
            return [];
          }

          if (adjusted === undefined) {
            return [block];
          }

          return Array.isArray(adjusted) ? [...adjusted] : [adjusted];
        });

        if (renderBlocks.length === 0) {
          break;
        }
      }

      for (const block of renderBlocks) {
        blocks.push(`${block.selector} {\n${block.declarations}\n}`);
      }
    }

    return blocks.join('\n\n');
  }
}
