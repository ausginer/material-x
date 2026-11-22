# `@ydinjs/signals` — prototype report

**Author:** the implementer, in slot `c` on `repo/signals-design-1`, 2026-11-22. **Task:** [`signals-prototype-task.md`](signals-prototype-task.md), against revision 2 of the [design draft](signals-design-draft.md), at `5c7e48fbd`. **Kind:** an architecture prototype under [`agent-workflow.md` §Architecture prototypes](../../.agents/docs/agent-workflow.md#architecture-prototypes). It adopts no decision and claims no record identifier. Labels P1 to P10, C1 to C5 and Q4 to Q11 are the draft's.

**Status:** stopped for the owner's evaluation. No pull request.

## Commits

| Commit | What it holds |
| --- | --- |
| `5c7e48fbd` | The base: the draft and the task. Its code equals `main` at `7dbef17bb`. `origin/main` hadn't moved, so nothing was merged. |
| **(A) `0e539a468`** | `packages/signals`, its workspace wiring, core's changes, the manifests, and the button group's forwarding on signals with **the button's helper importing `effect`**. |
| **(B) `044d9c2ef`** | The same flow with **the context value carrying `watch`**, a function the group made, which creates the button's effect. The button imports nothing from signals. |
| the report commit, after (B) | This report, its readings under [`checks/`](checks/), the benchmarks and the browser probe. It changes no source the flow runs, so the code at the head is shape (B). |
| the baselines commit, after the report commit | `usignal` and `@webreflection/signals` in the size and speed benchmarks, the consistency probe `bench/consistency.ts`, and [§Two more baselines](#two-more-baselines-usignal-and-webreflectionsignals). It changes no source the flow runs. |

To try (A): `git switch --detach 0e539a468`, then `aube install` and the commands below. Return with `git switch repo/signals-design-1`.

## Source paths

- **`packages/signals/`**: `src/index.ts` (`signal`, `computed`, `effect`, `batch`, the public types), `src/family.ts` (the declared family, its own entry `@ydinjs/signals/family.js`), `src/internal/node.ts` (the one node shape and the edge), `src/internal/graph.ts` (marking, the check, runs, edge reconciliation, the flush). Tests in `tests/`, readings in `bench/`. Manifest, `Justfile`, `project.json`, `tsconfig.json`, `tsdown.config.ts`, `vitest.config.ts`, `files.json`, `.oxlintrc.json`, `eslint.config.ts` as box-quad has them, and `browserslist: "baseline newly available"`.
- **Wiring:** the root `Justfile`'s project lists, root `vitest.config.ts`, `.scripts/vitest-config.ts` (`createSignalsTestConfig`, the `signals/` projects), and `MEASURED` in `.scripts/size-reading.ts`.
- **Core:** `src/emitter.ts`, `tests/emitter.browser.test.ts`, the export, the `files.json` entry and the `.size-limit.json` row deleted. `Unsubscribe` is now exported by `src/controllers/useContext.ts`, whose JSDoc names signals. New controller `src/controllers/useEffect.ts` with `tests/controllers/useEffect.browser.test.ts`. `docs/api.ts` lists it in place of the emitter.
- **material-x:** `src/button-group/button-group-context.ts` and `src/core/utils/useContext.ts`. `ButtonCore.ts`, `SwitchCore.ts` and `ButtonGroupCore.ts` are unchanged. Probe in `bench/`.
- **Manifests:** `@ydinjs/signals` `0.1.0` is a required peer and a dev dependency of material-x, and an optional peer (`peerDependenciesMeta`) and a dev dependency of core. Signals' dev dependencies `@preact/signals-core` `1.14.5`, `alien-signals` `3.2.1`, `usignal` `0.10.0` and `@webreflection/signals` `0.2.8` are exact. The lockfile recorded the peers through `aube install --fix-lockfile`, then `aube install --frozen-lockfile --force`; `node_modules/@ydinjs` holds all eight workspace packages.

### Provisional names, for the owner

| Name | What it is |
| --- | --- |
| `signal(value, { name, equals })`, `computed(inputs, fn, { name, equals })`, `effect(inputs, fn, { name })` | An options object carries the draft's `name` and `equals`, in place of a positional `equals`. |
| `Readable<T>`, `Signal<T>`, `Computed<T>`, `Source`, `Accessor<T>`, `Accessors<I>`, `ValueOf<N>`, `Dispose`, `EffectCleanup` | Public types. `Computed.sources` is the declaration. |
| `family(list, { name })`, `Family<T>` with `name` and `list`, `FamilyAccessor<T>` | The family. Its accessor `rows()` returns the current members, and `rows.at(index)` reads member `index`'s value. |
| `useEffect(host, inputs, fn, options)` | Core's controller, `@ydinjs/core/controllers/useEffect.js`. |
| `AttributeName<T>`, `AttributeWatcher<T>`, `AttributeCallback<A>`, `ContextData<T>` | material-x's context types. In (A) `ContextData` is `{ attributes }`, one signal per forwarded attribute. In (B) it is `{ watch }`. |

## How the owner tries it, as run

All in slot `c`, Node v26.13.1, Chromium from the repository's Playwright.

```sh
aube install                                   # the lockfile; then check node_modules/@ydinjs has 8 entries
cd packages/signals && aube exec just test     # 4 files, 53 tests pass
node packages/signals/bench/speed.ts           # the speed table, about 5 s
node packages/signals/bench/allocation.ts      # the P8 and C4 probe
node packages/signals/bench/consistency.ts     # P1 to P4 and P10 against the four other libraries
node packages/signals/bench/size-baselines.ts  # run `aube exec just build` in packages/signals first
cd packages/material-x && aube exec just test tests/button-group   # with tests/button: 10 files, 222 tests pass on (A) and on (B)
cd packages/material-x && aube exec vitest run -c bench/vitest.config.ts --silent=false   # the connect probe
just docs-dev   # at the root; the button group stories on port 6006
```

A fresh slot builds `vite-traits-plugin` and the other prerequisites before a package's own `just build` works; the root `just test` and `just docs-dev` do it themselves.

Results, besides the readings below:

- **signals:** 53 tests pass. **core:** 25 files, 255 tests pass, with `useEffect`'s 6. **material-x, the whole package:** 25 files, 562 tests pass on (A) and on (B). The visual suite runs only in CI (`repo:RD-13`): no visual run was made locally.
- **Typecheck** of signals, core and material-x: clean on (B). Format and lint per `handoff.md` on every changed file: clean, with file-level `no-console` and `no-await-in-loop` disables on the measurement scripts, as drag's benches have them.
- **The stories.** With `just docs-dev`, a Playwright script opened the six group stories (`button-group-standard--playground`, `--sizes`, `--switch`, and the same for `button-group-connected`). None logged a page error. Setting the group's `disabled` put every button into `:state(disabled)`, and setting the group's `value` to a switch's value checked that switch. The DevTools browser isn't installed in this container, so nobody looked at the stories with eyes.

### A deviation from the parity check

**Core's `tests/controllers/useContext.browser.test.ts` doesn't pass unchanged: it imported `EventEmitter`, which the task deletes.** It now builds a local `Channel` from `signal` and `effect`, with the same `on` and `emit`, and imports `Unsubscribe` from `useContext.ts`. No assertion changed, and all of its tests pass. material-x's `tests/button-group/` and `tests/button/` are unchanged.

## Readings

Observations are what an instrument printed. Estimates and explanations are marked as such. Machine: Intel i7-1255U, 12 logical CPUs, Linux 7.2.15 (Fedora host, devcontainer), Node v26.13.1. The saved outputs are in [`checks/`](checks/).

### Size, Brotli bytes

`just size-reading` at the base, (A) and (B), and `just size-report` between them: [`size-reading-base-5c7e48fbd.json`](checks/size-reading-base-5c7e48fbd.json), [`size-reading-a-0e539a468.json`](checks/size-reading-a-0e539a468.json), [`size-reading-b-044d9c2ef.json`](checks/size-reading-b-044d9c2ef.json), [`size-report-a-vs-base.md`](checks/size-report-a-vs-base.md), [`size-report-b-vs-base.md`](checks/size-report-b-vs-base.md), [`size-report-b-vs-a.md`](checks/size-report-b-vs-a.md).

**`@ydinjs/signals`'s rows** (`packages/signals/.size-limit.ts`; each row bundles a generated module re-exporting its features, because the preset's `import` option is unreachable. A `.size-limit.ts` in place of box-quad's `.size-limit.json` for that reason):

| Row                                             | Brotli  |
| ----------------------------------------------- | ------- |
| `signal`                                        | 291 B   |
| `signal+computed`                               | 1,138 B |
| `core`: `signal`, `computed`, `effect`, `batch` | 1,231 B |
| `core+family`                                   | 1,345 B |

**The baselines,** the same preset through `bench/size-baselines.ts` ([`size-baselines.txt`](checks/size-baselines.txt)):

| Fixture | Brotli |
| --- | --- |
| `@ydinjs/signals`: `signal, computed, effect, batch` | 1,231 B |
| `@preact/signals-core` 1.14.5: the same | 1,545 B |
| `alien-signals` 3.2.1: `signal, computed, effect, startBatch, endBatch` | 1,567 B |
| `signal` alone: ydin / Preact / alien | 291 B / 1,491 B / 1,368 B |

**material-x and core:**

| Row | Base | (A) | (B) | (A) − base | (B) − base |
| --- | --- | --- | --- | --- | --- |
| `button/button` | 4,913 | 6,009 | 4,872 | +1,096 | −41 |
| `button/icon-button` | 5,182 | 6,281 | 5,145 | +1,099 | −37 |
| `button/link-button` | 4,865 | 5,964 | 4,846 | +1,099 | −19 |
| `button/switch-button` | 5,261 | 6,366 | 5,223 | +1,105 | −38 |
| `button/switch-icon-button` | 5,658 | 6,748 | 5,631 | +1,090 | −27 |
| `button/split-button` | 7,496 | 8,572 | 8,603 | +1,076 | +1,107 |
| `button-group/button-group` | 3,118 | 3,285 | 4,265 | +167 | +1,147 |
| `button-group/connected-button-group` | 3,874 | 4,036 | 5,011 | +162 | +1,137 |
| `text-field/text-field` | 8,171 | 9,324 | 8,156 | +1,153 | −15 |
| `complete` | 22,211 | 23,202 | 23,252 | +991 | +1,041 |
| control `icon/icon` | 643 | 643 | 643 | 0 | 0 |
| control `list/list` | 662 | 662 | 662 | 0 | 0 |
| control core `element` | 275 | 275 | 275 | 0 | 0 |
| core `emitter` | 198 | deleted | deleted |  |  |

Every other material-x row is unchanged. The deleted `emitter` row's last figure is **198 B**, read at the base, as at `7dbef17bb`.

**Which modules entered or left each moved row,** read by bundling the row's entry with Rolldown as the preset does ([`row-modules.json`](checks/row-modules.json)):

- **Button rows, (A):** `signals/index.js`, `signals/internal/graph.js` and `signals/internal/node.js` entered. Nothing left: the base's buttons imported the emitter as a type only. **(B):** no module entered or left. The rows shrank by 19 to 41 B. Estimate: the button's helper lost its join loop over `getAttribute` and its attribute filter, which (B) moves to the group.
- **Group rows:** `core/emitter.js` left in both. (A) brought `signals/index.js` and `node.js` (`signal` only); (B) brought `graph.js` as well, for `effect`.
- **`text-field/text-field`** follows the buttons because it contains `icon-button` and `ButtonCore`. **`button/split-button`** contains `connected-button-group` and `ButtonGroupCore`, so it pays for the provider side in both shapes and for the button side in (A) too.
- **Controls:** `icon/icon`, `list/list` and core's `element` don't contain a context and didn't move, as they were expected not to.

### Speed

`node packages/signals/bench/speed.ts`: 10 warm-up samples, then 30 timed samples per cell; the median time per operation, with the fastest and slowest samples in brackets. Two runs are in [`speed.txt`](checks/speed.txt). Run 2:

| Case | @ydinjs/signals | @preact/signals-core | alien-signals |
| --- | --- | --- | --- |
| 1a. chain of 10 computeds and an effect, write the head | 360 ns (351–752) | 319 ns (312–347) | 287 ns (280–595) |
| 1b. diamond and an effect, write a | 287 ns (155–313) | 286 ns (280–319) | 216 ns (211–248) |
| 2. branch switch on every write | 181 ns (179–191) | 251 ns (233–270) | 113 ns (108–229) |
| 3. 100 declared inputs, 3 read per run | 271 ns (268–280) | 122 ns (118–187) | 88 ns (85–176) |
| 4. create and dispose an effect, 1 input | 83 ns (78–174) | 64 ns (60–128) | 46 ns (44–50) |
| 4. the same, 10 inputs | 466 ns (415–1,210) | 364 ns (320–382) | 294 ns (258–325) |
| 4. the same, 100 inputs | 3.96 µs (3.84–4.50) | 2.71 µs (2.55–3.19) | 2.34 µs (2.18–2.96) |
| 5. family scan, 100 rows, match at 50, write row 10 | 904 ns (866–1,880) | 703 ns (682–863) | 527 ns (511–566) |

**The machine is noisy:** the same cell differs by up to two times between runs (1b: 148 ns in run 1, 287 ns in run 2), so read only the order within a run. In both runs ydin is faster than Preact on the branch switch, as fast or faster on the diamond, and slower than both on cases 3, 4 and 5. On the chain it is 360 ns against Preact's 319 ns in run 2, and about twice Preact's in run 1, whose spread for that cell is wide. alien-signals is the fastest in most cells.

What the cases show, with the explanation as an estimate where no probe isolated it:

- **Case 3, the sketch's worry, isn't the accessors.** They are created once, with the node. The cost is the call: the callback receives 100 arguments, and its rest parameter `(...accessors)` allocates a 100-element array on every run. The allocation probe below reads **849 B per run** for it. A callback that names its parameters doesn't pay it, but nobody names 100 parameters. A large declaration read sparsely costs about twice Preact's run here.
- **Case 4, creation,** costs one edge object and one closure per declared input (an estimate from the code). At 100 inputs it is 1.5 times Preact's.
- **Case 5, the family scan,** is about 1.3 times a Preact computed looping over the members. Estimate: one `Map` lookup per member read, and `rows.at()` reads the list edge again on every call.

### Steady-state allocation (P8, C4)

`node packages/signals/bench/allocation.ts` counts V8's `total_allocated_bytes` over 200,000 and over 400,000 operations after 50,000 warm-up operations, and reads bytes per operation as the slope between the two. V8 allocates about a megabyte in each measured window whatever the operation runs, and the slope cancels it. Three runs in [`allocation.txt`](checks/allocation.txt); run 3:

| Probe                                                 | B per operation |
| ----------------------------------------------------- | --------------- |
| witness: an empty operation                           | 2.75            |
| diamond and an effect                                 | −0.01           |
| branch switch on every write                          | −2.28           |
| family scan reading the same 51 members               | −0.01           |
| witness: a callback with a rest parameter, 100 inputs | 849.11          |
| witness: an operation allocating one empty object     | 55.98           |
| reference: Preact's diamond                           | 121.64          |

**Observation:** the three ydin cases read zero within the probe's resolution, which the empty operation puts at a few bytes per operation, across the three saved runs (−2.28 to −0.01 B). One empty object reads 54 to 56 B, so a single allocation per run would show. **P8 and C4 hold in V8, in Node.** Preact's 120 B per write is an observation the report doesn't explain.

**What the probe can't see:** allocation that V8's escape analysis removes, which isn't allocation; another engine, since nothing was measured in a browser; and a run in an unwarmed state, since it reads after warm-up only. It also counts what the callbacks allocate, so it tests the runtime only because the callbacks allocate nothing. The structural tests in `tests/inspection.browser.test.ts` and `tests/family.browser.test.ts` check a different thing in Chromium: the same edge objects stay in the active and subscriber lists across such a run.

### The consumer flow at runtime

`bench/button-group-connect.probe.browser.ts` in Chromium: a group of 50 `mx-button`s, with `color="tonal"`, appended to the document and removed 1,000 times. Each cycle waits one microtask after the append, so the buttons' context lookup runs and creates the forwarding before the removal disposes it. The probe asserts at its end that a button carries the group's color. Five runs of 1,000 cycles, three invocations per commit, so 15 runs per commit ([`connect-probe-base-5c7e48fbd.txt`](checks/connect-probe-base-5c7e48fbd.txt), [`connect-probe-a-0e539a468.txt`](checks/connect-probe-a-0e539a468.txt), [`connect-probe-b-044d9c2ef.txt`](checks/connect-probe-b-044d9c2ef.txt)):

| Commit               | Median of 15 runs | Fastest  | Slowest  |
| -------------------- | ----------------- | -------- | -------- |
| base, `EventEmitter` | 2,588 ms          | 2,142 ms | 3,264 ms |
| (A)                  | 2,409 ms          | 1,947 ms | 3,191 ms |
| (B)                  | 2,033 ms          | 1,644 ms | 2,723 ms |

**The probe can't tell the three apart:** the ranges overlap, and an earlier invocation at the base read a median near 2,100 ms. About 2 ms a cycle, 40 µs a button, is mostly the button's own connect and disconnect, which is the same in all three. **Retained heap:** `performance.memory.usedJSHeapSize` is coarse in Chromium without `--enable-precise-memory-info`, and the probe can't force a collection. Its figures after a run move between 9 MB and 43 MB with collections at every commit, and the lowest figure after a run is 9.3 MB at the base, 9.7 MB at (A) and 9.8 MB at (B). That is no evidence of retention, and also no evidence of its absence. A heap snapshot after disconnect would answer it, and wasn't taken.

## Two more baselines: `usignal` and `@webreflection/signals`

The owner asked which library would do better than these two. They are `usignal` 0.10.0 and `@webreflection/signals` 0.2.8, both by the same author. Both are exact dev dependencies of `packages/signals`. aube refused `@webreflection/signals` at first because its name is one letter away from `@webreflection/signal`, a different package. The registry shows the same maintainer for both, 0.2.8 as the latest version (published 2026-05-30), no dependencies and no install script, so the package was added with `--allow-low-downloads`. Then `aube install --frozen-lockfile --force`, and `node_modules/@ydinjs` holds all eight workspace packages. Under the `browser` condition, `usignal`'s root export runs effects in a microtask, and the benchmarks import `usignal/sync` so that its effects run synchronously, as the others' do.

### Features and shape

Read from each package's published source.

| Library | Batch | Equality | Lazy computed | Disposal | Shape |
| --- | --- | --- | --- | --- | --- |
| `@ydinjs/signals` | `batch(fn)` | `Object.is`, or the node's own `equals` | yes | `effect` returns a disposer | Plain object literals of one node shape, with free functions in `graph.ts` |
| `@preact/signals-core` 1.14.5 | `batch(fn)` | `!==` on signals and computeds; no option | yes | yes | Constructor functions with their methods on `prototype` (`function Signal()`, `Signal.prototype._refresh`). The `.d.ts` declares them as classes |
| `alien-signals` 3.2.1 | **No batch function:** `startBatch()` and `endBatch()` | `!==`; no option | yes | yes | Plain records with free functions. A signal or computed is its operator function bound to its record (`signalOper.bind({ … })`) |
| `usignal` 0.10.0 | `batch(fn)` | `Object.is` by default; `equals` option on `signal` and `computed` | yes | yes | ES classes: `Signal`, `Reactive` and `Computed` extend it, then `FX` and `Effect` extend `Computed`. Fields are public, with one-letter names |
| `@webreflection/signals` 0.2.8 | `batch(fn)` | **None:** every write notifies, also for an equal value, and no computed stops propagation | yes | yes | ES classes `Signal` and `Computed` with `#private` fields and a static block, a class `Effect` with public fields, and free functions `signal`, `computed`, `effect`, `batch`, `untracked` |

### Size, Brotli bytes

`node packages/signals/bench/size-baselines.ts`, through the same preset as the other rows ([`size-baselines-five.txt`](checks/size-baselines-five.txt)):

| Library | `signal` | `signal`, `computed`, `effect`, batch |
| --- | --- | --- |
| `@ydinjs/signals` | 291 B | 1,231 B |
| `@preact/signals-core` | 1,491 B | 1,545 B |
| `alien-signals` (`startBatch`, `endBatch`) | 1,368 B | 1,567 B |
| `usignal` (`usignal/sync`) | 359 B | 829 B |
| `@webreflection/signals` | 188 B | 515 B |

### Speed

`node packages/signals/bench/speed.ts`, two runs ([`speed-five.txt`](checks/speed-five.txt)). Each cell gives the median per operation as run 1 / run 2. The file also has the spreads.

| Case | ydin | Preact | alien | usignal | webreflection |
| --- | --- | --- | --- | --- | --- |
| 1a. chain of 10 | 316 / 342 ns | 273 / 398 ns | 243 / 282 ns | 752 / 842 ns | 417 / 437 ns |
| 1b. diamond | 142 / 137 ns | 156 / 148 ns | 98 / 100 ns | 312 / 284 ns | 206 / 191 ns |
| 2. branch switch | 83 / 85 ns | 131 / 133 ns | 96 / 105 ns | 217 / 457 ns | 84 / 100 ns |
| 3. 100 inputs, 3 read | 279 / 277 ns | 123 / 116 ns | 86 / 85 ns | 198 / 197 ns | 94 / 88 ns |
| 4. create and dispose, 1 input | 86 / 95 ns | 61 / 58 ns | 43 / 43 ns | 674 / 508 ns | 124 / 125 ns |
| 4. the same, 10 inputs | 465 / 394 ns | 261 / 272 ns | 240 / 191 ns | 1.16 / 1.12 µs | 467 / 681 ns |
| 4. the same, 100 inputs | 3.79 / 3.43 µs | 1.69 / 1.64 µs | 1.45 / 1.38 µs | 17.5 / 9.18 µs | 4.95 / 7.13 µs |
| 5. family scan | 692 / 711 ns | 501 / 549 ns | 431 / 446 ns | 1.19 / 1.24 µs | 367 / 390 ns |

**The webreflection cells don't measure the same work.** In 1b it runs `d` and the effect three times per write, as P2's failure below shows. In case 5 it runs the effect on every write, although the first match doesn't change, because no computed stops propagation. **usignal is the slowest in every case.** Its case 4 spread is wide: 258 ns to 2.08 µs for one input in run 1. An estimate from the source: each node allocates two `Set`s, and disposal clears them.

### Consistency

`node packages/signals/bench/consistency.ts` runs the suite's cases with dynamic reads, through one adapter per library ([`consistency.txt`](checks/consistency.txt), with the observed values of each failure). Two runs printed the same table. Whether a source still holds a computed is read with a `WeakRef` to the computed's function and a forced garbage collection. Two witnesses check the method: an unreferenced object is collected, and a computed that an effect observes is held, in all four libraries. **The ydin column is not from this probe.** It cites the suite (`tests/propagation.browser.test.ts`, `tests/narrowing.browser.test.ts`), which checks a subscription by reading the node's fields, not by collection. One extra one-off run showed that the ydin effect runs on a write after a batch that throws.

| Property | ydin (suite) | Preact | alien | usignal | webreflection |
| --- | --- | --- | --- | --- | --- |
| P1 the diamond's effect sees a consistent `d` | holds | holds | holds | holds | **fails** |
| P2 one write runs `b`, `c` and `d` once each | holds | holds | holds | holds | **fails** |
| P2 one write runs the effect once | holds | holds | holds | holds | **fails** |
| P3 a computed with an unchanged value doesn't rerun its consumers | holds | holds | holds | **fails** | **fails** |
| P3 a write of an equal value runs no effect | holds | holds | holds | holds | **fails** |
| P3 the node's own equality function | holds | no option | no option | holds | no option |
| P4 an unobserved computed doesn't run on a write | holds | holds | holds | holds | holds |
| P4 the source doesn't hold a computed that was only read | holds | holds | **fails** | **fails** | **fails** |
| P4 a computed whose last observer is disposed doesn't run on a write | holds | holds | holds | holds | holds |
| P4 the source doesn't hold that computed | holds | holds | holds | **fails** | **fails** |
| P4 that computed is current when read | holds | holds | holds | holds | holds |
| P10 a batch's writes propagate once, at its end | holds | holds | holds | holds | holds |
| P10 nested batches flush at the end of the outermost | holds | holds | holds | holds | holds |
| P10 a throwing batch still flushes, and the effect runs on a later write | holds | holds | holds, by the adapter's `finally` | **fails** | holds |
| Tracking: after a branch switch, a write to the old input runs nothing | holds (P5, P6, declared) | holds | holds | holds | **fails** |

**The failing cases.** Each one is observed. Each mechanism is an estimate from the published source, and no probe isolated it.

- **webreflection, P1 and P2.** For writes 2 and 3 to `a`, the effect sees `1:2+3`, `2:2+3`, `2:4+3`, `2:4+6`, `3:4+6`, `3:6+6`, `3:6+9`. `d` and the effect run three times per write. Mechanism: a write notifies its subscribers one by one, and an effect runs as soon as it is notified. `a`'s first subscriber is `d`, so the effect reads `d` before `b` and `c` are invalid. After that, `b` and then `c` notify `d` again.
- **webreflection, P3.** An equal write to a signal runs the effect, and a computed whose value is unchanged (`n % 2` for `n` going from 1 to 3) reruns its consumer and the effect. The library has no equality check.
- **usignal, P3 at a computed.** The consumer and the effect each run once although `parity` is unchanged. Mechanism: a write marks every downstream computed and effect before anything recomputes, so a computed can't stop the propagation. An equal write to a signal is cut off.
- **alien, usignal and webreflection, P4, a read computed.** A computed that was only read stays reachable from its source. Mechanism in alien: the computed's run links it to its sources with no observer. The others keep it in the source's subscriber set.
- **usignal and webreflection, P4, after disposal.** The source still holds the computed after its last effect is disposed. Disposing the effect clears the effect's own sets, and the computed stays in the source's set. In webreflection it stays until the source's next write.
- **usignal, P10.** When the batched function throws, no effect runs, and **the effect never runs again**: `seen` stays `[1]` after a later write. Mechanism: `batch` flushes inside its `try`, after the function, so the throw skips the flush and leaves the effect marked. The marking pass skips a node that is already marked.
- **webreflection, tracking.** After `show` switches to `false`, a write to `left` reruns `picked` and the effect once. Mechanism: a source keeps a subscriber until its next write, which replaces its subscriber set. A read only adds to it.

**Dynamic tracking is these libraries' form of narrowing.** Each run subscribes to what it read. There is no declared input to compare with P5 and P6, so the last row is the nearest case: Preact, alien and usignal drop the unread input at the run that stops reading it, and webreflection drops it after one stale run.

**For the owner's question, evidence and not a verdict.** Both libraries are smaller than `@ydinjs/signals`: 515 B and 829 B against 1,231 B for the four features. Neither holds what the prototype's suite holds. webreflection fails P1, P2 and P3, keeps computeds alive from their sources, and runs once on a stale input. usignal fails the cut-off at a computed and keeps computeds alive from their sources, and a throwing batch stops its effects for good. It is also the slowest in every speed case. In this comparison, the only libraries that hold every property they offer are Preact, `alien-signals` and `@ydinjs/signals`. alien also keeps a computed that was only read alive.

## Properties

| Property | Result | Where |
| --- | --- | --- |
| P1 consistency, P2 single evaluation | **Held.** In the diamond, one write runs `b`, `c` and `d` once each, and the effect sees `1:2+3`, `2:4+6`, `3:6+9`. | `tests/propagation.browser.test.ts` |
| P3 equality cut-off | **Held**, with `Object.is` and with a node's own `equals`. | same |
| P4 laziness | **Held.** An unobserved computed doesn't run on a write, and its source holds no subscription after a read. When its last observer is disposed it unsubscribes from its sources and is current on the next read. | `tests/narrowing.browser.test.ts` |
| P5 narrowing, computed | **Held**, for observed and unobserved computeds. | same |
| P6 narrowing, effect | **Held.** The consequence test also holds: an effect that declares `tick` and doesn't read it doesn't rerun when `tick` changes, and `tick` has no subscriber. A declared computed the run doesn't read isn't evaluated. | same |
| P7 escaped reads | **Held** from a timer and after an `await`: the current value, no edge. | same |
| P8 steady-state allocation | **Held in V8** (probe above); the structural test holds in Chromium. | `bench/allocation.ts`, `tests/inspection.browser.test.ts` |
| P9 inspection seam | **Held for the prototype half:** `name` and `sources` are readable before the first run. The active edges are the node's own fields, which the tests read through `tests/support/graph.ts`. The production half, a separate development build, isn't prototyped. | `tests/inspection.browser.test.ts` |
| P10 batching | **Held**, nested batches included. A batch whose function throws still flushes. | `tests/propagation.browser.test.ts` |
| C1, C2 | **Held.** The scan subscribes to the list, the threshold and the rows up to and including the match. A write to a row after the match doesn't rerun it. It narrows and widens as the match moves. | `tests/family.browser.test.ts` |
| C3 | **Held.** After the consumer's next run, a removed row has no subscriber and isn't among the consumer's edges; insertion and reordering are followed. | same |
| C4 | **Held** (probe), and the scan's edge objects are reused (test). | same, `bench/allocation.ts` |
| C5 | **Held.** The family is in `sources`, with its `name` and `list`, before the first run, and the member edges are among the active edges after it. | same |

**Keyed mapping (a) and rebuild (b) weren't built,** because (c) broke none of P1 to P10.

Also tested: an effect's cleanup runs before its next run and on disposal; an effect disposed in a batch after it was marked doesn't run; a throwing effect rethrows from the flush and the other effects still run; a throwing computed caches the error and rethrows it to each reader until a source changes; an effect reading it runs again after it recovers.

## The family's call site

The sketch's scan, as `tests/family.browser.test.ts` and `bench/speed.ts` write it:

```ts
const firstMatch = computed(
  [family(rows, { name: 'rows' }), threshold],
  (rows, threshold) => {
    const limit = threshold();
    const members = rows();

    for (let index = 0; index < members.length; index += 1) {
      if (rows.at(index) > limit) {
        return members[index];
      }
    }

    return undefined;
  },
);
```

`rows` is a `Signal<readonly Signal<number>[]>`. `rows.at(index)` reads the member at `index` of the current list, so C1's "only members of the current value" holds by construction, with no membership check. A member edge is created by the first run that reads the member and deleted by the first run that doesn't, so the family keeps no edge to a removed member after the consumer's next run.

## Design choices the prototype made

None of these is decided. Each is what the prototype needed in order to run.

- **The node is a plain object literal of one shape,** not a class: Part I keeps a class's mutable state in `#private` fields, and the standalone functions in `graph.ts` and `family.ts` need to write the node's fields. `get` and `set` are shared top-level functions, so a node allocates no closures.
- **A signal carries no scheduler.** Its `set` calls `propagate` on its first subscriber: only a computed or an effect can subscribe, and it brings the function. The `signal` row, 291 B against 1,138 B with `computed`, is the reading that this holds.
- **Edges are in intrusive lists:** the current run's reads, the last run's reads and the source's subscribers. The used-edge mark is the run number, so it needs no clearing, and reconciliation walks the reads of this run and the previous one, not the declaration.
- **An unobserved computed checks its sources** when any signal was written since its last check, through a global write count, in the order the last run read them, so a branch's condition is checked before the computeds behind it.
- **The family needs one field and one line in the core:** `Edge.family`, and the deletion of an unread member edge during reconciliation. A composition without the family pays for them; everything else of it is in `family.ts`, 114 B.
- **A throwing computed caches its error,** as Preact does. Without that, a computed left marked after a throw stops propagating to its subscribers.
- **Effects run in the order they were marked.** A write outside a batch flushes before `set` returns, which keeps the button group's synchronous timing: the parity tests rely on it.

## Known defects, missing capabilities and limits

- **A write during a run to an edge the run has newly read isn't seen by that consumer.** A new edge joins its source's subscribers when the run ends, so a write inside the same run, by the consumer itself or by an effect it triggers, doesn't mark it. Found by reading the code, not tested. Preact subscribes at the read and has no such gap.
- **Marking, the check and subscription recurse,** so a very deep chain can exhaust the stack. Not probed.
- **A large declaration read sparsely costs a call with every accessor as an argument, and a rest-parameter array on every run** (case 3, 849 B per run). The draft's §2.8 says such a declaration "is a collection in disguise", and the family is the alternative; the prototype didn't measure a family of 100 against the declaration of 100.
- **Creation costs one edge and one closure per declared input,** which is 1.5 times Preact at 100 inputs.
- **No development build, no inspection interface, no bridges, no owner tree, no async computeds,** as the task scopes them out. The tests read the runtime's internal fields for subscriptions.
- **Measurement limits:** one machine, a noisy one; the speed and allocation readings are Node's V8 only; the browser probe can't resolve the forwarding's cost and reads no reliable heap; no visual run was made locally.

## What the prototype shows for the open questions

Evidence, not answers.

- **Q4, the declared family.** It covers the sketch's scan and holds C1 to C5 with no runtime check, for 114 B and one field in the core. The scan runs about 1.3 times as long as a Preact computed looping over the members. Neither alternative was needed for any property.
- **Q9, peer or dependency.** The prototype ran with the draft's provisional answer: a required peer of material-x and an optional peer of core, linked in the workspace as a dev dependency. `aube install --fix-lockfile` recorded the peers, and a frozen install with `--force` links all workspace packages. Nothing here tested two installed copies.
- **Q10, the core module that imports signals.** `useEffect` is the only core module importing signals, which is what makes core's optional peer coherent. **The button-group flow doesn't use it:** the button's effect has to start with the provider that the context lookup resolves, and the lookup runs in a microtask after the connect, once the parent's name is defined. `useEffect` creates its effect at the connect, before the provider is known. core's `useContext` already gives the flow the lifetime it needs: one effect per resolved connection, and its disposer as the cleanup.
- **Q11, (A) or (B).** (B) keeps every button row at or below its base size (−19 to −41 B), while (A) adds about 1.1 kB to each of them and to the text field. The group rows pay the other way: +162 to +167 B in (A), +1,137 to +1,147 B in (B). `complete` differs by 50 B (+991 against +1,041). The split button contains a group, so it pays about 1.1 kB in either shape. The runtime probe can't separate the shapes. As the architect expected, (B) is smaller for a consumer of buttons without groups; it isn't equal in the group rows.

## Handoff

- **Input:** `5c7e48fbd`, the task and revision 2 of the draft; `CONTRIBUTING.md`, `handoff.md`, `technical-english.md`, `agent-workflow.md` §Architecture prototypes.
- **Outcome:** (A) `0e539a468` and (B) `044d9c2ef` on `repo/signals-design-1`, and this report with its readings in the commit after them. The two further baselines and the consistency probe are in the commit after that.
- **Verification:** as listed under the commands; the one deviation from the parity check is core's `useContext` test.
- **Open:** Q4, Q9, Q10, Q11, and whether to continue.
- **Next:** the owner evaluates the prototype. Then the architect revises the draft.