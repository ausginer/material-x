import { ExtensionManager, resolveInheritance } from './ExtensionManager.ts';
import processTokenSet, {
  type ProcessedTokenSet,
  type ProcessedTokenValue,
} from './processTokenSet.ts';
import { resolveSet, type ResolveAdjuster } from './resolve.ts';
import {
  defaultDeclarationBlockRenderer,
  TokenPackage,
  type DeclarationBlockRenderer,
} from './TokenPackage.ts';
import {
  defaultGrouper,
  type AppendEntry,
  type Grouper,
  type GroupSelector,
  type ParentRef,
  type TokenSet,
} from './utils.ts';

export type ExtensionCallback = (manager: ExtensionManager) => void;

type RawNodeBucket = Record<string, ProcessedTokenValue>;

function defaultSelector() {
  return true;
}

export class TokenPackageProcessor {
  readonly #set: ProcessedTokenSet;
  readonly #extensions: Record<string, readonly ParentRef[]> = {};
  readonly #extensionMananger: ExtensionManager;
  readonly #appends: AppendEntry[] = [];
  readonly #tokenAdjusters: ResolveAdjuster[] = [];
  readonly #selectors: GroupSelector[] = [defaultSelector];
  #renderers: readonly DeclarationBlockRenderer[] = [
    defaultDeclarationBlockRenderer,
  ];
  #group: Grouper = defaultGrouper;
  #extensionCallback?: ExtensionCallback;

  /**
   * Creates a processor for a token set name.
   * The name is later used to pull raw tokens from the DB layer.
   */
  constructor(setOrSetName: string | ProcessedTokenSet) {
    if (typeof setOrSetName === 'string') {
      this.#set = processTokenSet(setOrSetName);
    } else {
      this.#set = setOrSetName;
    }

    this.#extensionMananger = new ExtensionManager((path, parents) => {
      const refs: ParentRef[] = [];

      for (const parent of parents) {
        if (!parent) {
          continue;
        }

        if (typeof parent === 'string') {
          refs.push({ kind: 'local', key: parent });
          continue;
        }

        refs.push({
          kind: 'external',
          tokens: parent,
        });
      }

      this.#extensions[path] = refs;
    });
  }

  /**
   * Defines how raw token names map into state buckets.
   */
  group(callback: Grouper): this {
    this.#group = callback;
    return this;
  }

  select(...callbacks: readonly GroupSelector[]): this {
    this.#selectors.push(...callbacks);
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
  append(group: string, tokens: TokenSet): this {
    this.#appends.push([group, tokens] as const);
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
   * Adds renderers applied during CSS output.
   */
  renderDeclarations(...renderers: readonly DeclarationBlockRenderer[]): this {
    this.#renderers = renderers;
    return this;
  }

  /**
   * Resolves raw tokens, applies inheritance and deduping,
   * and returns a renderable TokenPackage.
   */
  build(): TokenPackage {
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

    for (const [name, value] of Object.entries(this.#set)) {
      const result = this.#group(name);
      if (
        !result ||
        !this.#selectors.every((s) => s(result.path, result.tokenName))
      ) {
        continue;
      }

      const node = ensureNode(result.path);
      node[result.tokenName] = value;
    }

    for (const [path, tokens] of this.#appends) {
      const key = path.length > 0 ? path : 'default';
      const node = ensureNode(key);
      Object.assign(node, tokens);
    }

    this.#extensionCallback?.(this.#extensionMananger);

    for (const key of Object.keys(this.#extensions)) {
      if (nodes[key]) {
        continue;
      }

      nodes[key] = {};
      orderHint.push(key);
    }

    const resolved = Object.fromEntries(
      Object.entries(nodes).map(([key, node]) => [
        key,
        resolveSet(node, ...this.#tokenAdjusters),
      ]),
    );

    const { deduped, effective, order } = resolveInheritance(
      resolved,
      this.#extensions,
      orderHint,
    );

    return new TokenPackage({
      nodes: deduped,
      effective,
      order,
      renderers: this.#renderers,
    });
  }
}
