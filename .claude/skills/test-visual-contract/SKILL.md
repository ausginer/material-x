---
name: test-visual-contract
description: Author tproc-backed visual-contract tests (*.spec.browser.test.ts) for Material X components — assert that the rendered custom element agrees with the tokens tproc selected, using independent browser observations rather than circular token-vs-token comparisons. Use when writing a spec-contract test, adding a token contract to the bridge, or building a normalization adapter. For general behavior tests, the DoD checklist, or file routing, use the test-component skill instead.
---

# Authoring tproc-backed visual contracts

A visual-contract test proves the _rendered_ component agrees with the tokens tproc selected for it. It is the `*.spec.browser.test.ts` layer. Reference implementation: `packages/material-x/test/button/button.spec.browser.test.ts` — read it before writing a new one.

Rationale (four-layer model, oracle hierarchy, what this layer does and does not prove) lives in `.agents/docs/test-architecture.md`. This skill is the _how_.

## The one rule that makes this layer worth having

**Never compare two forms of the same generated value.** This is circular and proves only that tproc emitted its own value:

```ts
// WRONG — reads back the custom property tproc itself generated
expect(getComputedStyle(host).getPropertyValue('--_container-height')).toBe(
  expectedContainerHeight,
);
```

A valid contract compares the tproc expectation against an **independent browser observation** — geometry or a computed style the browser resolved on its own:

```ts
// RIGHT — DOMRect is the browser's own measurement, not a token read-back
expect(implementation.getBoundingClientRect().height).toBe(
  pixels(expected.values['container.height']!),
);
```

Prefer, in order: `DOMRect` geometry → computed CSS properties on the rendered target → (only when nothing observable exists) the generated custom property. If your assertion's left and right sides both originate from tproc, it is not a contract.

## The bridge: getting tproc values into the browser

tproc is Node-only (top-level async DB load). Browser tests reach it through a Vitest Browser command, **not** by importing the DB.

- Node side: `packages/material-x/test/support/visual-contracts.node.ts` — defines `resolveTokenContract` and the contract registry (`BUTTON_SIZE_CONTRACTS`, …). This is the live source of truth for **which contract IDs exist** — read it; do not maintain a list of IDs anywhere else.
- Browser side: `commands.resolveTokenContract({ contract, state, tokens })` from `vitest/browser`, typed in `test/support/browser-commands.ts`.

```ts
import { commands } from 'vitest/browser';

const expected = await commands.resolveTokenContract({
  contract: testCase.contract, // e.g. 'button.size.large'
  state: 'default',
  tokens: ['container.height', 'label-text.font-size'],
});
// expected.values['container.height'] -> the tproc value, serializable
```

### Adding a new contract

Register the component's production `ReadonlySignal<TokenPackage>` under a stable ID in the registry. Use the **same signal that generates the component's CSS** (import it from the component's `styles/**/tokens.ts`), so `append`, `adjust`, and inheritance are part of the expected contract. Do not rebuild a package for tests. The registry MUST reject unknown contracts, states, and tokens — the existing `resolveTokenContract` already throws on each.

## effective vs. state

- Read `TokenPackage.effective(path)` — the fully inherited state. This is the default.
- Read `state(path)` only when the unit under test _is_ deduplication or exact CSS emission (it may omit inherited values).

## Fail loudly — never let a missing oracle become a skipped assertion

A missing package, state, or token is a test failure, not a passing no-op. `resolveTokenContract` throws on all three; keep it that way. On the browser side, assert on `values['token']!` (non-null) or throw — never optional-chain a missing oracle into `undefined === undefined`.

## Bindings carry semantics, not values

A component's spec fixtures (`*.spec.fixtures.ts`) describe _how to observe_ a token — the contract ID, state, target selector, and which metric/property. They MUST NOT contain the resolved Material value; that comes from the bridge at runtime. See `button.spec.fixtures.ts` for the current shape (contract + attribute per case).

## Normalization: centralize when shared, inline when local

tproc emits CSS-oriented strings (`px`, `ms`, colors, font lists, `var()` with fallbacks); browser APIs may serialize the same value differently. Convert once, in one tested place:

- If an adapter is used by **one** component, a small local helper (like `pixels()` in the button spec) is fine.
- The moment a second component needs the same conversion, promote it to `test/support` and unit-test it there. Do not reimplement color/length/font normalization per component.

Adapters to expect as they arrive: CSS color → canonical serialization; font-family list normalization; length → CSS px / numeric DOMRect; border-radius expansion; opacity → number; duration → ms; `full` shape → `rendered block size / 2`; elevation level → shadow; state-layer opacity observed on a pseudo-element.

When an expected value contains a **public CSS variable**, resolve it in a hidden probe under the same fixture theme and compare computed-to-computed. Never compare raw `var()` text.

## Derived values are named formulas, not copied results

A requirement computed from tokens is a named formula over token-backed inputs, referenced by name — e.g. `round radius = rendered container block size / 2` (see the button spec's "derive the round radius" test). Do not copy the per-size result into a fixture.

## Non-token literals need provenance

If no tproc token represents a requirement, a literal is allowed only with `source`, `reviewed` date, and a `reason` it cannot come from tproc. First confirm it isn't already available from an effective package, a shared core package, or a derived formula.

## What a passing contract does and does not prove

It proves the component selected the intended production package and effective state, that runtime state + selectors applied it to the right element, and that the observable rendering agrees. It does **not** prove upstream Material data is correct — that is the job of the tproc node tests and source review. Do not claim conformance from this layer alone.

## Validating or debugging the upstream source

When you suspect the _input_ is wrong — a token resolves to an unexpected value, a token is deprecated, or you need to see what upstream tokens exist — inspect the raw M3 DB with the **use-tokens-db** skill (`db.getValue`, reference trees, deprecation, tag enumeration).

Use it for investigation only. The raw DB is **not** an independent oracle for a contract: tproc reads that same DB, so asserting a rendered value against `db.getValue` is as circular as reading back the generated custom property. Contract expectations come from the bridge (`resolveTokenContract` → `effective`); raw-DB queries help you decide whether a _disagreement_ is an upstream/tproc problem or a runtime/CSS one.