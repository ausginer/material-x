# D-208 final review round: consolidation

**Round:** `d208-final`, under [`request-application-claude.md`](../architecture/request-application-claude.md) §29.9. **Reviewed commit:** `bd3613d5f` on `drag2/fin-review2`. **`src/` tree:** `c6c5e6ea59697efa8f27beae2700a574e6f3df4c`. **Runtime comparison input:** `6905af249`.

**Passes:** `reviewer` ([report](d208-final-feature-proof-claude.md)) and `integrity` ([report](d208-final-integrity-claude.md)), launched in parallel, neither given the other's findings. Both read at `bd3613d5f`, so their reports can be merged.

## Outcome

**The round found no source defect. No run shows a behavior regression against the input, and the record's figures, its a3 wording and the owner's words hold.**

**One question needs the architect's decision before the whole-decision acceptance:** reviewer-1, below. Five smaller text findings are routed with it. The round fixed nothing, and the freeze holds.

D-208 stays `Unimplemented (Remediation)`, and the `decisions.node` witness still fails as expected. This round marks nothing, closes nothing and merges nothing.

## Findings

No finding was rejected. No two findings describe the same defect, so none was merged. Tiers are by consequence.

| Local id | Tier | Claim | Routed to |
| --- | --- | --- | --- |
| reviewer-1 | B, see below | A consumer slot that requests destruction and then throws reaches no `onError`, while D-208 and I-36 say every diagnostic of that interval is delivered. No row pins the outcome | architect, a decision |
| integrity-1 | B | The published `CANCEL_SUPPLIED` doc says `cancel(reason?)` was called. Both controllers publish only `requestCancel` | architect, under the freeze |
| integrity-2 | B | The published `BehaviorContext.fail` doc says an out-of-seam call becomes a _platform report_. The kernel delivers a `DraggableWarning` through the controller's route, as the doc's next paragraph says | architect, under the freeze |
| reviewer-2 | C | `d208-requests.md:206` repeats _the profile cannot name which anonymous function_, the wording §27.3 corrected | architect, for the record's text |
| reviewer-3 | C | `d208-requests.md:285` and `d208-step6.md:1495` cite `kernel/unwind.ts:33` for a phrase on line 35 | architect, for the record's text |
| integrity-3 | C | Root `Justfile:48` says _the same 15 projects_. `createWorkspaceTestConfig` lists 16 | the `Justfile`'s owner; repository-level, not this package's series |
| integrity-4 | C | Test titles and comments still say `destroy()` and `kernel.cancel`, and one cites `settlementLive`, which `src/` no longer has | implementer, after acceptance |

**Ids.** This summary mints no canonical id and proposes no number, so the local ids stand. The `Local → canonical` mapping is filled in when the architect registers a row, and the registered id wins. `F-445` is the highest `F-` in `00-index.md`, and a search of `.plan/`, `src/` and `tests/` finds no `F-446` to `F-449`. That shows those four numbers are unused. It says nothing about `Q-` or `I-`, and none is proposed. integrity-3 belongs to the repository's `RF-` series and is refused by this package's register.

### The decision reviewer-1 needs

**What is established.** The consolidator reproduced it on a private tree through the public `freeDrag` and `sortable` entries with real pointer events. Output is identical at `bd3613d5f` and `6905af249`, in both behaviors ([`d208-final-rerun-probe.txt`](d208-final-rerun-probe.txt)):

| Slot | `onError` and `onEnd` observed |
| --- | --- |
| `onStart` throws, no request (the control) | `DraggableError` stage 2 with the cause, then `onEnd` `canceled` |
| `onStart` requests destruction, then throws | nothing |
| `onMove` requests destruction, then throws | nothing |

> **Architect's dated correction, 2026-11-04 ([record §31.3](../architecture/request-application-claude.md)), not part of the round.** The table's third row is not established _in both behaviors_. Sortable has no `onMove` slot at either commit, and the probe passed the key through an untyped options object, so `sortable P1-onMove-destroy-then-throw []` at lines 7 and 15 of the raw log is empty because no callback ran. It is not evidence of sortable's diagnostic behavior. The probe also had no counter, so the free-drag `onMove` lines did not show that their callback ran either. A counter in the same drive shows it ran once at both commits, with the same empty log. The established scope is `onStart` in both behaviors and `onMove` in free drag. The text above and the raw log stay as the round left them, and no sortable slot past activation has been probed.

The mechanism is read at `kernel/kernel.ts:823–859` and `kernel/execution.ts:68–71`: the fault registers and queues `FAILED`, `#step` declines the entry because the lifecycle is `REQUESTED`, and application clears the queue.

**The texts disagree, and the evidence does not separate them.**

- **For delivery:** `00-index.md:2936`, _in `LIVE` and in the requested interval, every diagnostic is delivered_; `05:248`, _its diagnostics are a live controller's_; `README.md:74`, _completes as a live controller's_.
- **For discard:** §2.4 at line 138, _Requests raised in the interval are recorded as usual and discarded at application_, with §2.10's _A request: the classified checkpoint_ and the priority of destruction over a checkpoint; and the first sentence of `00-index.md:2936`, _The required behavior is the baseline's_, which the identical output at the input meets.

**Why the tier is conditional.** The reviewer assigned B, and this summary keeps it on the present evidence: nothing changes against the input, and a correct integrator can be misled by what the package says. If the architect reads delivery as the required behavior, the same observation is a behavior defect, and its consequence is tier A. That reading is the architect's call, so the tier is not settled here.

**Questions for the architect:**

1. Does a classified fault raised in the requested interval owe `onError`, or does §2.4's discard govern and D-208, I-36 and the README narrow?
2. Whichever holds, which row pins the outcome? The reviewer's search of test titles found none, and that search is not a census.
3. Does this block the whole-decision acceptance? §21.8 gives that call to the architect. A behavior change touches `src/`, so it is its own unit under §21.8.

### Decisions the other findings need

- **integrity-1 and integrity-2 are edits to frozen files.** The pass calls them no contract call and says nothing blocks acceptance on coherence grounds. This summary does not adopt that. §29.4 says _any other `src/` change, including a further comment, comes to the architect first_. Any such edit also moves the `src/` tree off `c6c5e6ea5`, the identity the record and this proof name, and whether and how the record carries across is the architect's to state. The consolidator confirmed both sentences in the built declarations: `kernel/failures.d.ts:39` and `kernel/spec.d.ts:56`.
- **integrity-2's provenance does not change its tier.** The phrase dates from the scaffold commit `c87ad854f`, so D-208 did not write it. Its consequence is the same either way.
- **reviewer-2 and reviewer-3 are text in the final record.** §29.9 asks whether the record states a3's limits truthfully. reviewer-2 changes no outcome: the sentence attributes a harness limit to the instrument, and §27.3 says this frame books nothing in the windows that bear on a3. Whether the record is corrected before acceptance is the architect's call. `d208-step6.md`'s original sentence is history, as the reviewer notes.

## The shared worktree: what happened and what was repeated

**The incident.** The consolidator's brief told both passes to use the scratchpad and gave them no distinct paths, and that omission is the consolidator's. `integrity`'s `git worktree add` at `scratchpad/wt` found the reviewer's worktree already there. It used that tree from about 09:05 to 09:22 UTC, adding trace lines, checking out `6905af249` and moving caches. When it noticed, it discarded its results, redid them in its own tree and disclosed the overlap. The reviewer's log carries the evidence too: `?? .vite.aside/` in its mutation batch's final status.

**The effect.** The reviewer's baseline suite (09:08), probe (09:14), declaration builds (09:15), TypeDoc runs (09:18) and mutation batch (finished 09:25) overlap that window. They cannot be cited from the report alone. The seam readings ran in their own worktrees, by `seam.sh`, and are unaffected.

**The repetition.** The consolidator repeated the affected runs once each in a private worktree at `bd3613d5f`, with its own install and build. This repeats existing mechanical readings. It is no new review, and no statistical round ran.

| Reading | Reviewer's result | Clean result |
| --- | --- | --- |
| Whole suite, row by row | 1,424 pass, 5 fail, 68 skipped, 2 files unloadable | Same on every row except one, below |
| M1, M2, M3 | 19, 11, 2 beyond the controls | Same row names ([log](d208-final-rerun-mutations.txt)) |
| N1 to N7, N9 to N13 | as in the report | Same row names |
| **N8** | **517** beyond the controls, unexplained | **8 raw, 4 beyond the controls** |
| Reviewer-1 and slot-reassignment probe | as in the report | Same, at both commits |
| Comment commit: five files, comments stripped, against `70368bfde` | equal | Equal |
| 33 built declarations against `70368bfde` | one sentence differs, in `kernel/spec.d.ts` | The same one sentence |

**N8's 517 is not a reading of the mutation.** The reviewer flagged it as unexplained. Its log has 525 raw rows. The clean run's 8 are all among them, which leaves 517 that the clean tree does not redden, and the reviewer reports they include files unrelated to cancellation. On the clean tree N8 reddens four declared controls, three `capture.node` rows and one activation row, _the activation checkpoint against a held cancel should not reach ACTIVE when a cancel is latched during activation_. **That the overlap caused the 517 is inferred from the timing and the clean rerun; no run isolated it.**

**One clean-run row differs.** `consumer.node`, _should pack every sourcemap its modules point at_, failed once in the consolidator's baseline with 32 entries. It passed in all 16 later full runs on the same tree and alone, and it passed for the reviewer and for `integrity`. Its cause was not established. The mutation log's `gone 1` on every line is this row.

**TypeDoc was not repeated by the consolidator.** `integrity` ran the same reading in its own tree after discarding the overlap: it is red on the two `.scripts/` compiler errors, and clean with `--skipErrorChecking --treatWarningsAsErrors`. The reviewer's and `integrity`'s statements agree.

## Coverage and limits

**Measured and repeated in this round:** the suite, the mutations, the probe, the identity checks, the composition table, and the seam readings the reviewer lists.

**Measured and taken from the record, not repeated:** M-1's 24 rounds, M-2″'s rounds, the allocation rounds, the call counts, the other 22 seam readings and the run conditions.

**Analysis in the record, read and found to agree with the code:** M-1's carry, and that no changed function runs in a sample, frame or `moveTo` window. That is reading and not a count.

**Accepted uncertainty and unresolved limits, left as they are:** a3; `moveTo`'s lean, per call or lump; whether the lean recurs or follows the worktree; the arrow's exact count; the low state's cause at both trees; the 1000-controller lean; the 1000-controller row bounding gross growth only. This round answers none of them. The reviewer tested how the record states them and did not reopen them.

**Recorded limitations, status verified:**

- **`decisions.node`:** the one witness row fails, as expected, and was not weakened.
- **`docs.node`, four rows:** they fail because TypeDoc aborts on `.scripts/vitest-config.ts:181` and `.scripts/vitest-one-shot.ts:34`. So these rows cannot currently detect an unresolved reference in anything D-208 added. A separate run with error checking skipped was clean at this tree. That is a reading for this tree and no repair. The record's _as before_ is true but does not say this, and both passes report it as information.
- **`react.browser` and `stories.browser`:** they do not load, on _Incompatible React versions_ (root `react` 19.3.1 against `packages/drag2`'s `react-dom` 19.2.7).
- **The 68 skipped rows** are the gated `tests/perf` files.

**Not covered, by each pass's own scope:**

- **`reviewer`:** a line-by-line reading of `sortable/` and `free-drag/`, which it reached through diagnostic routes, frame tasks, native listeners and the rows; contracts 02, 03, 06 and 07 beyond §5's named rows; browsers other than Chromium.
- **`integrity`:** lint and typecheck as gates, whose errors it saw and did not attribute; the M1 to M3 mutations and the transpile check, which it read from the record.
- **Both:** a3, F-442, F-443, F-445, compression and the terminology phase, by the round's boundaries.

**Limits of the repetition:** one run each, in Chromium, on one machine. The private worktree used `node_modules/.cache/css/css-private-props.json` copied from the main checkout so the test config would load. A mutation that reddens rows shows the rows see it, and not that the property holds everywhere the mutation reaches.

**How the reviewer's report reached this directory.** The harness refused that pass's `Write`, because subagents return findings as text. The pass did not route around the refusal, and the consolidator placed the text with a note at its head. `integrity`'s transcript shows no such refusal, and it committed its own report as `e3c41e626`. This difference is unexplained.

## Next

The owner runs the architect's whole-decision acceptance session. It needs a disposition of reviewer-1 first, and of the other routed findings. Acceptance alone removes D-208's row and marker, closes F-432 to F-435 and F-441, and marks D-208 implemented (§29.9). The merge comes after that and is the owner's.