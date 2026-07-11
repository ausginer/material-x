---
name: test-component
description: Write or migrate tests for a Material X component — file placement under packages/material-x/test, the .browser/.spec.browser/.visual.browser/.node suffix and Vitest project routing, rendering/interaction rules (real custom element, real browser input), and the component definition-of-done checklist. Use when adding, moving, or reviewing a component's tests. For the tproc-backed visual-contract layer specifically (token oracles, the bridge, normalization), use the test-visual-contract skill.
---

# Testing a Material X component

Rationale (why four layers, non-goals, the failure-interpretation table) lives in `.agents/docs/test-architecture.md`. This skill is the actionable rules. The tproc-contract layer has its own skill: **test-visual-contract**.

Reference component (closest to the target architecture): `test/button/`.

## Where tests go

All Material X tests live under `packages/material-x/test`, mirroring the production tree. No `*.test.ts`, fixture, screenshot baseline, or test-only helper below `packages/material-x/src`.

- `src/button` → `test/button`
- `src/core/elements` → `test/core/elements`
- `src/.tproc` → `test/tproc`
- shared test-only infrastructure → `test/support`

The directory is singular `test`. Do **not** create `tests`, `__tests__`, or source-colocated test roots in material-x (ydin's `packages/ydin/tests` is an intentional, separate divergence — do not reconcile it). Tests still `import` production modules from `src`; separation is organizational, not black-box. Test files MUST NOT become runtime entrypoints or be added to `files.json`, and production code MUST NOT import from `test`.

Migration is in progress: some tests are still colocated under `src` and the Vitest browser project still includes `src/**/*.browser.test.ts`. When moving a test, preserve its behavior and update imports/includes; remove the old include rather than running both trees.

## File suffix → what it tests → which project

| Suffix | Tests | Project | Recipe |
| --- | --- | --- | --- |
| `*.browser.test.ts` | public behavior + platform/a11y semantics | `browser` | `just test-behavior` |
| `*.spec.browser.test.ts` | tproc-backed visual contracts | `spec` | `just test-spec` |
| `*.visual.browser.test.ts` | reviewed screenshots | `visual` | `just test-visual` |
| `*.node.test.ts` | tproc/compiler + Node-only | `node` | `just test` |

The `browser` project **excludes** the `.spec.browser` and `.visual.browser` patterns, so a misnamed file lands in the wrong suffix bucket silently — name it precisely. Project globs live in `.scripts/vitest-config.ts`; that config is the source of truth, not this table. Every workflow selects a named project (`--project browser|spec|visual|node`), never a shell glob. Update baselines only via `just test-visual-update` — never automatically, never in CI.

## Behavior tests (`*.browser.test.ts`)

Cover, where applicable: attribute/property conversion + sync; native event sequence, identity, interface, flags, composition, retargeting; pointer/keyboard/label/programmatic activation; disabled interaction suppression; focus order, delegation, roving tabindex; form association, `FormData`, value/reset/restore/validity/submission; accessible name, description, role, checked/selected/expanded/disabled state; slot changes and fallback labeling; parent context and effective custom state; connect/disconnect/reconnect without duplicate listeners; component-specific edge cases.

Convert `accessibility.md` requirements into browser tests where the browser exposes a stable assertion surface. DOM/ARIA assertions do not prove every browser/AT combination; keep a documented manual matrix for critical ones.

## Rendering and interaction rules

- **Render the real custom element** (`document.createElement('mx-…')`). Never the Storybook React renderer or a captured iframe. Storybook may reuse data-only fixtures, but it is not the test runtime.
- **Select the meaningful target.** Many hosts use `display: contents`, so the host `DOMRect` is empty/misleading. Query the shadow implementation (`.host`, `.control`, an internal input) — see `getImplementation` in the button spec. Use `::before`/`::after` when the state layer is a pseudo-element; slotted targets when the contract belongs to slotted content.
- **Enter states through public behavior.** Variant/persistent state via attributes, properties, methods, form/parent context. **Transient interaction** (`:hover`, `:active`, `:focus-visible`) via **real browser input** — `userEvent`/locators from `vitest/browser`. `@testing-library/user-event` cannot create browser-owned pseudo-classes; new state-sensitive tests MUST use the Vitest Browser API. Synthetic `dispatchEvent` is only appropriate when the event itself is the unit under test.
- **Wait for explicit stability**, never arbitrary sleeps: element upgrade readiness, a frame boundary where layout needs it, `document.fonts.ready`, observer/slot settlement. Put these in shared `test/support` helpers.

## Determinism

`test/support/browser-setup.ts` is the shared setup (cleanup via `document.body.replaceChildren()`, fixed light scheme, canonical background/font, disabled animations/transitions). Tests MUST NOT depend on network, current time, random IDs, system fonts, or machine-specific data. Use deterministic fixture content. Reuse the setup rather than re-establishing environment per test.

## Coverage: equivalence classes, not Cartesian product

Cover every public variant at default size/state; every size on one representative variant; every shape/structural mode; presence/absence of optional content (icons, labels, support text, slots); enabled/disabled; selected/mixed/open/invalid as applicable; one real hover + focus-visible + pressed path per distinct token mapping; context-derived effective states; public CSS-variable overrides; and layout boundaries (long/min content, overflow, RTL) when behavior differs. Use `describe.each` for a coherent matrix; do not merge unrelated assertions to save setup time.

Shared cores get a shared behavior contract; concrete variants test only their deltas plus a small integration smoke test (e.g. checkable activation shared by checkbox/radio; grouping and indeterminate are variant-specific).

## Test-writing conventions

Every unit has a `describe`. Each `it` covers one logical part and normally includes `should`. Assert exact values after canonical normalization; a tolerance is allowed only for a documented browser boundary (subpixel geometry, color serialization) and must never mask a one-pixel or missing-state error.

## Definition of done

A new/migrated component is done when the applicable items hold.

**Behavior** — public attributes/properties; native activation + keyboard; disabled; event identity/order/flags/retargeting where exposed; form participation for form-associated components; accessible name/role/state/focus/description; parent context + reconnect when used; component-specific edge states.

**tproc contract** — _these are gated here but authored per the **test-visual-contract** skill:_ every tokenized value resolved through tproc; `effective(state)` unless testing deduplication; mappings carry token names + observations, not copied values; every variant and boundary selects the expected contract; missing packages/states/tokens fail explicitly; derived adapters named, centralized, tested; non-token literals carry provenance; assertions observe final geometry/computed style, not the private custom property alone.

**Visual regression** — curated matrix of structurally meaningful variants; deterministic fonts/viewport/theme/animations; correct fixture/target captured; baselines reviewed not blindly accepted; interactive shots use real Vitest Browser input.

**Test quality** — each `it` is one behavior with `should` where natural; shared core behavior not duplicated per variant; no arbitrary sleeps or broad tolerances; no Storybook iframe, remote asset, current time, or randomness; failure messages identify component case, token contract, state, and observation.