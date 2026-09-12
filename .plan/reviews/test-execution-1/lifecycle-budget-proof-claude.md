# test-execution-1 — the lifecycle, the budget and the formatter, independently reviewed

**Files read at `e41e72b25`**, the head of the reviewed range `ab174b894..e41e72b25` on `drag2/fin-review`, which is also the checkout head.

**Canonical inputs.** The test-execution architecture through `ab174b894` — `architect-test-execution-model-r4.md` §TE-D18, §TE-D19, §TE-D20, demonstrations 26–32, and §The whole-repository run, re-measured — the prior focused review at `c63269e5a`, and [`implementer-lifecycle-and-budget.md`](../../test-execution-1/implementer-lifecycle-and-budget.md). The architecture document is byte-different in the range and **content-identical**: `git diff --word-diff=porcelain` reports zero changed content lines, so the contract reviewed against is the one published at `ab174b894`.

**Isolation.** Every execution ran in detached worktrees at `e41e72b25` (`wt2-head`) and `ab174b894` (`wt2-base`), each with `node_modules` symlinked from the checkout and its packages built there. Every lifecycle arm was run on **both** trees, so each result carries its own discriminating control. No production code was modified in any tree; `git status --porcelain` carries only this artifact.

**Nothing here claims an identifier.** No heading opens with one at any depth; the pass-local `lb-` names sit in the bodies.

## Scope

**Covered.** The repaired lifecycle under both real consumers — a real Vite dev server with watcher-delivered saves and no injected events, and a real Rolldown build with the change delivered by a co-tenant dev server's own watcher — plus the module boundary where the ordering can be forced. The stability budget across five invalidation rates. Acceptance cases 26–32 and their discrimination against `ab174b894`. The accompanying repairs: the CDP comment, demonstration 20's two clauses driven over CDP, the `pkill` justification, and the formatter unification end to end. The resource result, re-measured on both arms. The root run's provider release, process exit and surviving failure.

**Not covered.** The design outside this range: `BROWSER_WORKERS`, `repo:RD-2`, id registration, and the derivations of the ten-second budget and the fifty-millisecond window, which the record implements rather than re-derives. The editor demonstrations 13–15, which remain owner-executed. How a real `@ydinjs/tproc` rebuild delivers its artefacts to a watcher on another filesystem.

## Result

**Four findings: one tier A, two tier B, one tier C.** The tier A and both tier B items are **routed** — each turns on a contract the pass does not own, and none is a departure from TE-D18, TE-D19 or TE-D20 as written.

**The lifecycle repair holds under everything I could aim at it.** TE-F41 and TE-F42 are both closed, in both consumers, with the discriminating half present in every arm: the torn sibling becomes untorn _and_ the arm shows a watcher event detached it; the 29-file burst resolves _and_ costs one supersession. Demonstrations 26–32 discriminate as written, and the two limits the record preserves are correct — I re-derived both rather than crediting them.

| Local | Tier | Claim |
| --- | --- | --- |
| lb-1 | A | The budget cannot fire when invalidation arrives faster than the coalescing window |
| lb-2 | B | The `memory.current` acceptance signal is an absolute peak, and the run does not meet it |
| lb-3 | B | D-198 still states the scoping its own correction retracts, and the register's projection reports both |
| lb-4 | C | The formatter coverage proof's figure does not reproduce |

---

## Tier A

### The stability budget cannot fire when invalidation arrives faster than the coalescing window

**lb-1. Routed.**

**Current behaviour.** A supersession is counted only when a request is detached from a generation. While a window is open every arriving invalidation re-arms it (`arm()` calls `clearTimeout` then `setTimeout`), so an invalidation stream with a gap shorter than `COALESCING_WINDOW` keeps the window permanently open, no successor is ever created, and the parked request is never attached to anything to be detached from. Its `supersessions` therefore stays at 1 — below `SUPERSESSION_FLOOR` — for as long as the stream lasts, and the budget's conjunction can never be satisfied.

**Why it is a problem.** TE-D20 requires that "**a parked request's budget is evaluated on every invalidation that reaches it**, in flight or parked", and gives the reason in the next clause: "without this, a storm severe enough that no generation ever exists would never consult the budget at all." The implementation satisfies the letter — the budget loop ranges over `parked` and runs on all 694 invalidations I drove — and the clause's purpose is still defeated, because the counter it gates on cannot advance in exactly the regime the clause names. TE-D19 removes the old cap on the ground that "**the hazard is a rate, and a count cannot bound a rate**"; the floor of two is a count, and in this regime it is the binding constraint.

**Evidence.** One tracked file rewritten at a fixed interval against a 400 ms entry, from before the request is issued until well past the budget, at the module boundary where the rate is controlled:

| interval | invalidations | generations | outcome |
| --- | --- | --- | --- |
| 20 ms | 694 | 0 | **never abandoned** — still pending at 14 s |
| 45 ms | 311 | 0 | **never abandoned** — still pending at 14 s |
| 60 ms | 234 | 168 | abandoned at 10 166 ms, `superseded 168 times over 10.0s` |
| 120 ms | 118 | 82+ | abandoned at 10 341 ms, `superseded 85 times over 10.1s` |
| 300 ms | 48 | 34 | abandoned at 10 813 ms, `superseded 35 times over 10.2s` |

The discontinuity sits exactly at the 50 ms window. Above it the budget behaves as designed and as the record demonstrates; below it the request waits indefinitely. When the writer stops, the request completes normally (`resolved v694`), so this is a stall for the duration of the storm rather than a leak — no handle is retained and the process still exits with none.

**Discriminating.** At `ab174b894` the same 20 ms storm rejects in **65 ms** with `CSS evaluation superseded by concurrent invalidation 2 times`. The old bound was far too eager; the new one, in this regime, never fires at all. Both are wrong in opposite directions, and the new failure is the quiet one.

**Why the record does not see it.** Demonstration 28's arm rewrites at 300 ms, six times the window, so every gap opens a successor and the counter advances — the arm cannot reach the regime TE-D20's clause is about. I reproduced that arm exactly (`superseded 35 times over 10.2s`, rejected at 10 813 ms against the record's 10 518 ms) before finding that it brackets only one side of the threshold.

**Adjacent datum for whoever prices the window.** At 60 ms the implementation created **168 generations in 10 s** — one Worker per quiet window, which is TE-D20-conforming and is the cost of the rule at rates just above the threshold.

**Required property.** A request that continuous invalidation keeps from completing is abandoned on the budget regardless of the rate, including a rate at which no successor generation is ever created.

**Routed.** Fixing it means changing what counts as a supersession or what the floor gates on — TE-D19's bound, not its implementation.

## Tier B

### The `memory.current` acceptance signal is an absolute peak, and the run does not meet it

**lb-2. Routed.**

**What the contract constrains.** Both axes, absolutely. The acceptance-signal table requires `Peak memory.current ≤ 13 107 MiB (80 % of cap)`, and demonstration 1 requires "peak anonymous memory **and** peak `memory.current` **both** at or below the 13 107 MiB working ceiling". TE-F37 closes the question explicitly — "What does not change: the 13 107 MiB ceiling. It is unchanged, it is met, and the acceptance signals are unchanged." The record's own preference for the anonymous axis is stated as what it "should have required from the start" and as the figure "subsequent passes compare"; comparing is not requiring, and no entry re-states the requirement. So the signal that the run reports at 13 231 MiB is a required threshold, and it is not met.

**Why baseline-plus-unchanged-delta is not sufficient attribution.** It is an explanation of the arithmetic, and the arithmetic is right; it is not a waiver, because the threshold is stated on the peak and not on the delta. I also could not sustain the premise that the delta is invariant. Four sampled runs, `memory.current` and `anon` at 1 Hz from the cgroup, head and base alternated on one container:

| run | baseline cur | peak cur | Δ cur | peak anon | Δ anon | vs ceiling |
| --- | --- | --- | --- | --- | --- | --- |
| head1 | 6361 | **15 269** | 8908 | 12 073 | 8112 | over by 2162 |
| base1 | 7923 | **14 980** | 7057 | 11 564 | 6153 | over by 1873 |
| head2 | 7722 | **14 797** | 7075 | 11 464 | 6396 | over by 1690 |
| base2 | 7759 | **14 775** | 7016 | 11 405 | 6319 | over by 1668 |

Three readings. **The breach is not this range's**: `ab174b894` breaches the same ceiling by the same order on the same container, so nothing in TE-D18/19/20 or the formatter unification causes it. **The two arms are indistinguishable at matched baselines**: head2 and base2 sit 37 MiB apart at rest and 59 MiB apart on Δ `memory.current`, under one per cent. And **the delta is itself baseline-dependent** — head1 measured Δ 8908 MiB at a baseline 1361 MiB _lower_ than head2's Δ 7075 MiB — so "the delta did not move" holds only between runs at comparable baselines and is not the transferable quantity the record treats it as.

**What holds regardless.** `memory.events.oom_kill` is **0** in all four runs, and **peak anonymous memory is under the ceiling in all four** (11 405–12 073 MiB). The axis TE-F35 and TE-F37 both argue for is the one with margin, and my data is a fourth independent run agreeing with them.

**Why it is tier B and not lower.** No consumer observes anything; what is unsound is an acceptance signal the repository gates on. As stated it cannot be met on a container at this resting load at _any_ commit, so a pass that meets every behavioural requirement still fails the table, and the only way to record a pass is to explain the number away — which is what the record does, honestly, and which is how a threshold stops being one.

**Required property.** The acceptance signal names a quantity the repository's own work controls, or states the baseline precondition under which the peak is read.

**Routed.** Re-expressing the ceiling on the anonymous axis, as a delta budget, or with a stated precondition is a contract change.

### D-198 still states the scoping its own correction retracts, and the register's projection reports both

**lb-3.**

**Current behaviour.** D-198's correction is made in the fourth paragraph, which strikes the scoping clause and replaces it: "the premise expired… the rule stands absolutely, over every file a formatting recipe writes." Two earlier and later sites in the same entry are not struck and still carry the retracted scope:

- the decision's own statement clause — "**Exactly one tool decides formatting for the files a package's `fmt` owns**, and a lint rule may not re-decide it";
- the **Touches** line — "**scopes** the `handoff.md` clause **to the files a package's `fmt` owns** and **names root-level Markdown as the exception**".

`handoff.md` §Verify what you changed, which D-198 amends, now reads "**One tool decides formatting**, and a lint rule may not re-decide it" and names no exception.

**Why it is a problem.** `ledger.ts` states the rule the register is read under — "**Strikethrough is content, not formatting.** A struck span… is the one span whose text must not reach the statement" — so unstruck text is the decision's live statement. The repository's own projection makes that concrete: `node .scripts/decision-status.ts` renders D-198's statement as a single flattened paragraph containing _both_ "for the files a package's `fmt` owns" and "the rule stands absolutely, over every file a formatting recipe writes", and a Touches line describing an exception the tree no longer has. A reader resolving `drag2:D-198` — the documented way to read one entry — gets a decision that contradicts itself and contradicts the document it amends. No gate catches this: `decisions.node.test.ts` checks the register's structure, not whether a statement agrees with itself.

**Two further sites carrying the same expired premise, unstruck.** F-424 and its repair entry in the same file still assert "The root Markdown path stays on Prettier, which is why `.prettierrc.json` and `.prettierignore` remain" and "`handoff.md` directs root-level Markdown — which no `oxfmt` invocation reaches — to `npx prettier --write`". Both files are deleted and `handoff.md` says neither thing.

**Evidence.** The entry read back through `.scripts/entry.ts`, and the flattened statement from `.scripts/decision-status.ts`, both at `e41e72b25`. Verified here.

**Required property.** A corrected entry carries the correction at every site that states the corrected fact, so that the register's own projection of the decision is what the decision now says.

## Tier C

### The formatter coverage proof's figure does not reproduce

**lb-4.** The record proves coverage by two numbers agreeing: "The tracked, existing, `oxfmt`-supported files outside `packages/`… number **120**, and the root leg of `just fmt` reports **120 files**." At `e41e72b25` both are **121**. Enumerating tracked files outside `packages/` with an `oxfmt`-supported extension gives 122, of which `package-lock.json` is refused by the tool as a lock file, leaving 121; `oxfmt --check . '!packages/**'` reports `Finished … on 121 files` and finds every one correctly formatted. The root count is 122 at _both_ ends of the range — `.prettierrc.json` leaves and `implementer-lifecycle-and-budget.md` arrives — so the figure was never 120 at either endpoint.

**The method is right and the property holds**; only the figure is wrong, which is why this is C. **Required property.** A figure a record offers as verification reproduces at the commit the record is published at.

---

## What survives falsification

### The lifecycle, under both consumers

Every arm below ran on both trees. The discriminating column is what `ab174b894` does.

**An entry failure followed by an invalidation publishes no tear (26).** A real Vite dev server, every fixture created before the server starts, no injected events, and a warm entry evaluated first so the saves under test are tracked changes:

```
                         at ab174b894   shipped here
throwing request       : the entry threw (own message, own stack, both)
sibling published      : A/B            B/B
torn                   : true           false
generations that ran it: 1              2
```

Repeated at the module boundary with the timing controlled: `A/B` / 1 generation against `B/B` / 2 generations, the throwing request rejecting with a stack inside `boom.css.ts:3:7` in both. The generation count is the half that matters and it is present — a watcher event detached the sibling, and the untorn output is the consequence.

**Without an invalidation, a sibling still settles against the draining snapshot.** Same fixture, save omitted: `A/A` from **one** generation, on both trees. Draining is a state that publishes, and the repair did not turn it into abandonment.

**One logical rebuild costs one supersession, in both consumers (27).** Dev server, one request in flight while _N_ tracked files are rewritten at once:

```
          head                                   base
N=1     : 3 events,  2 generations, resolved     3 events,  2 gen, resolved
N=2     : 4 events,  2 generations, resolved     3 events,  1 gen, REJECTED
N=3     : 5 events,  2 generations, resolved     4 events,  1 gen, REJECTED
N=29    : 31 events, 2 generations, resolved     30 events, 1 gen, REJECTED
```

Real Rolldown build, change delivered by a co-tenant dev server's watcher:

```
          head                                   base
N=1     : built, b1/b1,   torn false, 2 gen      built, b1/b1, torn false
N=2     : built, b2/b2,   torn false, 2 gen      BUILD FAILED: superseded … 2 times
N=29    : built, b29/b29, torn false, 2 gen      BUILD FAILED: superseded … 2 times
```

My watcher delivered 29 files as **31 separate events** rather than the batched pair the previous round measured, which makes this a stronger reading of the same property than the record's own arm: the generation count is flat across a tenfold change in the event count.

**A discarded generation's answer cannot win (29).** The third arm — abandoned **while draining**, with the dying worker's reply forced to arrive after the successor's:

```
                                     head    base
published                          : C/C     A/C
answered from the abandoned snapshot: false   true
deps carry a successor-only module  : true    true
settlements                         : 1       1
```

**Invalidation reaches a draining and an accepting generation together.** One generation draining with a request attached, a second accepting with another, one invalidation:

```
head : draining request resolved C/C   accepting request resolved C/C
base : draining request resolved A/C   accepting request resolved C/C
```

**Disposal is a single path, and detachment precedes it.** `generations.delete`, `monitor.close()` and `worker.terminate()` occur at exactly one site — `dispose` — reached only from `detach`, which clears the attachment on the line before, and from `settle`'s drain rule, which runs only when the attachment is already empty. So no termination path can leave an attached request behind, on either the accepting→abandoned or the draining→abandoned route.

**Parking has no bypass.** `issue` has one branch. A request arriving inside an open window resolves in **996 ms** against a 900 ms entry, where the same request at base resolves in 947 ms — the 49 ms difference is the window. The stronger reading is the storm above: 694 invalidations with a request outstanding created **zero** generations.

**Release reaches everything (31).**

```
                              at ab174b894                     shipped here
only a draining generation  : resolved A/A after 641 ms        released after 0 ms
draining + accepting        : draining resolved, other released both released
parked + window armed       : released                         released
```

The first row is the discriminating one: at `ab174b894` a generation draining when the last consumer leaves publishes an answer afterwards.

**The limit the record records on item 31 is real, and I re-derived it rather than crediting it.** `arm()` is called only at the end of `discardGeneration`, after every member of the set has been detached and disposed in the same synchronous block, and `resume()` clears the window before attaching anything. So a live generation and an armed window cannot coexist, and item 31's four-way simultaneous shape is unreachable by construction. The three arms above are its reachable union.

**The new states leave no handle (30).** Six arms, each its own process, `process.getActiveResourcesInfo()` at exit:

```
success · failure · supersede · abandoned-draining · parked-window · exhausted-no-release
→ every one: exited naturally, live handles: none
```

**A limit worth recording beside that.** The `parked-window` arm exits with the parked request never settling, because the window is `unref`'d by design (TE-D20) and nothing else in that process holds the loop. It is not reachable through a consumer: a window is armed only by an invalidation, an invalidation only arrives from a watcher, and a watcher is itself a live handle — which is why every dev-server and Rolldown arm above resolves. Recorded so the arm's `none` is read as the specified outcome rather than as evidence that a parked request is always served.

**No ordinary save rejects a request, in either consumer (32).** The `N=1` rows above, plus the entry throw rejecting only the request that threw, with that entry's own message and stack, while a sibling on the same generation resolves.

### The accompanying repairs

- **rem-3.** The comment now reads "the CDP port opened by the launch arguments above", and the launch arguments are above it.
- **rem-4, both clauses, driven here over CDP.** A probe browser test with a `debugger` statement, run through `.scripts/zed-test.sh … debug`: `Chrome/153.0.8010.36`, attached to `http://localhost:9876/__vitest_test__/…`, `paused: reason=other at line 4`. The test file was then **saved while paused**, left three seconds, and the run resumed: the log carries exactly **one** `RUN` line, **zero** `already executed a test run` errors, and `Tests 1 passed (1)`. Both halves of demonstration 20 are now evidenced, and the second half is no longer taken on narrowing.
- **rem-5, and the cleanup keeps its cause.** Reproduced: with a debug run live, 6 processes hold `--remote-debugging-port=9222` and the port answers; killing the task's script and its Vitest process leaves **all 6 alive and the port still answering** with the Vitest process gone. A run that completes leaves nothing, which is why the cause is invisible except after an interrupt — exactly what the new comment says.
- **The formatter is unified, and the partition is complete and disjoint.** The nine `fmt` projects are exactly the nine directories under `packages/`, with no tracked file under `packages/` outside them; the root leg is everything else. `just fmt-check` passes at head. No lint rule re-decides formatting: `prettier/prettier` is absent from the resolved ESLint config, `eslint-plugin-prettier` is registered by nothing, and `eslint-config-prettier` — kept deliberately — only disables. `prettier` is not a declared dependency at any workspace; it survives in `package-lock.json` only transitively. No Markdown link points at either deleted config file.
- **The 54 Markdown files that lost a trailing newline are the policy being honoured, not a regression.** `.editorconfig` sets `[*.md] insert_final_newline = false`; package-owned Markdown, already `oxfmt`-covered before this range, already ended that way. This range brings the root files into line with a declared convention that Prettier had been contradicting. I checked this before writing it up because the diff reads like damage.
- **`proseWrap: "never"` is the repository's own setting**, in `.oxfmtrc.json` and already applying to every package record — the record's characterisation is accurate. It was never a Prettier setting; `.prettierrc.json` carried four keys and none of them was this.

### The root run

Four sampled whole-repository runs, two per arm: **2468 passed, 60 skipped, 1 failed** in every one, 66.4–70.4 s, **seven of seven** providers released in boundary order 1→8, zero `close timed out`, zero `Failed to run the test`, zero unhandled errors, `oom_kill` 0.

**The surviving failure is the pre-existing `node/tproc` assertion.** `packages/tproc` is untouched by this range (zero files), and the test fails in isolation at head in 3 ms of test time with the assertion I reproduced at the branch point `9884b1fb1` in the previous round. Unchanged attribution, re-derived rather than inherited.

**`node/drag2`'s `size.node.test.ts` passed in all four runs**, at both commits, consistent with the previous round's attribution of its timeout to the shared non-browser group's contention.

## Method notes

**A symlinked-`node_modules` worktree fails `just lint` for a reason not in the tree.** At head the failure is twelve `no-unsafe-member-access` diagnostics on `packages/drag2/bench/size/noncomposed.js`, which reaches built output that a fresh worktree does not carry. The same command in the checkout at the same tree exits 0. This is the second round in which a worktree-only lint failure had to be excluded; recorded again so it is not reported as a regression.

**Delegation.** None. Every claim here was executed in this agent.

**LSP plugin — available; used, and stale on the file under review.** `findReferences` and `documentSymbol` on `css/generation.ts` answered from the pre-range copy — the returned symbol table lists `ATTEMPTS` and `discardGeneration`'s `discarded` binding, neither of which exists at `e41e72b25`. It was re-probed once and behaved the same way, so every structural claim about the module's call and disposal surface in this report comes from exhaustive `grep` over the current file instead.