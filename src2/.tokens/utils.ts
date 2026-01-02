import type { Param } from '../../src/core/tokens/selector.ts';
import {
  attribute,
  pseudoClass,
  selector,
} from '../../src/core/tokens/selector.ts';

export type VariantScope = Readonly<{
  name: string;
  value: string;
}>;

export type GroupResult = Readonly<{
  path: string;
  name: string;
}>;

export type Grouper = (tokenName: string) => GroupResult;

export type TokenValue = string | number;
export type TokenSet = Readonly<Record<string, TokenValue>>;

export type AppendInput = Readonly<
  Record<string, Readonly<Record<string, TokenValue>>>
>;

export type Extendable = Readonly<{
  path: string;
  extends(...parents: readonly ExtensionParent[]): void;
}>;

export type ExtensionParent = Extendable | TokenSet | undefined;

export type ExtensionManager = Readonly<{
  state(path: string): Extendable;
}>;

export type ParentRef =
  | Readonly<{ kind: 'local'; key: string }>
  | Readonly<{ kind: 'external'; tokens: TokenSet }>;

export type ExtensionEntry = Readonly<{
  path: string;
  parents: readonly ParentRef[];
}>;

/** Default grouping: places all tokens in the "default" bucket. */
export const defaultGroup: Grouper = (tokenName) => ({
  path: 'default',
  name: tokenName,
});

const stateMap: Readonly<Record<string, string>> = {
  hovered: 'hover',
  focused: 'focus-visible',
  pressed: 'active',
  disabled: 'disabled',
};

/** Converts RGBA byte values to hex, trimming the alpha channel when opaque. */
export function rgbaToHex(r: number, g: number, b: number, a: number): string {
  const hex = (((r << 24) | (g << 16) | (b << 8) | a) >>> 0)
    .toString(16)
    .padStart(8, '0');
  return `#${hex.endsWith('ff') ? hex.substring(0, 6) : hex}`;
}

/** Converts token names to CSS custom property names. */
export function cssify(name: string): string {
  return name.replaceAll('.', '-');
}

/** Builds a :host selector for a dot-separated state path and optional scope. */
export function buildSelector(path: string, scope?: VariantScope): string {
  const params: Param[] = [];

  if (scope) {
    params.push(attribute(scope.name, scope.value));
  }

  const segments = path.length > 0 ? path.split('.') : [];

  for (const segment of segments) {
    if (!segment || segment === 'default') {
      continue;
    }

    const mapped = stateMap[segment];
    params.push(mapped ? pseudoClass(mapped) : pseudoClass('state', segment));
  }

  return selector(':host', ...params);
}

/**
 * Resolves inheritance and dedupes tokens based on the provided extensions.
 * Returns deduped token sets and a topological order of the nodes.
 */
export function resolveInheritance(
  nodes: Readonly<Record<string, TokenSet>>,
  extensions: Readonly<Record<string, ExtensionEntry>>,
  orderHint: readonly string[] = [],
): {
  deduped: Readonly<Record<string, TokenSet>>;
  order: readonly string[];
} {
  // Split parent refs into local node keys vs. external token maps.
  const localParents: Record<string, string[]> = {};
  const externalParents: Record<string, TokenSet[]> = {};
  const nodeKeys = Object.keys(nodes);

  for (const key of nodeKeys) {
    localParents[key] = [];
    externalParents[key] = [];
  }

  for (const [key, entry] of Object.entries(extensions)) {
    if (!Object.hasOwn(nodes, key)) {
      throw new Error(`Unknown node for extension: ${key}`);
    }

    const locals = localParents[key] ?? [];
    const externals = externalParents[key] ?? [];

    for (const parent of entry.parents) {
      if (parent.kind === 'external') {
        externals.push(parent.tokens);
      } else {
        locals.push(parent.key);
      }
    }

    localParents[key] = locals;
    externalParents[key] = externals;
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

    for (const parentKey of localParents[key] ?? []) {
      const parentTokens = effective[parentKey];

      if (!parentTokens) {
        throw new Error(`Missing parent tokens for ${parentKey}`);
      }

      inherited = { ...inherited, ...parentTokens };
    }

    for (const parentTokens of externalParents[key] ?? []) {
      inherited = { ...inherited, ...parentTokens };
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

  return { deduped, order: ordered };
}

if (import.meta.vitest) {
  const { it, expect } = import.meta.vitest;

  it('buildSelector builds state and scoped selectors', () => {
    expect(buildSelector('default', { name: 'color', value: 'elevated' })).toBe(
      ':host([color="elevated"])',
    );
    expect(buildSelector('hovered', undefined)).toBe(':host(:hover)');
    expect(buildSelector('selected', undefined)).toBe(
      ':host(:state(selected))',
    );
  });

  it('resolveInheritance dedupes tokens', () => {
    const nodes: Readonly<Record<string, TokenSet>> = {
      default: { 'container.elevation': 0 },
      hovered: { 'container.elevation': 0, 'state-layer.opacity': 0.08 },
    };

    const extensions: Readonly<Record<string, ExtensionEntry>> = {
      default: {
        path: 'default',
        parents: [],
      },
      hovered: {
        path: 'hovered',
        parents: [{ kind: 'local', key: 'default' }],
      },
    };

    const result = resolveInheritance(nodes, extensions, [
      'default',
      'hovered',
    ]);

    expect(result.deduped['hovered']).toEqual({
      'state-layer.opacity': 0.08,
    });
  });
}
