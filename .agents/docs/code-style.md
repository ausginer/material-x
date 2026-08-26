# Code style

Conventions for source in this repository. Kept resident, because these are applied while writing rather than consulted afterwards.

## Priorities, in order

1. **Performance** — code should be as fast as possible for the end user.
2. **Code size** — a smaller bundle can outperform a faster-but-larger one, because load time is part of the user's experience. Keep code size minimal unless it costs runtime performance. Private identifiers may have long names; they are mangled in production builds.
3. **Readability** — code must be maintainable. DX does not prevail over UX. A comment is sometimes better than a less performant but cleaner implementation.

Size and ownership have their own policy in [`CODE_OF_SIZE.md`](../../CODE_OF_SIZE.md), which is senior to this document wherever the two meet.

## Language and platform

- Use **Baseline-2025** features.
- Prefer native browser and Node.js APIs over a library wherever the native API covers the use case — `fetch` over axios, `Array.groupBy` over lodash, `#private` over the `private` keyword. This does not apply to libraries that provide substantial value beyond a native API, such as TanStack Query or React Router.
- Never use the `sync` variants of `node:fs` unless there is genuinely no async alternative. `registerHooks` from `node:module` requires synchronous hooks and is the only known exception.
- Use `AbortController` instead of `removeEventListener` wherever it applies.
- Use `{ once: true }` instead of `removeEventListener` wherever it applies.
- Treat `Object.assign` as an ordered multi-source assignment primitive. When the sources already exist independently, pass them as separate arguments rather than pre-merging them with object spread: pre-merging materialises a combined source and copies later-source properties twice, and it can change observable assignment behaviour for setters, proxies, accessors and other non-plain targets.

## TypeScript

- Prefer `type` over `interface`, unless it is an interface a class implements or the declaration extends a global interface.
- Wrap types in `Readonly<>` and mark members `readonly` unless mutability is required.

## Nullish checks

The check states what the value's absence _means_. Four cases, and the fourth is the one that gets broken by a mechanical sweep:

- **Truthiness for reference-or-null values.** Where the non-null side is an object, an array, a function, a DOM node or a class instance, no valid value is falsy, so `if (handle)` and `if (!handle)` say everything `!== null` said and read as _is there one_. This is the common case.
- **`== null` where `null` and `undefined` are deliberately the same answer.** One check for both is the point: an absent property and an explicitly cleared one are the same absence. `eqeqeq` is configured with `"null": "ignore"` so this is the only loose equality the repository permits, and it is permitted because it is a distinct operator with a distinct meaning rather than a shortcut.
- **`=== null` / `!== null` only where the distinction carries information.** Keep it when `null` and `undefined` are different answers, or when `null` is a sentinel the surrounding code reasons about by name — a documented _there is no such thing_ against a value that merely has not arrived.
- **Never convert an exact check to truthiness over a domain with a meaningful falsy value.** `number | null` is the trap: `0` is an ordinary member and `if (count)` silently drops it. The same holds for `string | null` where `''` is reachable, for `boolean | null`, and for any union whose members include a literal `0`, `''` or `false`. **A domain that happens to exclude its falsy values today is still an exact check** — a numeric union starting at 1 is one edit from starting at 0, and nothing fails when it does.

The rule is about meaning and not about byte count. Where both spellings are correct, the shorter one wins on §Priorities, and where they are not, the correct one wins.

## Shape

- Declare top-level functions with `function`. Declare internal functions — those created inside another function — as arrow functions. Object methods stay shorthand.
- Always brace block statements: `if`, `for` and the rest. No one-liners.

## CSS

- Prefer CSS classes over inline styles.
- Files with a `.css.ts` extension are compiled to CSS for browser use rather than executed as modules.

## Comments and JSDoc

Governed by [`documentation.md`](documentation.md) §5. In short: a JSDoc block on a declaration that reaches a published `.d.ts` is consumer documentation and carries no internal identifiers, dates or history; every other comment states a constraint that holds now and may carry one bare decision pointer.

## Unit tests

- Use `describe` for the unit under test.
- Each `it` covers one specific piece of that unit's logic. Do not combine several.
- An `it` name starts with — or at least contains — the word `should`.

Testing a function inside a bare `it`, with three unrelated assertions in it:

```ts
it('buildSelector builds state and scoped selectors', () => {
  expect(buildSelector('default', { name: 'color', value: 'elevated' })).toBe(
    ':host([color="elevated"])',
  );
  expect(buildSelector('hovered', undefined)).toBe(':host(:hover)');
  expect(buildSelector('selected', undefined)).toBe(':host(:state(selected))');
});
```

The same coverage, one behaviour per case:

```ts
describe('buildSelector', () => {
  it('should build scoped selector', () => {
    expect(buildSelector('default', { name: 'color', value: 'elevated' })).toBe(
      ':host([color="elevated"])',
    );
  });

  it('should build built-in state selector', () => {
    expect(buildSelector('hovered', undefined)).toBe(':host(:hover)');
  });

  it('should build custom state selector', () => {
    expect(buildSelector('selected', undefined)).toBe(
      ':host(:state(selected))',
    );
  });
});
```

Placement, file suffixes and Vitest project routing for `@ydinjs/material-x` component tests are the `test-component` skill's; the layering behind them is in [`test-architecture.md`](test-architecture.md).