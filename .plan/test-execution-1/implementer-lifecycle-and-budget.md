# The generation lifecycle, the stability budget and coalescing — implementation

**Implementer pass, 2026-09-12, branch `drag2/fin-review` from `ab174b894`.** Implements TE-D18, TE-D19 and TE-D20 as published at `ab174b894`, the three tier C findings of the remediation review at `c63269e5a`, and the owner's formatter unification. [`architect-test-execution-model-r4.md`](architect-test-execution-model-r4.md) §The handoff boundary after the remediation review is the work list.

**Nothing here claims an identifier.** No heading opens with one at any depth, and the local `TE-` and `rem-` names fall outside the local identifier grammar in any case (`repo:RD-1`).

**Boundaries kept.** `BROWSER_WORKERS` is unchanged at two. Nothing of `repo:RD-2` is built. No canonical id is allocated. Test watch is not reintroduced. The budget and the window are implemented at the values the record derives and neither is re-derived here.

## What landed

| Change | Where |
| --- | --- |
| The set of undisposed generations, and the three lifecycle states | `packages/vite-custom-element-assets/src/css/generation.ts` |
| Invalidation and release ranging over the set, not the slot | the same file |
| The stability budget, replacing the attempt cap | the same file |
| Parking and the re-armed, unref'd coalescing window | the same file |
| The CDP comment's direction | `.scripts/vitest-config.ts` |
| The cause the debug recipe's port cleanup still has | `.scripts/zed-test.sh` |
| `oxfmt` as the single formatter authority, Markdown included | `Justfile`, `eslint.config.ts`, `.devcontainer`, two deleted config files |
| The records that described the obsolete formatter partition | `.agents/docs/handoff.md`, drag2's `00-index.md` (D-198) |

## The state model, as implemented

The module holds a `Set` of undisposed generations beside the `current` slot. **Accepting** is `current`; **draining** is any other member, which takes no new requests and whose snapshot is still valid; **abandoned** is not a state a generation rests in — `detach` empties its attachment and disposes it in one step, which is how invariant 3 is kept: detachment precedes termination, and only an attached request can be resolved.

Three call sites changed shape rather than behaviour.

- `dispose` removes the generation from the set and clears the slot if it held it, so the set and the slot cannot disagree about what exists.
- `discardGeneration` ranges over the set. Every generation is abandoned, accepting or draining alike, and the requests it held are counted, parked and re-issued. This is TE-F41's repair, and it is the whole of it.
- `releaseGeneration` no longer returns when the slot is empty. It cancels the window, rejects every parked request, and fails every member of the set.

The budget is evaluated inside `discardGeneration` and nowhere else, so the policy arms no timer of its own; the only timer in the module is the coalescing window, `unref`'d.

## Demonstrations 26–32

Each arm names what the tree at `783c97665` does, so an arm passing for the wrong reason is visible. Every dev-server arm creates its fixtures before the server starts, so the watcher sees changes only, and no event is injected anywhere.

### An entry failure followed by an invalidation publishes no tear (26)

A real Vite dev server. One entry throws 150 ms in; a sibling reads `early.ts` at link time and `late2.ts` 800 ms later; both token files are saved at 300 ms.

```
                             at ab174b894    shipped here
throwing request           : the entry threw (own message, own stack, in both)
sibling published          : A2/B            B/B
torn                       : true            false
generations that ran it    : 1               2
watcher events             : 3               3
```

`A2/B` is the mixture TE-D17 exists to make impossible: the pre-change module the entry had already loaded beside the post-change one it loaded afterwards. The generation count is the discriminating half — **two** generations evaluated the sibling, so a watcher event detached it and the successor produced the answer; the untorn output is a consequence and not the assertion.

Repeated at the module boundary, where the timing is controlled: the throwing request rejects with its own message and a stack inside `boom1.css.ts`, the sibling publishes `B/B`, and two generations evaluated it.

**One property of the arm worth recording.** The plugin's `watchChange` guard admits a file only once a completed evaluation has reported it as a dependency, so an arm whose first evaluation is still in flight has an empty tracked set and its saves reach nothing at all. An arm built that way measures the guard, not the lifecycle — it produces the same "the invalidation was a no-op" reading for a different reason. Every arm here completes one evaluation of an entry reading both token files first, then discards, so the saves under test are tracked changes.

### One logical rebuild delivered as many file events costs one supersession (27)

A dev server with a warm entry and one request in flight while _N_ tracked files are rewritten at once:

```
N=1 : watcher events 1   generations 2   resolved
N=2 : watcher events 2   generations 2   resolved
N=3 : watcher events 3   generations 2   resolved
N=29: watcher events 29  generations 2   resolved
```

The event column is what the shipped counter was denominated in, and it is the column that moves; the generation column is TE-D20's property and it does not. At `ab174b894`, `N=2` rejects the request and the rejection escapes the watcher callback as an uncaught error that ends the process.

Through a real Rolldown build with the change delivered by a co-tenant dev server's own watcher — three plugin instances to one process generation, the co-tenancy this repository runs:

```
N=1 : built, artefact b1/b1,   torn false, generations 2
N=2 : built, artefact b2/b2,   torn false, generations 2
N=29: built, artefact b29/b29, torn false, generations 2
```

Every build succeeded and every artefact is one generation's view of both modules, with no later request papering over anything.

### Repeated invalidation exhausts the budget, and says so (28)

One tracked file rewritten every 300 ms against a 400 ms entry, from before the request is issued until after the budget elapses. **A recorded probe, not a suite test**: it costs the budget in wall clock.

```
rejected at      : 10518 ms (budget 10 000 ms)
message          : CSS evaluation abandoned: superseded 35 times over 10.2s of continuous invalidation
names a file     : false
stack in the module: true
stack in a .css.ts : false
invalidations    : 39
handles after it : none
after it stops   : resolved (v39)
exit             : naturally at 12445 ms; live handles: none
```

Not rejecting early is as much of the assertion as rejecting eventually: at `ab174b894` this rejects within tens of milliseconds naming a count of two. Thirty-nine invalidations produced thirty-five supersessions — the four that arrived while the request was parked and attached to nothing counted nothing, which is the unit TE-D19 asks for. No release is called in this arm, and nothing is left behind.

### A discarded generation's answer cannot win (29)

At the module boundary, where the dying worker's reply can be forced to arrive after the successor's:

```
published          : B/B        (torn: false)
deps carry extra.ts: true       (a module only the successor ever resolved)
settlements        : 1
```

And the third arm, the one TE-F41 reaches — a generation abandoned **while draining**:

```
published                           : C/C
answered from the abandoned snapshot: false
generations that evaluated the drainer: 2
```

### The new states leave no handle (30)

Each arm its own process, `process.getActiveResourcesInfo()` read at exit:

```
success               : exited naturally after  55 ms; live handles: none
failure               : exited naturally after  59 ms; live handles: none
supersede             : exited naturally after  56 ms; live handles: none
abandoned-draining    : exited naturally after 152 ms; live handles: none
parked-window         : exited naturally after   3 ms; live handles: none
```

The exhausted-budget arm is measured in 28 above, with no release called, and reads `none` as well.

### Release reaches everything (31)

```
                                 at ab174b894              shipped here
only a draining generation     : resolved, 3066 ms,       released, 149 ms,
                                 live handles PipeWrap ×2  live handles none
draining + accepting           : —                        released | released
parked + window armed          : —                        released | released
```

The first row is the discriminating one and it is worse than the record predicts: at `ab174b894` the draining request does not merely survive the release, it **publishes an answer after the last consumer has gone**, and the process outlives the release by the length of the evaluation with worker pipes still open.

**A shape the demonstration names is unreachable, and the reason is structural.** Item 31 asks for one generation draining, another accepting, a request parked and a window armed, all at once. A window is armed only by an invalidation, and an invalidation abandons every live generation, so no generation can survive into an armed window; the reachable states are _generations live with no window_ and _no generations, window armed, requests parked_. The three arms above cover both, and the union of their assertions is the item's. This is a property of TE-D20's coalescing rule rather than a gap in the implementation.

### No ordinary save rejects a request, in either consumer (32)

A single save inside one evaluation resolves in the dev server (`resolved: Z`, one watcher event) and emits a correct artefact from the Rolldown build (`N=1` above). A genuine entry throw still rejects only the request that threw, with that entry's own error and stack, while a sibling on the same generation resolves.

## The remediation review's three tier C findings

- **rem-3 — the comment's direction.** `.scripts/vitest-config.ts` now points at the CDP port "opened by the launch arguments above", which is where they are.
- **rem-4 — demonstration 20's second clause.** Evidenced rather than narrowed. With the debug task paused at a breakpoint over the attached port, the test file was touched and the run left alone for three seconds before resuming: the log carries exactly one `RUN` line, no `already executed a test run`, and `Tests 1 passed (1)` — a save while paused starts no second execution. The first clause is re-evidenced in the same run: `paused: reason=other at line 7`, attached at `http://localhost:9876/__vitest_test__/`.
- **rem-5 — the `pkill` obligation.** Discharged with evidence, and the cleanup stays because it still has a cause. Stopping a debug task kills the Vitest process alone; its Playwright Chrome is orphaned and goes on holding port 9222 — measured here, five surviving processes and the port still answering — so the next debug run would find it taken. A run that **completes** leaves nothing, which is why the cause is invisible until a session is interrupted. The script now says this where the `pkill` is.

## The formatter, unified

`oxfmt` is the single authority for every supported file in the tree, Markdown included. The premise the partition rested on — that no `oxfmt` invocation reaches Markdown — is false at the pinned version, which formats `.md` in the same style the Prettier path produced apart from prose wrapping, where the repository's own `proseWrap: "never"` applies as it already did to every package record.

- The root `Justfile`'s `fmt` and `fmt-check` lose the `'!**/*.md'` exclusion and the Prettier lines.
- `.prettierrc.json` and `.prettierignore` are deleted: the disposition F-424 left open, taken. `eslint-config-prettier` stays — it disables stylistic lint rules and imposes no format, which is the half D-198 keeps.
- The audit for standalone consumers found one, and it is removed: `.devcontainer/devcontainer.json` recommended the Prettier editor extension, which with no configuration left would have formatted this tree to its own defaults. No script, recipe, workflow or package depends on Prettier; the package itself is not a declared dependency.
- `.agents/docs/handoff.md` and D-198 are corrected in fact rather than in substance: the rule they state is unchanged and now applies without an exception.

**The coverage is proved rather than asserted.** The tracked, existing, `oxfmt`-supported files outside `packages/` — `.md`, `.ts`, `.tsx`, `.json`, `.css`, `.html`, `.yml`, with `package-lock.json` refused by the tool as a lock file — number **120**, and the root leg of `just fmt` reports **120 files**; running `oxfmt --check` over exactly that enumerated list reports the same 120 and finds every one correctly formatted. Fifty-five of them are Markdown that no package recipe reaches. No file is offered to two formatters, and the strong form of that is now structural: there is no second formatter in the repository.

Fifty-three Markdown files were reformatted, which is what the newly covered set costs once. `.claude/agents/*.md` frontmatter is unchanged — the effort guard reads it and the diff touches only the trailing newline — and drag2's record instruments, which `proseWrap: "never"` once broke, are green: `references`, `decisions` and `entry` pass 94 of 94, the reader still answers `drag2:D-198` and `repo:RD-1`.

## Verification of the tree as a whole

- **The whole-repository run**, `npx just test` with the teardown log on: **2468 passed, 60 skipped, 1 failed**, 62.10 s, seven of seven providers released in boundary order, no `close timed out`, no `Failed to run the test`, no unhandled error.
- **The one failure is the pre-existing `node/tproc` assertion**, outside this work by instruction. `node/drag2`'s `size.node.test.ts`, which the previous run timed out under contention, passed here — consistent with the review's attribution of it to the shared group's contention rather than to any change.
- **Resources**, sampled at 1 Hz: Δ `memory.current` **7549 MiB** and Δ anonymous **6842 MiB**, both within about two per cent of the pair TE-F37 makes the comparison (7356–7412 and 6618–6685), with `memory.events.oom_kill` **0** and peak anonymous 10 550 MiB under the 13 107 MiB working ceiling. **Peak `memory.current` is 13 231 MiB, which is over that ceiling by 124 MiB**, and the cause is arithmetic rather than behavioural: the container rests at **5682 MiB**, against 2015–3538 MiB in every run the record carries, and 5682 + 7549 is the peak exactly. The delta is the transferable quantity and it did not move; a run at any previously recorded baseline stays under the ceiling.
- **Both consumer classes pass**: `just build` (tsdown) and `just docs-build` (the Vite build path, Storybook plus the API docs), alongside the dev-server and Rolldown arms above.
- **Gates**: `just fmt-check`, `just lint`, `just typecheck` over nine projects, the root `tsc`, and `just build` all pass.

## What is owed, and what is not claimed

- **The editor, demonstrations 13–15**, stay owner-executed. No VS Code installation exists in this container; nothing here is an editor observation.
- **How a real `@ydinjs/tproc` rebuild delivers its 29 artefacts to a watcher on another filesystem** is still unmeasured. What is measured is that 29 files delivered as 29 events cost one supersession, which removes the dependence on the batching behaviour the old counter was calibrated against.
- **The budget and the window are not re-derived here.** Ten seconds and fifty milliseconds are the record's values, implemented as named constants with the derivations beside them.
- **The `memory.current` ceiling breach above is reported, not explained away.** It is attributed to the resting baseline by arithmetic and by the unchanged deltas; a quiet-container run would settle it, and this container has not been quiet in any pass of this work.