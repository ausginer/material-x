import { selector } from './selector.ts';
import type { TokenSet } from './utils.ts';
import * as CSSVariable from './variable.ts';

export type RenderBlock = Readonly<{
  path: string;
  selectors: ReadonlyArray<string | null | undefined>;
  declarations: TokenSet;
}>;

export type DeclarationBlockRenderer = (
  path: string,
  declarations: TokenSet,
) => RenderBlock | readonly RenderBlock[] | null | undefined;

export type BlockAdjuster = (
  block: RenderBlock,
) => RenderBlock | readonly RenderBlock[] | null | undefined;

export const defaultDeclarationBlockRenderer: DeclarationBlockRenderer = (
  path,
  declarations,
) => ({
  path,
  selectors: [selector(':host')],
  declarations,
});

export type TokenPackageOptions = Readonly<{
  nodes: Readonly<Record<string, TokenSet>>;
  effective: Readonly<Record<string, TokenSet>>;
  order: readonly string[];
  renderers?: readonly DeclarationBlockRenderer[];
}>;

export class TokenPackage {
  readonly #nodes: Readonly<Record<string, TokenSet>>;
  readonly #effective: Readonly<Record<string, TokenSet>>;
  readonly #order: readonly string[];
  readonly #renderers: readonly DeclarationBlockRenderer[];

  /** Stores deduped tokens for a token set. */
  constructor({
    nodes,
    effective,
    order,
    renderers = [defaultDeclarationBlockRenderer],
  }: TokenPackageOptions) {
    this.#nodes = nodes;
    this.#effective = effective;
    this.#order = order;
    this.#renderers =
      renderers.length > 0 ? renderers : [defaultDeclarationBlockRenderer];
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

      const renderBlocks = this.#renderers.flatMap((renderer) => {
        const rendered = renderer(key, node);

        if (rendered == null) {
          return [];
        }

        return Array.isArray(rendered) ? rendered : [rendered];
      });

      for (const block of renderBlocks) {
        const entries = Object.entries(node);

        if (entries.length === 0) {
          continue;
        }

        const declarations = entries
          .map(
            ([name, value]) =>
              `  --_${CSSVariable.cssify(name)}: ${String(value)};`,
          )
          .join('\n');

        const selectors = block.selectors.filter((s) => s != null).join(', ');

        blocks.push(`${selectors} {\n${declarations}\n}`);
      }
    }

    return blocks.join('\n\n');
  }
}
