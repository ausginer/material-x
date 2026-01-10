import type {
  ExtensionEntry,
  ParentRef,
  TokenSet,
  TokenValue,
} from './utils.ts';

declare const $parentState: unique symbol;

export type ParentState = string & { [$parentState]: true };

export type ExtensionParent = ParentState | TokenSet | null | undefined;

export type ExtensionConsumer = (
  path: string,
  parents: readonly ExtensionParent[],
) => void;

export class ExtensionManager<_ extends boolean = false> {
  readonly #callback: ExtensionConsumer;
  #current?: string;

  constructor(callback: ExtensionConsumer) {
    this.#callback = callback;
  }

  state(this: ExtensionManager, state: string): ExtensionManager<true> {
    this.#current = state;
    return this;
  }

  extends(
    this: ExtensionManager<true>,
    ...parents: readonly ExtensionParent[]
  ): ParentState {
    const current = this.#current;

    if (!current) {
      throw new TypeError('State for extension is not selected');
    }

    this.#callback(current, parents);
    this.#current = undefined;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    return current as ParentState;
  }
}

/**
 * Resolves inheritance and dedupes tokens based on the provided extensions.
 * Returns deduped token sets and a topological order of the nodes.
 */
export function resolveInheritance(
  nodes: Readonly<Record<string, TokenSet>>,
  extensions: Readonly<Record<string, readonly ParentRef[]>>,
  orderHint: readonly string[] = [],
): {
  deduped: Readonly<Record<string, TokenSet>>;
  effective: Readonly<Record<string, TokenSet>>;
  order: readonly string[];
} {
  // Track parent refs in declaration order, plus local refs for graph building.
  const orderedParents: Record<string, ExtensionEntry['parents']> = {};
  const localParents: Record<string, string[]> = {};
  const nodeKeys = Object.keys(nodes);

  for (const key of nodeKeys) {
    orderedParents[key] = [];
    localParents[key] = [];
  }

  for (const [key, parents] of Object.entries(extensions)) {
    if (!Object.hasOwn(nodes, key)) {
      throw new Error(`Unknown node for extension: ${key}`);
    }

    orderedParents[key] = parents;
    localParents[key] = parents
      .filter((parent) => parent.kind === 'local')
      .map((parent) => parent.key);
  }

  // Use the hint to stabilize topological ordering when siblings are free.
  const orderIndex = orderHint.reduce<Record<string, number>>(
    (acc, key, index) => {
      acc[key] = index;
      return acc;
    },
    {},
  );

  // Build adjacency + indegree for the local extension graph.
  const inDegree: Record<string, number> = {};
  const children: Record<string, string[]> = {};

  for (const key of nodeKeys) {
    inDegree[key] = 0;
    children[key] = [];
  }

  for (const [childKey, parents] of Object.entries(localParents)) {
    for (const parentKey of parents) {
      if (!Object.hasOwn(nodes, parentKey)) {
        throw new Error(`Unknown parent node: ${parentKey}`);
      }

      children[parentKey]?.push(childKey);
      inDegree[childKey] = (inDegree[childKey] ?? 0) + 1;
    }
  }

  // Kahn's algorithm with a stable queue ordering.
  const queue = nodeKeys.filter((key) => (inDegree[key] ?? 0) === 0);
  queue.sort((a, b) => {
    const aIndex = orderIndex[a] ?? Number.MAX_SAFE_INTEGER;
    const bIndex = orderIndex[b] ?? Number.MAX_SAFE_INTEGER;

    if (aIndex !== bIndex) {
      return aIndex - bIndex;
    }

    return a.localeCompare(b);
  });

  const ordered: string[] = [];

  while (queue.length > 0) {
    const key = queue.shift();

    if (!key) {
      continue;
    }

    ordered.push(key);

    for (const child of children[key] ?? []) {
      const next = (inDegree[child] ?? 0) - 1;
      inDegree[child] = next;

      if (next === 0) {
        queue.push(child);
        queue.sort((a, b) => {
          const aIndex = orderIndex[a] ?? Number.MAX_SAFE_INTEGER;
          const bIndex = orderIndex[b] ?? Number.MAX_SAFE_INTEGER;

          if (aIndex !== bIndex) {
            return aIndex - bIndex;
          }

          return a.localeCompare(b);
        });
      }
    }
  }

  if (ordered.length !== nodeKeys.length) {
    throw new Error('Extension graph has a cycle');
  }

  // Walk in topo order: compute effective tokens and dedupe against inherited.
  const effective: Record<string, TokenSet> = {};
  const deduped: Record<string, TokenSet> = {};

  for (const key of ordered) {
    const node = nodes[key];

    if (!node) {
      continue;
    }

    let inherited: Record<string, TokenValue> = {};

    for (const parent of orderedParents[key] ?? []) {
      if (parent.kind === 'local') {
        const parentTokens = effective[parent.key];

        if (!parentTokens) {
          throw new Error(`Missing parent tokens for ${parent.key}`);
        }

        inherited = { ...inherited, ...parentTokens };
        continue;
      }

      inherited = { ...inherited, ...parent.tokens };
    }

    const resolved = node;
    const effectiveTokens = { ...inherited, ...resolved };
    const dedupedTokens = Object.fromEntries(
      Object.entries(resolved).filter(
        ([name, value]) => inherited[name] !== value,
      ),
    );

    effective[key] = effectiveTokens;
    deduped[key] = dedupedTokens;
  }

  return { deduped, effective, order: ordered };
}
