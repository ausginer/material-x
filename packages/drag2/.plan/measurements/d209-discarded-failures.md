# Discarded failures: the implementation record (D-209)

> **Implemented and remediated 2026-11-04, not accepted.** The independent review ran at `3ff2d2acf` and was disposed by §33 of the handoff. [The remediation](#the-remediation-33) is below. This record stops for §33.12's fresh, delta-only `reviewer` recheck, and architect acceptance follows it. D-209's marker and row, F-446 and F-448 are untouched, so `decisions.node`'s witness row is red by design until then.

**Canonical entry: `drag2:D-209`,** with its amendment for rejected settlements. The handoff is [`request-application-claude.md`](../reviews/architecture/request-application-claude.md) §32.5 to §32.8, and §33.8 to §33.11 for the remediation.

**Input.** `7398d6969` on `drag2/fin-review2`, whose `src/` is the accepted tree `626180a058af7374a68c5544fefc4111eec6003c`, the same `src/` as `e2aabaf3b`.

**The series:**

| Commit | Contents |
| --- | --- |
| `ec15441ce` | Step 1: the source, its rows, `tests/COVERAGE.md` and the README |
| `448ce5015` | Step 2: five control figures and their [`budget-rebases.md`](budget-rebases.md) entry |
| `3ff2d2acf` | Step 3: this record, the mutation readings, one README correction (§What to correct at acceptance), and `tests/COVERAGE.md`'s (k) cell, restored to `D-209, F-446` |

**The `src/` tree those three commits landed is `db3c402a488231e4d17fa2b6a3209543dab561e5`.** Steps 2 and 3 do not change it. The remediation's tree is in its own section.

## The mechanism

`#step`'s non-`LIVE` branch keeps iterating, handles nothing, and calls the report on each `FAILED` and `RESOLUTION_SETTLED` entry that carries one, in queue order. The kernel builds that report as a `discard` member: on the checkpoint at registration, and on the attempt only after a rejection has won the first-completion latch. It reports `DraggableWarning('drag: failure/superseded-by-destruction')` with the fault as `cause`, through `this.report`. As §32.4 states, `ActionQueue.apply`'s stop branch now has no production caller, and it stays.

## Property 6

Each check compares the landed tree with `e2aabaf3b`.

**The comment-stripped diff,** with `ts.transpileModule` and `removeComments` on both sides. Two `src/` files changed, and every hunk is at a site §32.8 allows:

| File | Hunk |
| --- | --- |
| `kernel/execution.ts` | The import of `FAILED` and `RESOLUTION_SETTLED` |
| `kernel/execution.ts` | `#step`'s non-`LIVE` branch: `return false` becomes the tag test, the call and `return true` |
| `kernel/kernel.ts` | `#failOperation`'s dispatched literal gains `discard` |
| `kernel/kernel.ts` | `#settleResolution` gains the `SETTLED_REJECTED` branch |

The `LIVE` branch of `#step` has no hunk. `FailureCheckpoint` and `ResolutionAttempt` each gain a member, and both are erased.

**The member lists,** by the TypeScript AST, are identical: `ExecutionBracket` 21, `ArmedController` 75, `Kernel` 15 and `ActionQueue` 4.

**The declarations:** 33 files, 0 differ.

**`capture.node`:** passes unchanged, including R21's census. R21 did not move, and the re-pin D-209 allows was not used.

**Allocation, by reading only:** one closure per registered checkpoint and one per rejected settlement. A settlement with no fault takes one more type test and allocates nothing for it. No allocation or timing round ran.

## The rows

Every row of §32.6 is in place, cited by title in `tests/COVERAGE.md`, and has its required outcome:

- **Public, in `diagnostic-intake.browser`:** (i) both behaviors, (j) free drag, (k) unchanged, (s) public half both behaviors, (v) both behaviors with its control, (z) both behaviors.
- **Kernel, in `kernel.browser`:** (l), (m), (n), (o), (p), (q), (r) twice, (s) kernel half, (t), (u), (w) twice, (x) twice, (y).
- **Bracket, in `execution.node`:** (B1), (B2), (B3). These were not run on the prototype, and they pass.

**(l) was driven as stated.** Its old row was rewritten under a new title and moved into the new `describe`, beside (m) to (y). (i), (j) and (l) carry new titles, and (k)'s title and assertions are unchanged.

**What makes the rows discriminating.** X1 restores the accepted tree's outcome for every delivery, so its reading below stands in for §32.6's _accepted tree_ column. Every row marked _fails_ reddens under it, and every row marked _passes_ stays green. The rows were not run on the tree `626180a05` itself.

## The mutations

Each ran once on `ec15441ce` and was restored, over `kernel.browser`, `diagnostic-intake.browser`, `execution.node` and `capture.node`. **Read each as:** a mutation shows that rows see it, not that a property holds wherever it reaches. Full titles are in [`mutations.txt`](../probes/d209-implementation/mutations.txt).

| Mutation | Failed | Listed rows reddened | Beyond the list |
| --- | --: | --- | --- |
| **N1**, `#step` declines only at `CLOSED` | 30 | (i) both, (j), (l), (m), (n), (o), (p), (q), (r) twice, (s) both halves, (t), (v) both, (w) twice, (z) both. **(k) stays green** | See below |
| **X1**, the walk removed | 20 | (i) both, (j), (v) both, (z) both, (l), (m), (n), (o), (p), (q), (r) twice, (t), (w) twice | (B1), (B2) |
| **X2**, stop after the first declined entry | 4 | (n), (q), (r) cancel first | (B1) |
| **X3**, identify by argument and not tag | 5 | (s) both halves, (t) | (B1) |
| **X4**, deliver after application, on the checkpoint | 14 | (i) both, (l), (m), (n), (o), (p), (q), (r) twice, (t), (z) both | (j) |
| **X5**, call `spec.reportError`, bypassing the route | 1 | (q) | None |
| **X6**, report the cancel's code when a cancel is held | 2 | (r) twice | None |
| **X7**, no settlement carrier | 4 | (v) both, (w) twice | None |
| **X8**, set the settlement carrier before the latch | 1 | (x), fulfil then reject | None |
| **X9**, walk before closing on a panic | 2 | (u) | (B3) |

**N1's rows beyond the list:** _should stop the drain at the next entry when an action requests destruction_, _should drain after admission and handle nothing once admission requested destruction_, (B1), (B2), _should open no round-trip for a destroy requested in the release effect_, _in the release prepare_, _by an action the release effect dispatched_, _should finish the join whose anchorTarget requested destruction and retire nothing after it_ and _should apply none of the requests from onStart when destruction follows them_.

**X2 ran twice.** My first spelling stopped only after a fault entry. That is not §32.7's wording, and it reddened (n), (q) and (B1) but not (r), because a `CANCEL` ahead of the checkpoint did not stop it. Spelled as written, it stops after any declined entry, and (r)'s cancel-first row reddens. Both runs are in `mutations.txt`.

**X4 has one spelling among others:** it defers the checkpoint's report by a microtask and leaves the settlement carrier alone, so (v) and (w) do not see it, as on the prototype.

**A mutation that reddened nothing listed would have stopped the sequence, and none did.**

## Composition

`measureAll()` at `ec15441ce`, with `drag2` rebuilt, against the ceilings in force. **No ceiling moved.** _Before_ is `d208-step6.md` §The final tree's Brotli column, which the comment commit to `626180a05` did not move: at the input, the controls read exactly and the other rows match to `just size`'s 10 B rounding. Bytes.

| Row | Minified | Brotli | Before | Modules | Ceiling | Slack |
| --- | --: | --: | --: | --: | --: | --: |
| minimal | 33,648 | 10,290 | 10,221 | 33 | 10,351 | 61 |
| minimal (xy) | 33,005 | 10,195 | 10,117 | 32 | 10,244 | 49 |
| minimal + layoutAnimation | 34,564 | 10,615 | 10,558 | 34 | 10,683 | 68 |
| xy + layoutAnimation | 33,921 | 10,503 | 10,435 | 33 | 10,563 | 60 |
| minimal + landing | 34,041 | 10,441 | 10,393 | 35 | 10,536 | 95 |
| complete | 34,957 | 10,767 | 10,722 | 36 | 10,838 | 71 |
| free drag minimal | 27,292 | 8,337 | 8,281 | 27 | 8,412 | 75 |
| free drag + bounds | 27,936 | 8,553 | 8,514 | 28 | 8,645 | 92 |
| free drag + landing | 27,685 | 8,497 | 8,449 | 29 | 8,587 | 90 |
| free drag complete | 28,329 | 8,712 | 8,652 | 30 | 8,778 | 66 |
| both behaviors | 42,497 | 12,283 | 12,235 | 47 | 12,359 | 76 |
| vocabulary root - drag.js | 252 | 142 | 142 | 2 | 205 | 63 |
| kernel root - kernel.js | 20,262 | 6,398 | 6,340 | 16 | 6,470 | 72 |
| baseline A - feature-matched, non-composed | 34,248 | 10,600 | 10,525 | 31 | 10,658 | 58 |
| baseline B - shipped @ydinjs/drag sortable.js | 22,618 | 6,916 | 6,916 | 26 | 7,040 | 124 |

**Every row is under its ceiling, and no module entered a graph.** `drag.js` stays at 142 and baseline B at 6,916. Slack on the thirteen package rows is now 49 to 95 B, which the compression pass inherits. These are measured endpoints of one change, so the deltas do not decompose.

**The controls.** Five moved, and each is re-declared with its whole interval attributed to `ec15441ce`: 8,337, 8,553, 8,497, 8,712 and 6,398. [`budget-rebases.md`](budget-rebases.md) holds the entry. None is unattributed.

## What A and a3 cover

**Retained heap A, allocation a3 and the owner's acceptance of 2026-11-04 belong to tree `626180a058af7374a68c5544fefc4111eec6003c`.** They do not extend to this tree. **So the merged tree will not be the measured tree.** The comment-stripped diff shows no statement on the sample path changing and no per-controller state added, and that is what this record offers in place of a measurement. No statistical round ran, and none is owed under D-209's _Measurement_. This record makes no statement about either figure on the new tree.

## The whole suite

Run once, at `448ce5015` with this record's file and the README correction in the working tree: **1,456 pass, 5 fail, 68 skipped, of 1,529. 74 of 78 files pass.** The failing set is exactly what §32.8 requires, by name:

- `decisions.node`: _should hold every witness it claims_, because this file exists. It clears at acceptance.
- `docs.node`: _should resolve every reference a public type makes_, and the closure rows for the kernel, ordinary and free-drag tiers (RF-24).
- `tests/sortable/react.browser.test.ts` and `stories.browser.test.ts` do not load (RF-25).

**`consumer.node`'s sourcemap row passed,** so F-447 did not recur in this run. All six `size.node` control rows pass. At the input the same suite read 1,431 pass, 4 fail and 68 skipped, of 1,503, with the four `docs.node` rows and the same two files.

**Finalizing.**

- `just typecheck` reports only the two `.scripts/` errors (RF-24).
- Two `unbound-method` lint errors remain in `kernel.browser.test.ts`, on `const selection = window.getSelection`. One is the standing line in the panic row, reported at D-208. **The other is new, in row (u),** which copies that row's stub. It is listed and not hand-resolved, as the handoff document requires.
- `README.md`, `tests/COVERAGE.md` and the records are ignored by the linters, and `oxfmt` wrote them.

## What to correct at acceptance

**Disposed by §33 of the handoff, and the items below stay as written at `3ff2d2acf`.** Item 1 is corrected at §33.7. Item 2's two sentences are replaced by §33.5's wording, in the remediation. Item 3 stays, because §33.5 finds the sentence true: the same request with no throw also publishes no terminal. The README sentence below is superseded by §33.5's.

**Not amended here, as directed.**

1. **§32.10's attribution is contrary to the owner's.** It says _No independent review of D-209 is booked, by the owner's direction against another round_, and that the acceptance would rest on the architect's reading. The owner clarified on 2026-11-04 that _no new architecture review round_ did not waive independent implementation review: one fresh, bounded `reviewer` pass comes after this implementation, and architect acceptance follows it.
2. **Published sentences this change makes untrue, in a file §32.5 puts out of scope.** `src/kernel/spec.ts`'s `reportError` doc says of a warning that _the terminal for that operation still publishes afterwards_, and no terminal follows this warning. By reading, it was already untrue of a report made between a request and its application (R33 (e)). The same file's `requestDestroy` doc, _that unit completes first … and nothing after it runs_, reads differently now that `onError` runs after the unit, though no unit does. Both stayed. They reach `kernel/spec.d.ts`, so the architect decides them.
3. **`src/kernel/errors.ts`'s `DraggableWarning` doc** says _The operation terminated exactly as it would have_. No terminal is published here, and the outcome was decided by destruction and not by this fault. It is outside the handoff's table and was left.

**The README sentence is corrected in this record's commit.** §32.5 words it as _a callback that requests destruction and then throws reaches `onError` as a `DraggableWarning`_, and step 1 landed that. It is untrue of a `handle` resolver, whose own step reports a `DraggableError` (§30.1), so the sentence now states both routes, with §32.5's content for every other callback. That is a README line and no source.

## Limits

- **Each reading ran once,** in Chromium, on one machine, in the main checkout. A mutation shows that rows see it, not that a property holds wherever it reaches.
- **§32.2's enumeration of queue entries is the architect's, by reading,** and I did not re-derive it beyond confirming the two `dispatch` sites changed here.
- **`measureAll()` read the main checkout,** not a fresh worktree. The input's controls reproduced exactly there, so the toolchain and dependency builds match the re-declaration's figures.
- **Nothing here is an acceptance.** The independent review ran at `3ff2d2acf`, and its recheck of the remediation has not run.

## The remediation (§33)

**Input.** `302ab0a37` on `drag2/fin-review2`, whose `src/` is `db3c402a4`.

| Commit | Contents |
| --- | --- |
| `6386f12e1` | Step 1: `kernel.ts`'s two code sites, comment hunks elsewhere, rows (ab) to (an), `tests/COVERAGE.md` and the README |
| `a815493a7` | Step 2: five control figures and their [`budget-rebases.md`](budget-rebases.md) entry |
| This record's commit | Step 3: this section and the [mutation readings](../probes/d209-implementation/remediation-mutations.txt) |

**The new `src/` tree is `779b4b0f5d3a04610b7cdb8edba306fc7520d2ef`.** Steps 2 and 3 do not change it.

### The mechanism

**A rejection that won the latch reports exactly once, whichever request superseded it.** The closure reads its code when it is delivered: destruction's while the attempt is still current, and the cancel's once it has been retired. `#handleResolutionSettled`'s retired branch calls the carried report and returns. An attempt with no rejection carries none and reports nothing. No class gained a field, no constructor gained a callback, and no name was exported.

**The spelling is the prototype's,** in [`prototype-src.diff.txt`](../probes/d209-disposition/prototype-src.diff.txt).

### Property 6, by §29.6's method

| Against | Files differing | Comment-stripped hunks |
| --- | --: | --- |
| `3ff2d2acf`, tree `db3c402a4` | 8 | `kernel.ts` only: `#settleResolution`'s closure and `#handleResolutionSettled`'s retired branch. The other seven are comment-only |
| `e2aabaf3b` | 8 | `execution.ts`: the import and `#step`'s non-`LIVE` branch. `kernel.ts`: `#failOperation`'s `discard`, `#settleResolution`'s branch, and the retired branch. These are §32.8's sites and that branch |

- **The member lists,** by the TypeScript AST, match both revisions: `ExecutionBracket` 21, `ArmedController` 75, `Kernel` 15 and `ActionQueue` 4.
- **The declarations:** 33 files, built from the landed tree and from `db3c402a4`'s sources. Four differ in text, `free-drag/config`, `free-drag/controller`, `kernel/spec` and `sortable/config`, and all 33 are identical once comments are stripped. This compares with `db3c402a4`, whose declarations matched `e2aabaf3b`'s in the section above.
- **`capture.node`** passes unchanged, and R21 did not move.

### The rows

Every row of §33.9 is in place, cited by title in `tests/COVERAGE.md`, and has its required outcome: (ab) to (af) in both behaviors, (ag) and (ah) in free drag with (ah) as two rows, and (ai) to (an) in the kernel. Standing rows stayed, and §33.6's retitle changes no assertion.

**Two spellings to read.**

- **(ae) returns `Promise.reject` from a slot that is not `async`,** as (y) does, because `require-await` refuses an `async` function with no `await`. An `async` slot that throws returns the same rejected promise. The disposition's probe drove the `async` spelling.
- **The fixture's `onResolve` now returns the slot's value,** so a row can return that promise. Returning nothing still accepts.

**§33.9's _Input tree_ column reproduced exactly, with one substitution.** `INPUT` below takes out the two hunks, which gives `db3c402a4`'s behavior under the landed rows. It reddens (ab) and (ac) in both behaviors, (al) and (am), and nothing else. The rows did not run on the tree `db3c402a4` itself.

### The mutations

Each ran once on `6386f12e1` and was restored, over `kernel.browser`, `diagnostic-intake.browser`, `free-drag/anchor.browser`, `execution.node` and `capture.node`. The landed code read 351 pass and 0 fail. **Read each as:** a mutation shows that rows see it, not that a property holds wherever it reaches. Full titles are in [`remediation-mutations.txt`](../probes/d209-implementation/remediation-mutations.txt).

| Mutation | Failed | Listed rows reddened | Beyond the list |
| --- | --: | --- | --- |
| **Y1**, the retired branch delivers nothing | 3 | (ab) both, (al) | None |
| **Y2**, the closure always reports destruction's code | 6 | (ab) both, (ac) both, (al), (am) | None |
| **Y3**, the closure always reports the cancel's code | 9 | (ad) both, (ai), (v) both, (w) twice | (aj), (ak) |
| **Y4**, the carrier is set on every settlement | 4 | (af) both, (x) twice | None |
| **X5s**, the settlement carrier bypasses the route | 1 | (aj) | None |
| **X6s**, the settlement carrier reports the cancel's code when one is held | 12 | (ai) | (ab), (ac) and (ad), each both, (al), (am), and three `capture.node` census rows |
| **N1**, `#step` declines only at `CLOSED` | 37 | as §32.7. **(k) stays green** | (ad) both, (ag), (ai), (aj), (ak), (an), and the standing rows the file lists |
| **X1**, the walk removed | 29 | as §32.7 | (B1), (B2), (ac) both, (ad) both, (ai), (aj), (ak), (am), (an) |
| **X7**, no settlement carrier | 15 | (v) both, (w) twice | (ab), (ac) and (ad), each both, (ai), (aj), (ak), (al), (am) |
| **X8**, set the settlement carrier before the latch | 1 | (x), fulfil then reject | None |

**X6s's spelling reads `this.#operation?.cancelRequest` in place of the attempt test,** so it replaces the choice the landed closure makes. That is why it also reddens the routes where the two disagree.

**A mutation that reddened nothing listed would have stopped the sequence, and none did.**

### Composition

`measureAll()` at `6386f12e1`, with `drag2` rebuilt, against the ceilings in force. **No ceiling moved.** _Before_ is `ec15441ce`'s figure above. Bytes.

| Row | Minified | Brotli | Before | Modules | Ceiling | Slack |
| --- | --: | --: | --: | --: | --: | --: |
| minimal | 33,723 | 10,329 | 10,290 | 33 | 10,351 | 22 |
| minimal (xy) | 33,080 | 10,199 | 10,195 | 32 | 10,244 | 45 |
| minimal + layoutAnimation | 34,639 | 10,651 | 10,615 | 34 | 10,683 | 32 |
| xy + layoutAnimation | 33,996 | 10,517 | 10,503 | 33 | 10,563 | 46 |
| minimal + landing | 34,116 | 10,483 | 10,441 | 35 | 10,536 | 53 |
| complete | 35,032 | 10,791 | 10,767 | 36 | 10,838 | 47 |
| free drag minimal | 27,367 | 8,357 | 8,337 | 27 | 8,412 | 55 |
| free drag + bounds | 28,011 | 8,592 | 8,553 | 28 | 8,645 | 53 |
| free drag + landing | 27,760 | 8,516 | 8,497 | 29 | 8,587 | 71 |
| free drag complete | 28,404 | 8,734 | 8,712 | 30 | 8,778 | 44 |
| both behaviors | 42,572 | 12,298 | 12,283 | 47 | 12,359 | 61 |
| vocabulary root - drag.js | 252 | 142 | 142 | 2 | 205 | 63 |
| kernel root - kernel.js | 20,337 | 6,418 | 6,398 | 16 | 6,470 | 52 |
| baseline A - feature-matched, non-composed | 34,323 | 10,620 | 10,600 | 31 | 10,658 | 38 |
| baseline B - shipped @ydinjs/drag sortable.js | 22,618 | 6,916 | 6,916 | 26 | 7,040 | 124 |

**Every row is under its ceiling, and no module entered a graph.** All fifteen rows equal the prototype's figures. `drag.js` stays at 142 and baseline B at 6,916. Slack on the thirteen package rows is now 22 to 71 B, and the 22 B on `minimal` is what the compression pass inherits.

**The controls.** Five moved, each with its whole interval attributed to `6386f12e1`: 8,357, 8,592, 8,516, 8,734 and 6,418, from `448ce5015`'s 8,337, 8,553, 8,497, 8,712 and 6,398. [`budget-rebases.md`](budget-rebases.md) holds the entry, and none is unattributed.

### What A and a3 cover (§33.13)

**D-208 is not reopened, and its evidence is untouched.** Retained heap A, allocation a3 and the owner's acceptance of 2026-11-04 belong to tree `626180a058af7374a68c5544fefc4111eec6003c`. They do not extend to `db3c402a4` or to this tree. No statistical round ran, and none is owed. The comment-stripped diff shows no statement on the sample path changed and no per-controller state added. This record makes no claim about regression, cost, A or a3 on this tree.

### The whole suite

Run once, at `a815493a7` with the mutation readings in the working tree: **1,475 pass, 5 fail, 68 skipped, of 1,548. 74 of 78 files pass.** The 19 new rows account for the difference from 1,529. The failing set is exactly what §33.11 requires, by name:

- `decisions.node`: _should hold every witness it claims_, by design until acceptance.
- `docs.node`: _should resolve every reference a public type makes_, and the closure rows for the kernel, ordinary and free-drag tiers (RF-24).
- `tests/sortable/react.browser.test.ts` and `stories.browser.test.ts` do not load (RF-25).

**`consumer.node`'s sourcemap row passed,** so F-447 did not recur in this run. All six `size.node` control rows pass.

### Finalizing

- `just typecheck` reports only the two `.scripts/` errors (RF-24).
- **§33.11's _lint must report none_ is not met, by one error that was not introduced here.** `src/sortable/spec.ts:1289` reports `consistent-return` on `prepareSettlement`. That file joined the changed set only through §33.8's comment hunk, and the same error reads at line 1286 on the file at `302ab0a37`. §33.6 says `handoff.md`'s _list it, do not resolve it by hand_ still governs any other lint error, and §33.8 allows no code hunk there, so it is listed and left. **The architect decides it.**
- §33.6's two `unbound-method` lines carry the directed comment, and neither reports now.
- `README.md`, `tests/COVERAGE.md` and the records are ignored by the linters, and `oxfmt` wrote them.

### Limits

**§33.14's limits stand.** One of them is carried here because no row reaches it:

- **The kernel-tier wrong-label limit is not tested and not resolved.** A kernel-tier seam that fails and then synchronously rejects the round-trip's thenable in one interval would queue `[FAILED, RESOLUTION_SETTLED]`, and the rejection would carry the cancel's code. The fault is delivered and its label is wrong. That is §33.14's reading. This remediation did not drive it, adds no row for it and adds no guard.

**Also:**

- **Each reading ran once,** in Chromium, on one machine, in the main checkout. Nothing here is an acceptance, and the recheck has not run.
- **The retired branch's phase test is not re-derived.** §33.14 notes it could report a current attempt as destruction's if the slot and the phase ever disagreed, and I relied on the same comment it did.
- **§33.2's route was not driven with a real scroll or resize,** and the listener's comment states it by §33.2's reading.
- **`moveTo`'s _past release_ has no new row.** The published sentence names it, the disposition drove it on the prototype, and (ag) and (ah) cover the other three cases.

## What stays open

| Item | Owner | Required action |
| --- | --- | --- |
| One fresh, delta-only `reviewer` recheck | owner starts it | §33.12, next, before acceptance |
| D-209's acceptance, marker, row, F-446 and F-448 | architect | §32.10, after the recheck |
| `src/sortable/spec.ts`'s standing `consistent-return` error | architect | Decide it, against §33.11's _none_ |
| RF-24, RF-25, F-447 | architect's handoff, then the implementer | §32.1 gates 3 to 5, after acceptance. Not repaired here |
| The merge, the terminology phase and the compression pass | as §32.1 states | Not started |