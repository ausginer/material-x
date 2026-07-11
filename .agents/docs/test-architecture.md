# Testing Architecture

This document explains _why_ Material X testing is shaped the way it is. It is the shared reference for humans and agents who need to understand the model, judgment calls, and trade-offs behind the tests.

The **actionable rules** — where files go, how to name and route them, the interaction rules, and the definition of done — live in two skills, so agents load only what a task needs and the rules have a single home:

- **`test-component`** — writing/migrating a component's tests: placement, suffixes, Vitest project routing, rendering/interaction rules, and the definition-of-done checklist.
- **`test-visual-contract`** — the tproc-backed visual-contract layer: the bridge, oracle selection, `effective` vs `state`, bindings, and normalization adapters.

When a rule in a skill and the reasoning here disagree, the skill is authoritative for _what to do_ and this document for _why_. Do not restate skill rules here; link to them.

## The four layers

No single layer proves Material conformance. A component is well tested only when the relevant layers agree:

1. **Browser behavior and accessibility contracts** — public inputs and user-observable outputs in a real browser.
2. **Machine-verifiable visual contracts backed by tproc** — the rendered element agrees with the tokens tproc selected for it.
3. **Curated visual regression screenshots** — approved raster output that must not change without review.
4. **tproc source, processor, and CSS-generation node tests** — the token pipeline itself.

Each layer catches a different fault, and the value is diagnostic: the failing layer tells you _where_ the problem is (see [Failure interpretation](#failure-interpretation)).

## Goals

- Detect regressions in public behavior, browser semantics, accessibility, layout, styling, and composition.
- Verify tokenized Material 3 Expressive Web values without copying values into hand-maintained tables.
- Exercise the real custom element, shadow DOM, generated CSS, custom states, native pseudo-classes, and component context in a real browser.
- Make failures local and diagnostic.
- Keep visual tests reproducible on developer machines and in CI.
- Make expected coverage for every new component predictable.
- Keep production source and test infrastructure structurally separate while mirroring component ownership.

## Non-goals

- A coverage percentage from testing implementation details.
- Treating screenshots as proof of Material-spec conformance.
- Copying upstream Material data into fixtures.
- Running Storybook as the component test runtime.
- Testing every Cartesian product of property and state.
- Replacing targeted assertions with broad DOM/HTML snapshots.
- Claiming assistive-technology interoperability from DOM assertions alone.

## Core principles

### Test observable contracts

Prefer public inputs and user-observable outputs: attributes, properties, methods, events, focus, form data; native and ARIA semantics; `DOMRect` geometry; computed CSS on the rendered implementation; rendered pixels for curated compositions. Private shadow nodes may be queried when they are the only meaningful rendered target — their class names are test selectors, not public API, and tests must not mutate private nodes or `ElementInternals.states` to force a state reachable through the public API.

### Use independent observations

The defining rule of the visual-contract layer: a test must not compare two forms of the same generated value and call it conformance. Reading back the custom property tproc generated only proves tproc emitted its own value. A valid contract compares the tproc expectation against an independent browser observation (geometry or a computed style the browser resolved itself). The tproc node suite proves the pipeline is correct; component contracts independently prove that public inputs select those tokens and the rendered component consumes them. See the **test-visual-contract** skill for the mechanics.

### Prefer exact assertions

Assert token values and discrete state exactly, after canonical normalization. Tolerances are for documented browser boundaries only (subpixel geometry, color serialization) and must never conceal a one-pixel geometry error or a missing state style.

## Oracle hierarchy

Expected values come from different authorities depending on the contract.

| Contract | Primary oracle | Notes |
| --- | --- | --- |
| Tokenized Material value | tproc with the active tag profile | Do not duplicate the value in a fixture. |
| Token selection and processing | tproc node tests | Covers tag selection, normalization, grouping, inheritance, and rendering. |
| Browser behavior | HTML, DOM, ARIA, and form platform contracts | Prefer native behavior over reimplemented expectations. |
| Material behavior not encoded as a token | Material documentation or an approved design reference | Record source and review date. |
| Derived layout | Named formula over token inputs | Record the formula and why it is valid. |
| Composed appearance | Reviewed screenshot baseline | A regression oracle, not a Material source. |
| Accessibility support | Platform assertions plus targeted manual/browser-AT evidence | Automated rule engines are supplementary. |

**tproc is the tokenized visual source of truth.** The pipeline loads Material token tables, selects contextual values, normalizes them for CSS, groups them into component states, applies component-specific filtering and inheritance, and renders the token packages used by production CSS. The active profile is **Material Expressive + Web** (`DB.load()` uses tags `expressive` and `web`). The exported `t` API does not accept a tag profile, so tests cannot claim coverage of alternative profiles until profile selection becomes an explicit, unit-covered tproc API. Tag selection currently uses intersection semantics with first-match-in-source-order fallback; tproc node tests pin this until it changes intentionally.

**Upstream Material and Figma remain validation sources** — for importing/refreshing tokens, reviewing whether active tags select the intended variant, validating a non-token requirement, establishing a screenshot baseline, or investigating a suspected discrepancy. The raw upstream DB can be inspected directly with the **use-tokens-db** skill (resolved values, reference trees, deprecation) — for validation and debugging only, never as a contract oracle, since tproc reads the same DB. Any non-token literal in a fixture carries provenance, a review date where appropriate, and why it cannot come from tproc.

## Data flow and verification boundaries

```text
Material DSM token tables
  -> tproc DB tag selection (expressive + web)
  -> processToken / processTokenSet normalization
  -> TokenPackageProcessor grouping, filtering, adjustment, and inheritance
  -> TokenPackage rendering
  -> generated component CSS
  -> runtime attributes, context, and ElementInternals states
  -> computed layout and pixels in Chromium
```

Testing places an assertion at each meaningful boundary: DB/processor node tests verify source selection and transformation; package contract node tests verify grouping, inheritance, adjustments, state paths, and selector rendering; browser visual-contract tests compare independently resolved package values with actual geometry and computed styles; visual regression tests detect composed raster changes not economically described by individual properties.

If only the final screenshot exists, failures are hard to diagnose. If only tproc tests exist, a component can select the wrong runtime state while the pipeline stays correct.

## What screenshots prove — and don't

A reviewed baseline says "this approved rendering must not change without review." It does **not** say "this rendering is correct because it matches a file the same implementation produced." So initial and updated baselines are reviewed against passing behavior + spec contracts, the relevant Material/Figma reference, the intended Material X theme, and expected environment changes. Baselines are committed artifacts, updated only via an explicit command, never in CI, and every changed baseline gets human review.

Screenshots are valid only for a pinned environment (OS/container image, Chromium version, headless mode, device scale/viewport, fonts/icons, color scheme/theme, GPU config where it matters). The ordinary PR gate uses one pinned Chromium environment; local runs must use the same pinned image so developer output matches CI. Broader browser/platform runs are scheduled or manual until their baselines and maintenance cost are justified.

## Avoiding false confidence

A tproc-backed contract proves the component selected the intended production package and effective state, that runtime state and CSS selectors applied it to the right element, and that the final rendering agrees with the token contract. It does **not** independently prove upstream Material data is correct — DB/processor tests, source-review workflows, and occasional Figma/Material review provide that. Never use a baseline update to make an unexplained spec-contract failure pass.

## Failure interpretation

| Failing layer | Likely fault |
| --- | --- |
| Behavior only | Runtime controller, platform semantics, lifecycle, events, forms, or ARIA |
| tproc node only | Source/tag selection, normalization, grouping, inheritance, adjustment, or rendering |
| Spec contract only | Package choice, runtime state, selector mapping, CSS consumption, or derived layout |
| Screenshot only | Composition, clipping, raster detail, font/environment drift, or an uncovered visual property |
| Spec contract and screenshot | Likely real visual conformance regression |
| Behavior and screenshot | Interaction/state transition changed visible output |
| All layers | Broad source, build, theme, or component regression |

Before updating a screenshot, inspect: the active tproc profile; contract ID and effective state path; expected token name and resolved value; actual public inputs and custom states; actual computed property or geometry; environment and font versions.

## Reproducibility and token-source maintenance

`DB.load()` uses cached token payloads when available and otherwise downloads and caches upstream data. Normal CI and test execution must not silently refresh the source of truth — token refresh is an explicit maintenance operation with a reviewable diff, using the `use-tokens-db` skill for any `.data/tokens` access. Tests use tproc APIs and never read those files directly.

When token sources intentionally change: review tag/profile selection and provenance; run all tproc node tests; inspect component spec-contract changes; review visual diffs; update baselines only after the new contract is approved; keep token-source and unrelated component changes separate where practical.

## CI policy

Every pull request gates on: formatting, linting, typechecking; tproc node tests; behavior and accessibility browser tests; spec-contract browser tests; the curated Chromium visual suite. CI uploads screenshot actual/diff artifacts on failure and never commits or approves baselines.

Scheduled or manual jobs may add the full visual state matrix, dark/contrast theme expansion, Firefox/WebKit behavior checks, RTL/zoom/forced-colors/reduced-motion resilience, and targeted accessibility-tree or manual AT validation. Coverage reports are diagnostic; a global percentage is not a substitute for the contract categories above.

## Implementation roadmap

The architecture is being adopted incrementally. Status is tracked in the tests themselves and the Vitest config (`.scripts/vitest-config.ts`), not duplicated here. Remaining sequence:

1. Finish moving Material X tests from `src` into their mirrored `test` directories without behavior changes, then remove the old `src/**` includes.
2. Move `src/.tproc/__tests__` in full to `test/tproc`, preserving its `DB` structure and helpers.
3. Grow the Node-side visual-contract registry and normalization adapters as components adopt the spec layer.
4. Pilot findings from `button/spec-consistency.md` into executable tproc-backed assertions.
5. Extend the curated visual matrix and CI gating.
6. Apply the shared convention to checkbox and radio, then migrate other components by family.
7. Retire exploratory consistency documents once their evidence is captured by executable tests or retained as historical design context.