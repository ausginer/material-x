# Test execution model — implementation

**Implementer pass, 2026-09-11, branch `drag2/fin-review` from `67af05288`.**
Implements [`architect-test-execution-model-r4.md`](architect-test-execution-model-r4.md)
as the canonical contract. The earlier revisions and the challenge artefacts are
evidence behind it and were not implemented against.

**Nothing here claims an identifier.** No heading opens with one, at any depth,
and the local `TE-` names fall outside the local identifier grammar in any case.

**Instruction boundaries.** The pre-existing `node/tproc`
`TokenPackageProcessor` failure and F-412 stay outside this work; neither was
touched and neither was repaired. No VS Code installation exists in this
container, so nothing below is an editor observation.

## What landed

One migration, one commit. Five mechanisms, in the shape the contract specifies.

| Mechanism                               | Where                                                       |
| --------------------------------------- | ----------------------------------------------------------- |
| One root Vitest process, Nx out of test | `Justfile` `test`, root `package.json` `test`               |
| Group assignment and worker bounds      | `.scripts/vitest-config.ts`                                 |
| One-shot contract and boundary teardown | `.scripts/vitest-one-shot.ts`, installed from the factory   |
| Per-generation CSS isolate              | `packages/vite-custom-element-assets/src/css/generation.ts` |
| Test watch retired                      | `.scripts/zed-test.sh`, `.vscode/settings.json`             |

**The carrier is a plugin in `createTestBaseConfig`**, which every project
derives from, so the node and declaration projects — which carry no other
plugins — get it too. It pushes a reporter **instance** from `configureVitest`,
guarded against the per-project re-entry, and the guard and the teardown share
one reporter because both need `onTestRunStart` and the runtime project objects.

**Group assignment is computed per configuration rather than per project.**
`assignGroupOrder` walks a configuration's project list, numbers the browser
projects from 1 in list order and puts every non-browser project in the highest
group. Each `create*TestConfig` and the workspace config pass their list through
it, so per-package and root configurations are numbered by one rule and the
invariant the reporter checks holds by construction.

**Workers.** `--maxWorkers` is parsed in the factory and applied as each
project's own `maxWorkers`, because neither the flag nor a root-level value
reaches a browser project. Absent the flag, each browser project takes the
explicit page bound and every non-browser project takes one shared bound —
equal across them, which is what their shared group requires, and derived below.
`VITEST_MAX_WORKERS` needs no code. A malformed flag fails the configuration
load.

## One correction to the design, found by executing it

**The contract says a browser project's "provider is closed" and does not name
the call. The obvious one is wrong in two ways at once**, and the second is
fatal rather than cosmetic.

`ProjectBrowser.close()` is `await this.vite.close()`, and `this.vite` is the
**parent browser project's dev server** (`@vitest/browser/dist/index.js:2543`,
`:2597`). It therefore releases no browser at all: Chromium is owned by the
provider, which the pool releases with `provider.close()` at
`cli-api.BK8pd4xc.js:2488`, alongside `orchestrator.$close()` at `:2492`.

Measured with `ProjectBrowser.close()` at the boundary:

| Arms                                         | Outcome                                    |
| -------------------------------------------- | ------------------------------------------ |
| one browser project + node (`packages/drag`) | 310 passed — no boundary release is needed |
| any **two** browser projects, one boundary   | passes                                     |
| **three** browser projects, two boundaries   | **hangs after the second close**           |

The hang reproduces on `browser/material-x + spec/material-x + visual/material-x`
and on `browser/material-x + spec/material-x + browser/core`, so it is the
second close and not a property of the visual project. Idle, no CPU, no further
output; killed at 300 s. The first arm passes because a single browser project
sits in the final group and is released by process close (TE-F29), so the
mechanism never ran.

**The repair is to call what the pool calls**: `browser.provider.close()`,
then `$close()` on that project's orchestrators. With it, the same three-project
arm passes 258 tests through both boundaries, and the Chrome process count
**falls during the run** — 14 → 36 → 19 against a baseline of 13 — which the
Vite-server close never produced. That fall is the evidence the design wanted
and the previous call could not have given.

This is an implementation detail the design left open, not a contradiction with
it: the required property — released at an event that provably follows the
group's completion — is unchanged, and the boundary is still the trigger.

## A second value the design left to implementation, and the measurement for it

**The shared non-browser group needs a bound, and the CPU default is the wrong
one.** TE-D14 requires the factory to derive the non-browser projects'
`maxWorkers` from a single resolved value and does not say what it is. Leaving
it at Vitest's `cores - 1` satisfies the letter and fails in practice: several
files in that group spawn a build of their own — tsdown, Rolldown, Brotli — and
each uses more than the one core the worker holding it is counted as.

Measured on all five node projects together, 12 cores:

| Group bound      | Duration | Failures                                    |
| ---------------- | -------- | ------------------------------------------- |
| `cores - 1` (11) | 40 s     | **4** — three timeouts plus the `tproc` one |
| 6                | 45 s     | 1 — the pre-existing `tproc` failure        |
| 4                | 45 s     | 1 — the same                                |

The three extra failures are `drag2`'s `size.node.test.ts` and
`consumer.node.test.ts`, at 5003–5008 ms against the 5 s default timeout, doing
no more than reading output they had just built. They pass when `node/drag2`
runs alone from the same root configuration, so the cause is contention rather
than the migration breaking them — but a root run that fails three tests is a
root run that fails.

**The value is half the available cores**, which is the bound Vitest itself
applies when it expects other work on the machine, derived from
`availableParallelism()` so it scales. It costs 5 s on this group and buys the
three failures back.

## Verification

Executed on the shipped code unless stated. Root-level figures are measured
against the real root configuration, not inherited from the design's probe.

### The whole-repository run

Three runs of the shipped configuration, `npx just test`, `memory.max`
17 179 869 184 B (16 384 MiB), sampled at 1 Hz. The third is the clean one: the
first predates the group bound above and the second ran on a container whose
page cache had not settled.

| Quantity                 | Measured                                    | Design's single run |
| ------------------------ | ------------------------------------------- | ------------------- |
| Files / tests            | **157 / 2467 passed, 60 skipped, 1 failed** | 157 / 2467, 60, 1   |
| The one failure          | pre-existing `node/tproc`, per instruction  | the same            |
| Providers released       | **7 of 7**, each at its group boundary      | 7 of 7              |
| `Failed to run the test` | **0**                                       | —                   |
| `close timed out`        | **0**                                       | —                   |
| Unhandled errors         | **0**                                       | 0                   |
| Chrome                   | 42 peak, **back to baseline 13**            | 32 peak             |
| `memory.events.oom_kill` | **0**                                       | 0                   |
| Peak anonymous memory    | 9843 MiB, **Δ 6685 MiB**                    | not measured        |
| Peak `memory.current`    | 11 671 MiB, **Δ 7412 MiB**                  | 7570 MiB, Δ 5554    |
| Duration                 | **71 s**                                    | 63.6 s              |

The teardown log, verbatim, reproducing the design's order exactly:

```
closed browser/material-x (chromium) (group 1) at boundary 1->2
closed spec/material-x (chromium) (group 2) at boundary 2->3
closed visual/material-x (chromium) (group 3) at boundary 3->4
closed browser/core (chromium) (group 4) at boundary 4->5
closed browser/box-quad (chromium) (group 5) at boundary 5->6
closed browser/drag (chromium) (group 6) at boundary 6->7
closed browser/drag2 (chromium) (group 7) at boundary 7->8
```

**The resource result is reproduced in kind and not in number, and the gap is
reported rather than explained away.** Every acceptance signal the design names
holds — no `oom_kill`, no unhandled error, no `Failed to run the test`, all
seven providers released at their boundaries, Chrome back to baseline, the same
test totals. The delta does not: Δ 7412 MiB against Δ 5554 MiB on
`memory.current`, and 71 s against 63.6 s, across three bounded runs measuring
Δ 6723–8442 MiB and 71–86 s.

Two facts bear on it and neither closes it. The design's pass ran at a 2015 MiB
baseline; these ran at 3158–3538 MiB, in a container also holding an agent
session and thirteen background Chrome processes inside the same 16 GiB cgroup,
which is load the design's pass did not carry. And `memory.current` counts
reclaimable page cache, which a run doing this much build and raster I/O grows:
the anonymous figure, which is what an OOM actually reads, is Δ 6685 MiB. The
peak stays under the 13 107 MiB working ceiling the design names, with
`oom_kill` at 0. **Whether the overshoot is the environment or the
implementation is not settled by these runs**, and a re-measurement on a quiet
container is the way to settle it.

### Confirmations of measured mechanisms

- **CSS output is unchanged and order-independent.** All 35 `.css.ts` entries
  in `packages/material-x`, three ways through the shipped evaluator — one
  fresh isolate per entry, one shared generation forward, the same reversed:
  **35/35 byte-identical** across all three. Timings reproduce the design's:
  16 575 ms per-entry against **1222 ms** shared forward and 1348 ms reversed.
- **Dependency discovery sees the whole graph.** The generation's set is
  **123 files** — 88 under `packages/material-x`, **29 under `packages/tproc`**,
  6 elsewhere — reproducing the design's 123/88/29 exactly. The two rules the
  previous tracker applied are gone.
- **Evaluation failure discards the generation.** A `.css.ts` that throws
  rejects with its own error and stack; the corrected file then evaluates
  **in the same process**, and a sibling entry keeps working across the failure.
- **The serialization invariant fails loudly.** `vitest run --sequence.shuffle`
  in `packages/box-quad` aborts before any specification with
  `browser projects must each have a distinct non-zero sequence.groupOrder … "browser (chromium)" (0)`.
- **A second execution fails loudly and reports no tests.** Driven through
  `createVitest` with `watch: true` — the shape the editor creates — against
  `packages/vite-traits-plugin`: run 1 executed 6 modules, run 2 raised
  `this Vitest process has already executed a test run …` and executed **0**.
- **The carrier cannot be removed and is driven, not merely present.**
  `vitest run --reporter=dot` in `packages/drag`, which replaces the configured
  reporter list wholesale, still releases the provider at the 1→2 boundary and
  still passes 310 tests.
- **The carrier is installed exactly once, and it is an instance.** The
  15-project root configuration created with `--reporter=dot` resolves to
  `dot, OneShotTestExecution` — one enforcement reporter across fifteen
  `configureVitest` invocations, and an object rather than a name.
  `packages/vite-traits-plugin` — one node project carrying no plugins of its
  own — also reports one.
- **The assignment is right across the whole root configuration**: browser
  projects at `groupOrder` 1–7 with `maxWorkers` 2 each, all eight non-browser
  projects sharing `groupOrder` 8 with an equal `maxWorkers` 6. The project list
  the reporter is handed is unsorted — the node projects come first — which is
  why the invariant reads `groupOrder` and never list position.

### Paths no previous pass exercised

- **An empty run does not spend the lifecycle.** A filter matching nothing
  executed 0 modules; the real run afterwards executed all 6.
- **Per-package invocation is unchanged.** `packages/drag` 310 passed,
  `packages/box-quad` 193 passed, `packages/tproc` 70 passed with its one
  pre-existing failure, `packages/vite-traits-plugin` 52 passed.
- **`--watch` is gone from the tree**, and `.vscode/settings.json` sets
  `vitest.watchOnStartup` explicitly false.
- **The debug task is run mode.** `.scripts/zed-test.sh <file> "" debug` runs
  the file and **exits on its own**, which a watch session would not do.
- **Freshness holds across a workspace rebuild, through the real dev server.**
  A Vite dev server on material-x's own configuration: the first request
  evaluates the entry and the server's watched set contains `packages/tproc`;
  patching a **built artefact of `@ydinjs/tproc`** and delivering the change
  produces CSS carrying the patch, without restarting the server; restoring the
  artefact returns byte-identical output. That is generation-wide discovery
  through the workspace symlink, `watchChange` discarding the generation, and
  the next generation reading the rebuilt artefact — the three steps demonstrations
  8 and 10 ask for, and none of them had been exercised in any previous pass.
- **Both consumer classes pass.** `just build` at the root builds every package
  and `packages/material-x`'s own `just build` emits 211 files and passes
  `publint` — the tsdown path. `just docs-build` builds the Storybook site and
  the API docs — the Vite build path. The freshness probe above is the dev-server
  path.

## An evidence note in the record that the tree does not carry

**TE-F27's second sentence overstates what `watch: true` suppresses**, and the
mechanism it supports is unaffected.

The record reads: _"Under the extension, which always sets `watch: true`, a
filter that matches nothing therefore produces a run start and no error."_
Executed at `cli-api.BK8pd4xc.js:13470`, the condition is
`if (!this.config.watch || !(this.config.changed || this.config.related?.length)) throw new FilesNotFoundError(this.mode);`
— `watch: true` alone does not reach the second conjunct, and a `createVitest`
instance with `watch: true` and no `changed`/`related` **does** raise
`FilesNotFoundError`.

What the design depends on is the preceding three lines, and those hold exactly
as recorded: the empty branch calls `_testRun.start([])` **before** the throw,
so the run start reaches the reporters with an empty list and the exemption is
reached. The invariant — at most one _consuming_ execution — is unchanged, and
demonstration 18 passes. Only the record's parenthetical about the editor's
error behaviour is wrong, and it is not load-bearing for any mechanism.

## What is owed, and what could not be established here

- **The editor, demonstrations 13–15.** No VS Code installation exists in this
  container and `.vscode-server` is absent; the editor server present is Zed.
  Nothing below the editor boundary is left unverified — the contract, the
  carrier, the guard and the teardown are all exercised through the same node
  API the extension drives — but **the ordinary-gesture confirmation in a
  running editor is not performed and is not simulated**. It stays open for the
  owner: a single test, a file, a project, "Run All Tests" and "Update
  snapshots", none tripping the guard.
