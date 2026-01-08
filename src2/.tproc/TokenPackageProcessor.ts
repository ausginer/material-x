import processTokenSet, {
  type ProcessedTokenSet,
  type ProcessedTokenValue,
} from './processTokenSet.ts';
import { resolveSet, type ResolveAdjuster } from './resolve.ts';
import { resolveInheritance } from './resolveInheritance.ts';
import {
  TokenPackage,
  type DeclarationBlockRenderer,
  defaultDeclarationBlockRenderer,
} from './TokenPackage.ts';
import {
  defaultGrouper,
  type AppendInput,
  type Extendable,
  type ExtensionEntry,
  type ExtensionManager,
  type ExtensionParent,
  type Grouper,
  type GroupSelector,
  type ParentRef,
} from './utils.ts';

export type ExtensionCallback = (x: ExtensionManager) => void;

type RawNodeBucket = Record<string, ProcessedTokenValue>;

function isExtendable(value: ExtensionParent): value is Extendable {
  return (
    typeof value === 'object' &&
    'extends' in value &&
    typeof (value as { extends?: unknown }).extends === 'function'
  );
}

function defaultSelector() {
  return true;
}

export class TokenPackageProcessor {
  readonly #set: ProcessedTokenSet;
  readonly #extensions: Record<string, ExtensionEntry> = {};
  readonly #appends: AppendInput[] = [];
  readonly #tokenAdjusters: ResolveAdjuster[] = [];
  #renderers: readonly DeclarationBlockRenderer[] = [
    defaultDeclarationBlockRenderer,
  ];
  #group: Grouper = defaultGrouper;
  #extensionCallback?: ExtensionCallback;
  #selectors: readonly GroupSelector[] = [defaultSelector];

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
  }

  /**
   * Defines how raw token names map into state buckets.
   */
  group(callback: Grouper): this {
    this.#group = callback;
    return this;
  }

  select(...callbacks: readonly GroupSelector[]): this {
    this.#selectors = callbacks;
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
      const { path, name: tokenName } = this.#group(name);
      if (!this.#selectors.every((s) => s(path, tokenName))) {
        continue;
      }
      const node = ensureNode(path);
      node[tokenName] = value;
    }

    for (const append of this.#appends) {
      for (const [path, tokens] of Object.entries(append)) {
        const key = path.length > 0 ? path : 'default';
        if (!this.#selectors.every((s) => s(key))) {
          continue;
        }

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
