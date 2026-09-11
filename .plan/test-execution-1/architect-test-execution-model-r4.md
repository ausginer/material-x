# Test execution model — revision 4, reconciled with the revision-3 challenge

**Architect pass, 2026-09-10, branch `drag2/fin-review` at `c4c76e638`.**
Reconciles [`architect-test-execution-model-r3.md`](architect-test-execution-model-r3.md)
with [`architect-challenge-test-execution-model-r3.md`](architect-challenge-test-execution-model-r3.md)
and with the owner's freshness boundary. It supersedes revision 3 where marked
and keeps its evidence where it stands.

**Nothing here claims an identifier.** No heading opens with one, at any depth.
The local `TE-` series continues under the sanctioned `consolidator.md` route;
the names also fall outside the local identifier grammar
(`[A-Za-z][A-Za-z0-9]*-\d+`, CONTRIBUTING §Reading one entry of a record), so
they could not claim a repository identifier even at `####`. No repository
register is opened and no repository rule is placed in `@ydinjs/drag2`'s
lifecycle family.

**Amended 2026-09-10 from settled owner direction**, against this document at
`a8cd06441`. The lifecycle question revision 4 left open is closed: browser
teardown is performed for editor runs as well, the repository's test execution
model is one-shot everywhere, and test watch and VS Code Continuous Run are
retired along with the machinery that exists only to serve them. The amendment
is carried by TE-D15 and TE-D16 and by the corrections marked against TE-D12
and TE-F21.

**Reconciled 2026-09-11 with the focused challenge of the amendment**
([`architect-challenge-test-execution-model-r4.md`](architect-challenge-test-execution-model-r4.md)
through `aeff2a679`), which found no contradictory evidence against any chosen
mechanism and required seven corrections. All seven are applied at the
statements that own them rather than collected into an errata section, and one
of them is applied against the challenge's own disposition on evidence the
challenge did not have. The design is implementation-ready; what remains is
listed under implementation verification obligations.

**Reconciled with the implementation, 2026-09-11**, against
[`implementer-test-execution-model.md`](implementer-test-execution-model.md) and
the shipped tree at `c1cab3031`. Executing the design produced evidence no
design pass had, and four statements are amended by it: the teardown primitive
is now named rather than left to the implementer (TE-F33); the non-browser
group's worker bound becomes a required property with a measured derivation
(TE-F34); the Δ 5554 MiB figure is reclassified as evidence rather than an
acceptance threshold (TE-F35); and TE-F27's reading of `FilesNotFoundError` is
corrected. **No chosen mechanism changed, and nothing the implementation did
violates a contract of this record**, so no remediation is routed. Every claim
this amendment rests on was verified here at source or on a fixture, not taken
on report.

**Reconciled with the review round, 2026-09-11**, against
[`test-execution-1-summary.md`](../reviews/test-execution-1/test-execution-1-summary.md)
and its four pass artefacts at `e618e5677`. The round's load-bearing verdict is
accepted: the shipped behaviour holds, and its teardown mutation probe makes
TE-F33 **stronger** than this record states. Five questions were routed here and
all five are settled below — the in-flight invalidation race (TE-D17, the
round's one tier A), the falsified explanations for the memory delta (TE-F37),
the browser page bound (TE-F39), the CI-policy statement (TE-F40, which carries
the one genuine owner choice this amendment does not close), and where
repository-level findings are registered (settled as `repo:RD-1` in the new
[repository register](../00-index.md)). **One consolidated finding is resolved
against the round's own reading**: F-440's headroom comparison is a category
error, and the record's claim it disputes is confirmed by the round's own
numbers. The straightforward B and C findings are left to implementation and are
not absorbed here.

**Instruction boundaries.** The pre-existing `node/tproc TokenPackageProcessor`
failure and F-412 stay outside this work. Nothing is implemented. Every probe
below is a scratchpad fixture or a reverted patch to an untracked build
artefact; the working tree was clean before this document and is clean after it.

## What changed, and why

The challenge was right on both mechanisms, and the owner's freshness boundary
settles the one question the challenge left as a fork. Revision 3's two central
mechanisms are replaced; its two other decisions survive with corrections.

| Ground                             | Revision 3                                      | Revision 4                                                                                        |
| ---------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Nx out of test orchestration       | Adopted, with a claimed loss of build ordering  | **Adopted; the claimed loss is deleted** — Nx never supplied it                                   |
| Browser serialization              | `sequence.groupOrder`, contiguous **from zero** | **Kept, assigned from 1** — zero is a sentinel that destroys the ordering it was meant to create  |
| Browser teardown trigger           | Last `onTestModuleEnd` of a project             | **Replaced by the group boundary** — the last-module trigger fails deterministically              |
| Teardown safety                    | Gated on `config.watch === false`               | **Marked project plus a pre-execution guard**, installed in every configuration by a plugin       |
| Where teardown applies             | CLI only; the editor was an open owner choice   | **Everywhere, the editor included** — the model is one-shot and the contract is enforced (TE-D15) |
| Test watch and Continuous Run      | Watch retained, teardown withheld from it       | **Retired**, together with the machinery that served only them (TE-D16)                           |
| CSS evaluation                     | Persistent Vite environment with invalidation   | **One fresh isolate per build generation**, discarded on any tracked change                       |
| Worker limit                       | `VITEST_MAX_WORKERS` > `parseArgs` > default    | **Kept, with three interactions the order did not account for**                                   |
| Whole-repository resource evidence | 10 384 MiB, semaphore standing in for CSS       | **Re-measured with the real mechanisms** — see below                                              |

**The headline: the whole repository runs in one Vitest process at 7570 MiB
peak over a 2015 MiB baseline — Δ 5554 MiB — in 63.6 s, with the real
per-generation CSS evaluator and real group-boundary teardown, 0 unhandled
errors, and all seven browser providers released.** Revision 3's best arm was
Δ 6181 MiB in 96 s, and it was measured on a mechanism this revision discards.
The shipped implementation reproduces every acceptance signal of that run and
not its delta — Δ 6723–8442 MiB across three runs on a loaded container. What
that figure is, and is not, is settled below.

## The whole-repository run, re-measured

One Vitest process, all 15 projects, `memory.max` 17 179 869 184 B (16 384 MiB),
`memory.current` sampled at 1 Hz. Baseline in this pass was **2015 MiB**, lower
than revision 3's 4.0–4.6 GiB, so the peaks are not directly comparable and the
run delta is the figure that transfers.

| Quantity                 | Value                                              |
| ------------------------ | -------------------------------------------------- |
| Peak `memory.current`    | **7570 MiB** (baseline 2015 MiB, **Δ 5554 MiB**)   |
| Working ceiling          | 13 107 MiB (80 % of the cap)                       |
| Chrome processes         | **32** peak, baseline 4                            |
| Duration                 | **63.56 s**                                        |
| Result                   | 157 files, 2467 passed, 60 skipped, **1 failed**   |
| The one failure          | pre-existing `node/tproc`, excluded by instruction |
| Unhandled errors         | **0**                                              |
| Providers released       | **7 of 7**, each at its group boundary             |
| `memory.events.oom_kill` | **0**                                              |

The teardown log from that run, verbatim:

```
runStart specs=157 groups=1,2,3,4,5,6,7,8
closed browser/material-x (chromium) (group 1) at boundary 1->2
closed spec/material-x (chromium) (group 2) at boundary 2->3
closed visual/material-x (chromium) (group 3) at boundary 3->4
closed browser/core (chromium) (group 4) at boundary 4->5
closed browser/box-quad (chromium) (group 5) at boundary 5->6
closed browser/drag (chromium) (group 6) at boundary 6->7
closed browser/drag2 (chromium) (group 7) at boundary 7->8
runEnd modules=157 errors=0
```

Two properties of that log matter beyond the total. Every browser project is
released, the last one included — because in **this** configuration the
non-browser projects occupy the highest group, so group 7's provider is closed
when group 8's first module starts. That is a property of the root
configuration, not of the mechanism: a project sitting in the final group is
never released by a boundary, because the boundary is another group starting
(TE-F29). And `errors=0` is now a meaningful acceptance signal, which it was not
in revision 3.

### What the delta is, and what the requirement is (TE-F35)

The shipped root run at `c1cab3031` measured Δ 6723–8442 MiB and 71–86 s across
three bounded runs, against Δ 5554 MiB and 63.6 s here. **The design's figure is
evidence, not a requirement, and demonstration 1 was wrong to state it as
one.** A single sample, taken at a 2015 MiB baseline this record already flags
as unusually low, cannot be a threshold that a later run must clear; promoting
it to one silently converts an observation into a budget nobody derived.

The requirement is the ceiling and the acceptance signals, and the
implementation meets all of them:

| Signal                           | Required                     | Shipped run                                        |
| -------------------------------- | ---------------------------- | -------------------------------------------------- |
| Peak `memory.current`            | ≤ 13 107 MiB (80 % of cap)   | **11 671 MiB**                                     |
| `memory.events.oom_kill`         | 0                            | **0**                                              |
| Unhandled errors                 | 0                            | **0**                                              |
| `Failed to run the test`         | 0                            | **0**                                              |
| `close timed out`                | 0                            | **0**                                              |
| Providers released at a boundary | every group with a successor | **7 of 7**                                         |
| Chrome at end                    | run baseline                 | **back to 13**                                     |
| Files / tests                    | unchanged                    | **157 / 2467, 60 skipped, 1 pre-existing failure** |

**The delta keeps a weaker status: an expectation.** A later run is compared
against it, and a divergence must be explained rather than absorbed. Two
explanations are on the table and neither is established. The shipped runs
carried a 3158–3538 MiB baseline against this pass's 2015 MiB, inside a cgroup
also holding an agent session and thirteen background Chrome processes — load
this pass did not carry. And `memory.current` counts reclaimable page cache,
which a run doing this much build and raster I/O grows; the implementation's
anonymous peak, which is what an OOM actually reads, is Δ 6685 MiB against a
`memory.current` delta of Δ 7412 MiB, so the page-cache component is real and
measurable.

**The remeasurement was taken, and it falsified both explanations.** The
paragraph this replaces offered container load and page cache as the two
candidates and scheduled the run; the review round ran it. Neither survives, the
delta is real and reproducible, and the correction is carried in full by TE-F37
below. What is retained from the reasoning here is only the axis argument, and
that one holds: anonymous memory is the figure to require, and it carries
substantially more headroom than `memory.current` in every run that measured
both.

**The comparison itself is weaker than it looks**, and the remeasurement should
fix that rather than repeat it. This pass measured only `memory.current`; the
implementation measured anonymous memory as well. Comparing two
`memory.current` deltas compares two unknown page-cache components. **Anonymous
peak against the working ceiling is the figure this record should have required
from the start**, with `memory.current` reported beside it; the remeasurement
reports both, and subsequent passes compare the anonymous number.

## The local register

Continuing the series. `TE-D1`…`TE-D11`, `TE-I1`, `TE-F1`…`TE-F15` are defined
in revisions 2 and 3.

| Local  | Canonical  | Subject                                                                                                   | Status                                            |
| ------ | ---------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| TE-D12 | unassigned | Browser projects serialized from group 1 and released at group boundaries                                 | New — supersedes TE-D9; primitive named by TE-F33 |
| TE-D13 | unassigned | CSS evaluated by one fresh isolate per build generation                                                   | New — supersedes TE-D10                           |
| TE-D14 | unassigned | The requested worker limit, and the three interactions that constrain it                                  | New — supersedes TE-D11; bound added by TE-F34    |
| TE-D15 | unassigned | Every Vitest process executes at most one test run, enforced from an unremovable carrier                  | New — closes revision 4's owner choice            |
| TE-D16 | unassigned | Test watch and Continuous Run are retired, with the machinery serving only them                           | New                                               |
| TE-F16 | unassigned | The last-module teardown trigger fails deterministically at the RPC boundary                              | New — refutes part of TE-D9                       |
| TE-F17 | unassigned | `sequence.groupOrder: 0` is a sentinel that demotes or interleaves the project                            | New                                               |
| TE-F18 | unassigned | Resolved-URL discovery sees the whole graph, `@ydinjs/tproc` and the token DB included                    | New — supersedes the tracker half of TE-D10       |
| TE-F19 | unassigned | Per-entry dependency attribution collapses inside a shared generation                                     | New                                               |
| TE-F20 | unassigned | Node caches an evaluation failure permanently in the isolate that produced it                             | New                                               |
| TE-F21 | unassigned | No in-process signal distinguishes an ordinary VS Code run from a continuous one                          | New — refines TE-F12                              |
| TE-F22 | unassigned | A retained generation worker prevents the Vitest process from closing cleanly                             | New                                               |
| TE-F23 | unassigned | The whole-repository run with both real mechanisms measures Δ 5554 MiB in 63.6 s                          | New — reclassified as evidence by TE-F35          |
| TE-F24 | unassigned | A plugin's `configureVitest` installs a reporter that no CLI flag can remove                              | New                                               |
| TE-F25 | unassigned | `Vitest.report` does not catch reporter errors, so `onTestRunStart` can abort a run                       | New                                               |
| TE-F26 | unassigned | The extension appends to configured reporters rather than replacing them                                  | New                                               |
| TE-F27 | unassigned | An empty specification list emits a run start without executing anything                                  | New — reading corrected at implementation         |
| TE-F28 | unassigned | `browser.api.allowExec` gates reruns, snapshot updates and the in-test `cdp()` API, and denial is silent  | New — scope corrected at reconciliation           |
| TE-F29 | unassigned | A boundary never releases the project in the final group; process close does                              | New — falsifies part of TE-D12                    |
| TE-F30 | unassigned | One consuming execution per extension-created process, by call-site enumeration                           | New — strengthens TE-F12                          |
| TE-F31 | unassigned | The extension's child has a noop watcher; continuous changes arrive over `onFilesChanged`                 | New — refines TE-F21                              |
| TE-F32 | unassigned | The retained handle is the parent-side `MessagePort` with a live listener                                 | New — identifies TE-F22's handle                  |
| TE-F33 | unassigned | The release primitive is `provider.close()` plus `$close()`; `ProjectBrowser.close()` releases no browser | New — names what TE-D12 left unnamed              |
| TE-F34 | unassigned | The shared non-browser group needs a bound below the CPU default, or it times out tests                   | New — constrains TE-D14                           |
| TE-F35 | unassigned | The Δ 5554 MiB whole-repository figure is evidence, not an acceptance threshold                           | New — reclassifies TE-F23                         |
| TE-D17 | unassigned | An invalidation arriving during evaluation supersedes the request rather than failing it                  | New — completes TE-D13                            |
| TE-F36 | unassigned | A discard landing inside an evaluation rejects that request with an error naming no file                  | New — the gap TE-D17 closes                       |
| TE-F37 | unassigned | Both explanations for the memory delta are falsified; the anonymous axis carries 2.3× the headroom        | New — corrects TE-F35                             |
| TE-F38 | unassigned | The torn-down marking cannot fire while TE-D15 holds                                                      | New — corrects TE-D12 and TE-D15                  |
| TE-F39 | unassigned | The browser page bound's stated ground was retired by this same design                                    | New — re-derives TE-D3's value                    |
| TE-F40 | unassigned | The repository documents a pull-request gate that does not exist                                          | New — carries an owner choice                     |

Superseded by this pass: **TE-D9**, **TE-D10**, **TE-D11**. **TE-D8** stands,
amended. **TE-D1**, **TE-D3**, **TE-D6**, **TE-D7**, **TE-I1** stand.
**TE-F11**, **TE-F13**, **TE-F14** are confirmed. **TE-F15**'s output claim
stands; its speed and applicability claims are withdrawn.

## Decisions

### Nx stays out of test orchestration, and nothing is lost with it (TE-D8)

The decision is unchanged: the root `Justfile`'s `test` recipe becomes a single
`vitest run` against the root configuration, per-package invocation stays
available unchanged, and `nx.json`'s `build`, `typecheck` and docs targets are
untouched.

**The claimed consequence is deleted.** Revision 3 recorded that removing Nx
loses `dependsOn: ["^build"]` ordering for tests. Verified here: `nx.json`'s
`targetDefaults` has keys for `build`, `typecheck`, `docs:build`, `docs:dev`,
`docs:api:build` and `docs:api:prepare` and **no `test` key**; every
`packages/*/project.json` carries only `$schema`, `name` and sometimes
`implicitDependencies`; every package's `test` recipe is a bare
`vitest run -c vitest.config.ts`. `nx run-many -t test` never built anything, so
there is nothing to become unenforced. The demonstration item that checked it is
dropped.

Two real consequences, unchanged from the challenge's reading: the root run
covers all 15 projects where `just test` names seven packages today — identical
coverage, since those seven configs contribute exactly those 15 projects — and
`nx affected -t test` becomes unavailable in principle, which costs nothing
because the repository uses `nx affected` nowhere and affected **builds** stay
on Nx.

### Browser projects are serialized from group 1 and released at group boundaries (TE-D12)

Each browser project gets its own `sequence.groupOrder`, **assigned from 1**;
the non-browser projects share the highest group. When the first test module of
a later group starts, every browser project in an earlier group has its provider
closed and its Chromium exits. **The closing call is
`project.browser.provider.close()` followed by `$close()` on that project's
orchestrators** — what the browser pool itself does when it releases the same
resources (`cli-api.BK8pd4xc.js:2488`, `:2493`). Revision 4 left the call
unnamed and the obvious reading of "the provider is closed" is the wrong one
(TE-F33), so it is named here rather than left to be rediscovered.

**Why the boundary and not the last module.** `groupSpecs` awaits
`Promise.allSettled(promises)` for a whole group before the next group begins
(`cli-api.BK8pd4xc.js:3712`), so the first module of group _n+1_ provably
follows the completion of group _n_ — every page, orchestrator RPC and pool
promise of that group has settled. The last-module trigger has no such
guarantee, and it does not merely risk a race: it fails every time (TE-F16).

**Why from 1.** `groupOrder: 0` is Vitest's default sentinel, and
`cli-api.BK8pd4xc.js:3816` diverts a project with `isolate === true`,
`order === 0` and `maxWorkers === 1` into a trailing catch-all group appended
after every other (TE-F17). Holes are irrelevant — `:3632` is
`if (!group) continue;` — so contiguity buys nothing and revision 3's
"contiguous from zero" was wrong in the half that mattered.

**Required properties.**

- **Teardown is triggered by an event that provably follows the completion of
  the group the project ran in.** Module counting cannot express that.
- **Teardown is installed by the shared factory into every configuration the
  repository ships**, root and per-package alike, through the carrier TE-D15
  specifies. Revision 4 originally required the opposite — that a one-shot entry
  point contribute it, and that the root configuration the extension loads not
  carry it — because the editor's lifecycle was an open question then. It is not
  open now: the model is one-shot everywhere, so the contract belongs where no
  consumer can fail to get it. `watch` is still not evidence of anything
  (TE-F21) and is still not used.
- **A run that would execute a specification belonging to a torn-down project
  fails loudly before executing anything.** This holds, and it is satisfied by
  **one** check rather than two: a project can only be torn down inside a
  process that has already consumed its execution, so TE-D15's counter always
  throws first and the marking's own check can never fire (TE-F38). Revision 4
  described the marking as independent defence in depth; that was never true of
  any implementation satisfying TE-D15, and the claim is withdrawn rather than
  the property. The loud failure the contract asks for is the one the counter
  produces, in place of the silent zero-module green run TE-F11 produces.
- **Identity comes from the runtime project object, never a configured-name
  string.** A project configured as `b1` is reported throughout as
  `b1 (chromium)`; one configured project expands to one runtime project per
  `browser.instances` entry. A mechanism keyed on configured names matches
  nothing, silently.
- **The serialization invariant is checked before any specification executes**:
  every browser project has a distinct, non-zero `groupOrder`. This is what
  makes the `--sequence.*` erasure in TE-D14 loud instead of a silent return to
  the fan-out that was fatal. The check reads
  `spec.project.config.sequence.groupOrder` and never the position of a
  specification in the list, because **the list is unsorted at that point** —
  `sequencer.sort` runs later, inside `executeTests`. Measured on the fixture,
  `onTestRunStart` received `n1[go=3] decl[go=4] b1[go=1] …`.
- **Teardown at a boundary releases every browser project except the one in the
  final group** (TE-F29). The final group's provider is released by process
  close, which is safe but is not this mechanism. The property to assert is
  therefore Chrome returning to baseline before the process exits — which
  holds in both cases — and boundary closures only where a later group exists.
  **A run that takes zero boundary closures therefore conforms**: a
  project-filtered IDE gesture instantiates one browser project, which sits in
  the final group and is released by `vitest.close()`. Reading that as a failure
  to release every provider mid-run inverts the property. What would be a
  failure is a boundary that exists and is not taken, or Chromium still running
  when the process exits.
- **The release primitive is the provider, never the browser project.**
  `ProjectBrowser.close()` is `await this.vite.close()` on the parent browser
  project's dev server (`@vitest/browser/dist/index.js:2543`, `:2597`); it
  touches no provider and releases no browser, so a mechanism built on it
  reports every boundary closure it was asked for while Chromium accumulates
  behind it (TE-F33) — the exact failure shape the acceptance property below
  exists to catch. Closing the provider and then the orchestrators leaves the
  project's Vite server open until process close, which is correct: the pool
  does the same, and nothing runs against that server again.
- **A teardown failure is distinguishable**, not merely present. The failure
  this mechanism produces when mistriggered is `Failed to run the test …`, which
  is indistinguishable from a genuine test failure; an acceptance check that
  greps for `provider was closed` reads clean while the mechanism is failing.
- **The generation worker and the browser providers are both released before
  the process closes** (TE-F22).

### Every Vitest process executes at most one test run (TE-D15)

The repository's test execution model is one-shot. A root CLI run, a per-package
CLI run and an ordinary run started from the VS Code Vitest UI each start a
Vitest process, execute one test run, release the browser providers at the group
boundaries TE-D12 establishes, and end. **Browser teardown applies to editor
runs as well** — the owner choice revision 4 recorded is closed in favour of
always tearing down.

Watch and Continuous Run rerun inside a process that has already torn down its
browsers, so they are not supported. TE-D16 retires them.

**The invariant, stated so it can be observed:** at most one _consuming_
execution per Vitest process. A run whose specification list is non-empty
consumes the process's single execution. A run with an empty list does not,
because Vitest emits a run start for it and executes nothing
(`cli-api.BK8pd4xc.js:13463`); a filter that matches no files must not spend the
lifecycle (TE-F27).

**The carrier — a plugin, not a configured reporter.** The mechanism is a
reporter, because teardown needs `onTestModuleStart` and the runtime project
object. But `test.reporters` is removable: when `--reporter` is present on the
command line, Vitest **replaces** the resolved reporter list wholesale
(`coverage.DM_a_rWm.js:437–452`), so a configured reporter is one flag away from
silently vanishing along with the contract it enforces. The reporter is
therefore installed by a **plugin** carried in the shared factory, from the
`configureVitest` hook, which runs at `cli-api.BK8pd4xc.js:13152` — after CLI
reporter replacement and before `createReporters` reads `resolved.reporters` at
`:13177`. Measured: with `--reporter=dot` on the command line, the plugin's push
survives and the reporter is constructed and driven (TE-F24).

Required properties of the carrier:

- **It is installed by the shared factory into every configuration**, so root
  and per-package runs and the editor all get it without an entry point opting
  in.
- **Installation is idempotent.** `configureVitest` is invoked once per project
  (`projects.flatMap`), so an unguarded push installs one reporter per project —
  fifteen in a root run.
- **It survives the editor.** The extension's own plugin appends its reporter to
  the configured list rather than replacing it, and passes `reporter: void 0`,
  so the CLI replacement branch is not taken (TE-F26).
- **What is pushed is a reporter instance, never a name.** `createReporters`
  normalizes only array entries and returns anything else unchanged
  (`cli-api.BK8pd4xc.js:11367–11382`, `return referenceOrInstance`); string
  normalization happens earlier, in `resolveConfig`, which has already run. A
  string pushed from `configureVitest` is therefore handed to `Vitest.report`
  as a string, `r[name]?.(…)` is `undefined`, and **the contract silently does
  nothing** — the one outcome it may not have. An instance, or a resolvable
  `[name, options]` tuple, is required.
- **The plugin reaches the projects that have no plugins today.**
  `configureVitest` hooks are gathered per project
  (`projects.flatMap(project => project.vite.config.getSortedPluginHooks(…))`),
  and the factory declares no `plugins` anywhere: `createNodeTestProject` and
  `createDeclarationTestProject` (`.scripts/vitest-config.ts:163, 173`) build
  from `createTestBaseConfig` alone, and the browser projects receive plugins
  only through the Vite config they merge in. A run filtered to
  `--project=node/tproc` would otherwise carry no carrier at all. This is why
  "into every configuration" is load-bearing rather than tidy.
- **The scope of "no flag can remove it" is the `test` command.** `:13177`
  branches on `resolved.mode === "benchmark"` to `createBenchmarkReporters`,
  which never reads `resolved.reporters`, so `vitest bench` drops the carrier.
  The repository runs no benchmarks, so this costs nothing today; the claim is
  narrowed rather than defended.

**The enforcement point — `onTestRunStart`.** It is the earliest per-run hook:
`Vitest.runFiles` awaits `this._testRun.start(specs)` before it creates the
pool, before `initializeGlobalSetup` and before `pool.runTests`. `Vitest.report`
is `await Promise.all(this.reporters.map(...))` with no `try`/`catch`
(`:13983`), so a throw there rejects the run before any module executes
(TE-F25). Verified end to end on an instance created with `watch: true` — the
extension's own configuration: run 1 executed 8 modules and released both
providers; run 2 threw
`this Vitest process has already executed a test run` and executed nothing.

Three checks live at that point, and all three fail loudly:

- a **second consuming execution**, which names the contract and says that watch
  and continuous reruns are retired. This is what "never silently succeeds with
  zero modules" covers: **reuse**. The neighbouring case is not ours to claim —
  a run whose filter matches nothing reports a successful run of nothing when
  `changed` or `related` is set, and raises `FilesNotFoundError` when neither is
  — `watch: true` alone does not suppress the throw, and revision 4's
  parenthetical saying it did is withdrawn (TE-F27). Either way the empty run
  start reaches the carrier first, which is all the exemption depends on. That
  route predates every revision and survives. The carrier does see `specs.length === 0` at the one hook that runs
  for such a run and could refuse a filtered empty execution; that is recorded
  as an available strengthening rather than a requirement, because its blast
  radius on legitimate editor gestures cannot be measured without an editor;
- a specification belonging to a **torn-down project** — TE-D12's marking. It
  is subsumed: a torn-down project implies a consumed process, so the check
  above always throws first and this one is unreachable (TE-F38). It is kept in
  the record as the property it guarantees and **not** as a second enforcement
  point; the unreachable branch and the set feeding it are dead machinery, and
  their removal is routed to implementation;
- the **serialization invariant**, every browser project carrying a distinct
  non-zero `groupOrder`, which is what makes TE-D14's `--sequence.*` erasure
  loud.

**The guard's scope is every path that emits a run start**, which is
`Vitest.runFiles` and therefore all four public run entry points and the two
RPC methods that reach them. It is **not** every path that executes
specifications: `Vitest.collectTests` (`:13692`) goes straight to `createPool`,
`initializeGlobalSetup` and `pool.collectTests` without calling
`_testRun.start`, and the browser pool's collect path launches Chromium. The
guard cannot see it. The exception is unreachable here — the extension collects
through `experimental_parseSpecifications` (verified), and no CLI entry point
collects after running in one process — but the scope is stated as what it is
rather than claimed wider.

**The boundary of "before test reporting", stated honestly.** `Promise.all`
invokes every reporter's `onTestRunStart`, so on a rejected second attempt the
other reporters do see a run start. No test executes and no test result is
reported. That is the strongest position available from a public hook. One
consequence follows and the implementation must not paper over it: the throw
happens before `runningPromise` is assigned, so the `finally` that calls
`_testRun.end` never runs and **no `onTestRunEnd` is emitted for the refused
execution**. A consumer pairing start with end sees an unbalanced start; the
extension recovers, because `executeRun`'s `finally` disposes and ends the run.
The refusal must propagate to the caller and must never be absorbed into a
"completed" run.

**Why not prevent it at entry.** `Vitest.runFiles` is the single funnel — four
public entry points (`runTestSpecifications`, `rerunTestSpecifications`,
`rerunFiles`, `rerunTask`) and two of those also exposed over the API server —
so wrapping it would refuse the second execution before anything at all was
reported. It is rejected: `runFiles` is internal and unmarked, and a monkey
patch over it disappears without a word when the name changes in a Vitest
upgrade. A contract whose whole purpose is to make a silent failure loud must
not be enforced by a mechanism that can go silent. The reporter hook is public
API, and if it were ever removed the run would fail rather than proceed
unguarded.

**Discovery is unaffected.** The extension collects tests through
`experimental_parseSpecifications` — AST-based, never reaching `runFiles` — so
listing tests neither consumes the lifecycle nor trips the guard, and root-config
discovery is preserved exactly as revision 2 established it.

### Test watch and Continuous Run are retired, with the machinery that served them (TE-D16)

TE-D15 makes a second execution in one process a loud failure. The modes that
depend on one are therefore withdrawn, and the machinery whose only
responsibility was supporting them is removed rather than left to fail.

**Retired.** `vitest --watch` in any form for tests; VS Code Continuous Run —
both the "eye" gesture and `vitest.watchOnStartup`, the setting that turns it on
for every config at activation without a gesture; and any rerun issued into a
process that has already run. Continuous Run cannot be disabled as a gesture, so
it is retired by documentation plus the loud failure; the setting can be, and
is.

**The inventory, and what happens to each.**

| Item                                                               | Responsibility                                                                                                                               | Disposition                                                                             |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| root `package.json` `"test": "vitest"`                             | bare `vitest` is watch mode — the only watch entry point in the repository                                                                   | becomes the one-shot root run TE-D8 already requires                                    |
| `.scripts/zed-test.sh`, `run-vitest-debug`                         | the only `--watch` in the tree                                                                                                               | becomes **`vitest run`** — deleting the flag is not enough (below)                      |
| `.scripts/zed-test.sh`, `pkill -f 'vitest.*browser'`               | kills a surviving watch runner so it cannot respawn Chrome — its comment says so                                                             | **removed**; the sibling `pkill` on the CDP port keeps its own justification            |
| `.vscode/settings.json`, `vitest.watchOnStartup`                   | the extension's continuous-run switch: _"Watch every test file after the extension is loaded. This is the same as enabling continuous run."_ | set explicitly **`false`**, beside TE-D7's other change to that file                    |
| `.agents/docs/test-architecture.md` and the `test-component` skill | say nothing about run lifecycle today                                                                                                        | **gain** the one-shot statement, the retirement, and what a second execution looks like |

Two of those need their reasoning on the record.

**The debug recipe must become `vitest run`, not lose a flag.**
`.zed/tasks.json`'s `vitest:debug` invokes `.scripts/zed-test.sh … debug`, whose
`run-vitest-debug` calls the binary directly:
`DEBUG=1 vitest -c vitest.config.ts --no-file-parallelism --test-timeout=0 --watch <file>`.
Deleting `--watch` leaves `vitest -c … <file>`, and the default is
`watch: !isCI && process.stdin.isTTY && !isAgent`
(`vitest/dist/chunks/defaults.9aQKnqFk.js:48`) — while the task sets
`use_new_terminal: true`, so stdin **is** a TTY and the session stays in watch
mode. That is worse than a no-op: unlike the extension's child, this process has
a real Vite watcher and no `onFilterWatchedSpecification` filter, so a save
during a paused debug session would reach `scheduleRerun` with a non-empty list
and hit the one-shot guard, converting today's working "save to re-run" into a
loud failure instead of into nothing. The disposition is `vitest run`, which is
also what TE-D8 already specifies for the root `"test"` script.

What is lost is re-running on save, which is what has been retired. The session
itself is unaffected: `--watch` is not what holds it open — `--test-timeout=0`
and a test paused on a breakpoint are — and the task, its terminal and the CDP
port survive unchanged.

**`browser.api.allowExec` leaves this inventory, and the reasoning is worth
keeping.** Revision 4 put it here on the ground that it gates the API server's
`rerun`, `rerunTask` and `updateSnapshot` — the browser UI's re-run buttons —
and nothing else. The challenge corrected the scope: it **also** gates the
in-test `cdp()` API, through `isCdpAllowed` / `assertCdpAllowed`
(`@vitest/browser/dist/index.js:3071–3077`, guarding `:3300` and `:3305`). It
then concluded that the capability is unused and the change harmless. It is not
unused: `packages/drag2/tests/sortable/input-policy.browser.test.ts` imports
`cdp` from `vitest/browser` at `:49` and calls it twice, at `:148` and `:1332`.
Setting `allowExec: false` would break that suite.

Two reasons settle it against the change, and the second is the stronger:

- the capability is in use, and retiring reruns is no reason to remove an
  unrelated one;
- denial is a **silent `return`** at each gate, whereas TE-D15's guard already
  makes a rerun into a consumed process a loud failure. Setting the flag false
  would replace a loud failure with a silent no-op for exactly those RPCs. The
  guard is the better instrument, and the gate would work against it.

The flag stays explicitly `true`, which also keeps Vitest's "API server is
exposed to network" warning quiet — the condition is
`api.allowWrite == null && api.allowExec == null`, so an explicit value of
either polarity silences it. `allowWrite` is untouched and already resolves to
`false` under the exposed-host branch. Debugging never depended on the gate in
any case: the Zed flow drives raw Chrome through `--remote-debugging-port=9222`
from the factory's launch args, and Vitest's own breakpoint support calls
`provider.getCDPSession` directly (`cli-api.BK8pd4xc.js:2652`), past it.

**The boundary, precisely.** Only _test_ watch is retired. Build and development
watch are untouched and remain valid: `just docs-dev`, Vite's and tsdown's own
watchers, the CSS plugin's `handleHotUpdate` and `addWatchFile`, and every
consequence of TE-D13 — repeated CSS generation still happens on every rebuild
and still requires a fresh disposable isolate per generation. Nothing in this
decision touches them.

### CSS is evaluated by one fresh isolate per build generation (TE-D13)

The workers buy exactly one thing: a cold ESM registry, so a `.css.ts` graph is
evaluated against current file contents. Revision 3 concluded that a persistent
Vite environment provides that guarantee and a stronger one. It does not, at the
boundary the owner has now stated.

**The owner's boundary decides the fork the challenge identified.** Freshness
covers every input affecting generated CSS, including a rebuilt
`@ydinjs/tproc`. An in-process evaluator cannot hold it: an externalized
dependency is loaded by Node's own process-scoped registry and is permanently
stale, and inlining `@ydinjs/tproc` costs 3 946 MiB retained on the challenge's
measurement. Measured here by an independent route — a bare specifier resolved
through a `node_modules` symlink, exactly `@ydinjs/tproc`'s shape:

| Step                            | Fresh worker per generation | The host process's own `import()` |
| ------------------------------- | --------------------------- | --------------------------------- |
| cold                            | `GEN-1`                     | —                                 |
| repeat, no change               | `GEN-1`                     | —                                 |
| after the dependency is rebuilt | **`GEN-2`**                 | `GEN-2`                           |
| after it is rebuilt again       | **`GEN-3`**                 | **`GEN-2`** — permanently stale   |

**The mechanism costs less than what it replaces, on every axis.** All 35
`.css.ts` entries in `packages/material-x`, with the plugin's own two
`registerHooks` preloads:

| Arrangement                                  | Total         | First entry | RSS           | Output              |
| -------------------------------------------- | ------------- | ----------- | ------------- | ------------------- |
| today — one fresh isolate per entry          | 15 312.1 ms   | 511.7 ms    | —             | reference           |
| **one fresh isolate per generation**         | **1186.7 ms** | 480.7 ms    | **412.9 MiB** | **35/35 identical** |
| the same, entries evaluated in reverse order | 1270.5 ms     | —           | 374.1 MiB     | **35/35 identical** |

**Generation ownership.** One generation per Node process, acquired by each
plugin instance that needs it and released when the last one is done; the
generation terminates when its reference count reaches zero. Three plugin
instances participate in a root run — material-x's `browser`, `spec` and
`visual` projects each embed `createMaterialXViteConfig`, which carries
`constructCSSTokens` — and process-wide sharing is sound because evaluation
depends only on file contents, never on the consumer's options: `isProd` reaches
`compileCSS`, which is downstream. The measured whole-repository figure is for a
process-wide generation.

**Dependency discovery.** The resolve hook reports **the URL `nextResolve`
returns**, filtered to `file:`, and filters on nothing else. The current
tracker's two rules — only specifiers beginning with `.`, and nothing resolving
under `node_modules` — are both removed. Measured over the 35 entries: the
current rules report **66** paths, resolved-URL discovery reports **123**,
including **29 under `packages/tproc`** — its built artefacts, `default-theme.json`
and the 14 token-database JSON files, which are reached by
`import(…, { with: { type: 'json' } })` and are therefore module-graph inputs
like any other (TE-F18). Node's ESM resolution follows the workspace symlink, so
`@ydinjs/tproc` resolves to `packages/tproc/…` and not to a `node_modules` path.

**Invalidation.** Generation-scoped, never entry-scoped. A change to any file in
the generation's dependency set, or to any `.css.ts`, discards the generation;
the next request creates a new one, which evaluates the complete graph against
current files. This is the owner's contract exactly — shared within a
generation, complete across generations — and it is also forced by TE-F19: in a
shared generation, per-entry attribution collapses to 119 recorded edges against
583 in the per-entry arm, with a median of 3 per entry and **one entry
attributing none at all**. Per-entry `addWatchFile` would therefore leave 34 of
35 entries unwatched against a shared token file. Every entry registers the
generation's whole set.

**Concurrent requests.** Requests are multiplexed onto the generation over one
port with request identifiers; concurrent `load` calls are served by one
isolate. Verified against the real plugin, converted: six concurrent `load`
calls returned correct output in 582.9 ms and registered 31 watch files. A
request arriving while a generation is being discarded is served by the next
generation, never by the dying one. What happens to a request **already in
flight** when the discard lands is a separate question this paragraph does not
answer, and TE-D17 answers it.

**Failure cleanup.** A worker `error` or non-zero `exit` drops the generation
and rejects every pending request with the underlying error; the next request
starts a new generation. **This is the failure path and nothing else reaches
it** — an ordinary watch invalidation is not a failure and must not reject a
pending request (TE-D17). **An evaluation failure also discards the generation**,
because Node caches a module's evaluation failure permanently: measured, a
module that throws keeps throwing the original error in the same isolate after
the file is corrected, and a fresh isolate returns the corrected value (TE-F20).
Without this rule, fixing a broken `.css.ts` in watch mode would appear not to
work until the dev server restarted.

**Shared-state protection.** The required property is that output must not
depend on evaluation order, nor on which entries share a generation. Held today
and measured in both directions: shared generation against one fresh isolate per
entry, 35 of 35 byte-identical; forward order against reverse order, 35 of 35
byte-identical. This is a property of the current tree, so it belongs in the
demonstration list rather than in an assumption.

**The `.styles.css` id still needs a non-`.css` suffix** (TE-F13) only if a Vite
module graph is involved. It is not, under this mechanism: the styles file is
loaded by the `registerHooks` `load` preload inside the isolate, and never
becomes a Vite module. The virtual-id problem revision 3 hit, and the reverse
mapping the challenge showed it had only half-solved, both disappear with the
mechanism that created them.

**Both consumer classes are covered without a Vite dev server.** The isolate is
a plain `node:worker_threads` worker with two `--import` preloads, so the tsdown
build path needs nothing new.

### An invalidation arriving during evaluation supersedes the request (TE-D17)

TE-D13 covers a request that **arrives** during a discard and a request pending
when the worker **fails**. It does not cover the request already in flight when
an ordinary save lands, and the shipped code reaches that case through the
failure path: `watchChange` calls `discardGeneration()`, which calls `fail()`,
which rejects every pending request with `CSS evaluation generation was
discarded` (TE-F36). A developer saving a token file while a `.css.ts` graph is
being evaluated gets a transform error naming a file they did not touch.

**The decision: supersede, never fail.** The owner's standing requirement has
two halves, and both are decided by it — a changed input must eventually produce
fresh CSS without restarting the dev server, and a stale or failed generation
must never publish output.

**Why not the obvious alternative.** Letting an in-flight request settle against
the generation it started in looks safer and is not. The change landed
mid-evaluation, so modules already loaded hold pre-change content and modules
not yet loaded hold post-change content: the result is not merely stale, it is
**torn**, and no consumer can tell. In the dev-server path `handleHotUpdate`
would re-request the entry moments later and paper over it; in the build path
there is no re-request at all, and a Rolldown rebuild would bake a torn
stylesheet into the artefact. "Never publish output from a superseded
generation" is what rules this out, and it rules it out in the path where the
consequence is permanent.

**Required properties.**

- **A discard is not a failure.** It rejects no pending request. Rejection stays
  reserved for what TE-D13 names: a worker `error`, a non-zero `exit`, and the
  entry's own evaluation throw — which rejects only the request that threw, with
  that entry's own error and stack.
- **Every request in flight when its generation is discarded is re-issued
  against the generation that succeeds the discard**, and resolves with the code
  **and the dependency set of the generation that actually produced it**. The
  caller sees one promise that settles once, against one generation's view of
  the files.
- **No response from a discarded generation is published.** The dying worker may
  still answer a request that has been re-issued; that answer is dropped, not
  resolved. Without this the supersession leaks exactly the torn output it
  exists to prevent.
- **Re-issue is bounded, and exhausting the bound is loud.** Writes can arrive
  faster than a generation completes — a `@ydinjs/tproc` rebuild writes 29
  tracked artefacts, and a full 35-entry generation measures 1.2–2.7 s — so an
  unbounded retry is a livelock. The bound is at least 2, so that a single
  supersession is always survivable, and exhausting it rejects with an error
  naming **concurrent invalidation** as the cause: not a file, and not a stack
  pointing into a `.css.ts` the developer did not edit.
- **The dying generation is disposed once its last pending request has been
  re-issued or settled.** This is the existing drain rule in `settle()`,
  unchanged; the review's `cleanup` pass established that branch is reachable,
  and supersession gives it a second way to be reached.

**Ownership: the generation module, not the caller and not Vite.** Three
reasons, and the third is the one that decides it.

1. The module is the only place that knows a discard landed while a request was
   in flight. A caller sees a rejection and cannot distinguish a discard from a
   genuine failure without a sentinel error it must agree to recognize.
2. Three plugin instances share one generation in a root run. Caller-side retry
   is three implementations of one rule.
3. **This record has rejected caller-dependent correctness every time it has
   met it** — the reporter that must be an instance rather than a name, the
   carrier that must be in every configuration rather than opted into. An
   invariant enforced by the least careful consumer is not enforced. The same
   reasoning applies here and reaches the same answer.

**What the caller observes, stated so it can be tested.** `evaluate(path)`
resolves with CSS evaluated wholly against one generation's files, or rejects
with the entry's own error, a worker crash, or the bounded-supersession error.
**It never rejects because of an ordinary save.** Latency under invalidation is
the duration of the generation that finally completed, not of the first one
started.

**One interaction to carry into implementation.** `evaluate` currently closes
over the generation it started in and returns `new Set(generation.deps)` from
it. Under supersession that lexical capture is the **wrong** generation, and the
returned set must come from the one that produced the code. The review's
`cleanup` pass separately found the copy itself unjustified; both are true, and
fixing the copy without fixing the source would silently register the wrong
watch set.

### The requested worker limit, and what constrains it (TE-D14)

The precedence order stands; three interactions the order did not account for
are added, and the CLI route is narrowed to a contract that can be stated
exactly.

Precedence, highest first:

1. **`VITEST_MAX_WORKERS`** — applied inside the per-project `resolveConfig`
   (`coverage.DM_a_rWm.js:380`), after every other resolution including the
   `fileParallelism: false` clamp, so it wins unconditionally and needs no code
   from us. It is the only route that reaches the VS Code extension, through
   `vitest.nodeEnv`; the keys the extension fixes for itself are
   `VITEST_VSCODE_LOG`, `VITEST_VSCODE`, `TEST`, `VITEST_WS_ADDRESS`, `VITEST`,
   `NODE_ENV` and `FORCE_COLOR`, and this is not among them.
2. **`parseArgs(process.argv)`** in the shared factory, applied as each project's
   `maxWorkers`, so that `vitest run --maxWorkers=N` behaves as its own
   documentation says despite TE-F1.
3. **The factory default**, TE-D3's explicit value — two pages per browser
   project. This, not the flag, is what bounds the editor, and the ground it is
   carried on has been re-derived: see below.

**The browser page bound stays at two, on a ground this design can still
state.** The comment the factory carries is revision 2's — "the editor cannot
separate processes and the root configuration is what it loads" — and half of it
expired inside this same design. That half was about **retention**: revision 2
chose two because TE-F4 held seven browser projects at ≈1.26 GiB each
simultaneously, making four "strictly worse" against an ≈8.8 GiB floor. TE-D12
and TE-F33 release each provider at its group boundary, so seven are never held
at once and that comparison has lost its subject (TE-F39). The surviving half is
still true and still load-bearing: the root configuration is what the editor
loads, so the factory default is what bounds an editor run, and no flag reaches
it.

**The ground that justifies two at head is headroom, measured.** Groups are
serialized, so within the browser phase concurrent Chromium pages are exactly
this bound; it is the most direct multiplier of that phase's memory. The shipped
root run clears the 13 107 MiB ceiling by **951 MiB on `memory.current` and
2712 MiB on anonymous memory** (TE-F37). A change that multiplies the browser
phase's page count against a margin that size is not free, and no arm has
measured it.

**Two is kept, not preserved.** The duration evidence for four is real —
`browser/drag2` at 12.3 s and 11.9 s against 15.3 s and 17.0 s, identical
results in all four arms — and it is an argument to take the measurement, not an
argument to make the change without it. **The demonstration that settles it** is
one whole-repository run at bound 4, on a container at a baseline comparable to
this record's, reporting anonymous peak and `memory.current` peak against
13 107 MiB together with the run duration. Four wins if it clears the ceiling on
**both** axes with no less margin than two shows today and the whole-run
duration improves; two stands otherwise. The value may not move on per-project
timings alone: the browser groups are serialized, so a per-project gain is not a
root-run gain until a root run says so.

**The environment variable does not accept the percentage form.** It is a bare
`Number.parseInt`, and `resolveInlineWorkerOption` — which does understand `N%`
— runs earlier in the same function (`:222` against `:380`), so the value is
never re-resolved. `VITEST_MAX_WORKERS=50%` yields **50 workers**. This footgun
sits on the route recommended for the extension and belongs beside the route.

**`--sequence.*` erases every project's `groupOrder`.** `sequence` is one of the
20 names in the CLI override allow-list, and the merge is
`test: { ...options.test, ...cliOverrides }` (`:11129`), which replaces the
object wholesale. A stray `vitest run --sequence.shuffle` therefore collapses
every project to `groupOrder: 0` — which, by TE-F17, both destroys the
serialization and arms the sentinel. TE-D12's pre-execution invariant check is
the answer; the two decisions must be read together.

**Projects sharing a group must have equal resolved `maxWorkers`**, or
`groupSpecs` throws before executing anything (`:3826`). TE-D12 puts every
non-browser project in one group, so the factory must derive their `maxWorkers`
from a single resolved value. It does, under all three precedence routes: the
environment variable applies the same number to every project, and so do the
flag and the default. The constraint is loud rather than silent, but neither
revision 3 nor its predecessors recorded that the two decisions are jointly
constrained.

**That single value must be set by the factory, and it must be below Vitest's
CPU default.** This record required equality across the group and said nothing
about magnitude, and equality alone is satisfied by leaving every non-browser
project at Vitest's own `cores - 1`. Executing it showed that is the wrong
value: several files in that group spawn a build of their own — tsdown,
Rolldown, Brotli — so a worker counted as one core demands several, and at
`cores - 1` the group oversubscribes badly enough to time out three tests that
do no more than read what they just built (TE-F34). A root run that fails three
tests is a failed root run, so this is a correctness property and not a
performance preference.

Stated as the contract:

- **The factory sets the non-browser group's `maxWorkers` explicitly.** Falling
  through to Vitest's default is a defect, not a default.
- **The value is one number shared by every project in the group**, which is
  what `groupSpecs` already requires (`:3826`).
- **It is below `cores - 1`**, and the justification is intra-worker
  parallelism: the group's unit of work is not a single-core test file.
- **The root run is green at the chosen value.** That is the acceptance test for
  any future change to it.

**The derivation is implementation tuning inside that contract, and it is
recorded here so the two do not disagree silently.** The shipped value is
`Math.max(Math.floor(availableParallelism() / 2), 1)` — six on this twelve-core
container. It is not an invented constant: it is character-for-character
Vitest's own bound for a run that expects other work on the machine
(`resolveMaxWorkers`, `cli-api.BK8pd4xc.js:3768–3770`, which returns
`Math.max(Math.floor(numCpus / 2), 1)` under `watch` and `Math.max(numCpus - 1, 1)`
otherwise). The repository adopts the watch-mode bound for a non-watch run for a
different reason than Vitest's — competing builds inside the run rather than an
editor outside it — and arrives at the same number. A future pass may change the
derivation without amending this decision, provided the four properties above
still hold and the root run is re-measured; it may not return the group to the
default.

**The CLI contract, stated exactly.** `parseArgs` runs with `strict: false`,
because Vitest passes many flags it does not declare. The accepted forms are a
positive integer and `N%`, matching Vitest's own inline semantics; anything else
fails the configuration load with a diagnostic rather than being silently
coerced. Under the extension the route is inert by construction — `cliArguments`
are turned into an options object by `parseCLI` and never become `process.argv`
(TE-F14), and `parseCLI` runs with `allowUnknownOptions: false`, so a malformed
extension setting fails the run rather than being ignored. That inertness is
acceptable only because the factory default bounds the editor.

## Findings

### The last-module teardown trigger fails deterministically (TE-F16)

`onTestModuleEnd` is emitted from `TestRun.updated`
(`cli-api.BK8pd4xc.js:12661`), reached from the `onTaskUpdate` RPC method at
`:2734`, and `Vitest.report` at `:13983` awaits every reporter. The browser page
is awaiting the reply to its own RPC while the hook runs, so closing the
provider there destroys the page that is waiting.

Measured on a two-browser-project fixture, three and four modules,
`maxWorkers: 1`:

| Trigger                        | Modules | Tests | Unhandled errors | Exit  | Chrome at end |
| ------------------------------ | ------- | ----- | ---------------- | ----- | ------------- |
| none (control)                 | 8       | 11    | 0                | 0     | 11            |
| last `onTestModuleEnd`         | 8       | 11    | **2**            | **1** | 6             |
| **first module of next group** | 8       | 11    | **0**            | 0     | **3**         |

Both errors in the middle arm are
`Failed to run the test <last module of the project>`. In that arm one provider
also never reported closing at all — the close promise did not settle before the
run ended.

This disqualifies revision 3's acceptance check, which recorded that "the string
`provider was closed` appears in no log". That string is not what this failure
emits, so revision 3's whole-repository arms could each have carried one
`Failed to run the test …` per browser project and been read as the excluded
`tproc` failure. **Their pass status cannot be certified**, which is one reason
this pass re-measured rather than inheriting.

### Group order zero is a sentinel, not a number (TE-F17)

Measured on the same fixture, two browser projects at `maxWorkers: 1` and one
node project:

| Assignment           | Observed order                                                         |
| -------------------- | ---------------------------------------------------------------------- |
| b1=0, b2=1, n1=2     | b2 → n1 → **b1 last** — b1 demoted to the trailing catch-all group     |
| b1=0, b2=0, n1=1     | n1 first, then **b1 and b2 interleaved** — serialization gone entirely |
| **b1=1, b2=2, n1=3** | b1 → b2 → n1                                                           |

The trap fires exactly in the regime this design moves toward, and
`VITEST_MAX_WORKERS=1` reaches the same field and arms it the same way.

### Resolved-URL discovery sees the whole graph (TE-F18)

Over the 35 entries, with both rules of the current tracker evaluated alongside
the resolved URL from `nextResolve`:

| Discovery rule                                      | Distinct paths                                                      |
| --------------------------------------------------- | ------------------------------------------------------------------- |
| current — relative specifiers, minus `node_modules` | 66                                                                  |
| resolved `file:` URLs                               | **123**                                                             |
| of which `packages/material-x`                      | 88                                                                  |
| of which **`packages/tproc`**                       | **29** — built artefacts, `default-theme.json`, 14 token JSON files |
| of which under a real `node_modules` path           | 3                                                                   |
| non-`file:` (`node:` builtins)                      | 6                                                                   |

The freshness boundary this establishes is precise: **every input reached
through the module graph is discoverable**, and inputs read through `fs` rather
than imported are not. There are none today — the token database is reached by
`import(…, { with: { type: 'json' } })` in `packages/tproc/src/DB/DB.ts`. One
boundary remains and should be written down rather than discovered: a dependency
consumed from a real `node_modules` directory rather than through a workspace
symlink falls under Vite's default watcher ignore, so its rebuild would not
trigger invalidation. `@ydinjs/tproc` is not such a dependency.

### Per-entry attribution collapses inside a shared generation (TE-F19)

Segmenting the resolve trace by the entry being evaluated, in one shared
isolate: **119** attributed edges in total against **583** in the per-entry
worker arm, a median of **3** per entry, the first entry absorbing 17 and **one
entry attributing none at all**. The union across the generation is complete;
the per-entry split is not, because a module already loaded for an earlier entry
resolves none of its own imports again.

### Node caches an evaluation failure permanently (TE-F20)

| Step                                        | Result     |
| ------------------------------------------- | ---------- |
| import a module that throws                 | `BOOM`     |
| correct the file, re-import in same isolate | **`BOOM`** |
| correct the file, import in a fresh isolate | `FIXED`    |

### No in-process signal separates an ordinary editor run from a continuous one (TE-F21)

`vitest.explorer@1.50.8`, `dist/workerNew.js`, builds the `createVitest`
options with **`watch:!0` unconditionally** — a bare literal, no ternary, no
guard — for every run the extension makes. Ordinary and continuous runs reach
the child through the same spawn with the same argv and the same environment
keys; nothing named `continuous`, `once` or a mode flag exists anywhere in the
init payload or is forwarded into `createVitest`. The reuse guard confirms
revision 3's TE-F12 — `spawnForRun`'s reuse branch is gated on `currentMeta`, an
instance field of an object `executeRun` creates fresh, so an ordinary run
always spawns and is disposed in `finally`, while continuous reuses the
long-lived instance.

The nearest thing to a continuous-only marker is the `watchTests` RPC, called
only from `syncWatcher` on the continuous runner subclass. It is **not** the
only RPC the extension sends its worker — `runTests`, `updateSnapshots`,
`onFilesChanged`, `onFilesCreated`, `unwatchTests`, `getFiles`, `collectTests`,
`cancelRun` and others share that channel — and no claim that it is may enter
this design. What is specific to it is its effect: it is the call that enables
the worker's watch tracking. Either way it travels between the extension and its
own worker and is invisible to a Vitest reporter or plugin, so it cannot gate
anything here.

**Where a continuous rerun actually comes from**, which matters because it is
not the child's own watcher. The extension creates Vitest with
`server: { middlewareMode: true, watch: null }`, and Vite installs a **noop**
watcher in exactly that case (`vite/dist/node/chunks/node.js:25752–25757`). File
changes reach the child by being **forwarded**: the extension's own file-system
watcher calls `bt.onFileChanged`, which — only when that object's `currentMeta`
is set, i.e. on the long-lived continuous or debug process — sends the
`onFilesChanged` RPC, whose worker handler is
`onFilesChanged(e){ e.forEach(f => this.vitest.watcher.onFileChange(f)) }`. That
reaches `VitestWatcher`, `onWatcherRerun` and `Vitest.scheduleRerun`, which has
no `config.watch` guard of its own. Changes arriving while a persistent process
is still spawning are buffered in `_pendingFileChanges` and flushed on spawn.

Three independent mechanisms therefore keep an **ordinary** editor run from
producing a second consuming execution, and none of them is `watch`: the child's
watcher is a noop; `executeRun` builds a fresh API object that is never
registered with the extension's watcher, so nothing is forwarded to it; and even
a delivered change would be filtered out by the worker's
`onFilterWatchedSpecification`, whose `shouldRunSpecification` returns `false`
until `watchTests` enables tracking — leaving an empty, non-consuming execution.
Continuous Run is the only path that produces a non-empty rerun, which is
exactly the path TE-D16 retires.

**Consequence.** `watch === false` is not merely a weak proxy — it is the wrong
question, because the one editor path whose lifecycle is provably one-shot is
marked `watch: true`. A one-shot lifecycle cannot be _detected_; it can only be
**declared**. Revision 4 read that as "declared by the entry point"; the owner
has since declared it for the repository, so TE-D15 states it as a property of
every Vitest process this repository starts, and TE-D16 retires the modes that
would contradict it.

### A retained generation worker prevents a clean process close (TE-F22)

The same single-project command, with and without the converted plugin:

| Plugin                                | Outcome                                                      |
| ------------------------------------- | ------------------------------------------------------------ |
| pristine                              | exits cleanly                                                |
| converted, generation worker retained | `close timed out after 10000ms`, then Vitest forces the exit |

`worker.unref()` is not sufficient; the parent's `MessagePort` keeps the loop
alive. The whole-repository run completed and reported correctly and then paid
the 10 s close timeout. Teardown is not the cause — with the pristine plugin the
fixture's `vitest.close()` took 339 ms without teardown and **4 ms with it**.

**The handle is now identified rather than inferred**, which settles one of
revision 4's own challenge grounds. Measured on a host/worker fixture holding a
parent-side `port.on('message')` listener — the shape a multiplexed request port
must have:

| Disposition                       | Result                     |
| --------------------------------- | -------------------------- |
| nothing                           | still alive at 1552 ms     |
| `worker.unref()` only             | **still alive at 1550 ms** |
| `worker.unref()` + `port.unref()` | exits in 50 ms             |
| `worker.unref()` + `port.close()` | exits in 51 ms             |
| `worker.terminate()`              | exits in 52 ms             |

**The parent-side `MessagePort` with a live `message` listener is the retained
handle**, and `terminate()` is sufficient because it detaches the port.
Unref-ing the worker without touching the port is the one disposition that looks
correct and is not. The challenge reports the same rule from a fixture in which
`worker.unref()` alone sufficed when the worker used a one-shot listener; here
the parent held a persistent listener in both arms and it did not, which is the
sharper statement of the same fact — the parent side is what holds the loop.

**`closeBundle` is the right backstop** behind reference-counted release. Vite's
plugin container close calls `hookParallel("closeBundle", …)` unconditionally
(`vite/dist/node/chunks/node.js:30185`), while `buildEnd` at `:30184` is gated on
environment and server options; `closeBundle` therefore fires for a dev-server
close and for a rolldown build alike.

### A plugin can install a reporter that no flag can remove (TE-F24)

`configureVitest` is a plugin hook invoked at `cli-api.BK8pd4xc.js:13152` with
`{ project, vitest, injectTestProjects, … }`, awaited in `Promise.all`, and
`vitest.config` there is the same object `createReporters(resolved.reporters, …)`
reads at `:13177`. Measured with `--reporter=dot` on the command line, which had
already replaced the configured reporters:

```
[oneshot] configureVitest: same object as resolved? true  reporters before: [["dot",{}]]
[oneshot] reporters after: 2
[oneshot] reporter constructed and initialised
[oneshot] onTestRunStart #1 specs=1
```

### Reporter errors are not caught, so a reporter can abort a run (TE-F25)

`Vitest.report` is `await Promise.all(this.reporters.map((r) => r[name]?.(…)))`
with no `try`/`catch` (`:13983`), and `runFiles` awaits `_testRun.start(specs)`
before `createPool`, before `initializeGlobalSetup` and before `pool.runTests`.
Measured on an instance created with `watch: true`:

| Run | Modules executed | Outcome                                                            |
| --- | ---------------- | ------------------------------------------------------------------ |
| 1   | 8                | passed, 0 errors, both providers released, Chrome back to baseline |
| 2   | **0**            | **threw** `this Vitest process has already executed a test run`    |

### The extension appends to configured reporters (TE-F26)

`workerNew.js`'s own plugin: `let t = o(e.test.reporters); t.length ||
t.push(['default', {isTTY:!1}]); t.push(s); e.test.reporters = t`. It passes
`reporter: void 0` into `createVitest`, so Vitest's CLI-replacement branch —
guarded by `if (cliReporters.length)` — is not taken. A reporter declared or
installed by the repository's configuration therefore runs inside the
extension's child process.

### An empty specification list emits a run start without executing (TE-F27)

`cli-api.BK8pd4xc.js:13463` calls `_testRun.start([])` and `_testRun.end([], [])`
when no specification matched, and only then evaluates
`if (!this.config.watch || !(this.config.changed || this.config.related?.length)) throw new FilesNotFoundError(this.mode);`
at `:13470`. **The run start precedes the throw**, which is the whole of what
TE-D15 needs: the carrier's `onTestRunStart` sees an empty list and declines to
spend the lifecycle before any of this is decided. This is why TE-D15 counts
only non-empty executions, and it holds whichever way the condition goes.

**Revision 4's second sentence was wrong and is withdrawn.** `watch: true` alone
does not suppress `FilesNotFoundError` — the condition needs `changed` or
`related` as well. Measured here on a `createVitest` instance with an
impossible filter:

| Arms                             | Reporter saw | Outcome                          |
| -------------------------------- | ------------ | -------------------------------- |
| `watch: true`                    | `specs=0`    | **throws `No test files found`** |
| `watch: true` + `related: [...]` | `specs=0`    | returns without throwing         |

The extension reaches both arms. `spawnForRun` passes
`related: 'related' in e ? e.related : void 0`, set only by the "run related
tests" gesture on a source file — the one that warns "Pick a source file to run
related tests" when given a test file. Every ordinary gesture leaves `related`
undefined, so an editor filter that matches nothing raises rather than reporting
a silent success. That is **louder** than revision 4 claimed, not quieter, and
it is Vitest's own behaviour either way: this design neither creates it nor
claims it.

### `allowExec` gates reruns and snapshot updates, and denial is silent (TE-F28)

`cli-api.BK8pd4xc.js:8982`, `:8987` and `:9036` gate `rerun`, `rerunTask` and
`updateSnapshot` on `config.api.allowExec`, each with the comment "silently
ignore exec attempts if not allowed" and a bare `return`. It does **not** gate
`browser.commands`, which the factory also configures — but it does gate one
more thing revision 4 missed: the in-test `cdp()` API, through `isCdpAllowed` /
`assertCdpAllowed` (`@vitest/browser/dist/index.js:3071–3077`, guarding `:3300`
and `:3305`). That capability is in use —
`packages/drag2/tests/sortable/input-policy.browser.test.ts` imports `cdp` from
`vitest/browser` at `:49` and calls it at `:148` and `:1332` — which is why
TE-D16 leaves the flag alone. Vitest's own breakpoint support does not pass the
gate: it calls `provider.getCDPSession` directly
(`cli-api.BK8pd4xc.js:2652`).

### The final group is released by process close, not by a boundary (TE-F29)

The boundary mechanism releases a project when a **later** group's first module
starts, so a project occupying the final group is never released by it.
Revision 4 read its own root-run log as evidence that "every browser project is
released, including the last"; that holds because the root configuration's
non-browser projects sit in the highest group, and it is a property of that
configuration rather than of the mechanism.

Measured on a fixture filtered to one browser project — which is what a
project-filtered run instantiates, because `--project` rejects non-matching
projects during resolution:

| Quantity                      | Value                |
| ----------------------------- | -------------------- |
| projects resolved             | `b1 (chromium)` only |
| boundary closures             | **0**                |
| Chrome baseline               | 6                    |
| Chrome during run             | 10                   |
| Chrome after `vitest.close()` | **6**                |

The provider is released by `Vitest.close()` → `pool.close()` →
`browserPool.close()`. Safe, but not the mechanism the design credits.

The configurations whose final group is a browser group are ordinary ones:
`packages/box-quad`'s entire per-package configuration declares exactly one
project, `browser` (`.scripts/vitest-config.ts:293`); material-x's
`test-behavior`, `test-spec` and `test-visual` recipes and box-quad's
`test-behavior` all pass `--project`; and so does every project-filtered editor
gesture. This bounds TE-D12's benefit honestly: in the editor it does work for
"Run All Tests" and nothing for the single-project gestures.

Configurations that end in a node or declaration project do release their last
browser project, and the declaration case had to be checked rather than assumed:
**typecheck projects do emit `onTestModuleStart`**. Measured on the same
fixture, `moduleStart decl[go=4]` fires after both browser groups, in its own
appended group, and closes group 2's provider on the way.

### One consuming execution per extension-created process, by enumeration (TE-F30)

Revision 4 left this as a per-gesture question for the demonstration list. It is
answerable from the bundle, and the answer is exhaustive rather than sampled.

`dist/extension.js` contains exactly **one** `rpc.runTests(` site and exactly
**one** `rpc.updateSnapshots(` site, and they are the two arms of a single
ternary called once — mutually exclusive, no loop. Three run profiles exist in
total (`Run`, `Debug`, `Coverage`), created together; there is no fourth. A
gesture queued behind another stores a thunk that calls `executeRun` again,
which builds a new API object and spawns again. So no gesture can issue two runs
against one process.

`vitest.updateSnapshot` deserved its own trace and closes favourably. It is a
**command, not a profile**, and its manifest exposes it only on
`testing/item/context` and `testing/item/gutter` with `commandPalette` gated
`when: "false"` — so it is reachable only against a **single test item**. It
takes the same `:run` profile as an ordinary run, builds a request with
`continuous` false, and reaches `executeRun` and therefore a fresh process; the
worker's `updateSnapshots` enables snapshot update and calls `runTests` once.

| Gesture                                | Path                                                      | Consuming executions |
| -------------------------------------- | --------------------------------------------------------- | -------------------- |
| single test / file / project / Run All | `:run` profile → `enqueue` → `executeRun` → fresh process | 1                    |
| update snapshots                       | command → the same `:run` profile → the same path         | 1                    |
| coverage                               | `:coverage` profile, its own queue → `executeRun`         | 1                    |
| debug                                  | `bt.forDebug`, `currentMeta` preset                       | 1                    |
| a gesture queued behind another        | `pendingQueue` → `executeRun` again → a new process       | 1 each               |
| Continuous Run                         | `spawnForContinuesRun` → reuse of the long-lived process  | the 2nd fails loudly |

This is source-derived. No editor gesture has been exercised in any pass, so the
demonstration that remains is a confirmation in a real editor, not an open
question about the code.

### Closing the browser project releases no browser (TE-F33)

`ProjectBrowser.close()` is one line — `await this.vite.close()` — and
`this.vite` is assigned in the constructor as `parent.vite`, the **parent
browser project's dev server** (`@vitest/browser/dist/index.js:2543`, `:2597`).
Chromium is not owned there. It is owned by the provider, which each
`ProjectBrowser` creates for itself in `initBrowserProvider` (`:2575–2579`) and
which the pool releases with `provider.close()` at `cli-api.BK8pd4xc.js:2488`,
followed by `orchestrator.$close()` for every project's orchestrators at
`:2493`. Those two calls, scoped to one project, are the boundary primitive.

Measured here on a three-browser-project fixture — one instance each, trivial
modules, the same boundary reporter driving both arms and differing only in the
call it makes — with Chromium process counts sampled at 4 Hz:

| Primitive                       | Chrome across the run               | Peak   | At exit |
| ------------------------------- | ----------------------------------- | ------ | ------- |
| `browser.close()`               | 17 → 28 → 39 → **50**               | **50** | 27      |
| `provider.close()` + `$close()` | 17 → 28 → 39 → **28** → 39 → **28** | **39** | 26      |

Both arms pass 17 tests and both log three boundary closures. **The log is
identical and the behaviour is not.** The first arm accumulates one browser per
group and releases nothing until the process ends; the second gives a browser
back at each boundary, which is why it oscillates instead of climbing and why
its peak is one browser lower. This is precisely the failure mode TE-D12's
distinguishability property anticipated: a teardown that reports success while
doing nothing.

**The hang the implementation reports is not reproduced here, and does not need
to be.** On the real tree, `ProjectBrowser.close()` wedged the run after the
second close on two different three-project arms; on this fixture the same call
completes and the run passes. Trivial modules with one worker apparently do not
hold whatever the real suites hold against a closed dev server. The falsification
that carries into the contract is the one measured above and readable in the
source — the call releases no browser — and it is sufficient on its own. The
hang is recorded as the implementation's observation, not as a property
established here.

**The provider tolerates the second close it will receive.** A boundary release
does not remove the provider from the pool's `providers` set, so
`Vitest.close()` closes it again. That is a no-op: `close()` nulls
`browserPromise` and `browser` before awaiting, clears `pages` and `contexts`,
and ends at `await browser?.close()` on a null
(`@vitest/browser-playwright/dist/index.js:1187–1206`). Both fixture arms closed
cleanly with no `close timed out`.

**`$close()` is symmetry with the pool rather than a separately isolated
necessity.** This pass's own whole-repository probe called `provider.close()`
alone and completed all 15 projects with `errors=0`. Doing both is still the
right contract — the pool does both, and the orchestrator holds a live RPC
channel that TE-F22 gives independent reason to release — but no arm has
isolated a failure that `$close()` alone prevents, and this record does not
claim one.

### The shared non-browser group needs a bound below the CPU default (TE-F34)

Measured by the implementation on all five node projects together, twelve cores,
one group:

| Group bound      | Duration | Failures                                    |
| ---------------- | -------- | ------------------------------------------- |
| `cores - 1` (11) | 40 s     | **4** — three timeouts plus the `tproc` one |
| 6                | 45 s     | 1 — the pre-existing `tproc` failure        |
| 4                | 45 s     | 1 — the same                                |

The three extra failures are `drag2`'s `size.node.test.ts` and
`consumer.node.test.ts` at 5003–5008 ms against the 5 s default, doing no more
than reading output they had just built, and they pass when `node/drag2` runs
alone from the same root configuration. The cause is contention, not the
migration.

Verified here at source: `resolveMaxWorkers` (`cli-api.BK8pd4xc.js:3768`)
returns `Math.max(Math.floor(numCpus / 2), 1)` when `config.watch` is set and
`Math.max(numCpus - 1, 1)` otherwise, so a one-shot run takes `cores - 1` unless
a project sets its own value, and the shipped value is the other branch of that
same expression. `availableParallelism()` is 12 on this container and the
resolved group bound is 6, matching the implementation's reported assignment.

**Five seconds bought three failures back.** The 40 s arm is faster and wrong;
duration is not the quantity under optimization here.

### A discard landing inside an evaluation rejects that request (TE-F36)

`watchChange` (`src/index.ts`) calls `discardGeneration()` for any tracked file
or any `.css.ts`; `discardGeneration()` calls `fail()`, which rejects every
pending request with `CSS evaluation generation was discarded` before disposing
(`src/css/generation.ts`). `load` awaits `evaluate()`, so the rejection surfaces
as that module's transform failure.

Reproduced here against the shipped built artefact, on one real entry:

| Arms                               | Outcome                                   |
| ---------------------------------- | ----------------------------------------- |
| baseline                           | ok, 14 744 bytes, 40 deps                 |
| a discard 5 ms into the evaluation | **rejected — `generation was discarded`** |
| the next request afterwards        | ok, 14 744 bytes — byte-identical         |

**Eventual freshness already holds; the in-flight request is the whole of the
defect.** The third arm is what the owner's requirement asks for and it works.
The round additionally reproduced the second arm end to end through a real Vite
dev server, where it appears as a load failure for a module the developer did
not touch. TE-D17 decides what replaces it.

### Both explanations for the memory delta are falsified (TE-F37)

The remeasurement TE-F35 scheduled was taken by the review round on a container
at a **4800 MiB** baseline:

| Quantity              | Design (this record) | Implementation | Remeasurement |
| --------------------- | -------------------- | -------------- | ------------- |
| Duration              | 63.56 s              | 71 s (71–86)   | **66.20 s**   |
| Δ `memory.current`    | 5554                 | 7412           | **7356**      |
| Δ anonymous           | not measured         | 6685           | **6618**      |
| Peak `memory.current` | 7570                 | 11 671         | **12 156**    |
| Peak anonymous        | not measured         | 9843           | **10 395**    |
| `oom_kill`            | 0                    | 0              | **0**         |

- **Container load is ruled out by duration.** The remeasurement ran at +4 %
  against this record's 63.56 s, where the implementation ran at +12–35 %, and
  its delta still landed within 0.8 % of the implementation's.
- **Page cache cannot account for it either.** Page cache is counted in
  `memory.current` and not in `anon`. The remeasured **anonymous** delta, 6618
  MiB, already exceeds this record's **total** `memory.current` delta of 5554
  MiB by over 1000 MiB. Whatever the extra is, it is anonymous memory.

**Both explanations are withdrawn, and none replaces them.** The most
parsimonious remaining reading is that this record's single sample — taken on a
probe configuration wrapping the real root config, with the evaluator applied as
a reverted patch to an untracked artefact, as its own Evidence limits state — is
not representative of the shipped mechanism. **That is not established and is
not promoted here.** It is recorded as the open reading and nothing rests on it.

**What changes: Δ 5554 MiB is withdrawn as the expectation.** Two independent
runs of the shipped tree agree within 0.8 % on `memory.current` and 1 % on
anonymous memory. The transferable quantity is the reproduced pair — **Δ anon
6618–6685 MiB, Δ `memory.current` 7356–7412 MiB** — and a future run is compared
against those. The design figure keeps standing only as evidence about the pass
that produced it.

**What does not change: the 13 107 MiB ceiling.** It is unchanged, it is met,
and the acceptance signals are unchanged.

**The round's headroom comparison is a category error, and the claim it disputes
is confirmed by its own numbers.** The consolidated finding reads the
remeasurement's 7.3 % `memory.current` headroom against the implementation's
~11 % `memory.current` headroom and concludes this record's "far more headroom
on anonymous" is false. Those are two runs on one axis; the record's claim is
two axes in one run. Computed from the round's own figures against 13 107 MiB:

| Run            | `memory.current` headroom | Anonymous headroom | Ratio     |
| -------------- | ------------------------- | ------------------ | --------- |
| implementation | 1436 MiB (11.0 %)         | 3264 MiB (24.9 %)  | **2.27×** |
| remeasurement  | 951 MiB (7.3 %)           | 2712 MiB (20.7 %)  | **2.85×** |

Anonymous headroom is 2.3–2.9× the `memory.current` headroom in both runs. **The
claim stands**, and the axis argument behind it stands with it: the kernel
reclaims page cache under pressure and OOM-kills on what it cannot reclaim, so
`memory.current` at 12 156 MiB with `oom_kill` at 0 is the expected reading and
not a near miss. The tightening the finding correctly identifies is real and
belongs on the other axis — 951 MiB of `memory.current` margin means a
concurrent second workload of any size in the same cgroup will not fit, which is
a statement about scheduling runs, not about the run.

**No further measurement blocks closure.** The requirement is met on both axes
by two independent runs, and the one remaining arm — bound 4, TE-D14 — is the
precondition for changing a value, not for closing this design.

### The torn-down marking cannot fire while the one-shot counter holds (TE-F38)

`#released` is written only inside `#release`, which is called only from
`onTestModuleStart`; a module start implies the run passed `onTestRunStart` and
set `#consumed`. The `#consumed` throw precedes the `#released` check in the
same hook. Verified here against the shipped file by enumerating the writers:
`#consumed` set after the invariant checks, `#released` added inside `#release`,
`#release` called from `onTestModuleStart` alone. **`#released` non-empty implies
`#consumed`, so the second check is unreachable** — and the round drove the
reporter through a second run and observed the one-shot message, never the
torn-down one.

The consequence is for this record, not the tree: revision 4 credited two
independent defences where one is reachable, and no implementation satisfying
TE-D15 could have provided two. **The contract statement is the origin of the
defect and the code faithfully implements it**, which is why the correction runs
to TE-D12 and TE-D15 and the dead branch's removal is a consequence rather than
the finding.

### The browser page bound's stated ground was retired by this design (TE-F39)

The shipped comment gives one reason for two rather than four, and it is
revision 2's, resting on TE-F4 retention — seven browser projects held at
≈1.26 GiB each. TE-D12 and TE-F33, inside this same range, release each provider
at its group boundary, so the premise does not obtain at head. Revision 4 carried
the value forward without re-deriving it, and revision 2 had already named the
choice as its own weakest point with the test that would settle it never run.

Measured by the round on `browser/drag2` — 39 files, 861 passed, 60 skipped,
identical in all four arms — through the factory's own CLI route:

| Bound       | Run 1   | Run 2   |
| ----------- | ------- | ------- |
| 2 (shipped) | 15.26 s | 17.01 s |
| 4           | 12.33 s | 11.89 s |

cgroup deltas were sampled and are not reported: sibling sessions moved the
baseline across the arms, so only the duration column is sound. **The finding is
that the record carried an expired reason and said nothing about it.** TE-D14
now carries the current one and the demonstration that would move the value.

### The repository documents a pull-request gate that does not exist (TE-F40)

`.agents/docs/test-architecture.md` states that "every pull request gates on"
formatting, linting, typechecking, tproc node tests, behaviour and accessibility
browser tests, spec-contract browser tests and the curated Chromium visual
suite, and a second sentence rests the visual-baseline policy on it: "The
ordinary PR gate uses one pinned Chromium environment." Verified here:
`.github/workflows/` contains `docs.yml` alone, triggered on `push` to `main`
and `workflow_dispatch`. **There is no pull-request workflow at all.**

This is pre-existing and outside the implemented range. It is live in this
record because revision 2 recorded it as an owner call for the implementing
pass, the implementing pass edited that file without resolving it, and revision
4 did not carry the question forward — so the decision to leave it was made
inside this work's own record and has never been taken. The owner choice is
stated below rather than settled here.

## Corrections to earlier revisions

Stated rather than quietly dropped.

- **Revision 3's teardown trigger was wrong**, and its acceptance check could
  not have detected that it was wrong. Both are corrected above.
- **Revision 3's `watch === false` gate is withdrawn.** It was described there
  as "a positive check on run mode, not an assumption about the caller"; it is
  an assumption about the caller, and TE-F21 shows it excludes the one editor
  case teardown is safe for.
- **Revision 3's "contiguous from zero" property is withdrawn** in both halves.
- **TE-F15's speed and applicability claims are withdrawn.** The 1 863 ms figure
  came from `runnerImport`, which externalizes `@ydinjs/tproc`; the mechanism
  revision 3 actually specified inlines it, at 19 001 ms and 3 812 MiB for a
  single entry on the challenge's measurement. The byte-identical output claim
  stands.
- **The 10 384 MiB figure is superseded.** It measured the revision-2 semaphore
  standing in for CSS and a teardown trigger this revision refutes.
- **Revision 4's claim that the boundary releases every browser project
  "including the last" is corrected by TE-F29.** It is true of the root
  configuration and of no configuration whose final group is a browser group.
- **Revision 4's reading of `watchTests` is tightened.** It is the call that
  enables the worker's watch tracking; it is not the only RPC the extension
  sends its worker, and this record does not say that it is.
- **Revision 4's `allowExec` disposition is withdrawn**, and the challenge's
  replacement for it is declined on evidence the challenge did not have: the
  in-test `cdp()` API it also gates is used by drag2's input-policy suite, and
  denial is silent where TE-D15's guard is loud. The scope correction to TE-F28
  is accepted; the change to the flag is not.
- **Revision 4's own teardown-ownership property is corrected by TE-D15.** It
  required the teardown carrier to sit in a one-shot entry point and to stay out
  of the configuration the extension loads. That followed from the editor's
  lifecycle being unsettled; with the model declared one-shot everywhere, the
  carrier belongs in the shared factory, and revision 4's open owner choice is
  closed.
- **Revision 4 left the teardown call unnamed, and the obvious reading is
  wrong.** "The provider is closed" reads as `project.browser.close()`, which
  closes a Vite dev server and releases no browser (TE-F33). The primitive is
  now named in TE-D12. This pass's own whole-repository probe happened to call
  `provider.close()`, so the measurement it produced stands; the record simply
  never said so.
- **Revision 4's worker contract required equality across the non-browser group
  and not a magnitude.** Equality alone is met by Vitest's `cores - 1`, which
  times out three tests (TE-F34). TE-D14 now requires an explicit bound below
  the CPU default and records the shipped derivation.
- **Demonstration 1 stated a single measurement as an acceptance threshold.**
  Δ 5554 MiB is evidence; the requirement is the 13 107 MiB working ceiling and
  the acceptance signals (TE-F35). The demonstration is restated below.
- **Revision 4's claim that `watch: true` suppresses `FilesNotFoundError` is
  withdrawn.** It needs `changed` or `related` as well, and only the extension's
  "run related tests" gesture supplies one (TE-F27). The exemption TE-D15 rests
  on is unaffected, because the empty run start precedes the throw.
- **TE-D13 left the in-flight invalidation race undecided**, and the shipped
  code resolved it through the failure path. The contract now decides it
  (TE-D17): a discard supersedes, never rejects.
- **Revision 4's "defence in depth" for the torn-down marking is withdrawn.**
  One check is reachable, not two, and no implementation satisfying TE-D15 could
  have provided two (TE-F38). The property survives; the redundancy claim does
  not.
- **TE-F35's two explanations for the memory delta are withdrawn**, both
  falsified by the remeasurement it scheduled, and Δ 5554 MiB is withdrawn as
  the expectation in favour of the reproduced pair (TE-F37). The ceiling and the
  acceptance signals are unchanged.
- **The consolidated round's refutation of the anonymous-headroom claim is
  declined**, on its own numbers: it compares two runs on one axis where the
  record compares two axes in one run, and anonymous headroom is 2.3–2.9× the
  `memory.current` headroom in both runs (TE-F37).
- **TE-D14 carried an expired reason for the browser page bound.** The retention
  premise that chose two over four was retired by TE-D12 inside this same design
  (TE-F39). Two stands on measured headroom instead, and the demonstration that
  would move it is stated.
- **Demonstration 20 is un-discharged**, because its evidence cannot distinguish
  the behaviour from its failure and the failure is what occurs.
- **The `$close()` citation was off by one line.** `orchestrator.$close()` is
  `cli-api.BK8pd4xc.js:2493`; `:2492` is the `forEach` enclosing it. Both sites
  corrected. The sibling `provider.close()` citation at `:2488` was exact.
- **The VS Code extension is not installed in this container.** The editor
  server present is Zed. All extension findings in every revision are source
  reading — here, of the marketplace artefact self-reporting
  `vitest.explorer@1.50.8` — plus API-level simulation. No running editor has
  been observed in any pass, and revision 2's phrasing "the installed extension"
  overstated that.

## How implementation demonstrates the required behaviour

The obligation is on the shipped implementation, not on this pass's probes.

**Discharged at `c1cab3031`, except where marked.** The implementation record
reports evidence for 1–12 and 16–25; 1's requirement is met and its expectation
is not yet explained; 13–15 are untouched, because no VS Code installation
exists in that container either. Items are annotated where the implementation
changed what the item should say; the rest stand as written and are evidenced in
[`implementer-test-execution-model.md`](implementer-test-execution-model.md).

1. **The root run reproduces the resource result with the real mechanisms.** One
   `vitest run` over all 15 projects, with the converted plugin and the teardown
   reporter as shipped. **Required**: peak anonymous memory and peak
   `memory.current` both at or below the 13 107 MiB working ceiling,
   `oom_kill` at 0, and the acceptance signals of demonstrations 2–4.
   **Expected, not required**: a delta near the Δ 5554 MiB measured here, and a
   duration near 63.6 s — a divergence must be explained, and one is
   outstanding (TE-F35). Neither the semaphore figure nor this pass's delta is
   inherited as a threshold. **Done** at `c1cab3031`, requirement met with
   11 671 MiB against the ceiling; the expectation diverged and the
   quiet-container remeasurement that settles it is owed.
2. **The run is clean by the right signal.** Zero unhandled errors, and zero
   occurrences of `Failed to run the test` — not the absence of
   `provider was closed`, which this mechanism never emits.
3. **Every browser provider is released, and the count is asserted**: seven of
   seven closed, each at a group boundary, with Chrome processes returning to
   the run's baseline before the process exits. Seven of seven is a property of
   the root configuration. In a project-filtered run the correct count is zero
   boundary closures and a release at process close (TE-F29), and asserting
   seven there would be asserting the wrong thing. **Done** at `c1cab3031` for
   the root configuration, with the boundary log reproducing this record's
   order exactly and Chrome returning to 13.
4. **The process closes cleanly.** No `close timed out` line; the generation
   worker is terminated when its last consumer releases it.
5. **The serialization invariant fails loudly when broken.** A run with
   `--sequence.shuffle` aborts before executing a specification, naming the
   projects whose `groupOrder` was erased.
6. **A torn-down project fails loudly on reuse.** Driving a second run against
   the same instance raises before any module executes, instead of reporting a
   zero-module success.
7. **CSS output is unchanged and order-independent.** All 35 entries, three
   ways: one isolate per entry, one shared generation forward, one shared
   generation reversed — byte-identical across all three.
8. **Freshness holds across a workspace rebuild.** With `just docs-dev` running,
   rebuild `@ydinjs/tproc` and observe the next generation produce CSS from the
   rebuilt artefact, without restarting the dev server.
9. **A corrected file recovers.** Break a `.css.ts`, observe the error, correct
   it, and observe the next request succeed without a restart.
10. **Dev-watch invalidation is wired to the discovered set** — development
    watch, which TE-D16 keeps. Editing a shared token file re-evaluates every
    entry that reaches it, not only the entry that happened to be evaluated
    first.
11. **Both consumer classes pass**: the root test run, `just build`,
    `just docs-build` and `just docs-dev`. Revision 3's tsdown evidence was one
    hook in a minimal build and does not carry.
12. **Per-package invocation is unchanged**: `cd packages/<pkg> && just test`
    still runs that package's own configuration.
13. **The editor path still discovers and runs tests.** Discovery lists every
    project, a single test runs, and a project-scoped run runs, against the
    unchanged root `vitest.config.ts`.
14. **The editor releases its browsers.** A whole-repository run from the editor
    releases every browser project it visited at a group boundary; a
    project-filtered gesture releases its single provider at process close, not
    at a boundary (TE-F29). The property asserted in both cases is **Chrome
    returning to baseline before the process exits** — boundary closures are
    asserted only where a later group exists.
15. **Confirm in a real editor what the code already says.** TE-F30 settles by
    enumeration that no gesture can issue two consuming executions against one
    process; what is owed is the confirmation itself — a single test, a file, a
    project, "Run All Tests" and "Update snapshots", none tripping the guard.
    A gesture that does trip it is a defect to resolve before shipping.
16. **The carrier cannot be removed.** `vitest run --reporter=dot` still tears
    down and still enforces the contract; the reporter is installed exactly once
    in a 15-project root run.
17. **The second execution fails loudly and reports no tests.** A rerun issued
    into a process that has already run raises before any module executes, the
    message names the retired mode, and no test result is reported.
18. **An empty run does not spend the lifecycle.** A filter matching no files,
    followed by a real run, succeeds.
19. **The retired machinery is gone.** No `--watch` remains in the tree, the
    debug recipe is `vitest run` and no longer inherits watch from a TTY, and
    `.vscode/settings.json` sets `vitest.watchOnStartup` explicitly false.
20. **The debug task is run mode.** `.zed/tasks.json`'s `vitest:debug` reaches a
    breakpoint with the CDP port attached, and saving the file while paused does
    **not** start a second execution. **Not discharged.** The implementation
    evidence — the process exits on its own — is satisfied equally by the
    behaviour and by its failure, and the round established the failure: on a
    **browser** test the task aborts before opening a page, because `DEBUG=1`
    sets `browser.ui`, the UI nulls the viewport, and the factory's unconditional
    `contextOptions: { deviceScaleFactor: 1 }` is then rejected by Playwright.
    The defect is **pre-existing and outside the implemented range** — the range
    touches no browser option, and the same error reproduces under the pre-range
    command form — so it is raised here rather than absorbed, and it blocks this
    demonstration until it is repaired. A discharge must show the breakpoint and
    the attached port, not the exit code.
21. **The carrier is present in a plugin-less project.**
    `vitest run --project=node/tproc` enforces the contract.
22. **The carrier is an instance, not a name.** A root run with `--reporter=dot`
    shows the enforcement reporter's hooks firing, not merely its presence in
    the list.
23. **`watchOnStartup` behaves as documented.** It is off — confirming nothing
    in the repository has set it — and enabling it produces the loud failure
    rather than a hang or a silent pass.
24. **The generation worker's port is released**, evidenced by the absence of
    `close timed out` under the real plugin in the root run.
25. **`cdp()` still works.** drag2's input-policy suite passes, which is the
    check that `browser.api.allowExec` was not turned off (TE-F28).

## Evidence limits

- **The whole-repository arm is a single run**, with the teardown reporter and
  `groupOrder`/`maxWorkers` assignment applied by a probe configuration
  wrapping the real root config, and the per-generation evaluator applied as a
  reverted patch to the untracked built plugin artefact. The mechanisms measured
  are the ones specified; their code will live elsewhere.
- **Baselines differ between passes.** This pass ran at a 2015 MiB baseline
  against revision 3's 4.0–4.6 GiB. Peaks are not comparable across passes; run
  deltas are, and the delta improved.
- **No control arm was re-run in this pass.** Revision 3's unbounded OOM figure
  and its intermediate arms are taken as reported.
- **The lifecycle probes use fixture suites** — three and four trivial modules —
  not the real browser suites. They establish the mechanism at the RPC boundary
  and at the group boundary, not timings for real suites.
- **The converted-plugin evidence covers the Vite `load` path only.** Six
  concurrent entries through the real plugin, and all 35 through the evaluation
  harness. Watch invalidation, `just build`, `just docs-build` and `just docs-dev`
  are not exercised; the demonstration list carries them.
- **`compileCSS` is downstream of every arm** — oxfmt, lightningcss and the
  sourcemap are unchanged and unmeasured, as in every previous pass.
- **Continuous-run mode was not measured**, in any pass.
- **The editor was read, not run**, and is not installed here. `.vscode-server`
  is absent entirely; the artefact read across this pass and its challenge is an
  unpacked copy of the marketplace build self-reporting
  `vitest.explorer@1.50.8`. **Every VS Code conclusion in this record is
  source-derived**, and none is editor-observed: this includes TE-F12, TE-F21,
  TE-F26, TE-F30 and TE-F31.
- **The shared-state result is a property of the current tree**, not a guarantee
  of the mechanism.
- **The one-shot contract was verified programmatically**, against a fixture
  with `watch: true`, and through a real `vitest run` for the carrier. That each
  editor gesture issues exactly one consuming execution is now established by
  call-site enumeration (TE-F30) rather than by sampling gestures, but it is
  still source-derived; the confirmation in a running editor is owed.
- **The port-handle result is a fixture**, not the converted plugin. It
  identifies the handle class; it does not prove the converted plugin holds no
  other handle.
- **The `--project` falsification uses a fixture**, two trivial browser modules
  and one typecheck module, not the real suites.
- **The primitive comparison is a fixture too** — three browser projects, one
  instance each, trivial modules (TE-F33). It establishes that
  `ProjectBrowser.close()` releases no browser and that the provider call does.
  It does **not** reproduce the hang the implementation saw on the real tree,
  and this record does not claim that property.
- **No resource figure in this record was measured on a quiet container.** This
  pass ran at a 2015 MiB baseline and the implementation at 3158–3538 MiB, both
  inside a cgroup carrying an agent session; at the time of this amendment the
  same cgroup reads 4363 MiB at rest. A remeasurement performed here would be
  noisier than either and would settle nothing, which is why TE-F35 schedules it
  rather than attempting it.
- **The non-browser worker measurement is the implementation's, not this
  pass's** (TE-F34). What was verified here is the source it rests on —
  `resolveMaxWorkers`'s two branches — and the resolved value on this container.

## The lifecycle policy, settled

Revision 4 recorded one owner choice — whether the VS Code extension's runs get
teardown. It is closed: **they do.** Nothing in this record now presents editor
teardown as open.

What the owner settled, and what follows from it:

- Root and per-package CLI runs are one-shot. Ordinary VS Code Vitest runs
  started from the UI are one-shot. Browser providers are released at the group
  boundaries TE-D12 establishes wherever a later group exists, and at process
  close for the project occupying the final group (TE-F29); in every case they
  are released before the process exits.
- Watch and continuous reruns inside one Vitest process are unsupported, by
  intent rather than by limitation.
- **Reuse after teardown** fails loudly before executing or reporting tests, and
  never succeeds silently with zero modules. The claim is scoped to reuse: a run
  whose filter matches nothing either reports a successful run of nothing or
  raises `FilesNotFoundError`, depending on `changed`/`related` and not on
  `watch` alone. Both are Vitest's own pre-existing behaviour, and neither is
  created, closed or claimed by this design (TE-F27).

The reasoning revision 4 used to keep the question open no longer applies. It
turned on the absence of an in-process signal separating an ordinary editor run
from a continuous one (TE-F21), which made an opt-in the only way to declare a
one-shot lifecycle and left the owner carrying that declaration per run. With
the whole model declared one-shot, nothing needs detecting: the contract is
uniform, the carrier is uniform, and the case the missing signal endangered —
continuous run — is retired rather than protected.

**No owner choice about the test execution model remains open.** Two questions
belong to implementation rather than to the owner: whether the debug task wants
anything back after `--watch` is removed, which the demonstration list settles
by exercising it; and whether any editor gesture issues more than one consuming
execution per process, which the same list settles by exercising each one.

**One owner choice was opened by the review round and is not about this model.**
It is the CI policy, stated below; it is presented rather than taken.

## The one open owner choice — the pull-request gate

The repository's test-architecture document describes a pull-request gate that
does not exist (TE-F40). Two ways out, and the consequences differ enough that
choosing on convenience would be choosing blind.

**Option A — correct the document to describe reality.** Cost: an edit. The
consequence is that the repository then states, in the document every role is
pointed at for test policy, that **it has no automated pre-merge verification**
— correctness rests entirely on contributor discipline and the `handoff.md`
sequence, and every "verified" in a review is a local claim on one container.
The second sentence goes with it: the visual-baseline policy's "one pinned
Chromium environment" loses its stated enforcement point, so the pinning rule
has to be restated as a local obligation or it becomes advice.

**Option B — introduce the gate the document describes.** Cost: a project, not a
workflow file. The root run needs ~7.4 GiB and 66 s plus build time; the browser
tests need Chromium in the runner; and the curated visual suite needs a
**pinned** image, which is precisely why the document specifies one — an
unpinned runner produces false diffs and the suite becomes noise that gets
disabled. So Option B is a pinned container image plus a workflow plus a
baseline-maintenance policy, and its first deliverable is not the gate but the
image.

**Recommendation: A now, B as its own work.** A document that promises a safety
net which will not run is actively harmful today, and it is harmful in the
direction that matters — a contributor relies on it and does not run the checks
locally. Correcting it is cheap and reversible: when B lands, the document is
corrected again, in the commit that makes it true. Taking B as a doc fix is how
a pinned-image project gets smuggled in as a sentence.

**What is not optional either way**: the document must not continue to assert a
gate that does not exist. Only which correction to make is the owner's.

## Implementation readiness

Written before implementation and kept as written; the verdict after
implementation is the section that follows.

**The design is implementation-ready.** Every mechanism it selects has survived a
focused challenge without contradictory evidence: the one-shot enforcement, the
carrier that installs it, group-boundary provider teardown, the disposable
per-generation CSS isolate, and the retirement of test watch. The seven
corrections the challenge required are applied above, at the statements that own
them. One of them — the `allowExec` disposition — is resolved against the
challenge's own recommendation, on evidence it did not have, and TE-D16 carries
the reasoning.

Nothing further is owed to design. What remains is verification during
implementation, and it divides into three kinds.

**Confirmations of mechanisms already measured** — these have been demonstrated
on probes, fixtures or a patched artefact, and must be re-demonstrated on the
shipped code: demonstrations 1–7, 16 and 17. The root-run resource result is the
weightiest: it must be reproduced with the real evaluator and the real teardown
integration rather than inherited.

**Paths never exercised in any pass** — these are new work, not repetition:
demonstrations 8–12 (the `@ydinjs/tproc` rebuild under `just docs-dev`,
dev-watch invalidation against the discovered set, `just build`,
`just docs-build`, `just docs-dev`, and per-package invocation after the
change), 18 (an empty run not spending the lifecycle), and 19–25 (the retired
machinery, the debug task in run mode, the carrier in a plugin-less project,
`watchOnStartup`, the generation worker's port, and drag2's `cdp()` suite).

**The editor, which no pass has run** — demonstrations 13–15. TE-F30 has
converted this from an open question about the code into a confirmation:
enumeration of the extension bundle shows no gesture can issue two consuming
executions against one process. The confirmation is still owed, and it is the
one obligation whose failure would be a design defect rather than an
implementation defect, because the contract would then turn a working gesture
into a loud failure.

## Readiness after implementation

**The implementation at `c1cab3031` conforms, and the record is ready for the
implementation review round.** Every mechanism this design selects is present in
the shipped tree in the shape specified, and the two places where execution
diverged from the record are places the record was underspecified, not places
the implementation departed from it. **No remediation is routed**: neither the
teardown primitive nor the worker derivation violates a deeper contract here.

- The teardown primitive is a detail this record declined to name and should
  have; the required property — released at an event that provably follows the
  group's completion — is untouched, the trigger is still the boundary, and the
  implementation's choice is the pool's own lifecycle (TE-F33). The correction
  runs from record to implementation, not the other way.
- The worker bound is a value this record left to derivation and should have
  constrained; the constraint it did state — one value shared across the group —
  is satisfied, and the magnitude is now a stated property with the shipped
  derivation recorded beside it (TE-F34). Plan and implementation no longer
  disagree, and neither is silent.

Three obligations remained at the time of writing, and the review round has
since discharged the first, opened one contract change and left the other two
standing — see the handoff boundary below, which supersedes this list where they
differ.

1. **A quiet-container remeasurement of the root run** (TE-F35). **Taken**, by
   the review round, and it falsified both explanations rather than confirming
   one (TE-F37). The binding requirement is met on both axes; no further
   measurement blocks closure.
2. **The editor, demonstrations 13–15**, which stay exactly as written and stay
   **owner-executed**. No VS Code behaviour has been observed in any pass of
   this work, design or implementation; the container has no VS Code
   installation and `.vscode-server` is absent. Every extension conclusion in
   this record remains source-derived. What is owed is unchanged: a single test,
   a file, a project, "Run All Tests" and "Update snapshots", none tripping the
   guard, against the unchanged root `vitest.config.ts`.
3. **The pre-existing `node/tproc` failure and F-412** stay outside this work by
   instruction, in the review round as in every pass before it. A review that
   counts the root run's one failure against this design is counting the wrong
   thing.

The review round should attack the grounds below, to which implementation has
added three.

## The handoff boundary after the review round

**The design is not implementation-ready in the sense it was at `7aeaff260`**:
one contract changed. TE-D17 is new behaviour that the tree does not have, so
implementation resumes before review does. Everything else in the round is a
record correction, a dead-code removal or a C-tier tidy.

**Implementation owns, in this order.**

1. **TE-D17 — supersession.** The one contract change. It needs the request's
   path retained, responses from a discarded generation dropped, a bounded
   re-issue, and the returned dependency set read from the producing generation.
   It is not a refactor of the generation state machine: the drain rule, the
   failure paths and the discard trigger are all unchanged.
2. **The dead one-shot branch** (TE-F38): the unreachable `#released` check and
   the set feeding it. A removal, not a repair — the property it was credited
   with is satisfied by the check above it.
3. **The `browser.ui` / `deviceScaleFactor` conflict** behind demonstration 20.
   Pre-existing and outside the implemented range, raised rather than absorbed;
   it blocks the demonstration and it blocks the round's one genuinely
   unestablished item, whether the debug recipe's surviving CDP-port `pkill`
   still has a cause.
4. **The round's remaining B and C findings**, which this pass deliberately did
   not absorb: the orphaned build chunks, the copied dependency set (read
   TE-D17's interaction note first), the process-scoped request counter, the
   `sh` shebang on a `bash` script.
5. **The document correction the owner selects** for the pull-request gate.
6. **`SCOPES` in `packages/drag2/.scripts/entry.ts`** gains a `repo` row, so
   `repo:RD-1` resolves. The register is readable without it.

**Implementation does not own** the value of `BROWSER_WORKERS`. It stays at two
until the bound-4 whole-repository arm is taken and reported on both axes; the
measurement is an experiment, and changing the constant is a decision that
follows it.

**The consolidator owns registration**, and only after the ownership rule it was
waiting on: repository-level findings are registered in
[`.plan/00-index.md`](../00-index.md) under `repo:RD-1`, as `RF-` numbered from
1, never as `F-` in a package's register. Two obligations come with it — the
round's headings must stop claiming identifiers they were not given, and each
minted id is written into the register in the commit that first uses it.

**The owner owns** the pull-request gate choice, and the editor confirmation.

**Re-review after implementation is warranted and is narrow**: TE-D17's
observable semantics under a real dev server and a real Rolldown rebuild. The
rest of the round's verdict stands and does not need re-establishing.

## Grounds a focused challenge should attack

- **The delta is reproduced and unexplained.** Three runs, two of them
  independent and agreeing within 1 %, against one design sample 32 % lower
  (TE-F37). Both offered explanations are falsified and the replacement — that
  the design's probe arm was unrepresentative — is a reading nobody has tested.
  Attack it by re-running the design's own probe arrangement on the shipped
  tree: if it still measures Δ 5554, the difference is the probe and not the
  mechanism, and this record's most-cited number was never a measurement of what
  it claimed.
- **TE-D17 is decided from source and one race probe**, not from a dev server
  under a real invalidation storm. The bounded re-issue is the part to attack:
  a bound that is too low turns a `@ydinjs/tproc` rebuild into a loud failure,
  and one that is too high turns it into a stall nobody can attribute. No arm
  has measured how many supersessions a real rebuild produces.
- **Supersession is specified as a property and not as a mechanism**, and the
  drop rule is the subtle half: a response from a discarded generation must be
  dropped, and the code path that would publish it is the same one that
  correctly publishes a normal answer. That is the shape of defect this design
  has met twice — a mechanism that reports success while doing the wrong thing.
- **The primitive was found by executing the design, not by reviewing it.**
  Three revisions and two challenges read "the provider is closed" without
  noticing that the obvious call does not close a provider (TE-F33). Ask what
  else in this record names an outcome where it should name a mechanism.
- **The non-browser bound is tuned to one container.** Twelve cores, this
  workload, this timeout. `availableParallelism() / 2` scales the number and not
  the reasoning behind it; a machine where the group's builds are cheaper or the
  cores fewer may want a different rule, and nothing here measures that
  (TE-F34).
- **Process-wide generation sharing is asserted from the shape of the code**,
  not from a case where two consumers disagree. If any consumer's options could
  reach evaluation rather than `compileCSS`, one generation is wrong.
- **Reference counting across three plugin instances is unimplemented.** The
  measured arm never released the generation at all — which is exactly what
  TE-F22 caught.
- ~~The 10 s close timeout was diagnosed by elimination~~ — **settled**: the
  handle is the parent-side `MessagePort` with a live listener (TE-F32).
- **`--sequence.*` is not the only override that could erase configured
  structure.** The allow-list has 20 names and the merge is wholesale; only
  `sequence` was traced.
- **TE-F19's consequence is stated but not demonstrated end to end.** No arm
  edited a shared token file and observed all dependent entries re-evaluate
  through the real watcher.
- **The editor is still the weakest evidence in the design**, three revisions
  in, and it is the workflow the owner named as non-negotiable. TE-D15 now rests
  on it in a new way: if any editor gesture issues two consuming executions in
  one process, the contract turns a working gesture into a loud failure.
- **The one-shot counter's exemption for empty runs is a hole by construction.**
  A run that matches nothing does not consume the lifecycle, so a mistaken
  filter followed by a real run is allowed — correct, but it means the invariant
  is "at most one execution that executed", not "at most one call".
- **The carrier depends on `configureVitest` and on `vitest.config` being the
  object `createReporters` reads.** Both are internal arrangements verified at
  one version. `Vitest._createRootProject` assigns `this._config = resolved`
  (`cli-api.BK8pd4xc.js:13097`), so the identity is by construction rather than
  by coincidence; that the pair fails loudly rather than silently if either
  changes is still reasoned, not measured.
- **TE-F30 is an enumeration of one bundle at one version.** It is exhaustive
  over that bundle, not over extension versions, and no editor has run it.
- **Keeping `allowExec: true` leaves the API server's rerun RPCs reachable.**
  They are made loud by TE-D15 rather than absent, and the server binds
  `0.0.0.0` as it already did. That is a deliberate trade of a silent gate for a
  loud guard, and it is the place to attack if the trade is wrong.
