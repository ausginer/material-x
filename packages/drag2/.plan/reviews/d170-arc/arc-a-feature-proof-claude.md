# Arc A — the execution bracket, proved against its own contract

**Subject** D-180 and [`arc-a-execution-bracket-claude.md`](arc-a-execution-bracket-claude.md), against `2e485eb4..164a151e` (A-1 `5a1da6ef`, the churn restore `e7c751fb`, A-2 `dd2cdb70`, A-3 `715c0a06`, A-4 `164a151e`). **Files read at** `164a151e` on `drag2/fin-review`. **Nothing is implemented or repaired by this pass.**

**The verdict in one line.** The extraction holds under every falsification I could construct: the entity owns what was decided and nothing else, the fifteen readings are fifteen, the ingress recomposition is the corrected one rather than the sketched one, all thirteen recorded mutations reproduce red-for-red, and every cell of the A-3 byte table re-derives on both trees. What does not hold is narrower and entirely in the record and the instrument's reach — **five tier-C findings, no tier A or B**.

## Scope

**Covered.** `execution.ts` and `queue.ts` read whole; every `#dispatchKernel` and `#queue.closed` route diffed site-by-site against `2e485eb4`; the fourteen node rows re-run under all thirteen recorded mutations plus six of my own, in a detached worktree; the whole suite run green at `164a151e` and under two mutations; `measureAll()` re-run on both trees; `e7c751fb` diffed against the baseline; A-4's counts re-derived.

**Not covered.** M-1 and M-1′ timings were not re-run — they are recorded as a null result at one clock quantum and a re-run reproduces the shape, not the numbers. The per-sample `kernel.closed` reading counts (0.28 / 1.00 / 0.00) were checked **structurally** — [`free-drag/spec.ts:528`](../../../src/free-drag/spec.ts) is `this.#slots.onMove && !this.#kernel.closed`, so the third row follows by short-circuit — but the probe was not rebuilt. F-335, F-323 and Arc B/C2+ untouched, per the brief.

## What holds

### The entity owns what was decided, and nothing else

`ExecutionBracket` carries the eight fields §3 names and the four callbacks, and **its only import is [`queue.ts`](../../../src/kernel/queue.ts)**. No frame, operation, spec, DOM node or declared consumer slot is named anywhere in the file except in prose; every consumer-visible act is behind `handle`, `panic`, `teardown` or `beginPass`. Invariant 8 holds by reading. `ActionQueue` is `actions`, `args`, `enqueue`, `clearQueue` and its factory — **91 lines to 44**, as A-4 says — and `closed`, `running` and `drain` are gone from it.

The kernel holds it in one `#private` field ([`kernel.ts:342`](../../../src/kernel/kernel.ts)), so F-317's `Exclude<keyof Kernel, keyof BehaviorContext>` row still reads `'arm'` and the public surface is unchanged. Declared-field lines in `kernel.ts` go **58 → 51**: eight out, one in.

### The fifteen readings are fifteen, and each is the same route

Sixteen `#queue.closed` occurrences at `2e485eb4`, one of them the write at `:781` — the census's 15 reads. At `164a151e`: **eleven** `#bracket.closed` in `kernel.ts` and **four** inside the bracket's guards. Site by site:

| Reading | `2e485eb4` | `164a151e` |
| --- | --- | --- |
| `#notify` · `#preparationValid` · `#cancelWith` · `failOperation` · the post-admission recheck · `#settlementLive` · `#joinLive` · the resolution gate · `#handleErrorReported` · `get closed` · public `dispatch` | `:400 :565 :889 :943 :1134 :1605 :1621 :1921 :2492 :2585 :2589` | `:425 :548 :790 :844 :1035 :1477 :1493 :1793 :2364 :2457 :2461` |
| `destroy()`'s idempotence read | `kernel.ts:779` | `execution.ts:192` |
| the dispatch gate | `kernel.ts:860` | `execution.ts:112` |
| `#openIngress`'s refusal | `kernel.ts:1275` | `execution.ts:147` |
| the post-admission drain gate | `kernel.ts:1300` | `execution.ts:167` |

**None was hoisted, cached, merged or replaced by a broader predicate**, and the drain loop's own per-iteration read survives as a sixteenth at [`execution.ts:223`](../../../src/kernel/execution.ts) exactly as it did in `queue.ts:82` — which is why A-4's "eleven plus four" is the right arithmetic rather than an undercount. The one guard that was _split_ is `#openIngress`: `closed || admitting || current.operation` becomes `current.operation` on the kernel and `closed || admitting` on the bracket. All three are pure reads whose only effect is to return, so the reordering is unobservable.

### The eleven dispatch routes are the same eleven

`#dispatchKernel` is deleted, not forwarded. Its eleven call sites map one-to-one and tag-for-tag onto `#bracket.dispatch` — `CANCEL`, `FAILED`, `MOVE`, `UP`, `ACTIVATE`, `START_COMMITTED`, `RETIRE`, `RESOLUTION_SETTLED`, `RELEASE`, `ERROR_REPORTED`, `BEHAVIOR_BASE + tag` — with the closed gate, the `enqueue`, the `admitting` early return, the depth increment and the `try/finally` transplanted verbatim. No route gained or lost an admission check.

### Ingress refuses before it prepares, and a close inside a pass defers

[`kernel.ts:1172`](../../../src/kernel/kernel.ts) is the composition §6 required, to the line: the operation guard alone, then `runIngress`. Inside, `#closed || #admitting` precedes `#depth += 1` precedes `#beginPass()`. Moving `beginPass()` above the guards reddens _should refuse a nested pass before the caller prepares one_ and nothing else, and [`kernel.browser.test.ts:1058`](../../../tests/kernel/kernel.browser.test.ts) — the row that presses from inside `admit` and asserts `note === 'outer'` — is byte-identical. The deferral arm holds too: `runIngress` opens the transaction before `admit`, so a close raised by a resolver sets `#teardownPending` and `#leave()` owns the teardown; removing that increment reddens the ingress-deferral row.

### Teardown order, and the routes that did not multiply

Step 2 sits immediately before the `teardown` callback in [`#runTeardown`](../../../src/kernel/execution.ts), and the callback carries 3–7 unchanged. **`#runPhysicalTeardown` goes from two callers to one** — the constructor closure at `kernel.ts:350` — so the two declared slots it reaches (`spec.retire`, `operation.lifetimes.dispose`) are reached by two routes where D-179 counted four. `#retireOperation` has **seven** call sites before and after; `#retireAttempts` **three** before and after. Nothing multiplied.

`close()` memoizes with `??=` and returns the same object from every call; the settle is a `finally` around the callback, so it runs whether the caller's release returns or throws.

### The thirteen mutations, recorded against measured

Applied to `src/kernel/execution.ts` at `164a151e` in a detached worktree, against a green 14-row baseline. **Every one reproduces exactly**, and no mutation reddened a row the record does not name:

| Mutation | Recorded | Measured |
| --- | --- | --- |
| the drained order reversed | 3 — FIFO, pairing, mid-drain latch | **3, the same three** |
| every entry handed the first argument | 1 — pairing | **1** |
| the re-entrant drain guard dropped | 2 — appended entry, nested dispatch | **2** |
| the latch read hoisted out of the loop | 1 — mid-drain latch | **1** |
| the escaping throw swallowed | 1 — panic | **1** |
| the drain's `clearQueue` dropped | 2 — replay, run latch | **2** |
| the run latch left set | 2 — replay, run latch | **2** |
| `close()` tears down unconditionally | 3 — both deferrals, settle ordering | **3** |
| `runIngress` does not open a transaction | 2 — ingress deferral, settle ordering | **2** |
| `close()`'s already-closed guard dropped | 1 — tear down once | **1** |
| the `admitting` early return dropped | 1 — enqueue without draining | **1** |
| `beginPass()` moved above the guards | 1 — nested-pass refusal | **1** |
| the promise settled before the callback | 1 — settle ordering | **1** |

Union: **all fourteen rows reddened**. And **the decision not to write the seventh falsifier holds** — hoisting the latch read reddens the migrated mid-drain row and nothing else, measured, so the row it would have added does exist.

### The A-3 table re-derives, every cell, on both trees

`measureAll()` re-run at `2e485eb4` (built with `tsdown`) and at `164a151e`. **All fifteen rows × minified, Brotli and module count reproduce the recorded figures exactly** — 10,399→10,456, 6,164→6,218, 142→142, 6,889→6,889, and the rest. Minified deltas are +270 on thirteen rows, **+268 on `both behaviors`**, 0 on the two kernel-free rows; Brotli deltas are the recorded +57/+36/+28/+60/+45/+70/+55/+53/+61/+56/+50/0/+54/+46/0; modules +1 on thirteen of fifteen. `kernel root` at +270 on 19,354 is exact.

**No budget moved**: only the five `control:` values changed in `bench/size/measure.ts`, every `budget:` is untouched, and the two remaining controls (`drag.js` 142, baseline B 6,889) are byte-identical, which is the pass's declared result. Slack over the thirteen rows the change reached is **67–108 B** where it was **120–166 B** — the recorded 0.07–0.11 against 0.12–0.17.

### `e7c751fb` is an exact revert

`git diff 2e485eb4 e7c751fb -- .plan/reviews tests/packaging.node.test.ts tests/COVERAGE.md` is **empty**, and the commit touches no `src/`. The formatter churn A-1 swept in is restored to the byte, including `COVERAGE.md`'s trailing newline. No semantic residue.

### The suite

Green at `164a151e`: 1,346 declared, 60 skipped, **1,286 passing**. (A worktree without a packed tarball reports six packaging and reference rows red; all six pass in the repository tree.) `1,340 + 14 − 8 = 1,346` reconciles with F-341's count. §Decisions not yet implemented is empty, so D-180's row retired as A-4 says.

## Findings

### arc-1 — Teardown's step 2, the step this arc moved and amended contract 01 for, is reddened by nothing · tier C

**Finding.** Deleting `clearQueue(this.#queue)` from [`#runTeardown`](../../../src/kernel/execution.ts) leaves the **entire package green**. No row anywhere asserts that the bracket releases its own storage on teardown.

**Current contract.** D-180 invariant 6 — _no queued argument outlives the drain that abandoned it_ — and [`01`](../../contract/01-construction-ownership.md) §Teardown step 2, which this arc amended to say the step is the bracket's. §4 states it as the reason the step moves at all.

**Why it is a problem.** The step is live, not dead: `runIngress` enqueues what a resolver dispatched, and when that resolver closes the controller the post-admission drain is skipped, so the arguments a resolver appended are released by **step 2 and nothing else**. Deleting it retains those values — a DOM element among them — for as long as the consumer holds the controller. The arc wrote a fourteen-row instrument for this entity's invariants and this is the one invariant arm no row reaches, while [`COVERAGE.md`](../../../tests/COVERAGE.md) credits the property to the drain row.

**Evidence.** Mutation `x4` — `#runTeardown` invokes `teardown` without clearing — over `--project node --project browser` plus the packaging and size projects: zero behavioural rows red. The same mutation applied to `#runPhysicalTeardown` at `2e485eb4` is also zero, so **the gap is inherited rather than introduced**; what is new is that the arc's instrument was written for these invariants and did not close it.

**Required property.** Teardown's release of the bracket's own storage is discriminated by a row, so deleting it fails the suite.

### arc-2 — The settle-on-teardown-failure arm §7 calls a strict improvement is unwitnessed · tier C

**Finding.** Moving the settle out of `#runTeardown`'s `finally` — which restores exactly the pre-arc shape, where a throw from step 7 left `destroy()`'s promise pending forever — reddens **nothing** across node and browser.

**Current contract.** §7's required property: _the promise settles once per controller, ordered after the teardown callback returns **or throws**_. §7 argues the move "preserves the first and strictly improves the second, and makes invariant 5 independent of D-29's totality rather than derived from it".

**Why it is a problem.** This is the one place the arc **changed** observable behaviour rather than relocating it, it is argued for in the contract as an improvement, and it landed with no instrument. The row that exists — _should settle its promise only after the teardown callback has run_ — pins the ordering on a callback that returns, which is the arm that was already correct. A later pass that re-hoists the settle for any reason retracts the improvement silently.

**Evidence.** Mutation `x5`, `--project node --project browser`: zero behavioural rows red. The thirteen recorded mutations include no throwing-teardown case.

**Required property.** The settle's independence from a throwing teardown callback is discriminated by a row.

### arc-3 — Five present-tense sites name identifiers this arc deleted, while A-4 records the sweep as done · tier C

**Finding.** Three `src/` comments and two live sentences in contract [`02`](../../contract/02-kernel-behavior-contract.md) justify present behaviour by `queue.closed`, `queue.running` and `drain` — a field, a field and a free function that no longer exist.

| Site | Text | This tree |
| --- | --- | --- |
| [`free-drag/controller.ts:75`](../../../src/free-drag/controller.ts) | "`dispatch`'s first statement is `if (queue.closed) { return; }`" | it is `if (this.#bracket.closed) { return; }` |
| [`kernel/kernel.ts:544`](../../../src/kernel/kernel.ts) | "`queue.closed` alone: a separate `destroyRequested` flag…" | two lines above `!this.#bracket.closed` |
| [`kernel/seams.ts:465`](../../../src/kernel/seams.ts) | "a `dispatch` from there appends because `drain` returns while `queue.running`" | `drain` is deleted; `running` is `ExecutionBracket.#running` |
| `02` §Invariant B, row **B** | "`drain` returns while `queue.running`, so every behavior- and consumer-facing entry appends" | same |
| `02` §Invariant B, the paragraph below | "What stops a `dispatch` from there opening a nested phase is **`drain` returning while `queue.running`**" | same |

**Current contract.** D-137: _a maintainer comment may argue for what is and may not narrate what was_. F-310's required property: _every present-tense justification in `src/` names a mechanism that exists in the tree it sits in_. And the plan entry's own claim: "the two present-tense sentences in `01` and `03` that named _the kernel's own `queue.closed` boundary guards_ now name the terminal latch instead of a field that has moved."

**Why it is a problem.** A-4 records a completed live-spelling sweep, and the sweep was scoped to one phrase rather than to the identifiers, so a reader trusts a sweep that found two of seven. The `free-drag/controller.ts` site is the sharpest: it quotes a line of code as its ground, and the quoted line exists nowhere. `02`'s two are worse in kind — a **normative invariant row** naming the enforcement point by a deleted function. The mechanism is intact in every case, so this is spelling, not substance. (`kernel.browser.test.ts:4083` names `leaveTransaction` too; D-137 puts `tests/` outside its scope, so it is noted rather than listed.)

**Required property.** No present-tense justification in `src/`, and no live normative sentence in the contract tree, names a member or function this arc deleted.

### arc-4 — The instrument met a weaker standard than the one it was written to, and one row is subsumed by another · tier C

**Finding.** §8 requires the arc's falsifiers "to the Stage 1 standard — _each mutation reddens the row written for it and no other_". **Six of the thirteen redden two or three rows.** Two row pairs have identical red-sets across all thirteen: _reach an entry appended during the same drain_ / _not interrupt the running action when dispatch nests_, both `{m3}`; and _drop every drained entry_ / _release the run latch after a panic_, both `{m6, m7}`.

**Current contract.** §8 as above; D-180 restates the achieved standard as "every one reddened by at least one of thirteen mutations", and [`COVERAGE.md`](../../../tests/COVERAGE.md) discloses each multi-row red on purpose.

**Why it is a problem.** Not the multi-row reds themselves — the record is candid about them and the reasoning that "a mutation that moves two rows is a fact about the rows" is sound. What does not survive is the **asymmetry**: the seventh planned falsifier was deleted on the ground that its row "would have been an assertion with no failure of its own", and the landed instrument keeps two pairs that fail that same test on the recorded evidence. One of them fails it by construction, not merely by the thirteen: _not interrupt the running action_ records `'appended'` in its order array, so it is red whenever _reach an entry appended_ is red, and additionally red on an interrupting drain. **The weaker row is subsumed.** The other pair is a gap in the evidence rather than in the rows — I separated it myself with two unrecorded mutations (clearing the run latch in the `try` rather than the `finally`, and likewise for `clearQueue`), each of which reddens _release the run latch after a panic_ alone, so that row does have a failure of its own and the record does not show it.

**Evidence.** The thirteen-mutation matrix above; probes `x1` and `x2`, one red each.

**Required property.** One standard governs the arc's falsifiers, and a row kept and a row deleted are judged by it alike.

### arc-5 — "+270 B on every composition that carries the kernel" is contradicted by the pass's own table · tier C

**Finding.** `both behaviors` carries the kernel and pays **+268 B minified**, not +270. D-180 states "**+270 B minified with one module** on every composition that carries the kernel"; [`arc-a.md`](../../measurements/arc-a.md) states "+270 B minified on every kernel-carrying row is the whole finding"; [`budget-rebases.md`](../../measurements/budget-rebases.md) states "at **+270 B minified** on each of them". `arc-a.md`'s own Δ column, four lines above its sentence, says +268.

**Why it is a problem.** The measurement is right and the summary generalizes past it, in the F-307 class — a figure a later reader trusts instead of re-running, in the decision entry where the table is not present to correct it. Nothing about the accounting is hidden: the module count, the controls and the budgets all re-derive, and no budget moved.

**Evidence.** `measureAll()` on both trees: `both behaviors` 42,904 → 43,172.

**Required property.** A summary figure quantified over a set is true of every member of it, or the exception is named.

## Null results

- **No C1–C5 implementation or production behaviour beyond Arc A landed in the range.** The only `src/` changes are `execution.ts`, `kernel.ts` and `queue.ts`; C4's listeners and abort, the channel (`#notify`, `#report`, `#unwind`), `#spec`, the seam driver, `#tail`, the frames and the operation records are untouched, as §4 requires.
- **`Kernel`'s public surface is unchanged.** F-317's two rows and F-318's three are green and unmodified; `destroy()` is `return this.#bracket.close()`.
- **Promise identity is instrumented after the move**, at the kernel tier: a `close()` that allocates a fresh promise per call reddens `kernel.browser.test.ts` — _should return one promise from every destroy call_. The bracket tier does not assert it, and does not need to.
- **No stale citation was found in the new record.** Every line reference I resolved in D-180, `arc-a.md` and the plan entry lands on what it names.
- **`e7c751fb` leaves no semantic residue** — an exact revert, `src/` untouched.