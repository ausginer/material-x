# Testing Architecture

This document explains _why_ `@ydinjs/material-x` testing is shaped the way it is. It is the shared reference for humans and agents who need to understand the model, judgment calls, and trade-offs behind the tests.

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

A reviewed baseline says "this approved rendering must not change without review." It does **not** say "this rendering is correct because it matches a file the same implementation produced." So initial and updated baselines are reviewed against passing behavior + spec contracts, the relevant Material/Figma reference, the intended `@ydinjs/material-x` theme, and expected environment changes. Baselines are committed artifacts. They are recorded only by the recording workflow on GitHub's runner, which proposes changed baselines in a pull request; the owner reviews every changed baseline and merges the proposal. The gate never writes, updates or approves a baseline (`repo:RD-13`).

Screenshots are valid only for a pinned environment: the Chromium build that the locked `playwright` package pins, text in Roboto from a locked package with no system font fallback, the vendored icon font, headless mode, device scale/viewport, and color scheme/theme. Baselines are recorded and compared on GitHub's `ubuntu-24.04` runner only, because a screenshot recorded elsewhere does not reproduce there. Visual tests don't run locally. Changing the Chromium build or the fonts re-records the baselines in a pull request of its own (`repo:RD-9`, `repo:RD-13`). Broader browser/platform runs are scheduled or manual until their baselines and maintenance cost are justified.

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

## Run lifecycle

**Every Vitest process this repository starts executes at most one test run.** A root run, a per-package run and an ordinary run started from the editor each start a process, run once, release their browser providers and end.

- **The whole repository** runs in one process: `just test` from the root, against `vitest.config.ts`. It contributes the same projects the per-package configurations do, so the coverage is identical.
- **One package** runs its own configuration unchanged: `cd packages/<name> && just test`.

**Browser projects are serialized, one per `sequence.groupOrder`, assigned from 1.** When the first test module of a later group starts, every browser project in an earlier group has its provider closed and its Chromium exits — the earliest point at which the earlier group is provably finished. A project occupying the _final_ group is never released this way, because a boundary is another group starting; it is released when the process closes. Both paths return Chrome to its baseline before the process exits, and `MX_TEST_TEARDOWN_LOG=1` prints one line per boundary release.

**Every project the shared factory declares sets `extends: false`,** so a project's configuration is what the factory gave it and the config file is evaluated once. Since Vitest 5 an inline project otherwise re-evaluates the file that declares it, and each copy brings its own one-shot reporter.

**A project's global setup does not throw for a failure it can foresee,** because Vitest ends the whole run for every project. It passes the failure to that project's files, which raise it, so one package's failed build leaves the others' results standing.

**A run's verdict is its exit status.** A real close failure at a group boundary sets it whichever reporters are selected, but only Vitest's base reporter family prints the error: `default`, `minimal`, `verbose`, `dot` and `tree`. `json` reports rows and does not carry it, so its `success` can read true on a run that exits 1. **A route this repository tracks keeps a base-family reporter in its list and reads the exit status.** Every current route does. A reporter selected by hand elsewhere is allowed, and without a base-family reporter beside it may give only the exit status: [`repo:RD-3`](../../.plan/00-index.md).

**Test watch and VS Code Continuous Run are retired**, and so is `vitest --watch` in any form for tests. A rerun would arrive in a process that has already released its browsers, so the modes that depend on one are withdrawn by intent rather than left to fail quietly. A second run raises before any module executes:

```
this Vitest process has already executed a test run. Test watch and VS Code
Continuous Run are retired: every Vitest process this repository starts runs
once, releases its browser providers and ends. Start a new process for the
next run.
```

A run whose filter matches nothing does not spend the process's execution: Vitest emits a run start for it and executes nothing, so a mistaken filter followed by a real run still works.

**Only _test_ watch is retired.** Build and development watch are untouched — `just docs-dev`, Vite's and tsdown's own watchers, and the CSS plugin's invalidation all remain, and repeated CSS generation on every rebuild is exactly what the per-generation evaluation isolate is built for.

**The contract is declared, not detected.** No in-process signal separates an ordinary editor run from a continuous one — the editor creates Vitest with `watch: true` for both — so `watch` is not evidence of anything here. The contract is installed by a plugin in the shared factory rather than by a configured reporter, because `--reporter` replaces the configured list wholesale and would take the contract with it.

## Reproducibility and token-source maintenance

`DB.load()` uses cached token payloads when available and otherwise downloads and caches upstream data. Normal CI and test execution must not silently refresh the source of truth — token refresh is an explicit maintenance operation with a reviewable diff, using the `use-tokens-db` skill for any `.data/tokens` access. Tests use tproc APIs and never read those files directly.

When token sources intentionally change: review tag/profile selection and provenance; run all tproc node tests; inspect component spec-contract changes; review visual diffs; update baselines only after the new contract is approved; keep token-source and unrelated component changes separate where practical.

## CI policy

Every push to `main` and every pull request that is not a draft must be gated on: formatting, linting, typechecking; every package's node and declaration tests, tproc's included; behavior and accessibility browser tests and spec-contract browser tests, each in Chromium, Firefox and Safari; the curated Chromium visual suite; the docs site, built and loaded in Chromium. CI runs on plain GitHub-hosted runners. Chromium and Firefox are the builds the locked `playwright` package pins; Safari is the one a named macOS runner ships, and it isn't pinned. Local runs are Chromium only, without the visual suite; Firefox, Safari and visual results are read in CI. The gate uploads screenshot actual/diff artifacts on failure and never writes, updates or approves a baseline; a separate recording workflow proposes baselines in a pull request (`repo:RD-13`).

Size, allocation and speed checks are outside the gate: CI reports them, and a pull request gets a comment showing how sizes changed, but they never fail the build. Coverage from the Chromium run is uploaded to Codecov. Coverage reports are diagnostic; a global percentage is not a substitute for the contract categories above.

**The gate is on.** `.github/workflows/verify.yml` runs on every push to `main` and every pull request that is not a draft, in the pinned visual environment, and the ruleset on `main` requires its `verify` check, so a pull request whose `verify` fails can't merge. The record: [`repo:RD-2`](../../.plan/00-index.md); the design: `repo:RD-6` to `repo:RD-9`, `repo:RD-12`, `repo:RD-13` and `repo:RD-14`. The same workflow deploys the docs build it loaded to GitHub Pages, from `main` only.

Scheduled or manual jobs may add the full visual state matrix, dark/contrast theme expansion, RTL/zoom/forced-colors/reduced-motion resilience, and targeted accessibility-tree or manual AT validation.

## Implementation roadmap

The architecture is being adopted incrementally. Status is tracked in the tests themselves and the Vitest config (`.scripts/vitest-config.ts`), not duplicated here. Remaining sequence:

1. Finish moving `@ydinjs/material-x` tests from `src` into their mirrored `test` directories without behavior changes, then remove the old `src/**` includes.
2. Grow the Node-side visual-contract registry and normalization adapters as components adopt the spec layer.
3. Pilot findings from `button/spec-consistency.md` into executable tproc-backed assertions.
4. Extend the curated visual matrix. The pull-request gate and its pinned environment are in place (`repo:RD-2`).
5. Apply the shared convention to checkbox and radio, then migrate other components by family.
6. Retire exploratory consistency documents once their evidence is captured by executable tests or retained as historical design context.