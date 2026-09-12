# Test execution model — revision 4, reconciled with the revision-3 challenge

**Architect pass, 2026-09-10, branch `drag2/fin-review` at `c4c76e638`.** Reconciles [`architect-test-execution-model-r3.md`](architect-test-execution-model-r3.md) with [`architect-challenge-test-execution-model-r3.md`](architect-challenge-test-execution-model-r3.md) and with the owner's freshness boundary. It supersedes revision 3 where marked and keeps its evidence where it stands.

**Nothing here claims an identifier.** No heading opens with one, at any depth. The local `TE-` series continues under the sanctioned `consolidator.md` route; the names also fall outside the local identifier grammar (`[A-Za-z][A-Za-z0-9]*-\d+`, CONTRIBUTING §Reading one entry of a record), so they could not claim a repository identifier even at `####`. No repository register is opened and no repository rule is placed in `@ydinjs/drag2`'s lifecycle family.

**Amended 2026-09-10 from settled owner direction**, against this document at `a8cd06441`. The lifecycle question revision 4 left open is closed: browser teardown is performed for editor runs as well, the repository's test execution model is one-shot everywhere, and test watch and VS Code Continuous Run are retired along with the machinery that exists only to serve them. The amendment is carried by TE-D15 and TE-D16 and by the corrections marked against TE-D12 and TE-F21.

**Reconciled 2026-09-11 with the focused challenge of the amendment** ([`architect-challenge-test-execution-model-r4.md`](architect-challenge-test-execution-model-r4.md) through `aeff2a679`), which found no contradictory evidence against any chosen mechanism and required seven corrections. All seven are applied at the statements that own them rather than collected into an errata section, and one of them is applied against the challenge's own disposition on evidence the challenge did not have. The design is implementation-ready; what remains is listed under implementation verification obligations.

**Reconciled with the implementation, 2026-09-11**, against [`implementer-test-execution-model.md`](implementer-test-execution-model.md) and the shipped tree at `c1cab3031`. Executing the design produced evidence no design pass had, and four statements are amended by it: the teardown primitive is now named rather than left to the implementer (TE-F33); the non-browser group's worker bound becomes a required property with a measured derivation (TE-F34); the Δ 5554 MiB figure is reclassified as evidence rather than an acceptance threshold (TE-F35); and TE-F27's reading of `FilesNotFoundError` is corrected. **No chosen mechanism changed, and nothing the implementation did violates a contract of this record**, so no remediation is routed. Every claim this amendment rests on was verified here at source or on a fixture, not taken on report.

**Reconciled with the review round, 2026-09-11**, against [`test-execution-1-summary.md`](../reviews/test-execution-1/test-execution-1-summary.md) and its four pass artefacts at `e618e5677`. The round's load-bearing verdict is accepted: the shipped behaviour holds, and its teardown mutation probe makes TE-F33 **stronger** than this record states. Five questions were routed here and all five are settled below — the in-flight invalidation race (TE-D17, the round's one tier A), the falsified explanations for the memory delta (TE-F37), the browser page bound (TE-F39), the CI-policy statement (TE-F40, settled by owner disposition as accepted policy with a deferred implementation), and where repository-level findings are registered (settled as `repo:RD-1` in the new [repository register](../00-index.md)). **One consolidated finding is resolved against the round's own reading**: F-440's headroom comparison is a category error, and the record's claim it disputes is confirmed by the round's own numbers. The straightforward B and C findings are left to implementation and are not absorbed here.

**Reconciled with the remediation review, 2026-09-12**, against [`remediation-proof-claude.md`](../reviews/test-execution-1/remediation-proof-claude.md) at `c63269e5a` and the TE-D17 implementation at `783c97665`. The review attacked every observable property TE-D17 states, by execution, under both real consumers, and **every one of them held**; it routes two tier A findings here, and both are defects in **this record** rather than departures from it. The generation lifecycle has a state that TE-D13 and TE-D17 between them never named, so a generation demoted by an entry's throw is unreachable by invalidation and a real Vite dev server publishes a torn stylesheet (TE-F41). And TE-D17's bound is denominated in a unit that does not match the thing it constrains, so two concurrently written tracked files exhaust it (TE-F42). Three decisions settle them — the lifecycle states and their ownership (TE-D18), the stability budget that replaces the attempt cap (TE-D19), and the coalescing that an uncapped re-issue now requires (TE-D20) — and TE-D13 and TE-D17 are amended at the statements that own them. **Implementation resumes again before review does**, and the handoff boundary below is rewritten. The review's three tier C findings are not absorbed here; they stay in the work order.

**Reconciled with the lifecycle-and-budget review, 2026-09-12**, against [`lifecycle-budget-proof-claude.md`](../reviews/test-execution-1/lifecycle-budget-proof-claude.md) at `30f6ff2e8` and the implementation at `e41e72b25`. TE-F41 and TE-F42 are **closed**, in both real consumers, with the discriminating half present in every arm; demonstrations 26–32 discriminate as written. Two things the review establishes are settled here by owner disposition and are the substance of this amendment. **The supported progress domain is now stated rather than implied** (TE-F43): an invalidation stream that never yields the coalescing window means the input has never been stable enough to evaluate, no progress is owed there, and TE-D19 and TE-D20 are corrected wherever they claimed otherwise — without adding machinery for the regime. **And the resource contract is re-expressed on the axis that gates the property it is about** (TE-D21, TE-F44): the `memory.current` ceiling is breached at every commit on a loaded container, by a quantity the run does not own, and an acceptance signal nobody can meet is not one. The review's other two findings — D-198's unstruck residues and the `120 → 121` figure — are left to the implementer by disposition and are not absorbed here.

**Instruction boundaries.** The pre-existing `node/tproc TokenPackageProcessor` failure and F-412 stay outside this work. Nothing is implemented. Every probe below is a scratchpad fixture or a reverted patch to an untracked build artefact; the working tree was clean before this document and is clean after it.

## What changed, and why

The challenge was right on both mechanisms, and the owner's freshness boundary settles the one question the challenge left as a fork. Revision 3's two central mechanisms are replaced; its two other decisions survive with corrections.

| Ground | Revision 3 | Revision 4 |
| --- | --- | --- |
| Nx out of test orchestration | Adopted, with a claimed loss of build ordering | **Adopted; the claimed loss is deleted** — Nx never supplied it |
| Browser serialization | `sequence.groupOrder`, contiguous **from zero** | **Kept, assigned from 1** — zero is a sentinel that destroys the ordering it was meant to create |
| Browser teardown trigger | Last `onTestModuleEnd` of a project | **Replaced by the group boundary** — the last-module trigger fails deterministically |
| Teardown safety | Gated on `config.watch === false` | **Marked project plus a pre-execution guard**, installed in every configuration by a plugin |
| Where teardown applies | CLI only; the editor was an open owner choice | **Everywhere, the editor included** — the model is one-shot and the contract is enforced (TE-D15) |
| Test watch and Continuous Run | Watch retained, teardown withheld from it | **Retired**, together with the machinery that served only them (TE-D16) |
| CSS evaluation | Persistent Vite environment with invalidation | **One fresh isolate per build generation**, discarded on any tracked change |
| Worker limit | `VITEST_MAX_WORKERS` > `parseArgs` > default | **Kept, with three interactions the order did not account for** |
| Whole-repository resource evidence | 10 384 MiB, semaphore standing in for CSS | **Re-measured with the real mechanisms** — see below |

**The headline: the whole repository runs in one Vitest process at 7570 MiB peak over a 2015 MiB baseline — Δ 5554 MiB — in 63.6 s, with the real per-generation CSS evaluator and real group-boundary teardown, 0 unhandled errors, and all seven browser providers released.** Revision 3's best arm was Δ 6181 MiB in 96 s, and it was measured on a mechanism this revision discards. The shipped implementation reproduces every acceptance signal of that run and not its delta — Δ 6723–8442 MiB across three runs on a loaded container. What that figure is, and is not, is settled below.

## The whole-repository run, re-measured

One Vitest process, all 15 projects, `memory.max` 17 179 869 184 B (16 384 MiB), `memory.current` sampled at 1 Hz. Baseline in this pass was **2015 MiB**, lower than revision 3's 4.0–4.6 GiB, so the peaks are not directly comparable and the run delta is the figure that transfers.

| Quantity | Value |
| --- | --- |
| Peak `memory.current` | **7570 MiB** (baseline 2015 MiB, **Δ 5554 MiB**) |
| Working ceiling | 13 107 MiB (80 % of the cap) |
| Chrome processes | **32** peak, baseline 4 |
| Duration | **63.56 s** |
| Result | 157 files, 2467 passed, 60 skipped, **1 failed** |
| The one failure | pre-existing `node/tproc`, excluded by instruction |
| Unhandled errors | **0** |
| Providers released | **7 of 7**, each at its group boundary |
| `memory.events.oom_kill` | **0** |

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

Two properties of that log matter beyond the total. Every browser project is released, the last one included — because in **this** configuration the non-browser projects occupy the highest group, so group 7's provider is closed when group 8's first module starts. That is a property of the root configuration, not of the mechanism: a project sitting in the final group is never released by a boundary, because the boundary is another group starting (TE-F29). And `errors=0` is now a meaningful acceptance signal, which it was not in revision 3.

### What the delta is, and what the requirement is (TE-F35)

The shipped root run at `c1cab3031` measured Δ 6723–8442 MiB and 71–86 s across three bounded runs, against Δ 5554 MiB and 63.6 s here. **The design's figure is evidence, not a requirement, and demonstration 1 was wrong to state it as one.** A single sample, taken at a 2015 MiB baseline this record already flags as unusually low, cannot be a threshold that a later run must clear; promoting it to one silently converts an observation into a budget nobody derived.

The requirement is the ceiling and the acceptance signals, and the implementation meets all of them:

_The Required column was corrected 2026-09-12 and the table is superseded by TE-D21; the Shipped run column is the historical measurement at `c1cab3031` and is unchanged._

| Signal | Required | Shipped run |
| --- | --- | --- |
| Peak anonymous memory | ≤ 13 107 MiB (80 % of cap) | **9843 MiB** |
| Peak `memory.current` | reported, never gated (TE-D21, TE-F44) | **11 671 MiB** |
| `memory.events.oom_kill` | 0 | **0** |
| Unhandled errors | 0 | **0** |
| `Failed to run the test` | 0 | **0** |
| `close timed out` | 0 | **0** |
| Providers released at a boundary | every group with a successor | **7 of 7** |
| Chrome at end | run baseline | **back to 13** |
| Files / tests | unchanged | **157 / 2467, 60 skipped, 1 pre-existing failure** |

**The delta keeps a weaker status: an expectation.** A later run is compared against it, and a divergence must be explained rather than absorbed. Two explanations are on the table and neither is established. The shipped runs carried a 3158–3538 MiB baseline against this pass's 2015 MiB, inside a cgroup also holding an agent session and thirteen background Chrome processes — load this pass did not carry. And `memory.current` counts reclaimable page cache, which a run doing this much build and raster I/O grows; the implementation's anonymous peak, which is what an OOM actually reads, is Δ 6685 MiB against a `memory.current` delta of Δ 7412 MiB, so the page-cache component is real and measurable.

**The remeasurement was taken, and it falsified both explanations.** The paragraph this replaces offered container load and page cache as the two candidates and scheduled the run; the review round ran it. Neither survives, the delta is real and reproducible, and the correction is carried in full by TE-F37 below. What is retained from the reasoning here is only the axis argument, and that one holds: anonymous memory is the figure to require, and it carries substantially more headroom than `memory.current` in every run that measured both.

**The comparison itself is weaker than it looks**, and the remeasurement should fix that rather than repeat it. This pass measured only `memory.current`; the implementation measured anonymous memory as well. Comparing two `memory.current` deltas compares two unknown page-cache components. **Anonymous peak against the working ceiling is the figure this record should have required from the start**, with `memory.current` reported beside it; the remeasurement reports both, and subsequent passes compare the anonymous number. _2026-09-12: this conclusion was never applied to the requirement, and TE-F44 is what that cost. TE-D21 applies it._

## The local register

Continuing the series. `TE-D1`…`TE-D11`, `TE-I1`, `TE-F1`…`TE-F15` are defined in revisions 2 and 3.

| Local | Canonical | Subject | Status |
| --- | --- | --- | --- |
| TE-D12 | unassigned | Browser projects serialized from group 1 and released at group boundaries | New — supersedes TE-D9; primitive named by TE-F33 |
| TE-D13 | unassigned | CSS evaluated by one fresh isolate per build generation | New — supersedes TE-D10; lifecycle completed by TE-D18 |
| TE-D14 | unassigned | The requested worker limit, and the three interactions that constrain it | New — supersedes TE-D11; bound added by TE-F34 |
| TE-D15 | unassigned | Every Vitest process executes at most one test run, enforced from an unremovable carrier | New — closes revision 4's owner choice |
| TE-D16 | unassigned | Test watch and Continuous Run are retired, with the machinery serving only them | New |
| TE-F16 | unassigned | The last-module teardown trigger fails deterministically at the RPC boundary | New — refutes part of TE-D9 |
| TE-F17 | unassigned | `sequence.groupOrder: 0` is a sentinel that demotes or interleaves the project | New |
| TE-F18 | unassigned | Resolved-URL discovery sees the whole graph, `@ydinjs/tproc` and the token DB included | New — supersedes the tracker half of TE-D10 |
| TE-F19 | unassigned | Per-entry dependency attribution collapses inside a shared generation | New |
| TE-F20 | unassigned | Node caches an evaluation failure permanently in the isolate that produced it | New |
| TE-F21 | unassigned | No in-process signal distinguishes an ordinary VS Code run from a continuous one | New — refines TE-F12 |
| TE-F22 | unassigned | A retained generation worker prevents the Vitest process from closing cleanly | New |
| TE-F23 | unassigned | The whole-repository run with both real mechanisms measures Δ 5554 MiB in 63.6 s | New — reclassified as evidence by TE-F35 |
| TE-F24 | unassigned | A plugin's `configureVitest` installs a reporter that no CLI flag can remove | New |
| TE-F25 | unassigned | `Vitest.report` does not catch reporter errors, so `onTestRunStart` can abort a run | New |
| TE-F26 | unassigned | The extension appends to configured reporters rather than replacing them | New |
| TE-F27 | unassigned | An empty specification list emits a run start without executing anything | New — reading corrected at implementation |
| TE-F28 | unassigned | `browser.api.allowExec` gates reruns, snapshot updates and the in-test `cdp()` API, and denial is silent | New — scope corrected at reconciliation |
| TE-F29 | unassigned | A boundary never releases the project in the final group; process close does | New — falsifies part of TE-D12 |
| TE-F30 | unassigned | One consuming execution per extension-created process, by call-site enumeration | New — strengthens TE-F12 |
| TE-F31 | unassigned | The extension's child has a noop watcher; continuous changes arrive over `onFilesChanged` | New — refines TE-F21 |
| TE-F32 | unassigned | The retained handle is the parent-side `MessagePort` with a live listener | New — identifies TE-F22's handle |
| TE-F33 | unassigned | The release primitive is `provider.close()` plus `$close()`; `ProjectBrowser.close()` releases no browser | New — names what TE-D12 left unnamed |
| TE-F34 | unassigned | The shared non-browser group needs a bound below the CPU default, or it times out tests | New — constrains TE-D14 |
| TE-F35 | unassigned | The Δ 5554 MiB whole-repository figure is evidence, not an acceptance threshold | New — reclassifies TE-F23 |
| TE-D17 | unassigned | An invalidation arriving during evaluation supersedes the request rather than failing it | New — completes TE-D13; bound replaced by TE-D19 |
| TE-F36 | unassigned | A discard landing inside an evaluation rejects that request with an error naming no file | New — the gap TE-D17 closes |
| TE-F37 | unassigned | Both explanations for the memory delta are falsified; the anonymous axis carries 2.3× the headroom | New — corrects TE-F35 |
| TE-F38 | unassigned | The torn-down marking cannot fire while TE-D15 holds | New — corrects TE-D12 and TE-D15 |
| TE-F39 | unassigned | The browser page bound's stated ground was retired by this same design | New — re-derives TE-D3's value |
| TE-F40 | unassigned | The repository documents a pull-request gate that does not exist | New — carries an owner choice |
| TE-D18 | unassigned | A generation is accepting, draining or abandoned, and the module owns the set of all three | New — completes TE-D13 and TE-D17 |
| TE-D19 | unassigned | Supersession is bounded by a stability budget in time with a floor of two, not by an attempt count | New — supersedes TE-D17's bound; domain bounded by TE-F43 |
| TE-D20 | unassigned | Invalidation is coalesced: a successor generation per quiet window, not per change event | New — required by TE-D19; domain bounded by TE-F43 |
| TE-F41 | unassigned | A generation demoted by an entry's throw is unreachable by invalidation and publishes a torn stylesheet | New — the gap TE-D18 closes |
| TE-F42 | unassigned | The attempt cap is denominated in watcher events, so two concurrently written files exhaust it | New — the gap TE-D19 closes |
| TE-D21 | unassigned | The resource contract: a safety gate on anonymous memory, a comparative regression gate, and evidence that gates nothing | New — supersedes TE-F35's acceptance table |
| TE-F43 | unassigned | Below the coalescing window no generation is ever created, so the budget cannot fire | New — bounds the progress domain of TE-D19 and TE-D20 |
| TE-F44 | unassigned | The `memory.current` ceiling is breached at every commit by a quantity the run does not own | New — falsifies TE-F37's "the acceptance signals are unchanged" |

Superseded by this pass: **TE-D9**, **TE-D10**, **TE-D11**. **TE-D8** stands, amended. **TE-D1**, **TE-D3**, **TE-D6**, **TE-D7**, **TE-I1** stand. **TE-F11**, **TE-F13**, **TE-F14** are confirmed. **TE-F15**'s output claim stands; its speed and applicability claims are withdrawn.

## Decisions

### Nx stays out of test orchestration, and nothing is lost with it (TE-D8)

The decision is unchanged: the root `Justfile`'s `test` recipe becomes a single `vitest run` against the root configuration, per-package invocation stays available unchanged, and `nx.json`'s `build`, `typecheck` and docs targets are untouched.

**The claimed consequence is deleted.** Revision 3 recorded that removing Nx loses `dependsOn: ["^build"]` ordering for tests. Verified here: `nx.json`'s `targetDefaults` has keys for `build`, `typecheck`, `docs:build`, `docs:dev`, `docs:api:build` and `docs:api:prepare` and **no `test` key**; every `packages/*/project.json` carries only `$schema`, `name` and sometimes `implicitDependencies`; every package's `test` recipe is a bare `vitest run -c vitest.config.ts`. `nx run-many -t test` never built anything, so there is nothing to become unenforced. The demonstration item that checked it is dropped.

Two real consequences, unchanged from the challenge's reading: the root run covers all 15 projects where `just test` names seven packages today — identical coverage, since those seven configs contribute exactly those 15 projects — and `nx affected -t test` becomes unavailable in principle, which costs nothing because the repository uses `nx affected` nowhere and affected **builds** stay on Nx.

### Browser projects are serialized from group 1 and released at group boundaries (TE-D12)

Each browser project gets its own `sequence.groupOrder`, **assigned from 1**; the non-browser projects share the highest group. When the first test module of a later group starts, every browser project in an earlier group has its provider closed and its Chromium exits. **The closing call is `project.browser.provider.close()` followed by `$close()` on that project's orchestrators** — what the browser pool itself does when it releases the same resources (`cli-api.BK8pd4xc.js:2488`, `:2493`). Revision 4 left the call unnamed and the obvious reading of "the provider is closed" is the wrong one (TE-F33), so it is named here rather than left to be rediscovered.

**Why the boundary and not the last module.** `groupSpecs` awaits `Promise.allSettled(promises)` for a whole group before the next group begins (`cli-api.BK8pd4xc.js:3712`), so the first module of group _n+1_ provably follows the completion of group _n_ — every page, orchestrator RPC and pool promise of that group has settled. The last-module trigger has no such guarantee, and it does not merely risk a race: it fails every time (TE-F16).

**Why from 1.** `groupOrder: 0` is Vitest's default sentinel, and `cli-api.BK8pd4xc.js:3816` diverts a project with `isolate === true`, `order === 0` and `maxWorkers === 1` into a trailing catch-all group appended after every other (TE-F17). Holes are irrelevant — `:3632` is `if (!group) continue;` — so contiguity buys nothing and revision 3's "contiguous from zero" was wrong in the half that mattered.

**Required properties.**

- **Teardown is triggered by an event that provably follows the completion of the group the project ran in.** Module counting cannot express that.
- **Teardown is installed by the shared factory into every configuration the repository ships**, root and per-package alike, through the carrier TE-D15 specifies. Revision 4 originally required the opposite — that a one-shot entry point contribute it, and that the root configuration the extension loads not carry it — because the editor's lifecycle was an open question then. It is not open now: the model is one-shot everywhere, so the contract belongs where no consumer can fail to get it. `watch` is still not evidence of anything (TE-F21) and is still not used.
- **A run that would execute a specification belonging to a torn-down project fails loudly before executing anything.** This holds, and it is satisfied by **one** check rather than two: a project can only be torn down inside a process that has already consumed its execution, so TE-D15's counter always throws first and the marking's own check can never fire (TE-F38). Revision 4 described the marking as independent defence in depth; that was never true of any implementation satisfying TE-D15, and the claim is withdrawn rather than the property. The loud failure the contract asks for is the one the counter produces, in place of the silent zero-module green run TE-F11 produces.
- **Identity comes from the runtime project object, never a configured-name string.** A project configured as `b1` is reported throughout as `b1 (chromium)`; one configured project expands to one runtime project per `browser.instances` entry. A mechanism keyed on configured names matches nothing, silently.
- **The serialization invariant is checked before any specification executes**: every browser project has a distinct, non-zero `groupOrder`. This is what makes the `--sequence.*` erasure in TE-D14 loud instead of a silent return to the fan-out that was fatal. The check reads `spec.project.config.sequence.groupOrder` and never the position of a specification in the list, because **the list is unsorted at that point** — `sequencer.sort` runs later, inside `executeTests`. Measured on the fixture, `onTestRunStart` received `n1[go=3] decl[go=4] b1[go=1] …`.
- **Teardown at a boundary releases every browser project except the one in the final group** (TE-F29). The final group's provider is released by process close, which is safe but is not this mechanism. The property to assert is therefore Chrome returning to baseline before the process exits — which holds in both cases — and boundary closures only where a later group exists. **A run that takes zero boundary closures therefore conforms**: a project-filtered IDE gesture instantiates one browser project, which sits in the final group and is released by `vitest.close()`. Reading that as a failure to release every provider mid-run inverts the property. What would be a failure is a boundary that exists and is not taken, or Chromium still running when the process exits.
- **The release primitive is the provider, never the browser project.** `ProjectBrowser.close()` is `await this.vite.close()` on the parent browser project's dev server (`@vitest/browser/dist/index.js:2543`, `:2597`); it touches no provider and releases no browser, so a mechanism built on it reports every boundary closure it was asked for while Chromium accumulates behind it (TE-F33) — the exact failure shape the acceptance property below exists to catch. Closing the provider and then the orchestrators leaves the project's Vite server open until process close, which is correct: the pool does the same, and nothing runs against that server again.
- **A teardown failure is distinguishable**, not merely present. The failure this mechanism produces when mistriggered is `Failed to run the test …`, which is indistinguishable from a genuine test failure; an acceptance check that greps for `provider was closed` reads clean while the mechanism is failing.
- **The generation worker and the browser providers are both released before the process closes** (TE-F22).

### Every Vitest process executes at most one test run (TE-D15)

The repository's test execution model is one-shot. A root CLI run, a per-package CLI run and an ordinary run started from the VS Code Vitest UI each start a Vitest process, execute one test run, release the browser providers at the group boundaries TE-D12 establishes, and end. **Browser teardown applies to editor runs as well** — the owner choice revision 4 recorded is closed in favour of always tearing down.

Watch and Continuous Run rerun inside a process that has already torn down its browsers, so they are not supported. TE-D16 retires them.

**The invariant, stated so it can be observed:** at most one _consuming_ execution per Vitest process. A run whose specification list is non-empty consumes the process's single execution. A run with an empty list does not, because Vitest emits a run start for it and executes nothing (`cli-api.BK8pd4xc.js:13463`); a filter that matches no files must not spend the lifecycle (TE-F27).

**The carrier — a plugin, not a configured reporter.** The mechanism is a reporter, because teardown needs `onTestModuleStart` and the runtime project object. But `test.reporters` is removable: when `--reporter` is present on the command line, Vitest **replaces** the resolved reporter list wholesale (`coverage.DM_a_rWm.js:437–452`), so a configured reporter is one flag away from silently vanishing along with the contract it enforces. The reporter is therefore installed by a **plugin** carried in the shared factory, from the `configureVitest` hook, which runs at `cli-api.BK8pd4xc.js:13152` — after CLI reporter replacement and before `createReporters` reads `resolved.reporters` at `:13177`. Measured: with `--reporter=dot` on the command line, the plugin's push survives and the reporter is constructed and driven (TE-F24).

Required properties of the carrier:

- **It is installed by the shared factory into every configuration**, so root and per-package runs and the editor all get it without an entry point opting in.
- **Installation is idempotent.** `configureVitest` is invoked once per project (`projects.flatMap`), so an unguarded push installs one reporter per project — fifteen in a root run.
- **It survives the editor.** The extension's own plugin appends its reporter to the configured list rather than replacing it, and passes `reporter: void 0`, so the CLI replacement branch is not taken (TE-F26).
- **What is pushed is a reporter instance, never a name.** `createReporters` normalizes only array entries and returns anything else unchanged (`cli-api.BK8pd4xc.js:11367–11382`, `return referenceOrInstance`); string normalization happens earlier, in `resolveConfig`, which has already run. A string pushed from `configureVitest` is therefore handed to `Vitest.report` as a string, `r[name]?.(…)` is `undefined`, and **the contract silently does nothing** — the one outcome it may not have. An instance, or a resolvable `[name, options]` tuple, is required.
- **The plugin reaches the projects that have no plugins today.** `configureVitest` hooks are gathered per project (`projects.flatMap(project => project.vite.config.getSortedPluginHooks(…))`), and the factory declares no `plugins` anywhere: `createNodeTestProject` and `createDeclarationTestProject` (`.scripts/vitest-config.ts:163, 173`) build from `createTestBaseConfig` alone, and the browser projects receive plugins only through the Vite config they merge in. A run filtered to `--project=node/tproc` would otherwise carry no carrier at all. This is why "into every configuration" is load-bearing rather than tidy.
- **The scope of "no flag can remove it" is the `test` command.** `:13177` branches on `resolved.mode === "benchmark"` to `createBenchmarkReporters`, which never reads `resolved.reporters`, so `vitest bench` drops the carrier. The repository runs no benchmarks, so this costs nothing today; the claim is narrowed rather than defended.

**The enforcement point — `onTestRunStart`.** It is the earliest per-run hook: `Vitest.runFiles` awaits `this._testRun.start(specs)` before it creates the pool, before `initializeGlobalSetup` and before `pool.runTests`. `Vitest.report` is `await Promise.all(this.reporters.map(...))` with no `try`/`catch` (`:13983`), so a throw there rejects the run before any module executes (TE-F25). Verified end to end on an instance created with `watch: true` — the extension's own configuration: run 1 executed 8 modules and released both providers; run 2 threw `this Vitest process has already executed a test run` and executed nothing.

Three checks live at that point, and all three fail loudly:

- a **second consuming execution**, which names the contract and says that watch and continuous reruns are retired. This is what "never silently succeeds with zero modules" covers: **reuse**. The neighbouring case is not ours to claim — a run whose filter matches nothing reports a successful run of nothing when `changed` or `related` is set, and raises `FilesNotFoundError` when neither is — `watch: true` alone does not suppress the throw, and revision 4's parenthetical saying it did is withdrawn (TE-F27). Either way the empty run start reaches the carrier first, which is all the exemption depends on. That route predates every revision and survives. The carrier does see `specs.length === 0` at the one hook that runs for such a run and could refuse a filtered empty execution; that is recorded as an available strengthening rather than a requirement, because its blast radius on legitimate editor gestures cannot be measured without an editor;
- a specification belonging to a **torn-down project** — TE-D12's marking. It is subsumed: a torn-down project implies a consumed process, so the check above always throws first and this one is unreachable (TE-F38). It is kept in the record as the property it guarantees and **not** as a second enforcement point; the unreachable branch and the set feeding it are dead machinery, and their removal is routed to implementation;
- the **serialization invariant**, every browser project carrying a distinct non-zero `groupOrder`, which is what makes TE-D14's `--sequence.*` erasure loud.

**The guard's scope is every path that emits a run start**, which is `Vitest.runFiles` and therefore all four public run entry points and the two RPC methods that reach them. It is **not** every path that executes specifications: `Vitest.collectTests` (`:13692`) goes straight to `createPool`, `initializeGlobalSetup` and `pool.collectTests` without calling `_testRun.start`, and the browser pool's collect path launches Chromium. The guard cannot see it. The exception is unreachable here — the extension collects through `experimental_parseSpecifications` (verified), and no CLI entry point collects after running in one process — but the scope is stated as what it is rather than claimed wider.

**The boundary of "before test reporting", stated honestly.** `Promise.all` invokes every reporter's `onTestRunStart`, so on a rejected second attempt the other reporters do see a run start. No test executes and no test result is reported. That is the strongest position available from a public hook. One consequence follows and the implementation must not paper over it: the throw happens before `runningPromise` is assigned, so the `finally` that calls `_testRun.end` never runs and **no `onTestRunEnd` is emitted for the refused execution**. A consumer pairing start with end sees an unbalanced start; the extension recovers, because `executeRun`'s `finally` disposes and ends the run. The refusal must propagate to the caller and must never be absorbed into a "completed" run.

**Why not prevent it at entry.** `Vitest.runFiles` is the single funnel — four public entry points (`runTestSpecifications`, `rerunTestSpecifications`, `rerunFiles`, `rerunTask`) and two of those also exposed over the API server — so wrapping it would refuse the second execution before anything at all was reported. It is rejected: `runFiles` is internal and unmarked, and a monkey patch over it disappears without a word when the name changes in a Vitest upgrade. A contract whose whole purpose is to make a silent failure loud must not be enforced by a mechanism that can go silent. The reporter hook is public API, and if it were ever removed the run would fail rather than proceed unguarded.

**Discovery is unaffected.** The extension collects tests through `experimental_parseSpecifications` — AST-based, never reaching `runFiles` — so listing tests neither consumes the lifecycle nor trips the guard, and root-config discovery is preserved exactly as revision 2 established it.

### Test watch and Continuous Run are retired, with the machinery that served them (TE-D16)

TE-D15 makes a second execution in one process a loud failure. The modes that depend on one are therefore withdrawn, and the machinery whose only responsibility was supporting them is removed rather than left to fail.

**Retired.** `vitest --watch` in any form for tests; VS Code Continuous Run — both the "eye" gesture and `vitest.watchOnStartup`, the setting that turns it on for every config at activation without a gesture; and any rerun issued into a process that has already run. Continuous Run cannot be disabled as a gesture, so it is retired by documentation plus the loud failure; the setting can be, and is.

**The inventory, and what happens to each.**

| Item | Responsibility | Disposition |
| --- | --- | --- |
| root `package.json` `"test": "vitest"` | bare `vitest` is watch mode — the only watch entry point in the repository | becomes the one-shot root run TE-D8 already requires |
| `.scripts/zed-test.sh`, `run-vitest-debug` | the only `--watch` in the tree | becomes **`vitest run`** — deleting the flag is not enough (below) |
| `.scripts/zed-test.sh`, `pkill -f 'vitest.*browser'` | kills a surviving watch runner so it cannot respawn Chrome — its comment says so | **removed**; the sibling `pkill` on the CDP port keeps its own justification |
| `.vscode/settings.json`, `vitest.watchOnStartup` | the extension's continuous-run switch: _"Watch every test file after the extension is loaded. This is the same as enabling continuous run."_ | set explicitly **`false`**, beside TE-D7's other change to that file |
| `.agents/docs/test-architecture.md` and the `test-component` skill | say nothing about run lifecycle today | **gain** the one-shot statement, the retirement, and what a second execution looks like |

Two of those need their reasoning on the record.

**The debug recipe must become `vitest run`, not lose a flag.** `.zed/tasks.json`'s `vitest:debug` invokes `.scripts/zed-test.sh … debug`, whose `run-vitest-debug` calls the binary directly: `DEBUG=1 vitest -c vitest.config.ts --no-file-parallelism --test-timeout=0 --watch <file>`. Deleting `--watch` leaves `vitest -c … <file>`, and the default is `watch: !isCI && process.stdin.isTTY && !isAgent` (`vitest/dist/chunks/defaults.9aQKnqFk.js:48`) — while the task sets `use_new_terminal: true`, so stdin **is** a TTY and the session stays in watch mode. That is worse than a no-op: unlike the extension's child, this process has a real Vite watcher and no `onFilterWatchedSpecification` filter, so a save during a paused debug session would reach `scheduleRerun` with a non-empty list and hit the one-shot guard, converting today's working "save to re-run" into a loud failure instead of into nothing. The disposition is `vitest run`, which is also what TE-D8 already specifies for the root `"test"` script.

What is lost is re-running on save, which is what has been retired. The session itself is unaffected: `--watch` is not what holds it open — `--test-timeout=0` and a test paused on a breakpoint are — and the task, its terminal and the CDP port survive unchanged.

**`browser.api.allowExec` leaves this inventory, and the reasoning is worth keeping.** Revision 4 put it here on the ground that it gates the API server's `rerun`, `rerunTask` and `updateSnapshot` — the browser UI's re-run buttons — and nothing else. The challenge corrected the scope: it **also** gates the in-test `cdp()` API, through `isCdpAllowed` / `assertCdpAllowed` (`@vitest/browser/dist/index.js:3071–3077`, guarding `:3300` and `:3305`). It then concluded that the capability is unused and the change harmless. It is not unused: `packages/drag2/tests/sortable/input-policy.browser.test.ts` imports `cdp` from `vitest/browser` at `:49` and calls it twice, at `:148` and `:1332`. Setting `allowExec: false` would break that suite.

Two reasons settle it against the change, and the second is the stronger:

- the capability is in use, and retiring reruns is no reason to remove an unrelated one;
- denial is a **silent `return`** at each gate, whereas TE-D15's guard already makes a rerun into a consumed process a loud failure. Setting the flag false would replace a loud failure with a silent no-op for exactly those RPCs. The guard is the better instrument, and the gate would work against it.

The flag stays explicitly `true`, which also keeps Vitest's "API server is exposed to network" warning quiet — the condition is `api.allowWrite == null && api.allowExec == null`, so an explicit value of either polarity silences it. `allowWrite` is untouched and already resolves to `false` under the exposed-host branch. Debugging never depended on the gate in any case: the Zed flow drives raw Chrome through `--remote-debugging-port=9222` from the factory's launch args, and Vitest's own breakpoint support calls `provider.getCDPSession` directly (`cli-api.BK8pd4xc.js:2652`), past it.

**The boundary, precisely.** Only _test_ watch is retired. Build and development watch are untouched and remain valid: `just docs-dev`, Vite's and tsdown's own watchers, the CSS plugin's `handleHotUpdate` and `addWatchFile`, and every consequence of TE-D13 — repeated CSS generation still happens on every rebuild and still requires a fresh disposable isolate per generation. Nothing in this decision touches them.

### CSS is evaluated by one fresh isolate per build generation (TE-D13)

The workers buy exactly one thing: a cold ESM registry, so a `.css.ts` graph is evaluated against current file contents. Revision 3 concluded that a persistent Vite environment provides that guarantee and a stronger one. It does not, at the boundary the owner has now stated.

**The owner's boundary decides the fork the challenge identified.** Freshness covers every input affecting generated CSS, including a rebuilt `@ydinjs/tproc`. An in-process evaluator cannot hold it: an externalized dependency is loaded by Node's own process-scoped registry and is permanently stale, and inlining `@ydinjs/tproc` costs 3 946 MiB retained on the challenge's measurement. Measured here by an independent route — a bare specifier resolved through a `node_modules` symlink, exactly `@ydinjs/tproc`'s shape:

| Step | Fresh worker per generation | The host process's own `import()` |
| --- | --- | --- |
| cold | `GEN-1` | — |
| repeat, no change | `GEN-1` | — |
| after the dependency is rebuilt | **`GEN-2`** | `GEN-2` |
| after it is rebuilt again | **`GEN-3`** | **`GEN-2`** — permanently stale |

**The mechanism costs less than what it replaces, on every axis.** All 35 `.css.ts` entries in `packages/material-x`, with the plugin's own two `registerHooks` preloads:

| Arrangement | Total | First entry | RSS | Output |
| --- | --- | --- | --- | --- |
| today — one fresh isolate per entry | 15 312.1 ms | 511.7 ms | — | reference |
| **one fresh isolate per generation** | **1186.7 ms** | 480.7 ms | **412.9 MiB** | **35/35 identical** |
| the same, entries evaluated in reverse order | 1270.5 ms | — | 374.1 MiB | **35/35 identical** |

**Generation ownership.** One generation per Node process, acquired by each plugin instance that needs it and released when the last one is done; the generation terminates when its reference count reaches zero. Three plugin instances participate in a root run — material-x's `browser`, `spec` and `visual` projects each embed `createMaterialXViteConfig`, which carries `constructCSSTokens` — and process-wide sharing is sound because evaluation depends only on file contents, never on the consumer's options: `isProd` reaches `compileCSS`, which is downstream. The measured whole-repository figure is for a process-wide generation.

**Dependency discovery.** The resolve hook reports **the URL `nextResolve` returns**, filtered to `file:`, and filters on nothing else. The current tracker's two rules — only specifiers beginning with `.`, and nothing resolving under `node_modules` — are both removed. Measured over the 35 entries: the current rules report **66** paths, resolved-URL discovery reports **123**, including **29 under `packages/tproc`** — its built artefacts, `default-theme.json` and the 14 token-database JSON files, which are reached by `import(…, { with: { type: 'json' } })` and are therefore module-graph inputs like any other (TE-F18). Node's ESM resolution follows the workspace symlink, so `@ydinjs/tproc` resolves to `packages/tproc/…` and not to a `node_modules` path.

**Invalidation.** Generation-scoped, never entry-scoped. A change to any file in the generation's dependency set, or to any `.css.ts`, discards the generation; the next request creates a new one, which evaluates the complete graph against current files. This is the owner's contract exactly — shared within a generation, complete across generations — and it is also forced by TE-F19: in a shared generation, per-entry attribution collapses to 119 recorded edges against 583 in the per-entry arm, with a median of 3 per entry and **one entry attributing none at all**. Per-entry `addWatchFile` would therefore leave 34 of 35 entries unwatched against a shared token file. Every entry registers the generation's whole set.

**Concurrent requests.** Requests are multiplexed onto the generation over one port with request identifiers; concurrent `load` calls are served by one isolate. Verified against the real plugin, converted: six concurrent `load` calls returned correct output in 582.9 ms and registered 31 watch files. A request arriving while a generation is being discarded is served by the next generation, never by the dying one. What happens to a request **already in flight** when the discard lands is a separate question this paragraph does not answer, and TE-D17 answers it.

**Failure cleanup.** A worker `error` or non-zero `exit` drops the generation and rejects every pending request with the underlying error; the next request starts a new generation. **This is the failure path and nothing else reaches it** — an ordinary watch invalidation is not a failure and must not reject a pending request (TE-D17). **An evaluation failure also discards the generation**, because Node caches a module's evaluation failure permanently: measured, a module that throws keeps throwing the original error in the same isolate after the file is corrected, and a fresh isolate returns the corrected value (TE-F20). Without this rule, fixing a broken `.css.ts` in watch mode would appear not to work until the dev server restarted.

**Corrected 2026-09-12: "discards" was the wrong word for the evaluation-failure case, and the imprecision was load-bearing.** An evaluation failure stops the generation taking new requests; it does not void the snapshot its siblings are evaluating against, because nothing on disk changed — only one module's registry entry is poisoned. The generation therefore **drains**, and while it drains it must stay reachable by invalidation, which a single current-generation slot cannot express (TE-F41). The states this sentence needs, and who owns them, are TE-D18.

**Shared-state protection.** The required property is that output must not depend on evaluation order, nor on which entries share a generation. Held today and measured in both directions: shared generation against one fresh isolate per entry, 35 of 35 byte-identical; forward order against reverse order, 35 of 35 byte-identical. This is a property of the current tree, so it belongs in the demonstration list rather than in an assumption.

**The `.styles.css` id still needs a non-`.css` suffix** (TE-F13) only if a Vite module graph is involved. It is not, under this mechanism: the styles file is loaded by the `registerHooks` `load` preload inside the isolate, and never becomes a Vite module. The virtual-id problem revision 3 hit, and the reverse mapping the challenge showed it had only half-solved, both disappear with the mechanism that created them.

**Both consumer classes are covered without a Vite dev server.** The isolate is a plain `node:worker_threads` worker with two `--import` preloads, so the tsdown build path needs nothing new.

### An invalidation arriving during evaluation supersedes the request (TE-D17)

TE-D13 covers a request that **arrives** during a discard and a request pending when the worker **fails**. It does not cover the request already in flight when an ordinary save lands, and the shipped code reaches that case through the failure path: `watchChange` calls `discardGeneration()`, which calls `fail()`, which rejects every pending request with `CSS evaluation generation was discarded` (TE-F36). A developer saving a token file while a `.css.ts` graph is being evaluated gets a transform error naming a file they did not touch.

**The decision: supersede, never fail.** The owner's standing requirement has two halves, and both are decided by it — a changed input must eventually produce fresh CSS without restarting the dev server, and a stale or failed generation must never publish output.

**Why not the obvious alternative.** Letting an in-flight request settle against the generation it started in looks safer and is not. The change landed mid-evaluation, so modules already loaded hold pre-change content and modules not yet loaded hold post-change content: the result is not merely stale, it is **torn**, and no consumer can tell. In the dev-server path `handleHotUpdate` would re-request the entry moments later and paper over it; in the build path there is no re-request at all, and a Rolldown rebuild would bake a torn stylesheet into the artefact. "Never publish output from a superseded generation" is what rules this out, and it rules it out in the path where the consequence is permanent.

**Required properties.**

- **A discard is not a failure.** It rejects no pending request. Rejection stays reserved for what TE-D13 names: a worker `error`, a non-zero `exit`, and the entry's own evaluation throw — which rejects only the request that threw, with that entry's own error and stack.
- **Every request in flight when its generation is discarded is re-issued against the generation that succeeds the discard**, and resolves with the code **and the dependency set of the generation that actually produced it**. The caller sees one promise that settles once, against one generation's view of the files.
- **No response from a discarded generation is published.** The dying worker may still answer a request that has been re-issued; that answer is dropped, not resolved. Without this the supersession leaks exactly the torn output it exists to prevent.
- **Every generation that still holds pending work is reachable by invalidation**, whether or not it is the one taking new requests. _Added 2026-09-12._ This record said "the generation" throughout and the implementation read it as "the current generation", which is the whole of TE-F41; TE-D18 states the states the sentence needs.
- **Re-issue is bounded, and exhausting the bound is loud.** Writes can arrive faster than a generation completes — a `@ydinjs/tproc` rebuild writes 29 tracked artefacts, and a full 35-entry generation measures 1.2–2.7 s — so an unbounded retry is a livelock. Exhausting the bound rejects with an error naming **concurrent invalidation** as the cause: not a file, and not a stack pointing into a `.css.ts` the developer did not edit. _Corrected 2026-09-12._ "The bound is at least 2" was read as an attempt count and shipped as one, and a count of generations is a count of watcher events (TE-F42). The floor of two survives as a floor — a single supersession is always survivable — and the cap is re-expressed in time by TE-D19.
- **The dying generation is disposed once its last pending request has been re-issued or settled.** This is the existing drain rule in `settle()`, unchanged; the review's `cleanup` pass established that branch is reachable, and supersession gives it a second way to be reached.

**Ownership: the generation module, not the caller and not Vite.** Three reasons, and the third is the one that decides it.

1. The module is the only place that knows a discard landed while a request was in flight. A caller sees a rejection and cannot distinguish a discard from a genuine failure without a sentinel error it must agree to recognize.
2. Three plugin instances share one generation in a root run. Caller-side retry is three implementations of one rule.
3. **This record has rejected caller-dependent correctness every time it has met it** — the reporter that must be an instance rather than a name, the carrier that must be in every configuration rather than opted into. An invariant enforced by the least careful consumer is not enforced. The same reasoning applies here and reaches the same answer.

**What the caller observes, stated so it can be tested.** `evaluate(path)` resolves with CSS evaluated wholly against one generation's files, or rejects with the entry's own error, a worker crash, or the bounded-supersession error. **It never rejects because of an ordinary save.** Latency under invalidation is the duration of the generation that finally completed, not of the first one started.

**One interaction to carry into implementation.** `evaluate` currently closes over the generation it started in and returns `new Set(generation.deps)` from it. Under supersession that lexical capture is the **wrong** generation, and the returned set must come from the one that produced the code. The review's `cleanup` pass separately found the copy itself unjustified; both are true, and fixing the copy without fixing the source would silently register the wrong watch set.

### The generation lifecycle has three states, and the module owns all of them (TE-D18)

TE-D13 and TE-D17 both speak of "the generation" and of discarding it. The implementation holds exactly one slot — `current` — and makes it carry two different facts: _which generation new requests are issued to_, and _which generation exists at all_. The two come apart the moment an entry throws, and TE-F41 is the consequence: a generation demoted by a throw is invisible to `discardGeneration`, its siblings go on evaluating across a change the module was told about, and a real Vite dev server publishes a torn stylesheet.

**A generation is in exactly one of three states.**

- **Accepting.** New requests are issued to it. At most one generation is accepting, and there may be none.
- **Draining.** It takes no new requests, and **its snapshot is still valid**, so the requests still attached to it may settle and publish. This is the state an entry's own evaluation failure produces: Node poisons that module's registry entry permanently (TE-F20), which is a fact about the isolate and not about the files, so a sibling's answer is neither stale nor torn.
- **Abandoned.** An invalidation has landed, so its snapshot is void. **No answer of its may be published**, it holds no requests, and its worker is terminated at once rather than left to finish work whose result cannot be used.

**The transitions, and the one that was missing.**

| From | To | Trigger |
| --- | --- | --- |
| — | Accepting | the first request arriving with no accepting generation |
| Accepting | Draining | an entry's own evaluation throw — which rejects that request with that entry's error and stack, and nothing else |
| Accepting | Abandoned | an invalidation |
| **Draining** | **Abandoned** | **an invalidation** — the transition one slot cannot express, and the whole of TE-F41 |
| Draining | disposed | its last attached request settles |
| Accepting or Draining | failed | a worker `error`, a non-zero `exit`, or the last consumer releasing — every attached request rejects with that error |

**Ownership: the module owns the set of undisposed generations, and `current` names at most one member of it.** Every operation whose subject is _the world changed_ or _the process is going away_ ranges over the set and never over `current`. The module exports exactly two — invalidation and the last consumer's release, which is also how a harness teardown reaches a generation — and **both are wrong today in the same way**, because both begin by returning when the slot is empty. TE-F41 reports the first; the second is the same defect on the release path, where a generation draining when the last consumer leaves is neither rejected nor disposed. This is the reasoning TE-D17 used to place supersession in the module rather than in the caller, applied one level down: an invariant enforced by whichever slot happened to be set is not enforced.

**Required invariants.**

1. At most one generation is accepting.
2. A request is attached to at most one generation, and never to an abandoned one.
3. **Detachment precedes termination, and only an attached request can be resolved.** This is what makes a dying worker's answer unpublishable, and it must now hold on the draining→abandoned path as well as on the accepting→abandoned one. The mechanism already exists — the pending map is emptied before disposal, and the review verified that a dropped response finds no request — and what is missing is only the path that reaches it.
4. After the last consumer releases, no generation is undisposed, no request is attached or parked, and nothing armed keeps the event loop alive.

**Why the set, and not a validity stamp compared when a response arrives.** A per-generation epoch checked at settle time would make the reachability problem disappear without introducing a set, and it is the wrong trade three times over. TE-D17 requires latency under invalidation to be the duration of the generation that _finally completed_, which means the re-issue starts when the invalidation lands and not when the dead worker gets round to answering. A torn evaluation in flight is doing no useful work, and the moment it must stop occupying a core is exactly the rebuild storm that produced it. And invariant 4 needs the set regardless, because a release arriving while a generation drains has to reach it — so the stamp would be a second mechanism deciding what the set already decides.

**A cost this makes visible and does not change.** After a `.css.ts` throws, the next request creates a second generation against the same files, so an authoring error costs one extra worker until the draining one finishes. That is TE-D13's existing price for TE-F20 and it is not reopened here; what changes is only that the draining generation stops being invisible.

### Supersession is bounded by a stability budget, not by an attempt count (TE-D19)

**What the shipped bound counts.** A request records the generations it has been issued to and rejects at the second. Each tracked change is its own `watchChange` call and therefore its own discard, so the counter is denominated in **watcher events**. Two tracked files written while one evaluation is in flight exhaust it, in both real consumers (TE-F42) — which is a `git checkout`, an editor's save-all, a formatter pass, or any build emitting more than one artefact.

**Why no other constant is the answer.** Two reasons, and the second decides it.

1. **The event count is a property of the watcher, not of the change.** The review measured two events for two files and also two events for twenty-nine, because the watcher batches on this filesystem. A constant chosen against that number is calibrated against a batching behaviour that a network mount, a polling watcher or another platform does not share, and it would transfer nowhere.
2. **The hazard is a rate, and a count cannot bound a rate.** What makes retry a livelock is not that many events arrived; it is that changes keep arriving faster than a generation completes _while still leaving it room to start_. Every terminating rebuild — which is every real one — produces a burst of unbounded size and bounded duration, so every count-based bound mistakes some burst for a storm, and raising the count only moves which burst it mistakes.

**The supported progress domain, stated before the bound that operates inside it.** _Added 2026-09-12 by owner disposition, against TE-F43._ A request is guaranteed to make progress when the tracked set becomes quiescent for the coalescing window at least once. That is the domain, and inside it three things are owed: a finite multi-file burst coalesces and completes, however many events it is delivered as; a parked request is attached to a successor as soon as one window of quiescence occurs; and a request whose successors keep being superseded — invalidation slower than the window but faster than a generation completes — is abandoned on the budget, loudly.

**Outside it, no progress is owed.** An invalidation stream that indefinitely arrives at a gap shorter than the coalescing window means the input has **never become stable enough to evaluate**: there is no snapshot to evaluate against, no generation is created, and the repository does not require a trailing debounce to complete while something is continuously re-arming it. What is owed there is unconditional and is **correctness, not progress** — nothing stale or torn publishes, no worker is created, no handle is retained, and the request completes as soon as the stream stops. TE-F43 is the measurement that locates the boundary exactly at the window, and the boundary is intentional rather than a defect the record failed to see.

**The bound, which governs generations that actually start and are superseded. A request is abandoned when it has been superseded at least twice and the first of those supersessions is longer ago than the stability budget.**

- **A supersession is counted when the request is detached from a generation** — one per generation destroyed under it. An invalidation arriving while the request is parked and attached to nothing counts nothing, which is what makes the unit a _logical_ supersession rather than an event (TE-D20), and which is also why the counter does not advance outside the progress domain. That consequence is intended and is not repaired.
- **The floor of two is a floor and not a cap.** It carries TE-D17's guarantee that a single supersession is always survivable, and it keeps a legitimately long evaluation followed by one late save from being abandoned on the clock alone. **It is a count, and inside the progress domain it is never the binding constraint**: a domain that guarantees a window of quiescence guarantees a successor, and a request the budget could abandon has been superseded far more than twice — 35 times at the rate demonstration 28 drives, 168 at a rate just above the window. Where the floor _is_ binding, no successor was ever created and no progress was owed.
- **The clock runs from the request's first supersession and never resets.** Only a request that never completes accumulates time, and a request fails to complete for this reason only while invalidation keeps arriving.
- **It is evaluated when an invalidation arrives, and at no other time** — the only moment at which the budget can be exceeded and the only moment at which the request's fate can change. The budget therefore arms **no timer of its own**, and the four exit arms the review measured with `process.getActiveResourcesInfo()` are untouched by it.
- **The diagnostic names the fault and interpolates the offending values**, which is what CONTRIBUTING §1.3 asks of a message — here the supersession count and the elapsed span, in the shape of `CSS evaluation abandoned: superseded 37 times over 10.4s of continuous invalidation`. It names no file, enumerates no path, and its stack points into the generation module: the properties TE-D17 already required and the review verified, unchanged.
- **Nothing in the policy reads which consumer delivered the invalidation.** Vite's watcher and Rolldown's co-tenant path both arrive at `watchChange`, and the module neither can nor may distinguish them. TE-D17's ownership argument settles that and is not reopened.

**The budget's value is ten seconds, and the derivation rather than the number is the contract.** The budget must exceed the wall-clock span over which any terminating rebuild writes tracked files. The measured ground is a full 35-entry generation at 1.2–2.7 s (TE-D13) and a largest tracked burst of `@ydinjs/tproc`'s 29 artefacts inside its own build step. Ten seconds is more than three times the worst measured generation and an order of magnitude beyond the burst, and still short enough that a runaway writer surfaces inside one developer's attention span rather than hanging a build indefinitely.

**The storm's cost is bounded, and the bound is worth stating.** A request the budget eventually abandons can, at a rate just above the window, cause one generation per window for the budget's duration — at most ⌈budget ÷ window⌉ ≈ 200 workers, measured at 168 over ten seconds at a 60 ms interval. That is the priced cost of TE-D20's rule at rates near its threshold, and it is the thing the old attempt cap was accidentally buying. It is **bounded**, where per-event creation was not, and it is reached only in a regime that then fails loudly.

**And the value is a threshold on patience, not on correctness** — which is the whole of what re-uniting the bound buys. At any budget no output is torn, none is stale, and none from an abandoned generation is published; the budget decides only when the module stops waiting. The shipped constant did not have that property: its value decided whether an ordinary two-file save succeeded or failed, so it was a correctness parameter wearing a tuning parameter's clothes. A later pass may move ten seconds by re-deriving nothing but its own patience.

### Invalidation is coalesced before a successor generation is created (TE-D20)

A separate decision with a separate justification, required by the one above rather than by anything in TE-D17.

**What removing the cap uncaps.** The discard path re-issues eagerly, and re-issue creates a generation on demand. With the attempt cap gone, a storm delivering a change every few milliseconds spawns a worker per event for as long as the budget lasts — thousands of `Worker` constructions before the budget fires. The count-based cap was preventing that by accident, and removing it without replacing the effect trades one loud failure for a worse quiet one.

**Required property: the number of generations created is bounded by the number of times the tracked set goes quiet, not by the number of change events.**

- An invalidation detaches and **parks** the requests it affects; it does not create a successor.
- A successor is created once the tracked set has been quiet for a coalescing window, and every invalidation arriving inside the window re-arms it.
- **While a window is open, a newly arriving request parks too.** One rule and no bypass: a request allowed to create a generation mid-storm defeats the property, and it is in any case a request evaluating against files that are still moving.
- **A parked request's budget is evaluated on every invalidation that reaches it**, in flight or parked, because a request parked between two generations is inside the progress domain and must not escape the budget by being momentarily attached to nothing. _Corrected 2026-09-12._ The clause previously justified itself by "a storm severe enough that no generation ever exists would never consult the budget at all", and that reason is **withdrawn**: in that regime the budget is evaluated on every invalidation and correctly declines to fire, because the request's supersession count cannot advance when nothing was ever created to destroy (TE-F43). The requirement stands; only its stated purpose was wrong.
- **The window must not keep the process alive.** An `unref`'d timer satisfies this — `process.getActiveResourcesInfo()` reports nothing for one, verified in this pass — and the last consumer's release cancels it (TE-D18, invariant 4).

**The window is a performance parameter, not a correctness parameter.** At a window of zero the design is still correct and merely wasteful; at a large one it merely adds latency. **Fifty milliseconds**, against a generation of 1.2–2.7 s: under four per cent of one evaluation, and long enough for one process's multi-file write to be delivered as a single wave on this filesystem.

**The window is armed unconditionally, and it earns the 50 ms.** Arming even when nothing is pending costs the next dev-server or rebuild request one window and removes the special case that would otherwise let that request create a generation in the middle of a burst. An evaluation started inside a multi-file write is a guaranteed supersession; waiting the window out is cheaper than the generation it avoids.

**One consequence worth stating.** Under this rule the 29-artefact rebuild is **one** supersession rather than two, so TE-D19's floor of two is not reached by ordinary work at all and the budget is consulted only under genuine churn. Verified: a watcher that delivered the same 29 files as **31** separate events still produced two generations and one supersession, so the generation count is flat across a tenfold change in the event count — a stronger reading of the property than the batched pair this record first measured against.

**The window bounds the progress domain, and that is deliberate.** _Added 2026-09-12 by owner disposition._ Re-arming on every invalidation means a stream with a sub-window gap holds the window open indefinitely and creates nothing (TE-F43). That is the correct reading of the input, not a gap in the design: a tracked set that never holds still for fifty milliseconds has not presented a state to evaluate. **No defence is added for it** — not a maximum wait, not periodic generation creation regardless of quiescence, not an event counter, not a second clock. Each would be machinery serving a regime no consumer of this repository produces, and each costs something the design already decided against: a maximum wait is a timer and a handle, periodic creation is the per-event spawn TE-D20 exists to prevent applied on a schedule, and an event counter is the watcher-dependent unit TE-F42 established does not transfer. CONTRIBUTING §1.1 is the standing rule and it applies here — the integrator who arranges for a file to change every twenty milliseconds forever is not owed a stylesheet.

### The resource contract: one safety gate, one comparative gate, and evidence that gates nothing (TE-D21)

TE-F35 wrote the acceptance-signal table and TE-F37 confirmed it unchanged. Four alternating whole-repository runs have since shown that its first row cannot be met at any commit on a container carrying an ordinary resting load (TE-F44), so the table gated on a quantity the run does not own. This decision replaces it, and it separates four things the table ran together.

**The reasoning that chose the axis predates the measurement that forced the change, and that matters.** TE-F35 already concluded that "anonymous peak against the working ceiling is the figure this record should have required from the start", and TE-F37 already established that anonymous headroom is 2.3–2.9× the `memory.current` headroom in every run measuring both. Neither applied the conclusion to the requirement. What TE-F44 supplies is not a new reason to prefer the anonymous axis; it is proof that a correction the record had already made was never finished. **The number does not move. The axis it is read on is the one this record argued for twice.**

**And the relaxation is real, so it is stated rather than absorbed.** `memory.current` stops being a gate. That is a genuine loosening and it is accepted on one ground: the quantity is not the run's to control.

**The hard safety condition — does the run survive? Gated, absolutely: `memory.events.oom_kill` is 0, and peak anonymous memory is at or below 13 107 MiB, 80 % of the cgroup cap.**

This is the axis because it is the axis the kernel acts on. Page cache is reclaimable and is evicted under pressure; anonymous pages are not, and are what the OOM killer must free. A run whose `memory.current` approaches the cap while holding reclaimable cache is in no danger; a run whose anonymous peak approaches it is one allocation from being killed. `oom_kill` alone is necessary and not sufficient — it reports the outcome with no margin, and a run one page short of death reports zero — so the ceiling supplies the margin and `oom_kill` supplies the ground truth.

**The regression signal — did this change make the suite worse? Gated, comparatively: peak anonymous memory does not exceed the reference arm's by more than 5 %, where the reference arm is the same suite at the pre-change commit, run alternately on the same container, with the two arms' resting baselines agreeing within 500 MiB.**

Peak anonymous memory is the quantity the repository's own work moves: the workers it starts, the browsers it launches, the graphs it evaluates. No absolute figure can gate it, because the peak sits on a baseline the run does not set — the four sampled runs rest between 6361 and 7923 MiB on one container. And no delta can gate it either, because the delta is itself baseline-dependent: the same commit measured Δ 8908 MiB at a baseline 1361 MiB below the run that measured Δ 7075 MiB. **A comparison is therefore the only sound form**, and it is sound only against a contemporaneous arm.

The tolerance is derived from what has been measured and the derivation is thin, which is recorded rather than hidden. The one matched-baseline pair available differs by 0.5 % on peak anonymous memory; the one mismatched pair, 1562 MiB apart at rest, differs by 4.4 %. Five per cent sits above both, so it flags only a change an order of magnitude larger than the noise the matched pair shows, and the baseline precondition is what keeps the mismatched case from consuming the whole tolerance. **Two pairs is not a noise distribution.** A pass that widens it should widen the tolerance's evidence, not the tolerance.

**Comparative evidence explains a divergence and gates nothing.** Alternated base/head runs are the method by which the regression gate is read, and their full output — both peaks, both baselines, both deltas, duration — is reported so that a divergence can be explained rather than absorbed. The comparison is evidence for the gate above; it is not a second gate, and no row of it is a threshold.

**Reported, never gated.** Peak and Δ `memory.current`, the resting baseline of each arm, Δ anonymous memory, and duration. Each is a function of container state the run does not own, and each is recorded because an unexplained movement in any of them is a reason to look.

**What `memory.current` keeps, because it is genuinely informative.** Its margin says whether a second workload fits in the cgroup beside the run. TE-F37 put it exactly — 951 MiB of `memory.current` margin means a concurrent second workload of any size will not fit, "which is a statement about scheduling runs, not about the run". That statement survives intact; it simply never was a pass or a fail for the suite, and it is now recorded as what it is.

**Nothing here weakens what the design must achieve.** The mechanisms, the browser serialization, the teardown and the one-shot contract are untouched, and the ceiling's number is untouched. What changes is which measurement the ceiling is read from, and the honest admission that a threshold nobody can meet had stopped being a threshold before this pass arrived — the only way to record a passing run was to explain the number away, which the record had been doing.

### The requested worker limit, and what constrains it (TE-D14)

The precedence order stands; three interactions the order did not account for are added, and the CLI route is narrowed to a contract that can be stated exactly.

Precedence, highest first:

1. **`VITEST_MAX_WORKERS`** — applied inside the per-project `resolveConfig` (`coverage.DM_a_rWm.js:380`), after every other resolution including the `fileParallelism: false` clamp, so it wins unconditionally and needs no code from us. It is the only route that reaches the VS Code extension, through `vitest.nodeEnv`; the keys the extension fixes for itself are `VITEST_VSCODE_LOG`, `VITEST_VSCODE`, `TEST`, `VITEST_WS_ADDRESS`, `VITEST`, `NODE_ENV` and `FORCE_COLOR`, and this is not among them.
2. **`parseArgs(process.argv)`** in the shared factory, applied as each project's `maxWorkers`, so that `vitest run --maxWorkers=N` behaves as its own documentation says despite TE-F1.
3. **The factory default**, TE-D3's explicit value — two pages per browser project. This, not the flag, is what bounds the editor, and the ground it is carried on has been re-derived: see below.

**The browser page bound stays at two, on a ground this design can still state.** The comment the factory carries is revision 2's — "the editor cannot separate processes and the root configuration is what it loads" — and half of it expired inside this same design. That half was about **retention**: revision 2 chose two because TE-F4 held seven browser projects at ≈1.26 GiB each simultaneously, making four "strictly worse" against an ≈8.8 GiB floor. TE-D12 and TE-F33 release each provider at its group boundary, so seven are never held at once and that comparison has lost its subject (TE-F39). The surviving half is still true and still load-bearing: the root configuration is what the editor loads, so the factory default is what bounds an editor run, and no flag reaches it.

**The ground that justifies two at head is headroom, measured.** Groups are serialized, so within the browser phase concurrent Chromium pages are exactly this bound; it is the most direct multiplier of that phase's memory. The shipped root run clears the 13 107 MiB ceiling by **951 MiB on `memory.current` and 2712 MiB on anonymous memory** (TE-F37). A change that multiplies the browser phase's page count against a margin that size is not free, and no arm has measured it.

**Two is kept, not preserved.** The duration evidence for four is real — `browser/drag2` at 12.3 s and 11.9 s against 15.3 s and 17.0 s, identical results in all four arms — and it is an argument to take the measurement, not an argument to make the change without it. **The demonstration that settles it** is one whole-repository run at bound 4, on a container at a baseline comparable to this record's, reporting anonymous peak and `memory.current` peak against 13 107 MiB together with the run duration. Four wins if it clears the ceiling on **both** axes with no less margin than two shows today and the whole-run duration improves; two stands otherwise. The value may not move on per-project timings alone: the browser groups are serialized, so a per-project gain is not a root-run gain until a root run says so.

**The environment variable does not accept the percentage form.** It is a bare `Number.parseInt`, and `resolveInlineWorkerOption` — which does understand `N%` — runs earlier in the same function (`:222` against `:380`), so the value is never re-resolved. `VITEST_MAX_WORKERS=50%` yields **50 workers**. This footgun sits on the route recommended for the extension and belongs beside the route.

**`--sequence.*` erases every project's `groupOrder`.** `sequence` is one of the 20 names in the CLI override allow-list, and the merge is `test: { ...options.test, ...cliOverrides }` (`:11129`), which replaces the object wholesale. A stray `vitest run --sequence.shuffle` therefore collapses every project to `groupOrder: 0` — which, by TE-F17, both destroys the serialization and arms the sentinel. TE-D12's pre-execution invariant check is the answer; the two decisions must be read together.

**Projects sharing a group must have equal resolved `maxWorkers`**, or `groupSpecs` throws before executing anything (`:3826`). TE-D12 puts every non-browser project in one group, so the factory must derive their `maxWorkers` from a single resolved value. It does, under all three precedence routes: the environment variable applies the same number to every project, and so do the flag and the default. The constraint is loud rather than silent, but neither revision 3 nor its predecessors recorded that the two decisions are jointly constrained.

**That single value must be set by the factory, and it must be below Vitest's CPU default.** This record required equality across the group and said nothing about magnitude, and equality alone is satisfied by leaving every non-browser project at Vitest's own `cores - 1`. Executing it showed that is the wrong value: several files in that group spawn a build of their own — tsdown, Rolldown, Brotli — so a worker counted as one core demands several, and at `cores - 1` the group oversubscribes badly enough to time out three tests that do no more than read what they just built (TE-F34). A root run that fails three tests is a failed root run, so this is a correctness property and not a performance preference.

Stated as the contract:

- **The factory sets the non-browser group's `maxWorkers` explicitly.** Falling through to Vitest's default is a defect, not a default.
- **The value is one number shared by every project in the group**, which is what `groupSpecs` already requires (`:3826`).
- **It is below `cores - 1`**, and the justification is intra-worker parallelism: the group's unit of work is not a single-core test file.
- **The root run is green at the chosen value.** That is the acceptance test for any future change to it.

**The derivation is implementation tuning inside that contract, and it is recorded here so the two do not disagree silently.** The shipped value is `Math.max(Math.floor(availableParallelism() / 2), 1)` — six on this twelve-core container. It is not an invented constant: it is character-for-character Vitest's own bound for a run that expects other work on the machine (`resolveMaxWorkers`, `cli-api.BK8pd4xc.js:3768–3770`, which returns `Math.max(Math.floor(numCpus / 2), 1)` under `watch` and `Math.max(numCpus - 1, 1)` otherwise). The repository adopts the watch-mode bound for a non-watch run for a different reason than Vitest's — competing builds inside the run rather than an editor outside it — and arrives at the same number. A future pass may change the derivation without amending this decision, provided the four properties above still hold and the root run is re-measured; it may not return the group to the default.

**The CLI contract, stated exactly.** `parseArgs` runs with `strict: false`, because Vitest passes many flags it does not declare. The accepted forms are a positive integer and `N%`, matching Vitest's own inline semantics; anything else fails the configuration load with a diagnostic rather than being silently coerced. Under the extension the route is inert by construction — `cliArguments` are turned into an options object by `parseCLI` and never become `process.argv` (TE-F14), and `parseCLI` runs with `allowUnknownOptions: false`, so a malformed extension setting fails the run rather than being ignored. That inertness is acceptable only because the factory default bounds the editor.

## Findings

### The last-module teardown trigger fails deterministically (TE-F16)

`onTestModuleEnd` is emitted from `TestRun.updated` (`cli-api.BK8pd4xc.js:12661`), reached from the `onTaskUpdate` RPC method at `:2734`, and `Vitest.report` at `:13983` awaits every reporter. The browser page is awaiting the reply to its own RPC while the hook runs, so closing the provider there destroys the page that is waiting.

Measured on a two-browser-project fixture, three and four modules, `maxWorkers: 1`:

| Trigger | Modules | Tests | Unhandled errors | Exit | Chrome at end |
| --- | --- | --- | --- | --- | --- |
| none (control) | 8 | 11 | 0 | 0 | 11 |
| last `onTestModuleEnd` | 8 | 11 | **2** | **1** | 6 |
| **first module of next group** | 8 | 11 | **0** | 0 | **3** |

Both errors in the middle arm are `Failed to run the test <last module of the project>`. In that arm one provider also never reported closing at all — the close promise did not settle before the run ended.

This disqualifies revision 3's acceptance check, which recorded that "the string `provider was closed` appears in no log". That string is not what this failure emits, so revision 3's whole-repository arms could each have carried one `Failed to run the test …` per browser project and been read as the excluded `tproc` failure. **Their pass status cannot be certified**, which is one reason this pass re-measured rather than inheriting.

### Group order zero is a sentinel, not a number (TE-F17)

Measured on the same fixture, two browser projects at `maxWorkers: 1` and one node project:

| Assignment | Observed order |
| --- | --- |
| b1=0, b2=1, n1=2 | b2 → n1 → **b1 last** — b1 demoted to the trailing catch-all group |
| b1=0, b2=0, n1=1 | n1 first, then **b1 and b2 interleaved** — serialization gone entirely |
| **b1=1, b2=2, n1=3** | b1 → b2 → n1 |

The trap fires exactly in the regime this design moves toward, and `VITEST_MAX_WORKERS=1` reaches the same field and arms it the same way.

### Resolved-URL discovery sees the whole graph (TE-F18)

Over the 35 entries, with both rules of the current tracker evaluated alongside the resolved URL from `nextResolve`:

| Discovery rule | Distinct paths |
| --- | --- |
| current — relative specifiers, minus `node_modules` | 66 |
| resolved `file:` URLs | **123** |
| of which `packages/material-x` | 88 |
| of which **`packages/tproc`** | **29** — built artefacts, `default-theme.json`, 14 token JSON files |
| of which under a real `node_modules` path | 3 |
| non-`file:` (`node:` builtins) | 6 |

The freshness boundary this establishes is precise: **every input reached through the module graph is discoverable**, and inputs read through `fs` rather than imported are not. There are none today — the token database is reached by `import(…, { with: { type: 'json' } })` in `packages/tproc/src/DB/DB.ts`. One boundary remains and should be written down rather than discovered: a dependency consumed from a real `node_modules` directory rather than through a workspace symlink falls under Vite's default watcher ignore, so its rebuild would not trigger invalidation. `@ydinjs/tproc` is not such a dependency.

### Per-entry attribution collapses inside a shared generation (TE-F19)

Segmenting the resolve trace by the entry being evaluated, in one shared isolate: **119** attributed edges in total against **583** in the per-entry worker arm, a median of **3** per entry, the first entry absorbing 17 and **one entry attributing none at all**. The union across the generation is complete; the per-entry split is not, because a module already loaded for an earlier entry resolves none of its own imports again.

### Node caches an evaluation failure permanently (TE-F20)

| Step                                        | Result     |
| ------------------------------------------- | ---------- |
| import a module that throws                 | `BOOM`     |
| correct the file, re-import in same isolate | **`BOOM`** |
| correct the file, import in a fresh isolate | `FIXED`    |

### No in-process signal separates an ordinary editor run from a continuous one (TE-F21)

`vitest.explorer@1.50.8`, `dist/workerNew.js`, builds the `createVitest` options with **`watch:!0` unconditionally** — a bare literal, no ternary, no guard — for every run the extension makes. Ordinary and continuous runs reach the child through the same spawn with the same argv and the same environment keys; nothing named `continuous`, `once` or a mode flag exists anywhere in the init payload or is forwarded into `createVitest`. The reuse guard confirms revision 3's TE-F12 — `spawnForRun`'s reuse branch is gated on `currentMeta`, an instance field of an object `executeRun` creates fresh, so an ordinary run always spawns and is disposed in `finally`, while continuous reuses the long-lived instance.

The nearest thing to a continuous-only marker is the `watchTests` RPC, called only from `syncWatcher` on the continuous runner subclass. It is **not** the only RPC the extension sends its worker — `runTests`, `updateSnapshots`, `onFilesChanged`, `onFilesCreated`, `unwatchTests`, `getFiles`, `collectTests`, `cancelRun` and others share that channel — and no claim that it is may enter this design. What is specific to it is its effect: it is the call that enables the worker's watch tracking. Either way it travels between the extension and its own worker and is invisible to a Vitest reporter or plugin, so it cannot gate anything here.

**Where a continuous rerun actually comes from**, which matters because it is not the child's own watcher. The extension creates Vitest with `server: { middlewareMode: true, watch: null }`, and Vite installs a **noop** watcher in exactly that case (`vite/dist/node/chunks/node.js:25752–25757`). File changes reach the child by being **forwarded**: the extension's own file-system watcher calls `bt.onFileChanged`, which — only when that object's `currentMeta` is set, i.e. on the long-lived continuous or debug process — sends the `onFilesChanged` RPC, whose worker handler is `onFilesChanged(e){ e.forEach(f => this.vitest.watcher.onFileChange(f)) }`. That reaches `VitestWatcher`, `onWatcherRerun` and `Vitest.scheduleRerun`, which has no `config.watch` guard of its own. Changes arriving while a persistent process is still spawning are buffered in `_pendingFileChanges` and flushed on spawn.

Three independent mechanisms therefore keep an **ordinary** editor run from producing a second consuming execution, and none of them is `watch`: the child's watcher is a noop; `executeRun` builds a fresh API object that is never registered with the extension's watcher, so nothing is forwarded to it; and even a delivered change would be filtered out by the worker's `onFilterWatchedSpecification`, whose `shouldRunSpecification` returns `false` until `watchTests` enables tracking — leaving an empty, non-consuming execution. Continuous Run is the only path that produces a non-empty rerun, which is exactly the path TE-D16 retires.

**Consequence.** `watch === false` is not merely a weak proxy — it is the wrong question, because the one editor path whose lifecycle is provably one-shot is marked `watch: true`. A one-shot lifecycle cannot be _detected_; it can only be **declared**. Revision 4 read that as "declared by the entry point"; the owner has since declared it for the repository, so TE-D15 states it as a property of every Vitest process this repository starts, and TE-D16 retires the modes that would contradict it.

### A retained generation worker prevents a clean process close (TE-F22)

The same single-project command, with and without the converted plugin:

| Plugin | Outcome |
| --- | --- |
| pristine | exits cleanly |
| converted, generation worker retained | `close timed out after 10000ms`, then Vitest forces the exit |

`worker.unref()` is not sufficient; the parent's `MessagePort` keeps the loop alive. The whole-repository run completed and reported correctly and then paid the 10 s close timeout. Teardown is not the cause — with the pristine plugin the fixture's `vitest.close()` took 339 ms without teardown and **4 ms with it**.

**The handle is now identified rather than inferred**, which settles one of revision 4's own challenge grounds. Measured on a host/worker fixture holding a parent-side `port.on('message')` listener — the shape a multiplexed request port must have:

| Disposition                       | Result                     |
| --------------------------------- | -------------------------- |
| nothing                           | still alive at 1552 ms     |
| `worker.unref()` only             | **still alive at 1550 ms** |
| `worker.unref()` + `port.unref()` | exits in 50 ms             |
| `worker.unref()` + `port.close()` | exits in 51 ms             |
| `worker.terminate()`              | exits in 52 ms             |

**The parent-side `MessagePort` with a live `message` listener is the retained handle**, and `terminate()` is sufficient because it detaches the port. Unref-ing the worker without touching the port is the one disposition that looks correct and is not. The challenge reports the same rule from a fixture in which `worker.unref()` alone sufficed when the worker used a one-shot listener; here the parent held a persistent listener in both arms and it did not, which is the sharper statement of the same fact — the parent side is what holds the loop.

**`closeBundle` is the right backstop** behind reference-counted release. Vite's plugin container close calls `hookParallel("closeBundle", …)` unconditionally (`vite/dist/node/chunks/node.js:30185`), while `buildEnd` at `:30184` is gated on environment and server options; `closeBundle` therefore fires for a dev-server close and for a rolldown build alike.

### A plugin can install a reporter that no flag can remove (TE-F24)

`configureVitest` is a plugin hook invoked at `cli-api.BK8pd4xc.js:13152` with `{ project, vitest, injectTestProjects, … }`, awaited in `Promise.all`, and `vitest.config` there is the same object `createReporters(resolved.reporters, …)` reads at `:13177`. Measured with `--reporter=dot` on the command line, which had already replaced the configured reporters:

```
[oneshot] configureVitest: same object as resolved? true  reporters before: [["dot",{}]]
[oneshot] reporters after: 2
[oneshot] reporter constructed and initialised
[oneshot] onTestRunStart #1 specs=1
```

### Reporter errors are not caught, so a reporter can abort a run (TE-F25)

`Vitest.report` is `await Promise.all(this.reporters.map((r) => r[name]?.(…)))` with no `try`/`catch` (`:13983`), and `runFiles` awaits `_testRun.start(specs)` before `createPool`, before `initializeGlobalSetup` and before `pool.runTests`. Measured on an instance created with `watch: true`:

| Run | Modules executed | Outcome |
| --- | --- | --- |
| 1 | 8 | passed, 0 errors, both providers released, Chrome back to baseline |
| 2 | **0** | **threw** `this Vitest process has already executed a test run` |

### The extension appends to configured reporters (TE-F26)

`workerNew.js`'s own plugin: `let t = o(e.test.reporters); t.length || t.push(['default', {isTTY:!1}]); t.push(s); e.test.reporters = t`. It passes `reporter: void 0` into `createVitest`, so Vitest's CLI-replacement branch — guarded by `if (cliReporters.length)` — is not taken. A reporter declared or installed by the repository's configuration therefore runs inside the extension's child process.

### An empty specification list emits a run start without executing (TE-F27)

`cli-api.BK8pd4xc.js:13463` calls `_testRun.start([])` and `_testRun.end([], [])` when no specification matched, and only then evaluates `if (!this.config.watch || !(this.config.changed || this.config.related?.length)) throw new FilesNotFoundError(this.mode);` at `:13470`. **The run start precedes the throw**, which is the whole of what TE-D15 needs: the carrier's `onTestRunStart` sees an empty list and declines to spend the lifecycle before any of this is decided. This is why TE-D15 counts only non-empty executions, and it holds whichever way the condition goes.

**Revision 4's second sentence was wrong and is withdrawn.** `watch: true` alone does not suppress `FilesNotFoundError` — the condition needs `changed` or `related` as well. Measured here on a `createVitest` instance with an impossible filter:

| Arms | Reporter saw | Outcome |
| --- | --- | --- |
| `watch: true` | `specs=0` | **throws `No test files found`** |
| `watch: true` + `related: [...]` | `specs=0` | returns without throwing |

The extension reaches both arms. `spawnForRun` passes `related: 'related' in e ? e.related : void 0`, set only by the "run related tests" gesture on a source file — the one that warns "Pick a source file to run related tests" when given a test file. Every ordinary gesture leaves `related` undefined, so an editor filter that matches nothing raises rather than reporting a silent success. That is **louder** than revision 4 claimed, not quieter, and it is Vitest's own behaviour either way: this design neither creates it nor claims it.

### `allowExec` gates reruns and snapshot updates, and denial is silent (TE-F28)

`cli-api.BK8pd4xc.js:8982`, `:8987` and `:9036` gate `rerun`, `rerunTask` and `updateSnapshot` on `config.api.allowExec`, each with the comment "silently ignore exec attempts if not allowed" and a bare `return`. It does **not** gate `browser.commands`, which the factory also configures — but it does gate one more thing revision 4 missed: the in-test `cdp()` API, through `isCdpAllowed` / `assertCdpAllowed` (`@vitest/browser/dist/index.js:3071–3077`, guarding `:3300` and `:3305`). That capability is in use — `packages/drag2/tests/sortable/input-policy.browser.test.ts` imports `cdp` from `vitest/browser` at `:49` and calls it at `:148` and `:1332` — which is why TE-D16 leaves the flag alone. Vitest's own breakpoint support does not pass the gate: it calls `provider.getCDPSession` directly (`cli-api.BK8pd4xc.js:2652`).

### The final group is released by process close, not by a boundary (TE-F29)

The boundary mechanism releases a project when a **later** group's first module starts, so a project occupying the final group is never released by it. Revision 4 read its own root-run log as evidence that "every browser project is released, including the last"; that holds because the root configuration's non-browser projects sit in the highest group, and it is a property of that configuration rather than of the mechanism.

Measured on a fixture filtered to one browser project — which is what a project-filtered run instantiates, because `--project` rejects non-matching projects during resolution:

| Quantity                      | Value                |
| ----------------------------- | -------------------- |
| projects resolved             | `b1 (chromium)` only |
| boundary closures             | **0**                |
| Chrome baseline               | 6                    |
| Chrome during run             | 10                   |
| Chrome after `vitest.close()` | **6**                |

The provider is released by `Vitest.close()` → `pool.close()` → `browserPool.close()`. Safe, but not the mechanism the design credits.

The configurations whose final group is a browser group are ordinary ones: `packages/box-quad`'s entire per-package configuration declares exactly one project, `browser` (`.scripts/vitest-config.ts:293`); material-x's `test-behavior`, `test-spec` and `test-visual` recipes and box-quad's `test-behavior` all pass `--project`; and so does every project-filtered editor gesture. This bounds TE-D12's benefit honestly: in the editor it does work for "Run All Tests" and nothing for the single-project gestures.

Configurations that end in a node or declaration project do release their last browser project, and the declaration case had to be checked rather than assumed: **typecheck projects do emit `onTestModuleStart`**. Measured on the same fixture, `moduleStart decl[go=4]` fires after both browser groups, in its own appended group, and closes group 2's provider on the way.

### One consuming execution per extension-created process, by enumeration (TE-F30)

Revision 4 left this as a per-gesture question for the demonstration list. It is answerable from the bundle, and the answer is exhaustive rather than sampled.

`dist/extension.js` contains exactly **one** `rpc.runTests(` site and exactly **one** `rpc.updateSnapshots(` site, and they are the two arms of a single ternary called once — mutually exclusive, no loop. Three run profiles exist in total (`Run`, `Debug`, `Coverage`), created together; there is no fourth. A gesture queued behind another stores a thunk that calls `executeRun` again, which builds a new API object and spawns again. So no gesture can issue two runs against one process.

`vitest.updateSnapshot` deserved its own trace and closes favourably. It is a **command, not a profile**, and its manifest exposes it only on `testing/item/context` and `testing/item/gutter` with `commandPalette` gated `when: "false"` — so it is reachable only against a **single test item**. It takes the same `:run` profile as an ordinary run, builds a request with `continuous` false, and reaches `executeRun` and therefore a fresh process; the worker's `updateSnapshots` enables snapshot update and calls `runTests` once.

| Gesture | Path | Consuming executions |
| --- | --- | --- |
| single test / file / project / Run All | `:run` profile → `enqueue` → `executeRun` → fresh process | 1 |
| update snapshots | command → the same `:run` profile → the same path | 1 |
| coverage | `:coverage` profile, its own queue → `executeRun` | 1 |
| debug | `bt.forDebug`, `currentMeta` preset | 1 |
| a gesture queued behind another | `pendingQueue` → `executeRun` again → a new process | 1 each |
| Continuous Run | `spawnForContinuesRun` → reuse of the long-lived process | the 2nd fails loudly |

This is source-derived. No editor gesture has been exercised in any pass, so the demonstration that remains is a confirmation in a real editor, not an open question about the code.

### Closing the browser project releases no browser (TE-F33)

`ProjectBrowser.close()` is one line — `await this.vite.close()` — and `this.vite` is assigned in the constructor as `parent.vite`, the **parent browser project's dev server** (`@vitest/browser/dist/index.js:2543`, `:2597`). Chromium is not owned there. It is owned by the provider, which each `ProjectBrowser` creates for itself in `initBrowserProvider` (`:2575–2579`) and which the pool releases with `provider.close()` at `cli-api.BK8pd4xc.js:2488`, followed by `orchestrator.$close()` for every project's orchestrators at `:2493`. Those two calls, scoped to one project, are the boundary primitive.

Measured here on a three-browser-project fixture — one instance each, trivial modules, the same boundary reporter driving both arms and differing only in the call it makes — with Chromium process counts sampled at 4 Hz:

| Primitive | Chrome across the run | Peak | At exit |
| --- | --- | --- | --- |
| `browser.close()` | 17 → 28 → 39 → **50** | **50** | 27 |
| `provider.close()` + `$close()` | 17 → 28 → 39 → **28** → 39 → **28** | **39** | 26 |

Both arms pass 17 tests and both log three boundary closures. **The log is identical and the behaviour is not.** The first arm accumulates one browser per group and releases nothing until the process ends; the second gives a browser back at each boundary, which is why it oscillates instead of climbing and why its peak is one browser lower. This is precisely the failure mode TE-D12's distinguishability property anticipated: a teardown that reports success while doing nothing.

**The hang the implementation reports is not reproduced here, and does not need to be.** On the real tree, `ProjectBrowser.close()` wedged the run after the second close on two different three-project arms; on this fixture the same call completes and the run passes. Trivial modules with one worker apparently do not hold whatever the real suites hold against a closed dev server. The falsification that carries into the contract is the one measured above and readable in the source — the call releases no browser — and it is sufficient on its own. The hang is recorded as the implementation's observation, not as a property established here.

**The provider tolerates the second close it will receive.** A boundary release does not remove the provider from the pool's `providers` set, so `Vitest.close()` closes it again. That is a no-op: `close()` nulls `browserPromise` and `browser` before awaiting, clears `pages` and `contexts`, and ends at `await browser?.close()` on a null (`@vitest/browser-playwright/dist/index.js:1187–1206`). Both fixture arms closed cleanly with no `close timed out`.

**`$close()` is symmetry with the pool rather than a separately isolated necessity.** This pass's own whole-repository probe called `provider.close()` alone and completed all 15 projects with `errors=0`. Doing both is still the right contract — the pool does both, and the orchestrator holds a live RPC channel that TE-F22 gives independent reason to release — but no arm has isolated a failure that `$close()` alone prevents, and this record does not claim one.

### The shared non-browser group needs a bound below the CPU default (TE-F34)

Measured by the implementation on all five node projects together, twelve cores, one group:

| Group bound      | Duration | Failures                                    |
| ---------------- | -------- | ------------------------------------------- |
| `cores - 1` (11) | 40 s     | **4** — three timeouts plus the `tproc` one |
| 6                | 45 s     | 1 — the pre-existing `tproc` failure        |
| 4                | 45 s     | 1 — the same                                |

The three extra failures are `drag2`'s `size.node.test.ts` and `consumer.node.test.ts` at 5003–5008 ms against the 5 s default, doing no more than reading output they had just built, and they pass when `node/drag2` runs alone from the same root configuration. The cause is contention, not the migration.

Verified here at source: `resolveMaxWorkers` (`cli-api.BK8pd4xc.js:3768`) returns `Math.max(Math.floor(numCpus / 2), 1)` when `config.watch` is set and `Math.max(numCpus - 1, 1)` otherwise, so a one-shot run takes `cores - 1` unless a project sets its own value, and the shipped value is the other branch of that same expression. `availableParallelism()` is 12 on this container and the resolved group bound is 6, matching the implementation's reported assignment.

**Five seconds bought three failures back.** The 40 s arm is faster and wrong; duration is not the quantity under optimization here.

### A discard landing inside an evaluation rejects that request (TE-F36)

`watchChange` (`src/index.ts`) calls `discardGeneration()` for any tracked file or any `.css.ts`; `discardGeneration()` calls `fail()`, which rejects every pending request with `CSS evaluation generation was discarded` before disposing (`src/css/generation.ts`). `load` awaits `evaluate()`, so the rejection surfaces as that module's transform failure.

Reproduced here against the shipped built artefact, on one real entry:

| Arms | Outcome |
| --- | --- |
| baseline | ok, 14 744 bytes, 40 deps |
| a discard 5 ms into the evaluation | **rejected — `generation was discarded`** |
| the next request afterwards | ok, 14 744 bytes — byte-identical |

**Eventual freshness already holds; the in-flight request is the whole of the defect.** The third arm is what the owner's requirement asks for and it works. The round additionally reproduced the second arm end to end through a real Vite dev server, where it appears as a load failure for a module the developer did not touch. TE-D17 decides what replaces it.

### Both explanations for the memory delta are falsified (TE-F37)

The remeasurement TE-F35 scheduled was taken by the review round on a container at a **4800 MiB** baseline:

| Quantity | Design (this record) | Implementation | Remeasurement |
| --- | --- | --- | --- |
| Duration | 63.56 s | 71 s (71–86) | **66.20 s** |
| Δ `memory.current` | 5554 | 7412 | **7356** |
| Δ anonymous | not measured | 6685 | **6618** |
| Peak `memory.current` | 7570 | 11 671 | **12 156** |
| Peak anonymous | not measured | 9843 | **10 395** |
| `oom_kill` | 0 | 0 | **0** |

- **Container load is ruled out by duration.** The remeasurement ran at +4 % against this record's 63.56 s, where the implementation ran at +12–35 %, and its delta still landed within 0.8 % of the implementation's.
- **Page cache cannot account for it either.** Page cache is counted in `memory.current` and not in `anon`. The remeasured **anonymous** delta, 6618 MiB, already exceeds this record's **total** `memory.current` delta of 5554 MiB by over 1000 MiB. Whatever the extra is, it is anonymous memory.

**Both explanations are withdrawn, and none replaces them.** The most parsimonious remaining reading is that this record's single sample — taken on a probe configuration wrapping the real root config, with the evaluator applied as a reverted patch to an untracked artefact, as its own Evidence limits state — is not representative of the shipped mechanism. **That is not established and is not promoted here.** It is recorded as the open reading and nothing rests on it.

**What changes: Δ 5554 MiB is withdrawn as the expectation.** Two independent runs of the shipped tree agree within 0.8 % on `memory.current` and 1 % on anonymous memory. The transferable quantity is the reproduced pair — **Δ anon 6618–6685 MiB, Δ `memory.current` 7356–7412 MiB** — and a future run is compared against those. The design figure keeps standing only as evidence about the pass that produced it.

**What does not change: the 13 107 MiB ceiling.** It is unchanged, it is met, and the acceptance signals are unchanged. _Corrected 2026-09-12 by TE-F44._ The ceiling's **number** is unchanged and is met on the anonymous axis. The rest of the sentence is withdrawn: the acceptance signals **are** changed, because peak `memory.current` was a required threshold that four alternating runs show cannot be met at any commit on a loaded container. TE-D21 states what replaces it. The reproduced delta pair this entry promotes as "the transferable quantity" is withdrawn with it — TE-F44 measures the delta moving 1833 MiB with the baseline at one commit.

**The round's headroom comparison is a category error, and the claim it disputes is confirmed by its own numbers.** The consolidated finding reads the remeasurement's 7.3 % `memory.current` headroom against the implementation's ~11 % `memory.current` headroom and concludes this record's "far more headroom on anonymous" is false. Those are two runs on one axis; the record's claim is two axes in one run. Computed from the round's own figures against 13 107 MiB:

| Run            | `memory.current` headroom | Anonymous headroom | Ratio     |
| -------------- | ------------------------- | ------------------ | --------- |
| implementation | 1436 MiB (11.0 %)         | 3264 MiB (24.9 %)  | **2.27×** |
| remeasurement  | 951 MiB (7.3 %)           | 2712 MiB (20.7 %)  | **2.85×** |

Anonymous headroom is 2.3–2.9× the `memory.current` headroom in both runs. **The claim stands**, and the axis argument behind it stands with it: the kernel reclaims page cache under pressure and OOM-kills on what it cannot reclaim, so `memory.current` at 12 156 MiB with `oom_kill` at 0 is the expected reading and not a near miss. The tightening the finding correctly identifies is real and belongs on the other axis — 951 MiB of `memory.current` margin means a concurrent second workload of any size in the same cgroup will not fit, which is a statement about scheduling runs, not about the run.

**No further measurement blocks closure.** The requirement is met on both axes by two independent runs, and the one remaining arm — bound 4, TE-D14 — is the precondition for changing a value, not for closing this design.

### The torn-down marking cannot fire while the one-shot counter holds (TE-F38)

`#released` is written only inside `#release`, which is called only from `onTestModuleStart`; a module start implies the run passed `onTestRunStart` and set `#consumed`. The `#consumed` throw precedes the `#released` check in the same hook. Verified here against the shipped file by enumerating the writers: `#consumed` set after the invariant checks, `#released` added inside `#release`, `#release` called from `onTestModuleStart` alone. **`#released` non-empty implies `#consumed`, so the second check is unreachable** — and the round drove the reporter through a second run and observed the one-shot message, never the torn-down one.

The consequence is for this record, not the tree: revision 4 credited two independent defences where one is reachable, and no implementation satisfying TE-D15 could have provided two. **The contract statement is the origin of the defect and the code faithfully implements it**, which is why the correction runs to TE-D12 and TE-D15 and the dead branch's removal is a consequence rather than the finding.

### The browser page bound's stated ground was retired by this design (TE-F39)

The shipped comment gives one reason for two rather than four, and it is revision 2's, resting on TE-F4 retention — seven browser projects held at ≈1.26 GiB each. TE-D12 and TE-F33, inside this same range, release each provider at its group boundary, so the premise does not obtain at head. Revision 4 carried the value forward without re-deriving it, and revision 2 had already named the choice as its own weakest point with the test that would settle it never run.

Measured by the round on `browser/drag2` — 39 files, 861 passed, 60 skipped, identical in all four arms — through the factory's own CLI route:

| Bound       | Run 1   | Run 2   |
| ----------- | ------- | ------- |
| 2 (shipped) | 15.26 s | 17.01 s |
| 4           | 12.33 s | 11.89 s |

cgroup deltas were sampled and are not reported: sibling sessions moved the baseline across the arms, so only the duration column is sound. **The finding is that the record carried an expired reason and said nothing about it.** TE-D14 now carries the current one and the demonstration that would move the value.

### The repository documents a pull-request gate that does not exist (TE-F40)

`.agents/docs/test-architecture.md` states that "every pull request gates on" formatting, linting, typechecking, tproc node tests, behaviour and accessibility browser tests, spec-contract browser tests and the curated Chromium visual suite, and a second sentence rests the visual-baseline policy on it: "The ordinary PR gate uses one pinned Chromium environment." Verified here: `.github/workflows/` contains `docs.yml` alone, triggered on `push` to `main` and `workflow_dispatch`. **There is no pull-request workflow at all.**

This is pre-existing and outside the implemented range. It is live in this record because revision 2 recorded it as an owner call for the implementing pass, the implementing pass edited that file without resolving it, and revision 4 did not carry the question forward — so the decision to leave it was made inside this work's own record and had never been taken.

**It is taken now, and the finding's own framing was too narrow.** The document was read as describing a mechanism, and the two repairs that follow from that reading — correct the prose, or build the mechanism — both treat the gap as a decision about whether the repository wants a gate. It is not: the gate is accepted and unbuilt. The policy stands, the tense and status are corrected, and the work is registered as `repo:RD-2`. **The finding stays open**, because nothing about the repository's actual enforcement has changed.

### A generation demoted by an entry's throw is unreachable by invalidation (TE-F41)

An entry's evaluation failure clears the single current-generation slot and leaves its siblings to drain, which is TE-D13's rule and is not changed by the range that implemented TE-D17. `discardGeneration()` then begins by returning when that slot is empty, and `findReferences` puts its only call site outside the module at the `watchChange` hook, so **every invalidation arriving in that window is a silent no-op** and the draining siblings settle against a snapshot the module has been told is void.

The review reproduced the published tear on a real Vite dev server, every file created before the server started so the watcher saw changes only, and no event injected. One entry throws 150 ms in; a second reads `early.ts` at link time and `late.ts` 800 ms later; both token files are saved at 300 ms:

```
boom              : REJECTED: the entry threw
watcher events    : 2
slow published    : A/B
torn (A/B)        : true
superseded (B/B)  : false
```

`--early: A` is the pre-change module the entry had already loaded and `--late: B` the post-change one it loaded afterwards — precisely the mixture TE-D17 exists to make impossible. Both watcher events were delivered and both did nothing. Reproduced independently at the module boundary against the built artefact, in the same shape.

**Pre-existing, and a defect in this record rather than in the range that implemented TE-D17.** The early return stands unchanged at `375a9c00e`. What the range changed is that TE-D17 now states the property this window violates, so the two rules meet here and disagree: TE-D13 says a failed generation drains, TE-D17 says a generation told about a change publishes nothing. Both are right, and neither had a state to say so in. **TE-D18 settles it**, and the settlement is a state model rather than a repair to either sentence.

**Bounded, and the bound is worth recording.** The demoted generation is disposed once it drains, so no handle leaks and the next request recovers immediately. In the dev-server path `handleHotUpdate` returns every entry for a tracked file and should re-request the torn one, which no arm drove end to end through a browser: the tear is established, its lifetime in the browser is not. In the build path a throwing entry fails its own build, so a torn artefact needs the throw and the publish in different builds sharing one process generation — reachable under the co-tenancy this repository runs, and not reached without staging.

### The attempt cap is denominated in watcher events (TE-F42)

`ATTEMPTS = 2` is TE-D17's floor read as its cap, and a request is issued to at most two generations. Each tracked change is its own `watchChange` call and therefore its own discard, so **two** tracked files written during one evaluation exhaust it. Measured on a real Vite dev server — one plugin instance, a warm entry tracking the token files, one request in flight while _N_ tracked files are rewritten at once:

```
N=1 : watcher events 1  → resolved
N=2 : watcher events 2  → REJECTED: CSS evaluation superseded by concurrent invalidation 2 times
N=3 : watcher events 2  → REJECTED: …
N=29: watcher events 2  → REJECTED: …
      next request      → resolved: BB
```

And through a real Rolldown build with the change delivered by a co-tenant Vite dev server's own watcher, which is the co-tenancy this repository actually runs:

```
one tracked file saved mid-evaluation  → artefact B/A          (correct, not torn)
two tracked files saved mid-evaluation → BUILD FAILED: CSS evaluation superseded …
```

**Two readings of that table matter more than the rejection.** The first is that `N=1` holds and no arm published torn output, so TE-D17's central guarantee is intact and it is only the bound that is wrong. The second is the second column: **29 files produce the same two events as 2 files.** The counter is measuring the watcher's batching on this filesystem, which is why no constant chosen against a file count transfers to another platform, and why TE-D19 changes the unit rather than the number.

### Below the coalescing window no generation is ever created, so the budget cannot fire (TE-F43)

Every invalidation arriving inside an open coalescing window re-arms it, so a stream whose gap is shorter than the window holds it open indefinitely. No successor is created, the parked request is never attached to anything to be detached from, its supersession count stays below the floor, and the budget's conjunction cannot be satisfied for as long as the stream lasts.

Measured at the module boundary, one tracked file rewritten at a fixed interval against a 400 ms entry, from before the request is issued until well past the budget:

| interval | invalidations | generations | outcome |
| --- | --- | --- | --- |
| 20 ms | 694 | **0** | never abandoned — still pending at 14 s |
| 45 ms | 311 | **0** | never abandoned — still pending at 14 s |
| 60 ms | 234 | 168 | abandoned at 10 166 ms, `superseded 168 times over 10.0s` |
| 120 ms | 118 | 82+ | abandoned at 10 341 ms, `superseded 85 times over 10.1s` |
| 300 ms | 48 | 34 | abandoned at 10 813 ms, `superseded 35 times over 10.2s` |

**The discontinuity sits exactly at the fifty-millisecond window**, which is what makes this a measurement of a boundary rather than of a bug. Above it the budget behaves as TE-D19 specifies; below it the input never presents a state to evaluate.

**Settled by owner disposition as the supported progress domain, not as a defect.** A stream that never yields the configured window means the tracked set has never become stable enough to evaluate, and the repository does not require a trailing debounce to complete while something is continuously re-arming it. TE-D19 and TE-D20 are corrected where they overstated the guarantee, and **no machinery is added** — no maximum wait, no periodic creation, no event counter.

**Why the probe is valid evidence and not a supported failure mode.** It is valid because it locates the boundary precisely, shows the design is continuous across it in correctness, and prices the regime just above it: at 60 ms the implementation created 168 generations in ten seconds, one per quiet window, which is TE-D20 conforming and is the cost of the rule near its threshold. It is not a supported failure mode because no consumer produces it — a watcher delivering a tracked change every twenty milliseconds forever is a synthetic writer, not a rebuild, a save-all or a checkout, all of which terminate. **What the probe confirms about the regime is that correctness is unconditional there**: no generation is created, nothing stale or torn is published, no handle is retained, and the request resolves normally when the writer stops (`resolved v694`). It is a stall for the duration of the storm, and it ends with the storm.

**Where the old bound sat, for contrast.** At `ab174b894` the same twenty-millisecond stream rejects in 65 ms with `superseded by concurrent invalidation 2 times`. The two bounds fail in opposite directions on the same input, and the earlier one failed the same input for a burst of two ordinary files. The regime this finding names is the only one in which the new bound does not act, and it is the only one in which nothing is owed.

### The `memory.current` ceiling is breached at every commit by a quantity the run does not own (TE-F44)

TE-F35's acceptance table requires peak `memory.current` at or below 13 107 MiB and demonstration 1 required both axes at or below it; TE-F37 recorded the signals as unchanged and met. Four whole-repository runs, head and base alternated on one container, `memory.current` and `anon` sampled at 1 Hz from the cgroup:

| run | baseline cur | peak cur | Δ cur | peak anon | Δ anon | vs ceiling |
| --- | --- | --- | --- | --- | --- | --- |
| head1 | 6361 | **15 269** | 8908 | 12 073 | 8112 | over by 2162 |
| base1 | 7923 | **14 980** | 7057 | 11 564 | 6153 | over by 1873 |
| head2 | 7722 | **14 797** | 7075 | 11 464 | 6396 | over by 1690 |
| base2 | 7759 | **14 775** | 7016 | 11 405 | 6319 | over by 1668 |

**Three readings, and each one is load-bearing for TE-D21.** The breach belongs to no range: `ab174b894` exceeds the ceiling by the same order on the same container, so nothing in TE-D18, TE-D19, TE-D20 or the formatter unification causes it. The arms are indistinguishable at matched baselines: head2 and base2 sit 37 MiB apart at rest and 59 MiB apart on Δ `memory.current`, under one per cent. And **the delta is itself baseline-dependent** — head1 measured Δ 8908 MiB at a baseline 1361 MiB lower than head2's Δ 7075 MiB — so no delta is the portable quantity this record had been treating it as, including the reproduced pair TE-F37 promoted.

**What holds on the axis the design was already arguing for.** `oom_kill` is 0 in all four runs, and peak anonymous memory is under the ceiling in all four, at 11 405–12 073 MiB. That is a fourth independent run agreeing with TE-F35's and TE-F37's axis argument, taken by a pass that was trying to break it.

**Why this is a defect in the contract rather than in any run.** As written the signal cannot be met on a container at an ordinary resting load at any commit, so a pass meeting every behavioural requirement still fails the table, and the only way to record a pass is to explain the number away — which is what this record had been doing, honestly, and which is how a threshold stops being one. **TE-F37's sentence "It is unchanged, it is met, and the acceptance signals are unchanged" is false on the `memory.current` axis and is corrected at the statement that owns it.** TE-D21 replaces the table.

## Corrections to earlier revisions

Stated rather than quietly dropped.

- **Revision 3's teardown trigger was wrong**, and its acceptance check could not have detected that it was wrong. Both are corrected above.
- **Revision 3's `watch === false` gate is withdrawn.** It was described there as "a positive check on run mode, not an assumption about the caller"; it is an assumption about the caller, and TE-F21 shows it excludes the one editor case teardown is safe for.
- **Revision 3's "contiguous from zero" property is withdrawn** in both halves.
- **TE-F15's speed and applicability claims are withdrawn.** The 1 863 ms figure came from `runnerImport`, which externalizes `@ydinjs/tproc`; the mechanism revision 3 actually specified inlines it, at 19 001 ms and 3 812 MiB for a single entry on the challenge's measurement. The byte-identical output claim stands.
- **The 10 384 MiB figure is superseded.** It measured the revision-2 semaphore standing in for CSS and a teardown trigger this revision refutes.
- **Revision 4's claim that the boundary releases every browser project "including the last" is corrected by TE-F29.** It is true of the root configuration and of no configuration whose final group is a browser group.
- **Revision 4's reading of `watchTests` is tightened.** It is the call that enables the worker's watch tracking; it is not the only RPC the extension sends its worker, and this record does not say that it is.
- **Revision 4's `allowExec` disposition is withdrawn**, and the challenge's replacement for it is declined on evidence the challenge did not have: the in-test `cdp()` API it also gates is used by drag2's input-policy suite, and denial is silent where TE-D15's guard is loud. The scope correction to TE-F28 is accepted; the change to the flag is not.
- **Revision 4's own teardown-ownership property is corrected by TE-D15.** It required the teardown carrier to sit in a one-shot entry point and to stay out of the configuration the extension loads. That followed from the editor's lifecycle being unsettled; with the model declared one-shot everywhere, the carrier belongs in the shared factory, and revision 4's open owner choice is closed.
- **Revision 4 left the teardown call unnamed, and the obvious reading is wrong.** "The provider is closed" reads as `project.browser.close()`, which closes a Vite dev server and releases no browser (TE-F33). The primitive is now named in TE-D12. This pass's own whole-repository probe happened to call `provider.close()`, so the measurement it produced stands; the record simply never said so.
- **Revision 4's worker contract required equality across the non-browser group and not a magnitude.** Equality alone is met by Vitest's `cores - 1`, which times out three tests (TE-F34). TE-D14 now requires an explicit bound below the CPU default and records the shipped derivation.
- **Demonstration 1 stated a single measurement as an acceptance threshold.** Δ 5554 MiB is evidence; the requirement is the 13 107 MiB working ceiling and the acceptance signals (TE-F35). The demonstration is restated below.
- **Revision 4's claim that `watch: true` suppresses `FilesNotFoundError` is withdrawn.** It needs `changed` or `related` as well, and only the extension's "run related tests" gesture supplies one (TE-F27). The exemption TE-D15 rests on is unaffected, because the empty run start precedes the throw.
- **TE-D13 left the in-flight invalidation race undecided**, and the shipped code resolved it through the failure path. The contract now decides it (TE-D17): a discard supersedes, never rejects.
- **Revision 4's "defence in depth" for the torn-down marking is withdrawn.** One check is reachable, not two, and no implementation satisfying TE-D15 could have provided two (TE-F38). The property survives; the redundancy claim does not.
- **TE-F35's two explanations for the memory delta are withdrawn**, both falsified by the remeasurement it scheduled, and Δ 5554 MiB is withdrawn as the expectation in favour of the reproduced pair (TE-F37). The ceiling and the acceptance signals are unchanged.
- **The consolidated round's refutation of the anonymous-headroom claim is declined**, on its own numbers: it compares two runs on one axis where the record compares two axes in one run, and anonymous headroom is 2.3–2.9× the `memory.current` headroom in both runs (TE-F37).
- **TE-D14 carried an expired reason for the browser page bound.** The retention premise that chose two over four was retired by TE-D12 inside this same design (TE-F39). Two stands on measured headroom instead, and the demonstration that would move it is stated.
- **Demonstration 20 is un-discharged**, because its evidence cannot distinguish the behaviour from its failure and the failure is what occurs.
- **The `$close()` citation was off by one line.** `orchestrator.$close()` is `cli-api.BK8pd4xc.js:2493`; `:2492` is the `forEach` enclosing it. Both sites corrected. The sibling `provider.close()` citation at `:2488` was exact.
- **This record's own A-versus-B framing of the CI policy is withdrawn.** Both options read an accepted-but-unbuilt gate as an open decision about whether the repository wants one. The owner's disposition is that the policy is the target and the automation is deferred; the policy is preserved, its tense and status are corrected, and the work is registered as `repo:RD-2`.
- **The VS Code extension is not installed in this container.** The editor server present is Zed. All extension findings in every revision are source reading — here, of the marketplace artefact self-reporting `vitest.explorer@1.50.8` — plus API-level simulation. No running editor has been observed in any pass, and revision 2's phrasing "the installed extension" overstated that.

## How implementation demonstrates the required behaviour

The obligation is on the shipped implementation, not on this pass's probes.

**Discharged at `c1cab3031`, except where marked.** The implementation record reports evidence for 1–12 and 16–25; 1's requirement is met and its expectation is not yet explained; 13–15 are untouched, because no VS Code installation exists in that container either. Items are annotated where the implementation changed what the item should say; the rest stand as written and are evidenced in [`implementer-test-execution-model.md`](implementer-test-execution-model.md).

1. **The root run reproduces the resource result with the real mechanisms.** One `vitest run` over all 15 projects, with the converted plugin and the teardown reporter as shipped. **Required**: TE-D21's two gates — `oom_kill` at 0 with peak anonymous memory at or below the 13 107 MiB working ceiling, and peak anonymous memory within 5 % of an alternated reference arm at a baseline within 500 MiB — together with the acceptance signals of demonstrations 2–4. **Reported beside them and gating nothing**: both baselines, both `memory.current` peaks, both deltas and the duration. _Corrected 2026-09-12 (TE-F44): this item required both axes absolutely, and the `memory.current` half cannot be met at any commit on a loaded container._ **Expected, not required**: a delta near the Δ 5554 MiB measured here, and a duration near 63.6 s — a divergence must be explained, and one is outstanding (TE-F35). Neither the semaphore figure nor this pass's delta is inherited as a threshold. **Done** at `c1cab3031`, requirement met with 11 671 MiB against the ceiling; the expectation diverged and the quiet-container remeasurement that settles it is owed.
2. **The run is clean by the right signal.** Zero unhandled errors, and zero occurrences of `Failed to run the test` — not the absence of `provider was closed`, which this mechanism never emits.
3. **Every browser provider is released, and the count is asserted**: seven of seven closed, each at a group boundary, with Chrome processes returning to the run's baseline before the process exits. Seven of seven is a property of the root configuration. In a project-filtered run the correct count is zero boundary closures and a release at process close (TE-F29), and asserting seven there would be asserting the wrong thing. **Done** at `c1cab3031` for the root configuration, with the boundary log reproducing this record's order exactly and Chrome returning to 13.
4. **The process closes cleanly.** No `close timed out` line; the generation worker is terminated when its last consumer releases it.
5. **The serialization invariant fails loudly when broken.** A run with `--sequence.shuffle` aborts before executing a specification, naming the projects whose `groupOrder` was erased.
6. **A torn-down project fails loudly on reuse.** Driving a second run against the same instance raises before any module executes, instead of reporting a zero-module success.
7. **CSS output is unchanged and order-independent.** All 35 entries, three ways: one isolate per entry, one shared generation forward, one shared generation reversed — byte-identical across all three.
8. **Freshness holds across a workspace rebuild.** With `just docs-dev` running, rebuild `@ydinjs/tproc` and observe the next generation produce CSS from the rebuilt artefact, without restarting the dev server.
9. **A corrected file recovers.** Break a `.css.ts`, observe the error, correct it, and observe the next request succeed without a restart.
10. **Dev-watch invalidation is wired to the discovered set** — development watch, which TE-D16 keeps. Editing a shared token file re-evaluates every entry that reaches it, not only the entry that happened to be evaluated first.
11. **Both consumer classes pass**: the root test run, `just build`, `just docs-build` and `just docs-dev`. Revision 3's tsdown evidence was one hook in a minimal build and does not carry.
12. **Per-package invocation is unchanged**: `cd packages/<pkg> && just test` still runs that package's own configuration.
13. **The editor path still discovers and runs tests.** Discovery lists every project, a single test runs, and a project-scoped run runs, against the unchanged root `vitest.config.ts`.
14. **The editor releases its browsers.** A whole-repository run from the editor releases every browser project it visited at a group boundary; a project-filtered gesture releases its single provider at process close, not at a boundary (TE-F29). The property asserted in both cases is **Chrome returning to baseline before the process exits** — boundary closures are asserted only where a later group exists.
15. **Confirm in a real editor what the code already says.** TE-F30 settles by enumeration that no gesture can issue two consuming executions against one process; what is owed is the confirmation itself — a single test, a file, a project, "Run All Tests" and "Update snapshots", none tripping the guard. A gesture that does trip it is a defect to resolve before shipping.
16. **The carrier cannot be removed.** `vitest run --reporter=dot` still tears down and still enforces the contract; the reporter is installed exactly once in a 15-project root run.
17. **The second execution fails loudly and reports no tests.** A rerun issued into a process that has already run raises before any module executes, the message names the retired mode, and no test result is reported.
18. **An empty run does not spend the lifecycle.** A filter matching no files, followed by a real run, succeeds.
19. **The retired machinery is gone.** No `--watch` remains in the tree, the debug recipe is `vitest run` and no longer inherits watch from a TTY, and `.vscode/settings.json` sets `vitest.watchOnStartup` explicitly false.
20. **The debug task is run mode.** `.zed/tasks.json`'s `vitest:debug` reaches a breakpoint with the CDP port attached, and saving the file while paused does **not** start a second execution. **Not discharged.** The implementation evidence — the process exits on its own — is satisfied equally by the behaviour and by its failure, and the round established the failure: on a **browser** test the task aborts before opening a page, because `DEBUG=1` sets `browser.ui`, the UI nulls the viewport, and the factory's unconditional `contextOptions: { deviceScaleFactor: 1 }` is then rejected by Playwright. The defect is **pre-existing and outside the implemented range** — the range touches no browser option, and the same error reproduces under the pre-range command form — so it is raised here rather than absorbed, and it blocks this demonstration until it is repaired. A discharge must show the breakpoint and the attached port, not the exit code.
21. **The carrier is present in a plugin-less project.** `vitest run --project=node/tproc` enforces the contract.
22. **The carrier is an instance, not a name.** A root run with `--reporter=dot` shows the enforcement reporter's hooks firing, not merely its presence in the list.
23. **`watchOnStartup` behaves as documented.** It is off — confirming nothing in the repository has set it — and enabling it produces the loud failure rather than a hang or a silent pass.
24. **The generation worker's port is released**, evidenced by the absence of `close timed out` under the real plugin in the root run.
25. **`cdp()` still works.** drag2's input-policy suite passes, which is the check that `browser.api.allowExec` was not turned off (TE-F28).

**Items 26–33 are the acceptance surface for TE-D18, TE-D19 and TE-D20.** They are written to discriminate: each names what the shipped tree at `783c97665` does, so an arm that passes for the wrong reason is visible. Items 1–25 are unaffected, and the eight properties of TE-D17 the remediation review established do not need re-establishing.

**26–32 are discharged at `e41e72b25`**, each on both trees so every arm carries its own control, and evidenced in [`lifecycle-budget-proof-claude.md`](../reviews/test-execution-1/lifecycle-budget-proof-claude.md). **33 was added 2026-09-12** and is discharged by the same pass's boundary measurement. Item 31's four-way simultaneous shape was separately shown unreachable by construction — a live generation and an armed window cannot coexist, because the window is armed only after every member of the set has been disposed in the same synchronous block — and its reachable union is the three arms the review ran.

26. **An entry failure followed by an invalidation while a sibling is pending publishes no tear.** A real Vite dev server, every file created before the server starts so the watcher sees changes only and no event is injected. One entry throws early; a sibling reads one token module at link time and a second several hundred milliseconds later; both token files are saved between the two reads. **Required**: the throwing request rejects with its own message and its own stack; the sibling publishes one generation's view of both modules and never the pre-change/post-change mixture; and the arm asserts that a watcher event **detached** the sibling, not merely that the output happened to come out untorn. Repeated at the module boundary against the built artefact, where the timing is controlled rather than observed. **Discriminating**: at `783c97665` this emits `A/B` with `superseded: false`, and an implementation that restores reachability while losing TE-D18's invariant 3 publishes the successor's answer _and_ the dying worker's.
27. **One logical rebuild delivered as many file events costs one supersession.** Both consumers. A dev server with a warm entry and one request in flight while _N_ ∈ {1, 2, 3, 29} tracked files are rewritten at once; a real Rolldown build with the change delivered by a co-tenant dev server's watcher at _N_ ∈ {1, 2, 29}. **Required**: every arm resolves — the build succeeds and its artefact is one generation's view of every module — and the number of generations created is counted and is at most the number of quiet windows observed. The generation count is the discriminating half: "it resolved" is satisfied equally by coalescing and by a spawn per event, and only one of those is TE-D20.
28. **Repeated invalidation inside the progress domain exhausts the budget, and says so.** A writer rewriting one tracked file at an interval **longer than the coalescing window and shorter than a generation**, running from before the request is issued until after the budget elapses. _Corrected 2026-09-12._ The rate bound was stated on one side only, so the item could not distinguish the regime the budget governs from the one outside it (TE-F43); the 300 ms arm this was written against is well inside the domain and its result stands. **Required**: the request rejects no earlier than the budget; the message names continuous invalidation and interpolates the supersession count and the elapsed span, names no file, and carries a stack inside the generation module; the process still exits naturally with no live handle; and the first request issued after the writer stops resolves. **Discriminating**: the shipped bound rejects within tens of milliseconds with a message naming a count of two, so _not_ rejecting early is as much of the assertion as rejecting eventually. An arm at a sub-window rate is **not** part of this item and its non-abandonment is not a failure — see 33. This is a recorded probe rather than a suite test — it costs the budget in wall-clock and TE-D14 already constrains the shared non-browser group's margin.
29. **A discarded generation's answer cannot win.** Three arms at the module boundary, where the dying worker's reply can be forced to arrive after the successor's: the caller settles exactly once and with the successor's code; the resolved dependency set is the producing generation's own object and carries a module only the successor ever resolved; and a generation abandoned **while draining** answers into an empty attachment and resolves nothing. The third arm is new, and it is the one TE-F41 reaches.
30. **The new states leave no handle.** The review's four exit arms — success, failure, supersession, and an exhausted bound with no release — extended by two: a generation abandoned while draining, and a request parked with a coalescing window armed. **Required**: `process.getActiveResourcesInfo()` empty at exit, and the process exiting on its own, in every arm.
31. **Release reaches everything.** The last consumer releases while one generation drains, another is accepting, a request is parked and a window is armed. **Required**: every attached and parked request rejects, every generation is disposed, the window is cancelled, and nothing keeps the loop alive. **Discriminating**: the shipped `releaseGeneration` returns early when the slot is empty, so a release arriving during a drain currently reaches nothing.
32. **No ordinary save rejects a request, in either consumer.** TE-D17's headline, re-asserted because TE-D19 and TE-D20 both move machinery underneath it: a single save during an evaluation resolves in the dev server and emits a correct artefact from a Rolldown build, and a genuine entry throw still rejects only the request that threw, with that entry's own error and stack.
33. **Outside the progress domain, correctness is unconditional and progress is not owed.** A writer rewriting one tracked file at an interval **shorter than the coalescing window**, indefinitely. **Required**: zero generations are created; nothing is published; no handle is retained and the process exits naturally; and the request resolves normally once the writer stops. **Explicitly not required**: abandonment, a diagnostic, or any bounded wait. **Discharged** by the measurement in TE-F43 — 694 invalidations, 0 generations, `resolved v694`, live handles none — recorded here so the absence of a failure in this regime reads as the specified outcome rather than as an unnoticed stall. An implementation that grew a maximum wait, a periodic creation or an event counter to make this item "pass" has failed it.

## Evidence limits

- **The whole-repository arm is a single run**, with the teardown reporter and `groupOrder`/`maxWorkers` assignment applied by a probe configuration wrapping the real root config, and the per-generation evaluator applied as a reverted patch to the untracked built plugin artefact. The mechanisms measured are the ones specified; their code will live elsewhere.
- **Baselines differ between passes.** This pass ran at a 2015 MiB baseline against revision 3's 4.0–4.6 GiB. Peaks are not comparable across passes; run deltas are, and the delta improved.
- **No control arm was re-run in this pass.** Revision 3's unbounded OOM figure and its intermediate arms are taken as reported.
- **The lifecycle probes use fixture suites** — three and four trivial modules — not the real browser suites. They establish the mechanism at the RPC boundary and at the group boundary, not timings for real suites.
- **The converted-plugin evidence covers the Vite `load` path only.** Six concurrent entries through the real plugin, and all 35 through the evaluation harness. Watch invalidation, `just build`, `just docs-build` and `just docs-dev` are not exercised; the demonstration list carries them.
- **`compileCSS` is downstream of every arm** — oxfmt, lightningcss and the sourcemap are unchanged and unmeasured, as in every previous pass.
- **Continuous-run mode was not measured**, in any pass.
- **The editor was read, not run**, and is not installed here. `.vscode-server` is absent entirely; the artefact read across this pass and its challenge is an unpacked copy of the marketplace build self-reporting `vitest.explorer@1.50.8`. **Every VS Code conclusion in this record is source-derived**, and none is editor-observed: this includes TE-F12, TE-F21, TE-F26, TE-F30 and TE-F31.
- **The shared-state result is a property of the current tree**, not a guarantee of the mechanism.
- **The one-shot contract was verified programmatically**, against a fixture with `watch: true`, and through a real `vitest run` for the carrier. That each editor gesture issues exactly one consuming execution is now established by call-site enumeration (TE-F30) rather than by sampling gestures, but it is still source-derived; the confirmation in a running editor is owed.
- **The port-handle result is a fixture**, not the converted plugin. It identifies the handle class; it does not prove the converted plugin holds no other handle.
- **The `--project` falsification uses a fixture**, two trivial browser modules and one typecheck module, not the real suites.
- **The primitive comparison is a fixture too** — three browser projects, one instance each, trivial modules (TE-F33). It establishes that `ProjectBrowser.close()` releases no browser and that the provider call does. It does **not** reproduce the hang the implementation saw on the real tree, and this record does not claim that property.
- **No resource figure in this record was measured on a quiet container.** This pass ran at a 2015 MiB baseline and the implementation at 3158–3538 MiB, both inside a cgroup carrying an agent session; at the time of this amendment the same cgroup reads 4363 MiB at rest. A remeasurement performed here would be noisier than either and would settle nothing, which is why TE-F35 schedules it rather than attempting it.
- **The non-browser worker measurement is the implementation's, not this pass's** (TE-F34). What was verified here is the source it rests on — `resolveMaxWorkers`'s two branches — and the resolved value on this container.

## The lifecycle policy, settled

Revision 4 recorded one owner choice — whether the VS Code extension's runs get teardown. It is closed: **they do.** Nothing in this record now presents editor teardown as open.

What the owner settled, and what follows from it:

- Root and per-package CLI runs are one-shot. Ordinary VS Code Vitest runs started from the UI are one-shot. Browser providers are released at the group boundaries TE-D12 establishes wherever a later group exists, and at process close for the project occupying the final group (TE-F29); in every case they are released before the process exits.
- Watch and continuous reruns inside one Vitest process are unsupported, by intent rather than by limitation.
- **Reuse after teardown** fails loudly before executing or reporting tests, and never succeeds silently with zero modules. The claim is scoped to reuse: a run whose filter matches nothing either reports a successful run of nothing or raises `FilesNotFoundError`, depending on `changed`/`related` and not on `watch` alone. Both are Vitest's own pre-existing behaviour, and neither is created, closed or claimed by this design (TE-F27).

The reasoning revision 4 used to keep the question open no longer applies. It turned on the absence of an in-process signal separating an ordinary editor run from a continuous one (TE-F21), which made an opt-in the only way to declare a one-shot lifecycle and left the owner carrying that declaration per run. With the whole model declared one-shot, nothing needs detecting: the contract is uniform, the carrier is uniform, and the case the missing signal endangered — continuous run — is retired rather than protected.

**No owner choice about the test execution model remains open.** Two questions belong to implementation rather than to the owner: whether the debug task wants anything back after `--watch` is removed, which the demonstration list settles by exercising it; and whether any editor gesture issues more than one consuming execution per process, which the same list settles by exercising each one.

**The review round opened one question that is not about this model** — the repository's CI policy — and the owner has settled it. It is recorded below and carries no remaining choice.

## The pull-request gate is accepted policy with its implementation deferred

The review round found that `.agents/docs/test-architecture.md` describes a pull-request gate the repository does not have (TE-F40), and this record previously put two options to the owner: correct the document to describe reality, or build the gate. **Both were wrong, because both read a deferral as a decision.** The owner's disposition is neither: the policy is the accepted target and is not weakened, and the missing automation is unimplemented repository work.

**What that changes.** A repository that had decided to operate without pre-merge verification would say so in its policy. This one has accepted the gate and not yet built it, so the policy stays authoritative and the build becomes owed work with a home, an identifier and an acceptance test. The correction to the policy document is therefore in **tense and status only** — `gates on` becomes `must be gated on`, `the ordinary PR gate uses one pinned Chromium environment` becomes `must use`, and one status line names the entry that owns the deferral. No requirement is removed, softened or scoped down.

**Where each half lives**, which is the part this pass had to decide:

| Half | Home | Why |
| --- | --- | --- |
| The requirement | `test-architecture.md` §CI policy, §What screenshots prove | Current-state policy: the document a role reads to learn what must hold |
| The status, deliverables and acceptance | `repo:RD-2` in [`.plan/00-index.md`](../00-index.md) | Record: what is owed and why, cited by the rule rather than copied into it |
| The finding | TE-F40, here, **open** | It is answered by making the status explicit, not by asserting the gate exists |

That split is the documentation model's own — a durable rule cites a record and does not carry the record's numbers, and a current-state document carries no amendment narrative — and the test-architecture document already used it: its §Implementation roadmap exists precisely to say what is adopted incrementally. Roadmap item 4 read "extend the curated visual matrix and CI gating", which implies a gate to extend; it now says the gate and its environment are new work and names `repo:RD-2`.

**What `repo:RD-2` fixes, so the next unit does not re-derive it.** Four deliverables in dependency order, and the first is not the workflow: the pinned image, then the workflow running the enumerated suite, then the branch rule that makes it a gate rather than a report, then a baseline-maintenance policy for image upgrades. The ordering is load-bearing — the curated visual suite inside an unpinned runner produces false diffs, and a visual gate that produces false diffs is disabled within a week, which is worse than not having one. It also carries the resource facts this work measured, so a runner is not sized by guesswork: one whole-repository run needs roughly 6.6–7.4 GiB and 66–86 s plus build time, peaking near 10.4 GiB anonymous.

**TE-F40 is not closed.** Its required property was that the document states the gate that exists or states that none does; the second branch is taken, and the statement now sits in the policy document with the detail in the register. Nothing here claims enforcement exists, and the finding stays open until the four deliverables do.

**This unit does not build any of it.** No workflow, no image, no branch rule, and no plan directory for them — `repo:RD-2` names that directory as the home for the unit that takes the work, and designing the mechanism is that unit's job rather than this one's.

## Implementation readiness

Written before implementation and kept as written; the verdict after implementation is the section that follows.

**The design is implementation-ready.** Every mechanism it selects has survived a focused challenge without contradictory evidence: the one-shot enforcement, the carrier that installs it, group-boundary provider teardown, the disposable per-generation CSS isolate, and the retirement of test watch. The seven corrections the challenge required are applied above, at the statements that own them. One of them — the `allowExec` disposition — is resolved against the challenge's own recommendation, on evidence it did not have, and TE-D16 carries the reasoning.

Nothing further is owed to design. What remains is verification during implementation, and it divides into three kinds.

**Confirmations of mechanisms already measured** — these have been demonstrated on probes, fixtures or a patched artefact, and must be re-demonstrated on the shipped code: demonstrations 1–7, 16 and 17. The root-run resource result is the weightiest: it must be reproduced with the real evaluator and the real teardown integration rather than inherited.

**Paths never exercised in any pass** — these are new work, not repetition: demonstrations 8–12 (the `@ydinjs/tproc` rebuild under `just docs-dev`, dev-watch invalidation against the discovered set, `just build`, `just docs-build`, `just docs-dev`, and per-package invocation after the change), 18 (an empty run not spending the lifecycle), and 19–25 (the retired machinery, the debug task in run mode, the carrier in a plugin-less project, `watchOnStartup`, the generation worker's port, and drag2's `cdp()` suite).

**The editor, which no pass has run** — demonstrations 13–15. TE-F30 has converted this from an open question about the code into a confirmation: enumeration of the extension bundle shows no gesture can issue two consuming executions against one process. The confirmation is still owed, and it is the one obligation whose failure would be a design defect rather than an implementation defect, because the contract would then turn a working gesture into a loud failure.

## Readiness after implementation

**The implementation at `c1cab3031` conforms, and the record is ready for the implementation review round.** Every mechanism this design selects is present in the shipped tree in the shape specified, and the two places where execution diverged from the record are places the record was underspecified, not places the implementation departed from it. **No remediation is routed**: neither the teardown primitive nor the worker derivation violates a deeper contract here.

- The teardown primitive is a detail this record declined to name and should have; the required property — released at an event that provably follows the group's completion — is untouched, the trigger is still the boundary, and the implementation's choice is the pool's own lifecycle (TE-F33). The correction runs from record to implementation, not the other way.
- The worker bound is a value this record left to derivation and should have constrained; the constraint it did state — one value shared across the group — is satisfied, and the magnitude is now a stated property with the shipped derivation recorded beside it (TE-F34). Plan and implementation no longer disagree, and neither is silent.

Three obligations remained at the time of writing, and the review round has since discharged the first, opened one contract change and left the other two standing — see the handoff boundary below, which supersedes this list where they differ.

1. **A quiet-container remeasurement of the root run** (TE-F35). **Taken**, by the review round, and it falsified both explanations rather than confirming one (TE-F37). The binding requirement is met on both axes; no further measurement blocks closure.
2. **The editor, demonstrations 13–15**, which stay exactly as written and stay **owner-executed**. No VS Code behaviour has been observed in any pass of this work, design or implementation; the container has no VS Code installation and `.vscode-server` is absent. Every extension conclusion in this record remains source-derived. What is owed is unchanged: a single test, a file, a project, "Run All Tests" and "Update snapshots", none tripping the guard, against the unchanged root `vitest.config.ts`.
3. **The pre-existing `node/tproc` failure and F-412** stay outside this work by instruction, in the review round as in every pass before it. A review that counts the root run's one failure against this design is counting the wrong thing.

The review round should attack the grounds below, to which implementation has added three.

## The handoff boundary after the lifecycle-and-budget review

_Rewritten 2026-09-12. This supersedes the boundary drawn after the remediation review; items it does not restate are discharged below, and nothing is silently dropped._

**The design is implementation-ready, and what is left is small.** TE-D18, TE-D19 and TE-D20 are shipped at `e41e72b25` and were established under both real consumers, each arm run against `ab174b894` as its own control. TE-F41 and TE-F42 are closed. **No contract in this amendment requires production code**: the progress domain is a statement of what was already built, and the resource contract is an acceptance contract that no source file reads — `13 107`, `memory.current` and `oom_kill` appear nowhere outside this record.

**Implementation owns two items and no more.**

1. **D-198's unstruck residues.** The entry's statement clause and its Touches line still carry the scoping that the entry's own fourth paragraph retracts, so `decision-status.ts` renders a flattened statement containing both the retracted scope and its replacement, and `drag2:D-198` reads as a decision contradicting itself and the document it amends. The same expired premise stands unstruck in F-424 and its repair entry, both of which still assert that root Markdown stays on Prettier and that `.prettierrc.json` and `.prettierignore` remain. **The required property**: a corrected entry carries the correction at every site stating the corrected fact, so that the register's own projection is what the decision now says. Strikethrough is content under `ledger.ts`, so the repair is made by striking, not by deleting.
2. **The `120 → 121` figure.** The formatter coverage proof states 120 tracked, existing, `oxfmt`-supported files outside `packages/` against a root leg reporting 120; both are 121 at `e41e72b25`, and the figure was never 120 at either end of the range. The method and the property are right; only the number is wrong. **The required property**: a figure a record offers as verification reproduces at the commit the record is published at.

**Nobody owns a repair for the sub-window regime.** TE-F43 is the boundary of the supported progress domain, settled by owner disposition, and a maximum wait, periodic generation creation, an event counter or any other defence for it is **out of scope by decision rather than deferred** — demonstration 33 fails an implementation that adds one.

**Discharged by this range and not carried forward**: the CDP comment, both clauses of demonstration 20 driven over CDP, the `pkill` justification, the formatter unification and its partition, and demonstrations 26–32.

**The resource contract's next reading is a procedure, not a task.** TE-D21's regression gate is comparative, so the next pass taking a root-run measurement runs the arms alternately on one container and reports both baselines beside both peaks. The four runs already taken are the reference, and the tolerance rests on two pairs — a pass that wants a firmer one widens the evidence.

**Implementation does not own** the value of `BROWSER_WORKERS`, the ten-second budget, the fifty-millisecond window, or the five-per-cent tolerance. Each is stated with its derivation, and each moves against measurement rather than preference.

**The consolidator owns registration**, unchanged and still owed: repository findings as `repo:RF-`, numbered from 1, each written into [`.plan/00-index.md`](../00-index.md) in the commit that first uses it, and no heading claiming an identifier it was not given.

**The owner owns** the pull-request gate choice (`repo:RD-2`) and the editor confirmation (demonstrations 13–15), both unchanged.

**Re-review is not warranted for the lifecycle or the budget.** Both were attacked under both consumers by a pass carrying its own controls, and this amendment changes no behaviour either pass observed. What a later pass should read is TE-D21, the first time a root run is measured against it.

## Grounds a focused challenge should attack

- **The delta is reproduced and unexplained.** Three runs, two of them independent and agreeing within 1 %, against one design sample 32 % lower (TE-F37). Both offered explanations are falsified and the replacement — that the design's probe arm was unrepresentative — is a reading nobody has tested. Attack it by re-running the design's own probe arrangement on the shipped tree: if it still measures Δ 5554, the difference is the probe and not the mechanism, and this record's most-cited number was never a measurement of what it claimed.
- ~~TE-D17 is decided from source and one race probe~~ — **attacked and answered.** The remediation review drove a real dev server and a real Rolldown build under watcher-delivered saves; the bound was too low exactly as this ground predicted, and the measurement it asked for — how many supersessions a real rebuild produces — is TE-F42. The successor grounds are below.
- **The progress domain is bounded by a constant chosen for coalescing, not for the domain.** The fifty-millisecond window was derived as a performance parameter — TE-D20 says so in terms, and says correctness does not depend on it — and it now also decides where the repository stops owing progress (TE-F43). Two justifications rest on one number and only one of them was derived. Attack it by asking what the domain should be if the window moved for a performance reason: the answer should be "nothing about what is owed", and today it is not.
- **The cost of the rule near its threshold is bounded and large.** At a rate just above the window, 168 workers in ten seconds, bounded at ⌈budget ÷ window⌉ ≈ 200. Bounded is what the old cap was not, and nobody has measured what 200 sequential `Worker` constructions cost a dev server that is also serving a page.
- **The regression tolerance rests on two pairs.** Five per cent above a 0.5 % matched-pair difference and a 4.4 % mismatched one is a defensible first cut and is not a noise distribution. A regression between 1 % and 5 % passes today and nothing has established that no such regression is real.
- **The baseline precondition is a gate on the measurement, not on the run**, and nothing enforces it. A pass that reports two arms 1500 MiB apart at rest has satisfied TE-D21's letter while comparing quantities TE-F44 shows are not comparable. The precondition is stated and unautomated, which is the shape of requirement this record has watched fail before.
- **The stability budget's value is derived from one filesystem's timings.** Ten seconds is three times the worst generation measured on this container, and nothing has measured a generation on a slower disk, a network mount, or a machine where the 35-entry graph costs more. The derivation is stated so the number can be re-derived; it has not been re-derived anywhere else.
- ~~Coalescing assumes a rebuild's writes are delivered inside one window~~ — **measured, on a synthetic 29-file write**: 31 separate watcher events produced two generations and one supersession, so the generation count is flat across a tenfold change in the event count. What is still unmeasured is the one that matters: **a real `@ydinjs/tproc` rebuild**, whose artefacts are written in stages by a real build and may well arrive as several waves. A handful of waves is nowhere near the budget, so the design survives it; nobody has counted them.
- **The budget is consulted only when an invalidation arrives, and that is load bearing.** It buys the absence of a timer, and it means a request starved by a storm that _stops_ is never abandoned — correct, and it also means no arm can observe the budget without keeping a writer running. If a future change moves the check anywhere else, the handle-freedom demonstrations stop covering it.
- ~~Detachment before termination is required on two paths and implemented on one~~ — **settled**: disposal occurs at exactly one site, reached only from a detach that clears the attachment on the line before and from the drain rule that runs only when it is already empty, so no termination path can leave an attached request behind. Verified by enumeration over the current file and by the abandoned-while-draining arm publishing `C/C` where the pre-range tree publishes `A/C`.
- **The draining state is a cost nobody has priced.** Every authoring error now leaves a second worker evaluating the same files until it finishes. It is bounded and it is TE-D13's existing price, but no arm has measured what a `.css.ts` throw costs in memory during a root run, and TE-F37 says this record's memory numbers are not well understood.
- **Supersession is specified as a property and not as a mechanism**, and the drop rule is the subtle half: a response from a discarded generation must be dropped, and the code path that would publish it is the same one that correctly publishes a normal answer. That is the shape of defect this design has met twice — a mechanism that reports success while doing the wrong thing.
- **The primitive was found by executing the design, not by reviewing it.** Three revisions and two challenges read "the provider is closed" without noticing that the obvious call does not close a provider (TE-F33). Ask what else in this record names an outcome where it should name a mechanism.
- **The non-browser bound is tuned to one container.** Twelve cores, this workload, this timeout. `availableParallelism() / 2` scales the number and not the reasoning behind it; a machine where the group's builds are cheaper or the cores fewer may want a different rule, and nothing here measures that (TE-F34).
- **Process-wide generation sharing is asserted from the shape of the code**, not from a case where two consumers disagree. If any consumer's options could reach evaluation rather than `compileCSS`, one generation is wrong.
- **Reference counting across three plugin instances is unimplemented.** The measured arm never released the generation at all — which is exactly what TE-F22 caught.
- ~~The 10 s close timeout was diagnosed by elimination~~ — **settled**: the handle is the parent-side `MessagePort` with a live listener (TE-F32).
- **`--sequence.*` is not the only override that could erase configured structure.** The allow-list has 20 names and the merge is wholesale; only `sequence` was traced.
- **TE-F19's consequence is stated but not demonstrated end to end.** No arm edited a shared token file and observed all dependent entries re-evaluate through the real watcher.
- **The editor is still the weakest evidence in the design**, three revisions in, and it is the workflow the owner named as non-negotiable. TE-D15 now rests on it in a new way: if any editor gesture issues two consuming executions in one process, the contract turns a working gesture into a loud failure.
- **The one-shot counter's exemption for empty runs is a hole by construction.** A run that matches nothing does not consume the lifecycle, so a mistaken filter followed by a real run is allowed — correct, but it means the invariant is "at most one execution that executed", not "at most one call".
- **The carrier depends on `configureVitest` and on `vitest.config` being the object `createReporters` reads.** Both are internal arrangements verified at one version. `Vitest._createRootProject` assigns `this._config = resolved` (`cli-api.BK8pd4xc.js:13097`), so the identity is by construction rather than by coincidence; that the pair fails loudly rather than silently if either changes is still reasoned, not measured.
- **TE-F30 is an enumeration of one bundle at one version.** It is exhaustive over that bundle, not over extension versions, and no editor has run it.
- **Keeping `allowExec: true` leaves the API server's rerun RPCs reachable.** They are made loud by TE-D15 rather than absent, and the server binds `0.0.0.0` as it already did. That is a deliberate trade of a silent gate for a loud guard, and it is the place to attack if the trade is wrong.