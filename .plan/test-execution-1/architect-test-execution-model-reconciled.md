# Test execution model — reconciled design

**Architect pass, 2026-09-10, branch `drag2/fin-review` at `84756191f`.**
Reconciles [`architect-test-execution-model.md`](architect-test-execution-model.md)
(revision 1) with
[`architect-challenge-test-execution-model.md`](architect-challenge-test-execution-model.md)
and with an owner requirement revision 1 did not account for: **the Vitest VS
Code extension must keep working — test discovery and launching tests from the
editor. Replacing that with terminal commands is not an acceptable outcome.**

This document supersedes revision 1's decisions. Revision 1's _measurements_
stand except where noted here, and its headings have been demoted to local ids
in mention form.

**Nothing here claims an identifier.** No heading opens with one, at any depth.
The local register below is the sanctioned route from `consolidator.md` — "the
summary keeps local ids and the mapping is filled in when it is" — held open
because canonical registration is unresolved and is not this pass's to settle.
No repository register is opened, and no repository rule is written into
`@ydinjs/drag2`'s lifecycle family.

## The local register

| Local  | Canonical  | Subject                                                                   | Status against revision 1                                         |
| ------ | ---------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| TE-D1  | unassigned | Resource use bounded by construction; the stated budget                   | Stands, budget scoped per operation                               |
| TE-D2  | unassigned | `constructCSSTokens` bounds its worker concurrency                        | **Amended** — semaphore, not pool                                 |
| TE-D3  | unassigned | An explicit project-level `maxWorkers` in the shared factory              | **Reversed** — revision 1 declined to set one                     |
| TE-D4  | unassigned | A package CLI run holds one browser project's footprint at a time         | Stands, grounds amended, scope narrowed to the CLI                |
| TE-D5  | unassigned | The repository CLI run is a sequence of package runs                      | Stands, gains a derivation                                        |
| TE-D6  | unassigned | **The root workspace configuration is retained** as the IDE's entry point | **Reversed** — revision 1 recommended removing it                 |
| TE-D7  | unassigned | `.vscode/settings.json` names the root config and drops the inert setting | New                                                               |
| TE-I1  | unassigned | A scheduling or runner-config change carries a measured peak              | Stands; destination corrected                                     |
| TE-F1  | unassigned | CLI `--maxWorkers` cannot reach a browser project                         | Confirmed; **20** names, not 21                                   |
| TE-F2  | unassigned | The container misreports its budget                                       | Confirmed                                                         |
| TE-F3  | unassigned | Unbounded worker isolate per `.css.ts`                                    | Confirmed; build and docs-CI paths added                          |
| TE-F4  | unassigned | A finished browser project is never released                              | Confirmed and **refined** — retention is per project, not per run |
| TE-F5  | unassigned | The root run is fatal by construction                                     | Confirmed by construction                                         |
| TE-F6  | unassigned | Background load is part of the budget                                     | Confirmed                                                         |
| TE-F7  | unassigned | The visual failures                                                       | **Diagnosis reversed** — pixel mismatch, not a stability timeout  |
| TE-F8  | unassigned | `vitest.workspaceConfig` is inert on Vitest ≥ 4                           | New                                                               |
| TE-F9  | unassigned | Config dedup makes the root config the single IDE process                 | New                                                               |
| TE-F10 | unassigned | IDE "Run All Tests" drops the project filter                              | New                                                               |

`TE-D6` in revision 1 was the settle-budget decision; it is **withdrawn** and its
number reused here for the root-configuration decision, because revision 1's
numbering never entered a register and nothing cites it. TE-F7 carries what
remains of it.

## What changed, and on what grounds

For a focused challenge, these are the load-bearing reversals. Each is a
conclusion revision 1 or the challenge reached that new evidence overturns.

1. **The root `vitest.config.ts` is kept, not removed.** Revision 1 recommended
   removal; the challenge called the disposition an owner decision. It is
   neither — it is settled by extension behaviour (TE-F9). Removing it makes the
   IDE **worse**, not better.
2. **An explicit `maxWorkers` is set after all.** Revision 1 declined it as
   "buys nothing"; the challenge narrowed the ground to "not needed". Both are
   wrong: on `drag2` an explicit bound of 4 is **faster and lighter** than the
   CPU-derived default (TE-D3).
3. **The visual failures are pixel mismatches.** Revision 1 called them
   stability timeouts; the challenge downgraded them to undiagnosed. The run
   logs and the diff images settle it, and the settle budget is not the lever
   (TE-F7).
4. **Retention is per browser project, not per run.** This is what makes a
   long-lived editor process safe at all, and revision 1 could not have known it
   because it never ran one (TE-F4).
5. **Discovery is free.** An intermediate finding of this pass — that IDE
   discovery launches browsers and dies — was an artefact of calling the wrong
   API, and is recorded below as a correction rather than quietly dropped.

## The IDE path

Everything in this section was established in this session against the installed
extension `vitest.explorer-1.50.8` and `vitest@4.1.10`.

### How the extension resolves configuration, and why the root config must stay

Two mechanisms decide this, and neither is documented in the place a reader
would look.

**The tracked setting does nothing (TE-F8).** `.vscode/settings.json:3` sets
`"vitest.workspaceConfig": "vitest.config.ts"`. The extension's workspace
resolution ends at a version gate:

```js
let t = En(!1, e);
return !t || (0, ct.gte)(t.version, `4.0.0`) ? null : {...};
```

For Vitest ≥ 4.0.0 every workspace candidate resolves to `null` and is filtered
out. On `vitest@4.1.10` the setting is inert. `vitest.ignoreWorkspace` is
equally inert for the same reason.

**The root config suppresses every package config (TE-F9).** A started config
reports `workspaceSource = config.projects == null ? false : vite.config.configFile`,
and the resolution loop — candidates sorted shallowest-first — skips any later
candidate lying under an already-started `workspaceSource` directory, logging
_"Ignoring config … because there is a workspace config in the parent folder"_.

The root `vitest.config.ts` declares `test.projects`, so it starts first, claims
the repository root, and all seven `packages/*/vitest.config.ts` are skipped.
**Net: exactly one Vitest process for the whole repository.**

Remove the root config and that inversion is lost. The seven package configs
each declare `test.projects` too, each claims only its own directory, and none
suppresses another — so the extension starts **seven** Vitest processes. Runs are
serialized _within_ a config by a per-config queue, but **across** configs there
is no limiter at all: each config gets its own default run profile, so "Run All
Tests" fans out to seven concurrent processes with nothing bounding the total.

So the owner's recollection is functionally right, for a reason worth recording:
the root config is not required by the extension, but it is what collapses the
repository to a single process with a single serialized queue. **Revision 1's
recommendation to delete it was wrong, and would have made the IDE path
materially less safe.**

### Discovery costs almost nothing — and a correction

The extension does **not** enumerate tests through the pool. `workerNew.js`'s
`collectSpecifications` calls `vitest.experimental_parseSpecifications`, which
runs `astCollectTests` — a single-module Vite `transformRequest` plus
`createFileTask`. No pool, no runner. The three `_initBrowserProvider()` call
sites in the installed Vitest are the browser pool's `runTests`, `_standalone`,
and the interactive CLI keypress handler; **none is reachable from parsing.**

Measured, all four material-x projects, one long-lived instance:

| Phase                                | Self RSS            | cgroup Δ  | Chrome procs    |
| ------------------------------------ | ------------------- | --------- | --------------- |
| after `createVitest`                 | 454 MiB             | —         | 12 (background) |
| parse all 19 specs                   | 544 MiB             | **8 MiB** | 12              |
| three re-parses (a save re-collects) | 557 / 557 / 564 MiB | ~0        | 12              |

Discovery launches no browser and costs single-digit megabytes, and repeated
re-collection does not accumulate.

**The correction.** An earlier arm of this pass drove `vitest.collectTests()` —
which _does_ go through the pool — and recorded discovery OOM-killing the
container in 13 s at 15 962 MiB with 70 Chrome processes. **The extension never
calls that method**, so the figure describes a path the IDE does not take. It is
recorded here because a false alarm that shaped an intermediate design should be
visible, not because it bears on the design.

### A scoped run instantiates only its own project

`--project` is not merely a run filter: non-matching projects are rejected
during resolution (`VitestFilteredOutProjectError`) and never created. The
extension supplies that filter for any test-, file- or project-level action.

Measured against the **root** config with the filter the extension would pass,
three consecutive runs:

|       | Self RSS | cgroup peak                | Chrome procs |
| ----- | -------- | -------------------------- | ------------ |
| run 1 | 1810 MiB |                            |              |
| run 2 | 1812 MiB |                            |              |
| run 3 | 1812 MiB | **7622 MiB** (47 % of cap) | 30           |

Only `browser/material-x` was instantiated — 8 specs globbed, not 157. The
common editor actions are cheap and stable.

### Repeated and mixed runs plateau — the reason a long-lived process is safe

The realistic editor flow, one instance throughout: browser → spec → visual →
browser → spec.

| Step              | Self RSS | cgroup   |
| ----------------- | -------- | -------- |
| 1 `browser`       | 1871 MiB | 6890 MiB |
| 2 `spec`          | 1505 MiB | 7039 MiB |
| 3 `visual`        | 2162 MiB | 8259 MiB |
| 4 `browser` again | 2162 MiB | 8303 MiB |
| 5 `spec` again    | 2163 MiB | 8343 MiB |

Peak 8677 MiB, 52 Chrome processes. Memory rises as each _new_ browser project
is first touched and is flat on revisits — four repeats of one project moved
self RSS by 5 MiB (1719 → 1724).

**This refines TE-F4.** Revision 1 said a Vitest process never releases a
finished browser project. True — but the retained resource is _reused_ by the
next run of the same project. Retention is bounded by the number of distinct
browser projects touched, not by the number of runs. A long-lived editor process
therefore has a ceiling, and reaches it.

### "Run All Tests" is the one dangerous action (TE-F10)

For a folder item or "Run All Tests" the extension's project collector returns
`undefined` — **no filter** — so one process loads all 15 projects and every one
of the seven browser projects launches Chromium. This is the F-5 fan-out,
reached from a toolbar button.

Measured against the root config, watch mode, one long-lived process, two
consecutive whole-repo runs:

| Arrangement                                   | Result                  | Peak   | Run Δ  | Chrome  | Duration |
| --------------------------------------------- | ----------------------- | ------ | ------ | ------- | -------- |
| **today (unbounded)**                         | **OOM-killed, 4 kills** | 16 383 | 12 049 | **162** | 42 s     |
| worker cap 4 + `maxWorkers: 2`                | passed                  | 14 163 | 9 629  | 109     | 102 s    |
| worker cap 4 + `maxWorkers: 2` + `groupOrder` | passed                  | 13 994 | 9 501  | 104     | 144 s    |
| worker cap 4 + `maxWorkers: 1`                | passed                  | 12 843 | 8 832  | 89      | 144 s    |

Three readings:

- **The extension is unsafe today**, and a CLI-only bound would never have shown
  it. The owner's caution was right.
- **`sequence.groupOrder` buys nothing here** — 13 994 against 14 163 is inside
  the spread, for 40 % more wall clock. It stays rejected, now on IDE evidence
  as well as CLI evidence.
- **No page bound brings this inside TE-D1's budget.** At one page per project
  the floor is still 8832 MiB, ≈1.26 GiB per retained browser project. The
  binding term is the _number of browser projects_, and only the owner can
  decide to have fewer. §Owner choices states it.

### What I could not verify

Stated rather than assumed, as instructed.

- **I did not run VS Code.** I read the extension's resolution, spawn, discovery
  and run paths in its installed bundle, and then drove the same Vitest Node API
  calls it makes, with the same options it passes (`watch: true`, project
  filter, `report('onInit')`). That establishes the _Vitest-side_ cost of each
  action. It does not establish the extension's own process overhead, its
  WebSocket transport cost, or UI-thread behaviour.
- **Continuous run ("eye" icon) was not measured.** It is the one mode that
  deliberately keeps a process alive between runs; my long-lived instance is a
  fair model of it, but the extension's own teardown timer and its interaction
  with the file watcher were not exercised.
- **Debug and coverage runs were not measured.** Debug forces
  `fileParallelism: false`; coverage adds an instrumented run.
- **Whether editing `packages/*/vitest.config.ts` triggers a reload** is not
  determinable from the bundle — the reload test compares against each started
  project's `configFile`, and whether an inlined project reports the root path or
  `undefined` is not visible in minified source.
- **The extension's `Ignoring config …` log lines were not observed**, only
  derived from the resolution code. They are printed to the Vitest output
  channel and are the cheapest confirmation of TE-F9; implementation should read
  them.

## Reconciling the challenge

| Challenge item                                                       | Disposition                                                                                                                                               |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TE-D2 prefers a pool that breaks its own required property           | **Accepted in full.** The pool preference is deleted.                                                                                                     |
| TE-F7's diagnosis is not established by the quoted string            | **Accepted, and now settled** — the challenge was right that the string proves nothing, and the deciding evidence was in the log. It is a pixel mismatch. |
| TE-D4's A/B conflates L2 and L5                                      | **Accepted.** Ground restated as retention plus the sum-under-retention argument.                                                                         |
| TE-D5's `--parallel=1` is asserted, not derived                      | **Accepted.** The derivation is adopted.                                                                                                                  |
| TE-D3's ground is one package; its corrective clause has no referent | **Accepted on the referent; the conclusion is reversed** on new evidence.                                                                                 |
| TE-D2's necessity is narrower than "the single largest lever"        | **Accepted**, including the docs-CI path, which is the strongest argument and was missing.                                                                |
| TE-D5 both makes and defers an owner decision                        | **Accepted that it must not; resolved rather than split** — the root-config half is settled by TE-F9.                                                     |
| Registration does not follow the live rules                          | **Accepted.** Local-id route taken.                                                                                                                       |
| Allow-list is 20 names, not 21                                       | **Accepted**, verified by counting.                                                                                                                       |

### The refuted pool (TE-D2)

The challenge's isolate-reuse probe is accepted without re-running it, because
the mechanism is decidable by inspection and the inspection agrees.
`css-worker.ts` is `await import(id)` and nothing else. A reused isolate keeps a
module registry, so a second job importing an already-loaded transitive
dependency never re-triggers Node's `resolve` hook for it — which is exactly the
hook `deps-tracker.js` exists to observe. The dependency set for the second
module would be short by every edge the first module already pulled in, and
`addWatchFile` would never see them. A reused isolate also serves the module it
already evaluated, so an edited stylesheet returns its pre-edit content — the
live HMR path, which `just docs-dev` uses.

That is decisive on its own, and the cost argument seals it: at a fixed bound
the peak is set by how many isolates are alive, not by how often they are
created, so a pool cannot improve the figure TE-D2 exists to control. **The
mechanism is bounded concurrency with a fresh isolate per load** — the semaphore
that was actually measured.

### The visual failures are pixel mismatches (TE-F7)

Revision 1 read `Matcher did not succeed in time` as a stability timeout. The
challenge showed the string cannot carry that conclusion, since `expect.poll`
attaches it as the cause of _any_ escaping error. Both are settled by the run
logs revision 1 already had:

```
Screenshot does not match the stored reference.
29 pixels (ratio 0.01) differ.
Reference screenshot:  …/radio-states-chromium-linux.png
Actual screenshot:     …/radio-states-actual-chromium-linux.png
Diff image:            …/radio-states-diff-chromium-linux.png
```

The button failure is the same shape with `123 pixels (ratio 0.01) differ`.
Reference, actual and diff attachments are present in both — a stability failure
produces none. **These are pixel mismatches. The settle budget is not the
lever, and revision 1's diagnosis is withdrawn.**

The surviving diff images identify two _different_ sub-causes, so this is not
one defect:

- **`radio-states`** — the actual capture shows a grey circular **state layer**
  behind the first radio that the baseline does not have. An interaction state
  (hover or focus) is present at capture time, or its transition has not
  settled. That is a test-isolation defect.
- **`button-enabled-and-disabled`** — the diff is a thin arc along the **bottom
  edge** of the enabled button only, consistent with sub-pixel/anti-aliasing
  difference on the rounded border rather than a state or layout change.

Neither is resource-driven, and neither belongs to the execution model. They are
booked here because this pass surfaced them, and routed out: they need a
visual-contract diagnosis of their own, **not** a re-recorded baseline and
**not** a widened tolerance. The `browser.expect.toMatchScreenshot.timeout`
lever the challenge located (default 5000 ms, unset in the factory) is real but
is not the fix for either.

### `--parallel=1`, derived

The challenge's arithmetic is adopted. From the per-package figures: `drag2`
≈7116 MiB, `core` ≈6570 MiB, material-x post-fix Δ 5697 MiB.

| Nx `--parallel` | Heaviest concurrent set   | Run Δ     | + 4.2 GiB background | Verdict      |
| --------------- | ------------------------- | --------- | -------------------- | ------------ |
| 3 (today)       | drag2 + core + material-x | ≈19.4 GiB | —                    | over the cap |
| 2               | drag2 + core              | ≈13.7 GiB | ≈17.9 GiB            | over the cap |
| **1**           | drag2                     | ≈7.1 GiB  | ≈11.3 GiB            | inside TE-D1 |

It is an estimate from summed per-package peaks, not a measurement of a composed
run, and is labelled as one. Even `--parallel=2` exceeds the cap outright, so
the choice is not marginal.

Two adjacent facts the challenge supplied and this design adopts. The `build`
target also runs at Nx's default of 3 and nothing bounds it; what keeps it safe
is that `nx.json` gives `build` `dependsOn: ["^build"]` and material-x depends on
both `@ydinjs/core` and `@ydinjs/tproc`, so the heavy build cannot overlap the
other two. That reasoning is the only thing standing between the repository
build and the cap, and it is recorded rather than left to be rediscovered. And
there is **no `nx affected` anywhere in this repository** — the build paths are
`just build`, per-package `just build-lib`, and the docs build; the design models
no affected-graph path because none exists.

## The decisions

### Resource use is bounded by construction, and the budget is stated per operation (TE-D1)

No self-sizing default in the test toolchain is relied upon; TE-F2 is the
standing reason. The cap is 16 GiB and background may reach 6 GiB (measured
4.1–5.4), so a bounded operation must keep the total below **80 % of the cap,
≈13.1 GiB**.

Revision 1 stated that as one threshold for everything. It is now stated **per
supported operation**, because one operation provably cannot meet it:

| Operation                                  | Path        | Budget                                                 |
| ------------------------------------------ | ----------- | ------------------------------------------------------ |
| A package's tests                          | CLI and IDE | inside 80 %                                            |
| The repository's tests, package by package | CLI         | inside 80 %                                            |
| Discovery, and any scoped editor run       | IDE         | far inside 80 %                                        |
| **Whole-repo "Run All Tests"**             | IDE         | **outside** — floor ≈8.8 GiB run Δ, see §Owner choices |

Naming the exception is the point. A budget that silently excludes the heaviest
operation is not a budget.

### `constructCSSTokens` bounds its worker concurrency, with a fresh isolate per load (TE-D2)

The plugin's `load` handler spawns one `node:worker_threads` isolate per
`.css.ts` with no pool and no cap; material-x has 35, each importing its own copy
of the token DB. The correction belongs in the plugin.

**Required properties.** The number of `.css.ts` worker isolates alive at once
has a fixed upper bound that does not derive from host CPU count or memory; the
bound holds for any number of `.css.ts` modules; and behaviour is otherwise
unchanged — same `MessageChannel` dependency tracking, same `addWatchFile`
calls, same compiled output.

**The mechanism is bounded concurrency with a fresh isolate per load, at bound 4.** A pool is refused: it breaks the third property and cannot improve the peak.

Bound 4 holds the main process near 2 GiB against ≈6.3 GiB unbounded, at no
measurable duration cost; bound 1 costs 5–10 s to buy a further 1 GiB the budget
does not need.

**Three paths no runner configuration reaches**, which is what makes this
unarguable:

- the library build — `.scripts/tsdown-component.ts:15`, measured at 12 063 MiB
  `VmRSS` and 89 threads on a clean `build-lib`, driving the cgroup to the cap;
- **the docs build, which runs in CI on `main`** — `.storybook/main.ts` points
  the builder at `packages/material-x/vite.config.ts` and
  `.github/workflows/docs.yml` runs `npm run docs` on every push, on a 16 GB
  `ubuntu-latest` runner with no swap. 35 unbounded isolates at the measured
  ≈290 MiB is ≈10 GB. This is the repository's only CI job;
- the dev server, through the same plugin.

The plugin already sits in `createViteConfig`, the base config, so `core`,
`drag`, `drag2` and the root all carry it. The carrier is in place everywhere;
only the `.css.ts` files are missing.

### The shared factory sets an explicit `maxWorkers` on every browser project (TE-D3)

Revision 1 declined this, measuring that it "buys nothing"; that measurement was
material-x alone, whose main process dominated because TE-F3 was unfixed. On a
Chromium-dominated package it is wrong. Measured, `drag2`'s browser project:

| `maxWorkers` | Duration | cgroup Δ     | Chrome procs |
| ------------ | -------- | ------------ | ------------ |
| default (11) | 12 s     | 3314 MiB     | 47           |
| **4**        | **9 s**  | **1697 MiB** | 30           |
| 1            | 27 s     | 1010 MiB     | 23           |

An explicit 4 is **faster and lighter than the default** — the CPU-derived
default oversubscribes. This is not a trade.

**The value is 2, one number for every browser project, set at project level in
`.scripts/vitest-config.ts`.** Two is chosen over four because the IDE cannot
separate processes and the root config is what the editor loads: 2 is the
largest bound measured to keep whole-repo "Run All Tests" non-fatal (14 163 MiB,
no OOM), where 4 is untested there and strictly worse. One number, rather than a
tighter bound under `VITEST_VSCODE`, so that a result from one path reproduces
on the other; the per-package cost of 2 against 4 is small and is reported by
demonstration item 4.

Project level is also the **only** level that works: CLI `--maxWorkers`, a root
`maxWorkers`, and `vitest.cliArguments: "--maxWorkers=N"` in the editor all fail
to reach a browser project (TE-F1). The editor inherits that trap exactly.

### A package CLI run holds at most one browser project's footprint at a time (TE-D4)

A Vitest process reuses but never releases a browser project's resources
(TE-F4), so within one process the peak is the sum over the browser projects
touched, however they are scheduled. The bound is a process boundary.

**Scope: the CLI path.** The IDE cannot satisfy this — one process is the whole
point of TE-D6 — and is bounded by TE-D3 instead.

Today this binds `@ydinjs/material-x` alone, the only package with more than one
browser project; `core`, `box-quad`, `drag` and `drag2` already satisfy it.

**Ground, restated.** Revision 1 credited the 14 061 → 9908 MiB pair, which
differs in two things at once. The sound ground is TE-F4's own series — Chrome
process count stepping 12 → 26 → 39 → 52 and never falling, with Chromium
untouched by the CSS workers — plus the consequence that under retention
serialization cannot move the browser term at all. The existing arms bracket the
untested one: serialized-without-cap (Δ 10 193) is worse than
concurrent-with-cap (Δ 9606), putting the missing combination near Δ 8–9.5 GiB
against 5.6–5.7 for separate processes. It survives the cleanest container the
measurements describe: at 4.2 GiB background, one process lands at ≈14.0 GiB and
separate processes at ≈9.9 GiB.

The property needs no configuration split — invoking `vitest run --project browser`,
`--project spec`, `--project visual` in sequence against the existing package
config satisfies it, and an unselected browser project starts no Chromium.

### The repository CLI run is a sequence of package runs (TE-D5)

Nx runs the `test` target at `--parallel=1`, derived above. Cross-package browser
concurrency follows from it; within a package it follows from TE-D4. `npm test`
— today bare `vitest`, which resolves the 15-project configuration in watch mode
— resolves to that sequence instead.

### The root workspace configuration is retained (TE-D6)

**Revision 1's recommendation to remove it is withdrawn.** It is kept, for a
reason independent of the owner's preference: removing it replaces one Vitest
process with seven unsuppressed ones and no cross-config limiter (TE-F9).

Its danger — that the editor can run all seven browser projects at once — is
real and is addressed by TE-D2 and TE-D3, which take that operation from
OOM-killed to completing. It is not addressed by deleting the configuration,
which makes it worse.

Consequences revision 1 listed as costs of removal therefore do not arise:
`createWorkspaceTestConfig` and its cross-package command imports stay, and
`box-quad`'s two parallel definitions stay as they are.

### `.vscode/settings.json` names the root config explicitly (TE-D7)

`vitest.workspaceConfig` is removed: it is inert on Vitest ≥ 4 (TE-F8) and
misdescribes the arrangement to anyone reading the file.

It is replaced by `"vitest.rootConfig": "vitest.config.ts"`. With `rootConfig`
set the extension takes that file as the sole candidate and never runs the
nine-file glob, so the single-process outcome is **stated** rather than emergent
from a dedup whose ordering nothing pins. Behaviour is unchanged; what changes
is that it no longer depends on `packages/drag2/bench/profile/vite.config.ts`
and seven others losing a sort.

### A scheduling or runner-configuration change carries a measured peak (TE-I1)

Any change to `.scripts/vitest-config.ts`, a package test configuration, the Nx
`test` target, `constructCSSTokens`' worker bound, `.vscode/settings.json`'s
config wiring, or the container's resource declaration is accompanied by the
run's measured peak `memory.current` and the `oom_kill` delta across it, taken
in the devcontainer. `free`, `memory.peak` and the lifetime `oom_kill` total do
not satisfy this — the first reports the host, the other two are cumulative.

**Destination corrected.** Revision 1 would have minted this into
`packages/drag2/.plan/contract/05-lifecycle-invariants.md`, whose family is that
package's kernel and lifecycle contract. A repository verification rule does not
belong there. Its content is a **rule in force**, so by `documentation.md` §1 it
belongs in a current-state document — `.agents/docs/test-architecture.md`, which
already owns the execution model — with the history in this record. It is not
written there by this pass, because nothing here is in force until implementation
lands.

## Rejected alternatives

**Removing the root `vitest.config.ts`.** Revision 1's recommendation, rejected
above on TE-F9: seven unsuppressed processes with no cross-config limiter is
worse than one, and it would have broken the owner's workflow to buy a
regression.

**A worker pool in `constructCSSTokens`.** Rejected on correctness, not cost: a
reused isolate loses transitive dependency edges and serves pre-edit content on
the live HMR path.

**`sequence.groupOrder` serialization.** Rejected twice over. On the CLI it
bounds concurrency without bounding the peak, because retention makes the peak a
sum. In the editor it is measurably worthless — 13 994 against 14 163, inside
the spread, for 40 % more wall clock.

**`fileParallelism: false`.** Rejected: it addresses one level of six, is in the
CLI allow-list only by accident, and buys the least of the available bounds for
the most duration.

**A tighter bound under `VITEST_VSCODE`.** The extension does export that
variable and the config could branch on it, giving the editor a tighter page
bound than the CLI. Rejected for now: the editor's common actions are already
far inside budget at bound 2, the only operation that would benefit cannot be
brought inside budget by any bound, and a config that behaves differently
depending on who launched it makes a report from one path not reproduce on the
other. It is the right lever if whole-repo editor runs ever have to fit.

**Raising the container's memory.** Rejected as a first move; with the bounds in
place the heaviest CLI operation sits at ≈9.9 GiB. It remains the honest answer
only for whole-repo editor runs — see below.

**Pinning V8's heap.** Rejected on measurement, and TE-F3 explains why: the flag
bounds the main isolate, and the memory was in thirty-one others.

**Reducing coverage.** Not considered.

## How implementation demonstrates the required behaviour

Each item is a measurement taken in the devcontainer and reported with the
change (TE-I1). Items 1–5 discharge the brief; 6–9 are what stop a silent
regression.

1. **The worker bound holds.** Peak main-process `VmRSS` and peak concurrent
   `.css.ts` isolate count for material-x's `browser` project at the implemented
   bound — ≈2 GiB against the ≈6.3 GiB unbounded figure — plus a test that fails
   if the bound is removed, asserting the observed concurrent count rather than
   the presence of a constant.
2. **The build and the docs build are bounded.** Peak `VmRSS` of `tsdown` on a
   clean `build-lib` against today's 12 063 MiB, and a peak for `npm run docs`,
   which is what CI runs on `main`.
3. **Package-level, every package**, each with an `oom_kill` delta of zero and a
   peak below 13.1 GiB; and material-x specifically passing all 19 files / 263
   tests in one invocation of its `test` target.
4. **The chosen page bound is priced.** Duration and peak for the heaviest
   Chromium-dominated package at bound 2 and at bound 4, so TE-D3's choice of 2
   is readable rather than asserted.
5. **Repository-level**, `oom_kill` delta zero, peak below 13.1 GiB, duration
   stated.
6. **The IDE path, in VS Code rather than in simulation.** This pass drove the
   Vitest API the extension drives; implementation must confirm the extension
   itself. Three observations, from the Vitest output channel and the container:
   the `Ignoring config …` lines showing one process and eight suppressed
   candidates; discovery of the full tree launching no Chromium; and a
   scoped run from the gutter icon instantiating one project.
7. **The editor process plateaus.** Peak `memory.current` across a session that
   runs each material-x browser project once and then repeats two of them, showing
   the ceiling and that revisits are flat.
8. **"Run All Tests" completes**, with its peak reported against the 14 163 MiB
   measured here, and the residual named to the owner rather than buried.
9. **TE-F7 is routed, not absorbed.** The two visual failures are handed on as a
   visual-contract defect with the diff images attached. Closing this work does
   not require them fixed; it requires that no baseline was re-recorded and no
   tolerance widened to make them pass.

## Owner choices

**Whole-repo "Run All Tests" cannot be brought inside the stated budget.** This
is the one place the design cannot decide for the owner. The floor is ≈8.8 GiB
of run Δ at one page per project, because seven browser projects are retained at
≈1.26 GiB each; against a 6 GiB background allowance that exceeds 13.1 GiB
whatever the page bound. The measured options:

| Option                                  | Effect                                                                | Cost                                                      |
| --------------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------- |
| Accept it as an out-of-budget operation | Completes at ≈14.2 GiB on a container carrying ≈4.5 GiB of background | Fails on a dirtier container; no OOM observed at bound 2  |
| Reclaim background (see below)          | Every GiB recovered goes straight to this operation                   | Harness hygiene, not test configuration                   |
| Prefer scoped runs                      | Discovery and every scoped run sit at 47 % of cap or below            | A habit, not a mechanism; the button stays on the toolbar |
| Raise the container's memory            | The only option that makes it comfortable by construction             | Changes contributor hardware requirements                 |

The design's recommendation is the third plus the second: the extension already
makes scoped runs the default interaction, and the background is the cheapest
GiB available. **Note that `vitest.cliArguments: "--maxWorkers=1"` is not an
escape hatch** — it is inert for browser projects, exactly as TE-F1 describes.

**Contributor hardware: no change proposed for the CLI path**, where the
heaviest package sits at ≈9.9 GiB including background. The whole-repo editor
run is the only argument for more memory, and it is the owner's to weigh.

**Reclaiming background.** 4.1–5.4 GiB is resident before any test, including 26
`chrome-devtools` MCP server processes holding 1192 MiB in a container up for
2 d 16 h. Named, not decided — it is a harness-lifecycle question. But it is the
single cheapest lever on the one operation that does not fit.

**`.agents/docs/test-architecture.md` §CI policy describes a pull-request gate
that does not exist.** The only workflow is `docs.yml`, on push to `main`. It is
adjacent to this work and is where TE-I1's content is destined, so it will be
edited by the same implementation; whether to correct the CI-policy sentence in
that pass is the owner's call.

## Grounds a focused challenge should attack

Named so the next pass can go straight at the load-bearing parts.

- **The IDE evidence is simulation, not VS Code** (§What I could not verify). If
  the extension's own process behaves differently from the API calls it makes,
  TE-D6, TE-D7 and TE-F10 all move. This is the weakest link in the pass.
- **TE-D3's value of 2 is chosen against an untested alternative.** Bound 4 was
  never run against whole-repo "Run All Tests"; it is assumed worse than 2
  because it is a strictly larger page count. One 100 s run would settle it, and
  if 4 also completes, the per-package argument favours 4.
- **TE-D1's per-operation budget is a weakening.** Revision 1 had one threshold;
  this has four rows and an explicit exception. That is honest if the exception
  is genuinely unreachable by design and evasive if it is not.
- **TE-F9's dedup was read, not observed.** The `Ignoring config …` lines are
  the cheap confirmation and were not collected.
- **TE-F4's refinement rests on one flow.** Plateauing was measured over five
  runs across three projects and four repeats of one. A longer editor session,
  or continuous-run mode, was not exercised.
- **The `--parallel=1` table is arithmetic on summed per-package peaks**, not a
  measurement of a composed run, and the `build` target's safety rests on a
  dependency-graph argument that no test enforces.
- **TE-F7 is diagnosed as to class but not as to cause.** Two sub-causes are
  identified from diff images; neither root cause is established, and the claim
  that they are load-related is an observation about which arms failed, not a
  mechanism.
