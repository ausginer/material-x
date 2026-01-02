# CSS Inheritance for Token Shapes

## Goals

- Component-agnostic, explicit inheritance model for token sets.
- Drop duplicates while preserving CSS cascade semantics.
- Support default vs attributed variants without multi-attribute complexity.
- Keep the API and data model easy to read and reason about.

## Non-goals

- Full CSS cascade emulation (specificity, !important, origin).
- Implicit inference of inheritance from token names.
- Multi-attribute inheritance (postponed).
- Resolving values beyond `resolveSet`.

## Core Idea

Move from an implicit "reshape" tree to an explicit, flattened node list with
declared inheritance. This avoids heuristic parsing and keeps variant scope
explicit.

## Processor API Surface

```ts
export type VariantScope = Readonly<{
  name: string;
  value: string;
}>;

export type GroupResult = Readonly<{
  path: string;
  name: string;
}>;

export type Grouper = (tokenName: string) => GroupResult;

export type TokenSet = Readonly<Record<string, string | number>>;

export type Extendable = Readonly<{
  path: string;
  extends(...parents: readonly (Extendable | TokenSet | undefined)[]): void;
}>;

export type ExtensionManager = Readonly<{
  state(path: string): Extendable;
}>;

export class TokenPackage {
  readonly scope?: VariantScope;

  state(path: string): TokenSet | undefined;

  render(): string;
}

export class TokenPackageProcessor {
  scope(name: string, value: string): TokenPackageProcessor;

  group(callback: Grouper): TokenPackageProcessor;

  extend(callback: (x: ExtensionManager) => void): TokenPackageProcessor;

  append(
    tokens: Readonly<Record<string, Readonly<Record<string, string | number>>>>,
  ): TokenPackageProcessor;

  allowTokens(tokens: readonly string[]): TokenPackageProcessor;

  build(): TokenPackage;
}

export type TokenManager = Readonly<{
  set(name: string): TokenPackageProcessor;
}>;

export const t: TokenManager;
```

`TokenPackage.state(...)` returns the deduped token map for a state. This can be
passed into `extends(...)` to inherit from another package without a registry.

## Flattening (Replacing `reshape`)

Instead of `reshape` heuristics, we define a grouping function that maps a
token name to a `{ path, name }` pair.

Your initial callback already illustrates the intent:

```ts
function group(tokenName: string): GroupResult {
  const groups: string[] = [];
  let remaining = tokenName;

  if (remaining.includes('unselected.')) {
    groups.push('unselected');
    remaining = remaining.replace('unselected.', '');
  } else if (remaining.includes('selected.')) {
    groups.push('selected');
    remaining = remaining.replace('selected.', '');
  }

  if (remaining.includes('focused.')) {
    groups.push('focused');
    remaining = remaining.replace('focused.', '');
  } else if (remaining.includes('hovered.')) {
    groups.push('hovered');
    remaining = remaining.replace('hovered.', '');
  } else if (remaining.includes('pressed.')) {
    groups.push('pressed');
    remaining = remaining.replace('pressed.', '');
  } else if (remaining.includes('disabled.')) {
    groups.push('disabled');
    remaining = remaining.replace('disabled.', '');
  } else {
    groups.push('default');
  }

  const path = groups.length > 0 ? groups.join('.') : 'default';

  return {
    path,
    name: remaining,
  };
}
```

We can formalize this into a processor step:

- `group()` returns `{ path, name }`, where `name` is the token path with
  prefixes removed.
- The result is a flat list of token nodes, not a tree.

This makes grouping rules explicit and avoids relying on `reshape` path
matching.

## Selector Emission

Selectors are emitted by the component layer, not by the processor. The
package only provides state groupings and an optional `scope` attribute.
Components decide how to map `state(...)` to selectors (for example with the
existing `state.*()` helpers).

## Precedence Rules

Precedence is defined by the `extends` list:

1. Earlier parents have lower precedence.
2. Later parents have higher precedence.
3. The node itself has the highest precedence in its chain.

## Dedup Algorithm

Dedup runs after `resolveSet` and compares values with `===`.

For each node:

1. `inherited = merge(parent1, parent2, ..., parentN)` in the given `extends`
   order (later parents override earlier).
2. Remove tokens where `node.tokens[key] === inherited[key]`.

This keeps only values that actually change the effective result.

## Multi-attribute Variants (Deferred)

Multi-attribute inheritance is postponed. For now, we focus on `default` vs a
single attribute scope (e.g. `[color=elevated]`) and its interaction states.

## Set Boundaries

Each build handles exactly one token set and yields one CSSStyleSheet. This
keeps the current separation of styles per file. Cross-set inheritance can be
handled explicitly by importing another built set and referencing its nodes,
but there is no implicit set merging. A built set may expose its own attribute
scope (for example, `scope('color', 'elevated')`) so other builds can attach it
as a variant. Variant sets depend on base sets, not vice versa.

## Processor API (Proposed)

The processor focuses on declaration and staged transformation:

```ts
const _default = t
  .set('md.comp.button')
  .group(group) // explicit grouping function
  .extend((x) => {
    x.state('default').extends();
    x.state('hovered').extends(x.state('default'));
  })
  .append({
    default: {
      'state-layer.opacity': 'md.comp.button.pressed.state-layer.opacity',
      'state-layer.color': 'md.comp.button.pressed.state-layer.color',
    },
  })
  .allowTokens([
    'container.shape',
    'container.shape.round',
    'container.shape.square',
    'container.shadow-color',
  ])
  .build();

const elevated = t
  .set('md.comp.button.elevated')
  .scope('color', 'elevated')
  .group(group) // explicit grouping function
  .extend((x) => {
    x.state('default').extends(_default.state('default'));
    x.state('hovered').extends(
      _default.state('default'),
      _default.state('hovered'),
      x.state('default'),
    );
  })
  .build();
```

### Stage Semantics

- `set(name)`: loads and processes a single token set (one build per set).
- `scope(name, value)`: assigns a single attribute scope for all selectors in the set.
- `group(fn)`: maps each token to a `path` string and a local token name.
- `extend(fn)`: explicit inheritance list per node via the processor DSL;
  calling `extends()` with no args clears the parent list and implies
  "no inheritance".
- `append(obj)`: adds tokens before `resolveSet` so refs can resolve. Keys are
  dot-separated paths (for example, `'selected.hovered'`).
- `allowTokens(list)`: filters the final token list.
- `build()`: returns a `TokenPackage` that can be rendered or extended.

## Integration with Current Pipeline

Existing:

1. `processTokenSet`
2. `resolveSet`
3. `reshape`
4. `createVariables`
5. `pack`

Proposed:

1. `processTokenSet`
2. `group` -> flat token buckets
3. `append`
4. `resolveSet`
5. `extend` + dedup
6. `allowTokens`
7. `createVariables` + `pack`

This removes implicit `reshape` heuristics and replaces them with explicit,
ordered, graph-based inheritance.

## Validation Rules

- `extends` may only reference known nodes; missing nodes are errors.
- `extends` may not create cycles.
- `attrs` order is preserved; no implicit sorting unless explicitly requested.
