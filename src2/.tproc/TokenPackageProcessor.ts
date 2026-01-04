import processTokenSet, {
  type ProcessedTokenValue,
} from './processTokenSet.ts';
import { resolveSet, type ResolveAdjuster } from './resolve.ts';
import { resolveInheritance } from './resolveInheritance.ts';
import { TokenPackage, type RenderAdjuster } from './TokenPackage.ts';
import {
  defaultGroup,
  type AppendInput,
  type ExtensionEntry,
  type ExtensionManager,
  type ExtensionParent,
  type Extendable,
  type Grouper,
  type ParentRef,
  type TokenSet,
  type VariantScope,
} from './utils.ts';

export type ExtensionCallback = (x: ExtensionManager) => void;

type AllowedTokenMap = Record<string, true>;

type RawNodeBucket = Record<string, ProcessedTokenValue>;

function isExtendable(value: ExtensionParent): value is Extendable {
  return (
    typeof value === 'object' &&
    'extends' in value &&
    typeof (value as { extends?: unknown }).extends === 'function'
  );
}

export class TokenPackageProcessor {
  readonly #setName: string;
  readonly #extensions: Record<string, ExtensionEntry> = {};
  readonly #appends: AppendInput[] = [];
  readonly #tokenAdjusters: ResolveAdjuster[] = [];
  readonly #renderAdjusters: RenderAdjuster[] = [];
  #scope?: VariantScope;
  #group: Grouper = defaultGroup;
  #allowedTokens?: AllowedTokenMap;
  #extensionCallback?: ExtensionCallback;

  /**
   * Creates a processor for a token set name.
   * The name is later used to pull raw tokens from the DB layer.
   */
  constructor(setName: string) {
    this.#setName = setName;
  }

  /**
   * Scopes all rendered selectors to a single variant attribute.
   *
   * @example
   * ```ts
   * const processor = new TokerPackageProcessor('md.comp.button')
   *   .scope('color', 'elevated');
   *
   * // => :host([color='elevated'])
   * ```
   */
  scope(name: string, value: string): this {
    this.#scope = { name, value };
    return this;
  }

  /**
   * Defines how raw token names map into state buckets.
   */
  group(callback: Grouper): this {
    this.#group = callback;
    return this;
  }

  /**
   * Declares inheritance between state buckets.
   */
  extend(callback: ExtensionCallback): this {
    this.#extensionCallback = callback;
    return this;
  }

  /**
   * Adds explicit token overrides keyed by dot-separated paths.
   */
  append(tokens: AppendInput): this {
    this.#appends.push(tokens);
    return this;
  }

  /**
   * Whitelists tokens that should be emitted in the final CSS.
   */
  allowTokens(tokens: readonly string[]): this {
    this.#allowedTokens = Object.fromEntries(
      tokens.map((token) => [token, true] as const),
    );
    return this;
  }

  /**
   * Adds token value adjusters applied during resolve.
   */
  adjustTokens(...adjusters: readonly ResolveAdjuster[]): this {
    this.#tokenAdjusters.push(...adjusters);
    return this;
  }

  /**
   * Adds render adjusters applied during CSS output.
   */
  adjustRender(...adjusters: readonly RenderAdjuster[]): this {
    this.#renderAdjusters.push(...adjusters);
    return this;
  }

  /**
   * Resolves raw tokens, applies inheritance and deduping,
   * and returns a renderable TokenPackage.
   */
  build(): TokenPackage {
    const rawSet = processTokenSet(this.#setName);
    const nodes: Record<string, RawNodeBucket> = {};
    const orderHint: string[] = [];

    const ensureNode = (path: string): RawNodeBucket => {
      if (nodes[path]) {
        return nodes[path];
      }

      const created: RawNodeBucket = {};
      nodes[path] = created;
      orderHint.push(path);
      return created;
    };

    for (const [name, value] of Object.entries(rawSet)) {
      const { path, name: tokenName } = this.#group(name);
      const node = ensureNode(path);
      node[tokenName] = value;
    }

    for (const append of this.#appends) {
      for (const [path, tokens] of Object.entries(append)) {
        const key = path.length > 0 ? path : 'default';
        const node = ensureNode(key);
        Object.assign(node, tokens);
      }
    }

    this.#extensionCallback?.({
      state: (path) => {
        const key = path;

        const extendable: Extendable = {
          path,
          extends: (...parents) => {
            const refs: ParentRef[] = [];

            for (const parent of parents) {
              if (!parent) {
                continue;
              }

              if (isExtendable(parent)) {
                refs.push({ kind: 'local', key: parent.path });
                continue;
              }

              refs.push({
                kind: 'external',
                tokens: parent,
              });
            }

            this.#extensions[key] = { path, parents: refs };

            return extendable;
          },
        };

        return extendable;
      },
    });

    for (const key of Object.keys(this.#extensions)) {
      if (nodes[key]) {
        continue;
      }

      nodes[key] = {};
      orderHint.push(key);
    }

    const resolved: Record<string, TokenSet> = {};

    for (const [key, node] of Object.entries(nodes)) {
      const tokens = resolveSet(node, ...this.#tokenAdjusters);
      const filtered = this.#allowedTokens
        ? Object.fromEntries(
            Object.entries(tokens).filter(
              ([name]) => this.#allowedTokens?.[name],
            ),
          )
        : tokens;

      resolved[key] = filtered;
    }

    const { deduped, effective, order } = resolveInheritance(
      resolved,
      this.#extensions,
      orderHint,
    );

    return new TokenPackage({
      scope: this.#scope,
      nodes: deduped,
      effective,
      order,
      renderAdjusters: this.#renderAdjusters,
    });
  }
}
