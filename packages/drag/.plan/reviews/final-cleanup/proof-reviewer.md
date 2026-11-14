# Final cleanup: feature proof

**Lens:** `reviewer`, feature proof. The owner asked for an independent review of the final cleanup in `f9e56fe7d..27c60a9ac` on `drag/size`, with its report at `e0e4cee55`. The inputs are [`final-cleanup-report.md`](../../final-cleanup-report.md) and the canonical entries for `drag:DRF-38` and `drag:DRF-40` in [`00-index.md`](../../00-index.md) and for `repo:RF-31` in the [repository index](../../../../../.plan/00-index.md).

**Commit read:** `e0e4cee55`. Its code outside `packages/drag/.plan/` is identical to `27c60a9ac`'s ([check](proof-reviewer-probes/trees-and-suppressions.txt)), so a check at the tip is a check of `27c60a9ac`. I read `f9e56fe7d`'s versions with `git show`.

**Order of reading:** the three canonical entries, then `git diff f9e56fe7d 27c60a9ac`, then the library code on the tested paths (`src/lift.ts`, `src/shared/landing.ts`) and the plugin types in `node_modules`. I read the report and its measurements after that, and before I ran my probes. Some probes check the report's figures, and the others test what the report doesn't.

**Scope:** the four questions of the request, the benchmark, build and size claims, and the evidence for the full suite at `27c60a9ac`. I didn't run Firefox or WebKit, timing, allocation or any campaign, and I didn't rerun the full suite or rebuild the packages. I changed no implementation and closed no finding.

## Result

- **`drag:DRF-38`:** its required property holds. Lint exits 0 with nothing suppressed. Every `@ts-expect-error` still fails for its stated reason, and both heap tests release their controllers. One comment the unit added misstates what a test covers (`final-cleanup-reviewer-1`, tier C).
- **`repo:RF-31`:** its required property holds for the four plugins at the installed versions. There is no cast, every consumer typechecks, and the emitted JavaScript is unchanged. I judge that P7 hides no real mismatch in this code. The check has a second limit that the report doesn't state: it can't see a hook's use of Vite-only context members (`final-cleanup-reviewer-2`, tier C).
- **`drag:DRF-40`:** its required property holds. The test's verdict no longer depends on elapsed time. A mutation of each kind fails both cases, and the delays pass.
- **Benchmark, build and size:** unchanged, as far as my checks and the report's hashes show.
- **The full suite:** the saved record ties it to a clean `27c60a9ac`. The failures are the five known size rows, and drag's typecheck reports only the two drag2 `TS2724`.

## Method

- **The main checkout, clean at `e0e4cee55`.** I used no worktree.
- **Type probes** were temporary untracked files in `packages/drag/tests/` and `packages/vite-traits-plugin/`, removed after each run. Their sources and outputs are under [`proof-reviewer-probes/`](proof-reviewer-probes/).
- **Browser probes** ran in Chromium, `browser` project only, with `--reporter verbose`, filtered by test name.
  - [`run.sh`](proof-reviewer-probes/run.sh.txt) applied each mutation with [`mutate.mjs`](proof-reviewer-probes/mutate.mjs.txt) and restored it with `git checkout`. `git status` of `src` and `tests` was empty before and after each batch ([summary](proof-reviewer-probes/browser/summary.txt)).
  - The first nine cases ran before I added the `ONLY` guard and the `heap-sentinel-kept` case to `run.sh`. Nothing else in the script changed.
  - The consumer project reads the built package and the mutations change `src`, so I didn't run it under mutation.
- **Outputs are unedited, apart from whitespace.** Their paths name my session's scratch directory where a command printed one. In `dry-head.txt` and `dry-new.txt` I trimmed the trailing space that my own `tr` join added to each line. The browser logs keep the trailing space of Vite's `(client) warning:` line, which `git diff --check` reports in each of them.

## `drag:DRF-38`: drag's lint

### Lint and suppressions

- `npx just lint` from `packages/drag` runs oxlint, then ESLint, and exits 0 ([output](proof-reviewer-probes/lint.txt)).
- **The diff suppresses nothing.**
  - It adds no `eslint-disable`, `oxlint-disable`, `@ts-ignore`, `@ts-expect-error`, `as any` or `as unknown`.
  - It changes no ESLint, oxlint, `tsconfig`, package or lock file ([check](proof-reviewer-probes/trees-and-suppressions.txt)).

### The declaration tests keep their negative type guarantees

The [directives probe](proof-reviewer-probes/directives.mjs.txt) copies the three declaration tests at both commits, with every `// @ts-expect-error` line replaced by `//`, and typechecks the drag package once ([output](proof-reviewer-probes/directives.txt)):

- **The counts:**
  - `authoring.declaration.test.ts` gives 37 directives and 37 errors at both commits, each on the line after its directive;
  - `callbacks.declaration.test.ts` gives 13 and 13;
  - `published-types.declaration.test.ts` has no directive.
- **Old against new:** each file's sequence of reasons, and of error codes and messages, is identical between `f9e56fe7d` and `27c60a9ac`.
- **Nothing extra:** no directive goes unused, and no error falls anywhere else in the copies. The only other errors are drag2's two `TS2724`.
- **Each message gives the reason its comment states:**
  - `TS2339` and `TS2551` for an absent member;
  - `TS2353` for a refused object-literal key;
  - `TS18047` for the step's `null` argument;
  - `TS2345` for a receiver mismatch;
  - `TS2741`, `TS2559` and `TS2322` for refused activation results.

`assertType` adds no error of its own to a directive's line: with no type argument, Vitest's `assertType<T>(value: T)` accepts any expression. The identical sequences show it.

### Receiver callbacks keep their semantics

- **The step with `this: unknown`** moved from an inline function expression to the module-level `unknownReceiverStep` ([`callbacks.declaration.test.ts:53`](../../../tests/callbacks.declaration.test.ts)). Changing `this: unknown` to `this: Holder` gives the same `TS2345` in `f9e56fe7d`'s inline form and in the new function ([output](proof-reviewer-probes/receiver-mutation.txt)). The test still checks that a step whose receiver is `unknown` needs none.
- **The other receiver functions** (`step`, `dispose` and `passAlone`) keep their declarations. Only their `void` lines changed.
- **The four `func-name-matching` helpers** stay function expressions with their `this` parameter. Each body calls the saved original (`readRect`, `original`, `nativeAnimate` or `nativeFocus`), never its own new name.

### The heap tests release their controllers

| Case ([logs](proof-reviewer-probes/browser/)) | `classes.browser.test.ts:190` | `destruction.browser.test.ts:381` |
| --- | --- | --- |
| Unmutated | passes | passes |
| The destroyed controller kept in the test's frame | fails at the class count, `expected 1 to be +0` | fails at the class count, `expected 1 to be +0` |
| A live controller, never destroyed, kept in the test's frame | not run | fails at the class count. The `WeakRef` assertion before it passes |
| `behavior = null` removed, controller released as written | not run | fails at the `WeakRef` assertion, `expected [ {}, undefined ] to deeply equal [ undefined, undefined ]` |

- **Rows 1 and 2:** each count depends on the controller becoming unreachable when the inner function returns. The report's matrix shows the same.
- **The report's `head-nodrop` result:** I didn't repeat it. It shows that the old tests needed the drop.
- **Rows 3 and 4** concern the `behavior` sentinel. They are the evidence for `final-cleanup-reviewer-1`.

### The benchmark script

- **Per-entry dry runs.** Each of the 23 entries ran alone with `--only`, once with `f9e56fe7d`'s `compare.ts` and once with the tip's. The outputs are identical: 13 apply, and 10 fail with the same message ([comparison](proof-reviewer-probes/dry-compare.txt), [head](proof-reviewer-probes/dry-head.txt), [new](proof-reviewer-probes/dry-new.txt)).
  - The report's runs without `--only` stop at the third entry of each mode, which is stale.
  - So they exercise the first two `--prove` entries and the first two `--floors` entries.
- **The injections are unchanged.** Their definitions (`compare.ts:1095` to `:1267`) lie outside the diff's two hunks, at `:1482` and `:1881`.
- **`--dry` doesn't run either changed function:**
  - `profileOnce` renames a local, `self` to `selfTimeById`, at all four uses.
  - `machineRecord`'s `coreSets` gives the same JSON in the old and new form, with the record's own `read()`. That holds on this machine's sysfs and on a fixture ([probe](proof-reviewer-probes/coresets.txt)).

## `repo:RF-31`: the shared plugin types

### The cause

My run of the report's P1 reproduces RF-31's error ([output](proof-reviewer-probes/rf31-reviewer-probe.ts.txt)):

- Vite 8.3.8's `Plugin` types the `load` options as `{ ssr? }`.
- Rolldown 1.3.2's `LoadExtraOptions` has `rawId` and `attributes`, so the two types have no property in common.
- One copy of `rolldown`, 1.3.2, is installed.

I agree with the report's cause.

### What the fix's form checks

The report's probe gives the same verdicts here for P1 to P8, and I added four cases:

- **P4 against P5:** these show that the intersection rejects a `load` parameter that Rolldown's argument can't satisfy, and that Vite's type alone accepts it.
- **P6 doesn't separate the intersection from Vite's type.** Its transform result also fails `satisfies Plugin` at `(50,3)`: Vite's own `transform` type refuses `moduleType: 1`.
- **Q3:** `config`, `configResolved` and `handleHotUpdate` aren't Rolldown hooks, so only Vite's type checks them. Rolldown never calls them.
- **Q1 and Q2:** the check can't see the hook's `this`. That is `final-cleanup-reviewer-2`.
- **Q4** isn't a mismatch: Rolldown's `ResolveIdExtraOptions` has no `scan`.

**Every implemented hook** in the four plugins:

| Plugin | Hooks Rolldown types | Vite-only hooks |
| --- | --- | --- |
| `viteTraitsPlugin` | `watchChange(id)`, `transform(code, id)` | `configResolved` |
| `constructCSSStyles` | `resolveId` `handler(source, importer)`, `load` `handler(id)` | — |
| `constructHTMLTemplate` | `resolveId` `handler(source, importer, options)`, `load` `handler(id)` | — |
| `constructCSSTokens` | `resolveId` `handler(source, importer)`, `load` `handler(id)`, `watchChange(id)`, `closeBundle()` | `config`, `handleHotUpdate` |

**No implemented hook depends on what the check misses:**

- The hooks call `this.resolve`, `this.addWatchFile`, `this.warn` and `this.fs.readFile`. Rolldown's own `PluginContext` and `MinimalPluginContext` declare each of them.
- The one options parameter in use, in `constructHTMLTemplate`'s `resolveId`, is read through `'scan' in options`.
- No `load` handler declares the options parameter.

### P7

P7 accepts a `load` hook that declares Vite's `options?: { ssr?: boolean }`. Under Rolldown the argument is a `LoadExtraOptions`, so `options.ssr` reads `undefined`, and a hook that branches on it takes its non-SSR path under tsdown. Nothing is cast, and no current hook declares that parameter.

My assessment is that P7 hides no real hook mismatch in the code at `27c60a9ac`. That meets RF-31's "no cast that hides a real hook mismatch". Its remaining cost: if a hook starts reading `options.ssr`, the type won't tell the author that tsdown never sets it. RF-31's closure stays the architect's.

### Both consumers

- **Typecheck** ([output](proof-reviewer-probes/typecheck.txt)):
  - `box-quad`, `core`, `tproc`, `vite-custom-element-assets`, `vite-traits-plugin`, `material-x` and the root `tsconfig` exit 0;
  - drag has only drag2's two `TS2724`, and drag2 has its four known errors.
  - The root `tsconfig` covers the Vite consumers (`vitest.config.ts`, `.scripts/vitest-config.ts` and `.scripts/vite-config.ts`) and the tsdown helpers (`.scripts/tsdown-library.ts` and `.scripts/tsdown-component.ts`).
  - I didn't rerun `f9e56fe7d`. The report's "before" output shows RF-31's error in every tsdown consumer, and four more in `material-x` through `tsdown-component.ts`.
- **Runtime:** TypeScript's `transpileModule` gives identical JavaScript at both commits for both edited plugin sources ([output](proof-reviewer-probes/plugin-emit.txt)). That is why I didn't rebuild. The report's hashes show 1,920 identical files across six tsdown consumers.
- **Published types:** `@ydinjs/vite-traits-plugin` isn't private.
  - Its `index.d.ts` now declares `viteTraitsPlugin(): Plugin$1 & Plugin` and imports `rolldown`, which the package lists as a dependency (1.3.2).
  - The intersection is assignable to Vite's `Plugin`, so a consumer that expects `Plugin` still accepts it.

## `drag:DRF-40`: the DRI-13 grab test

### What the test now does

After the release, the test takes `r0`'s animations, requires at least one, pauses each one and sets `currentTime = 10_000` ([`activation.browser.test.ts:162`](../../../tests/activation.browser.test.ts) to `:171`).

- **The landing** starts two animations of equal duration on the visual: the additive flight and the elevation ([`landing.ts:83`](../../../src/shared/landing.ts) and `:98`). So 10,000 ms is the midpoint of both.
- **`Lifter.acquire`** reads the visual's rect before it writes anything ([`lift.ts:252`](../../../src/lift.ts)) and cancels the running landing in its `finally` (`:370`). The cancel works on a paused animation, and the lifter reads no play state. So the pause doesn't change the path under test.
- **What is unchanged:** the duration, the easing, the 1 px tolerance, both assertions and both verdict cases. The landing still exists at the grab, because the test asserts it.
- **What changes:** at activation the landing is paused, not playing. The read and the cancel happen in one synchronous call, in which a playing animation would present a single state too. This last point is my reasoning, not a measurement.

### Elapsed time and both mutation kinds

| Case ([logs](proof-reviewer-probes/browser/)) | Accepted | Rejected |
| --- | --- | --- |
| Unmutated | passes | passes |
| 1 s between the release and the pause, and 2 s between the read and the grab | passes | passes |
| `acquire` cancels every animation of the visual before it measures | fails, `expected 5 to be less than 1` | fails, `expected 45 to be less than 1` |
| `acquire` measures with every animation moved past its end, then restores them. The landing isn't cancelled before the measurement | fails, 5 | fails, 45 |

- **Elapsed time:** once the animations are paused, the offset doesn't depend on how long either interval lasts. The report's 1 s case failed the old test by 4.72 px.
- **My two mutations** are written independently of the report's M1 and M2, and they give the same magnitudes. The 45 px and 5 px are half the rejected and accepted flights, as the report states.
- **M3** (measuring at the start offset) failed the new test in both cases in the report's matrix, and passed the old test's accepted case. I didn't repeat M3.

## Size and build

- **Size:** the `just size` table at `27c60a9ac` is byte-identical to the main integration's, by my diff of the two saved files.
- **Nothing that sets size changed.** No file under `packages/drag/src`, and no size, budget or control file, changed in `f9e56fe7d..27c60a9ac` ([check](proof-reviewer-probes/trees-and-suppressions.txt)). No budget moves.
- **Build:** the report's hashes, with my emit comparison.

## The full Chromium suite at `27c60a9ac`

- **The status record:** [`2026-11-14-final-cleanup-size.txt`](../../measurements/2026-11-14-final-cleanup-size.txt) gives revision `27c60a9ac` before and after the run, with empty `git status` both times, `suite exit=1` and `size exit=1`.
- **The log** ([log](../../measurements/2026-11-14-final-cleanup-drag-suite.log)):
  - 56 files and 752 tests, with 747 passing and 5 failing. The five failures are the size rows: draggable alone, example: drop zone, freeDrag, freeDrag + bounds + landing, and complete. "Type Errors" reports none.
  - The run started at 09:25:59, 24 s after `27c60a9ac`'s commit time (09:25:35) and before `e0e4cee55` (09:29:22).
  - The totals equal the main integration's suite log.
- **Chromium only:** `just test` runs `vitest.config.ts`, whose browser projects use Chromium. Firefox and WebKit are in `vitest.engines.config.ts`.
- **The expected failures:** the five unchanged size rows, and in drag's typecheck, drag2's two `TS2724` (my run).
- **Limits of the tie:**
  - The log carries no revision line, and the wrapper that wrote the status record isn't saved. The tie is that record, the timestamps and the counts.
  - The log isn't verbose, so it lists no per-project verdicts.
  - I didn't rerun the suite. My unmutated focused runs of the three changed browser tests passed at identical code.

## The report's claims

They agree with my results, apart from `final-cleanup-reviewer-2` and these points of precision:

- **"`--prove --dry` and `--floors --dry` give the same output"** is true. Each run stops at its third entry, and my per-entry comparison covers the rest.
- **P6** is listed among the cases the check rejects, but Vite's type rejects it too.
- **The plugin lint errors listed** are some of the plugins' errors, as the report says. The assets package's ESLint gives five more, in files this unit didn't change: `css/css.ts:31` (`require-unicode-regexp`) and `html.ts:20` to `:23` (`camelcase`, four). The package's recipe doesn't reach them, because it stops after oxlint fails ([output](proof-reviewer-probes/plugin-lint.txt)).
- **These figures match mine:**
  - 37 and 13 directives;
  - 45 px and 5 px;
  - the 1,920-file total, which is the sum of the six rows;
  - typecheck exit 0 for every package but drag and drag2.

## Findings

#### A comment added to the destruction heap test says the controller keeps `behavior` reachable, and a live controller doesn't (`final-cleanup-reviewer-1`, tier C)

- **Finding:** [`destruction.browser.test.ts:411`](../../../tests/destruction.browser.test.ts) to `:412`, added at `27c60a9ac`, reads: "The callback reads `behavior`, so the controller keeps it reachable until the controller is released."
- **Current behavior:** the object's reachability follows the test's own variable, which the test sets to `null` at `:429`. The callback captures the variable, not the object.
  - With a live controller that was never destroyed, kept in the test's frame, and whose `onStart` reads `behavior`, the sentinel is collected: the `WeakRef` assertion at `:439` passes, and the test fails only at the class count ([log](proof-reviewer-probes/browser/heap-alive-destruction.log)).
  - With `behavior = null` removed and the controller released as written, the sentinel is retained, and the assertion fails with `expected [ {}, undefined ]` ([log](proof-reviewer-probes/browser/heap-sentinel-kept.log)).
- **Why it is a problem:** the comment tells a reader that the sentinel checks whether the controller releases what its callbacks read. The assertion can't fail that way, so the comment overstates what the test covers. No assertion changed, and `DRF-38`'s required property holds.
- **Required property:** a comment beside the read states what the read does for the test, consistently with the sentinel's observed reachability.
- **Route:** the architect, with `DRF-38`'s disposition. No source file or decision is involved.

#### The report names P7 as the check's limit, and the check also can't see a hook's use of Vite-only context members (`final-cleanup-reviewer-2`, tier C)

- **Finding:** the report's §`repo:RF-31` says that assigning to the intersection "checks every implemented hook against Rolldown's signature", and names P7 as the limit.
- **Current behavior:**
  - Vite 8.3.8 augments Rolldown's `MinimalPluginContext` with `environment` (`node_modules/vite/dist/node/index.d.ts:2047` to `:2050` and `:2034` to `:2039`). Rolldown 1.3.2's own declaration has no such member.
  - Q1, a `transform` that reads `this.environment.mode`, and Q2, the same hook with the context declared on `this`, both compile through the fix's form.
  - So does Q5, P8's double `satisfies`, and so does Q6, `RolldownPlugin` alone in a program that loads Vite's types.
  - Under Rolldown 1.3.2 alone, a `transform` hook's `this.environment` is `undefined` ([probe](proof-reviewer-probes/rf31-context.txt)). Such a hook typechecks and throws under tsdown.
  - No implemented hook is affected (§What the fix's form checks).
- **Why it is a problem:**
  - RF-31's required property concerns hiding a real hook mismatch, and its closure depends on what the check catches.
  - The record presents P7 as the limit. This one is wider: it is a runtime mismatch, and no form of the check in a program that loads Vite's types catches it.
  - It isn't caused by this unit's form.
- **Required property:** the record of what RF-31's check catches and misses includes a hook's context members.
- **Route:** the architect, with RF-31's disposition. Tier C, because no current behavior is affected and nothing relies on the check for this today.

## Evidence limits

- The browser probes ran in Chromium's `browser` project only. The report's matrix covers the consumer project for its own mutations.
- I rebuilt nothing. Build identity rests on the report's hashes and on my emit comparison.
- I reran neither the full suite nor `f9e56fe7d`'s typecheck.
- I didn't repeat the report's `head-nodrop` or M3 cases.

## Observation outside the change

**What I observed:** the `behavior` sentinel in [`destruction.browser.test.ts:381`](../../../tests/destruction.browser.test.ts) can't detect a controller that keeps its callbacks, because the test's own `behavior = null` releases it. This has been the case since `a9c323f6a` introduced the `void behavior` read, which is now `assertType(behavior)`.

**Evidence:** rows 3 and 4 of the heap table.

**Not this unit's:** `DRF-38` barred changing what a test asserts. Whether to register it is the architect's call.

## Scratch work

- **Removed:** the temporary test copies, the bench copy, the probe files in `packages/vite-traits-plugin`, and the Rolldown runtime fixture.
- **Still in my session's scratch directory:** copies of the probe scripts and logs. Everything cited is saved here.
- No worktree or background process remains.

## Next

The architect decides `final-cleanup-reviewer-1` and `final-cleanup-reviewer-2`, and whether `DRF-38`, `RF-31` and `DRF-40` close. This review closes no finding and opens no PR.