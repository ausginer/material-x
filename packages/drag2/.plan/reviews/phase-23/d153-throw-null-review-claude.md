# D-153's `throw null`, reviewed at `f897d5b0`

Review, 2026-08-28. Read, compiled, driven, mutated and measured at `f897d5b0`. D-153 is taken as settled: **the guard stays**, and neither the decision nor the transport is reopened. **No production code changed** — eight temporary edits were made as falsifiers and each was reverted in the same command; the tree is clean apart from the pre-existing untracked `analysis.json`, `graph.txt` and `tst.md`.

**Verdict: the implementation preserves D-153 cleanly, and the corrected documentation matches the mechanism.** The refusal still lands before any mutation, the boolean latch is still the only thing the driver consults, swallowing the `throw null` still unwinds, ordinary `throw null` from behavior code is still an ordinary seam failure, classification is still bypassed, and the consumer meets exactly `stage === null` / `drag: controller destroyed` / `cause === null`. **F-169's counterfactual reproduces to the field** against a guard-free copy of the driver, and F-164 and F-166 genuinely dissolve rather than being renamed. **F-165's ranges now include every row and every figure in both size rows reproduces to the byte.**

Two findings, both tier C, neither a correctness contradiction in D-153.

---

## 0. What was checked, and how

| Ask | Result |
| --- | --- |
| `refuseReentry()` precedes every phase mutation / `begin()` | **Clean, unchanged** — §1 |
| The boolean latch is the sole authority | **True in the code; half-pinned** — **F-170** — §2 |
| Swallowing `throw null` cannot suppress the unwind | **Clean, falsified** — §2 |
| Ordinary behavior `throw null` is an ordinary seam failure | **Clean, proved; unasserted** — **F-170** — §3 |
| Re-entry bypasses `context.fail` and reaches panic | **Clean, falsified** — §4 |
| Consumer sees `stage === null`, that message, `cause === null` | **Clean, three assertions incl. a real interpolation** — §5 |
| No `re-entered` or sentinel vocabulary observable | **Clean** — §6 |
| Both `only-throw-error` suppressions narrow and justified | **Clean, plus one new test suppression, all three load-bearing** — §7 |
| F-167's corrected boundary accurate | **One clause is not** — **F-171** — §8 |
| F-169's counterfactual matches what happens | **Reproduces exactly, field by field** — §9 |
| Falsifiers discriminating, incl. `if (raised === null)` | **Caught, by one row** — §10 |
| F-164 / F-166 dissolve rather than rename | **Both genuinely dissolve** — §11 |
| Size ranges cover every row; signed reporting consistent | **Clean, to the byte** — §12 |
| Suite | 65 files, **1195 passed**, 116 skipped, **no type errors**; typecheck exit 0 |
| Lint | the same 3 errors in `tests/kernel/lifetimes.node.test.ts`, **pre-existing** |

---

## 1. Ordering is untouched

The commit does not touch either opener. [`runCore`](../../../src/kernel/seams.ts#L432-L448) still calls `refuseReentry()` as its first statement — ahead of the `staged`-unconsumed notify, `staged = null` and `context.begin()` — and [`runPhase`](../../../src/kernel/seams.ts#L378-L381) still calls it ahead of `failureRequested = false` and `openStage = stage`. `refuseReentry` itself is two statements, latch then throw, with the allocation that used to sit between them now gone.

Pinned by _should refuse the nested transaction before it rebuilds the draft_, which fails under the §10 falsifiers.

## 2. The latch is the authority, and swallowing cannot suppress the unwind

[`runPhase`](../../../src/kernel/seams.ts#L395-L403) reads `reentry` and rethrows on it **before** the `value === FAILED` arm, and it never looks at `raised`. So a `prepare` that catches the `null` and returns a good `{ staged: 1 }` unwinds identically to one that lets it pass — which is what _should panic even when the callback swallows the refusal_ drives.

**Falsified two ways.** Deleting the seven-line `if (reentry)` block puts `seams.node.test.ts` at **14 failed / 72 passed**. Replacing `if (reentry)` with `if (raised === null)` — the mutation named in the brief — is caught, by **exactly one row**: the swallow row, which is the only one where the raised value and the latch disagree. That is the row doing the work, and it does it.

**The converse direction is not pinned** — §3 and **F-170**.

## 3. An ordinary `throw null` is still an ordinary seam failure

True in the code, and I proved it against the real driver rather than reading it. Driving `createSeamDriver` directly with a behavior that throws `null`:

```
prepare throw null -> outcome 2 (SEAM_PREPARE_FAILED) | escaped: NONE | fails: [[9,null]]
leaf    throw null -> runLeaf false                   | escaped: NONE | fails: [[9,null]]
effect  throw null -> outcome 4 (SEAM_EFFECT_FAILED)  | escaped: NONE | fails: [[9,null]]
```

Classified at the seam's own stage with the raised value carried through, nothing escapes, no panic. The mechanism is exactly the one §2 states: `reentry` is false, so the value is never consulted.

**And it is reachable in production, which is new.** `Symbol()` was a value behavior code could not produce; `null` is one it re-raises verbatim. [`sortable/spec.ts:1575`](../../../src/sortable/spec.ts#L1575) and [`free-drag/spec.ts:752`](../../../src/free-drag/spec.ts#L752) are `throw input.error` on the `SETTLED_REJECTED` arm, and `input.error` is whatever the consumer's thenable rejected with — so `onReorder: () => Promise.reject(null)` produces `throw null` inside `settlement.prepare`, inside a `runPhase`, on an ordinary drop.

I drove it: pointing the existing _should classify a rejected round-trip promise_ row at `Promise.reject(null)` **passes unmutated** — the consumer gets `FAILURE_RESOLUTION` with `cause === null`, which is correct. No test in the package throws `null` from behavior code, so nothing holds that. See **F-170**.

## 4. Classification is still bypassed

`if (reentry) { … }` sits above all three classification arms, so `context.fail`, the `UNCLASSIFIED` warning and the `failed-then-threw` warning are unreachable on the re-entry path. Four rows assert `harness.failures).toHaveLength(0)` beside the escape, and all four fail under the §10 falsifiers.

Nothing between the driver and `drain` launders it: this was checked exhaustively at [`fac8276e`](reentry-identity-withdrawal-review-claude.md) §5 and the commit changes only the raised value, not the propagation. The one property that could have been value-sensitive — a `catch` reading `.message`, interpolating, or testing `instanceof` — remains absent from every `catch` body in `src/`, and `null` is inert in all three.

## 5. The consumer-facing result

[`errors.ts:50-55](../../../src/kernel/errors.ts#L50-L55)'s fallthrough is `cause instanceof Error ? cause.message : stage === null ? 'drag: controller destroyed' : …`, and `null`is not an`Error`, so the panic mints exactly the generic message. _should reach the consumer as a controller panic carrying no identity_ now pins all three facts:

- `report.stage).toBeNull()`
- `report.message).toBe('drag: controller destroyed')`
- `report.cause).toBeNull()`, **and** ``expect(`${report.cause}`).toBe('null')``

The fourth is the one that matters and its spelling is deliberate: `String(symbol)` succeeds and only `` `${symbol}` `` throws, so a real interpolation is the only assertion that discriminates F-166's regression. The row says so, and the `restrict-template-expressions` suppression it needs is scoped to that one line (§7).

The composition to the real `panic` remains covered by the conjunction established last review — the escape rows, `kernel.browser`'s `cause).toBe(broken)` identity assertion on the real `panic`, and `errors.node`'s null-stage message row.

## 6. No vocabulary survives

`REENTERED` occurs nowhere in `src/`, `tests/` or any emitted `.d.ts`; `Symbol(` in `seams.ts` now matches [one line](../../../src/kernel/seams.ts#L259), `FAILED`. `throw null` is confined to [:358](../../../src/kernel/seams.ts#L358) and [:402](../../../src/kernel/seams.ts#L402) and is the only non-`Error` throw in `src/`. The string `drag: seam/re-entered` survives only in the test's own history note and in the regex at [seams.node.test.ts:1178](../../../tests/kernel/seams.node.test.ts#L1178) that forbids it; the remaining hits for _re-entered_ are the English word in a comment and three unrelated free-drag rows about `constrain.invalidate()`.

## 7. Three suppressions, all narrow and all load-bearing

Two in `src/`, one added in the test, each `oxlint-disable-next-line`, each naming one rule, each with a reason on the adjacent line. Deleting them produces exactly the errors they suppress and nothing else:

```
src/kernel/seams.ts:357:13  typescript(only-throw-error): Expected an error object to be thrown.
src/kernel/seams.ts:400:13  typescript(only-throw-error): Expected an error object to be thrown.
tests/…/seams.node.test.ts:1173:15  typescript(restrict-template-expressions): Invalid type used in template literal expression.
```

The two in `src/` remain the only `only-throw-error` suppressions in the package; the other four `oxlint-disable` comments in `src/` are unrelated rules. The test suppression is justified in place — _the rule is right in general and this row is what it is about_ — which is the correct shape for a rule suppressed by the test that exists to violate it.

## 8. F-167's boundary — correct in substance, wrong in one clause (F-171)

The scoping is right and it is the right scoping: `openStage` marks _is foreign code on the stack_, it is cleared before `runPhase` classifies, and reading the guard as a general nesting interlock claims coverage it never had. The tier-B invariant row in 02 was re-worded to match, the source doc says the same, and the decline to widen the runtime is argued on `CODE_OF_SIZE.md` §1.1 grounds.

**One clause in [02 §236](../../../.plan/contract/02-kernel-behavior-contract.md#L236) does not hold**: _"the two `context.notify` arms that D-152 routed onto that path are still **inside** the window, since `openStage` is set when `requestFailure` runs."_ There are five `context.notify` sites in `seams.ts` and exactly **one** is inside the window:

| Site | Position | Window |
| --- | --- | --- |
| [:416](../../../src/kernel/seams.ts#L416), [:423](../../../src/kernel/seams.ts#L423) — `runPhase`'s two classification arms | after `openStage = NO_STAGE` at [:393](../../../src/kernel/seams.ts#L393) | **outside** |
| [:451](../../../src/kernel/seams.ts#L451) — `runCore`'s `staged-unconsumed` | before `openStage` is ever set | **outside** |
| [:533](../../../src/kernel/seams.ts#L533) — `requestFailure`'s `UNCLASSIFIED` arm | `openStage === UNCLASSIFIED` | **inside** |
| [:550](../../../src/kernel/seams.ts#L550) — `requestFailure`'s `fail-outside-seam` arm | guarded on `openStage === NO_STAGE` | **outside**, by its own guard |

Under the reading that "the two arms" are `requestFailure`'s, one of the two is outside by construction. Under the reading that they are the two arms D-152 routed the six former rejection sites onto — `runPhase`'s — both are outside. Either way the clause asserts the opposite of what the paragraph's own point requires, and it is the paragraph that says _the classification path is outside the window_.

A second, smaller looseness in the same sentence: _"Nothing opens one there — `context.fail` is `failOperation` and enqueues"_ reaches the right conclusion by an incomplete route. The classification path also runs **consumer** code — `context.notify` → the kernel's `notify` → `spec.reportError` → the consumer's `onError` — outside the window. What keeps _that_ from opening a phase is the other enforcement point the same row names, `drain` returning while `queue.running`, not `context.fail` enqueuing. The conclusion survives; the reason given covers only half of what runs there.

## 9. F-169's counterfactual reproduces exactly

This is the claim most worth checking independently, because it is stated as measured. I rebuilt it: neutered `refuseReentry` in a scratch copy of the real `seams.ts`, and drove nested `runCore` against the kernel's own frame semantics — `begin()` as `Object.assign(draft, current)` and `commit()` as the reference swap, taken from [kernel.ts:411-432](../../../src/kernel/kernel.ts#L411-L432).

**Nested from `prepare`**, with the outer writing the draft both before and after the nested call and the inner writing it too:

```
outcomes (inner, outer): [ 3, 3 ]          // both SEAM_COMMITTED
current identity unchanged: true
current: {"phase":"C0","mark":"committed","n":0}   // untouched
staged:  {"staged":"outer"}
notes: []   fails: 0                        // no diagnostic
```

**Nested from `effect`**:

```
outcomes (inner, outer): [ 3, 3 ]
current identity unchanged: true
current: {"phase":"C0","mark":"inner","n":99}      // the inner's frame, wholesale
staged:  {"staged":"outer"}                        // the outer's command
notes: []   fails: 0
```

Every clause of the record holds: the swaps cancel, neither transaction lands from `prepare`, the outer's committed frame is replaced wholesale from `effect` while the staged command against it is the outer's, both return `SEAM_COMMITTED`, and **neither path produces a diagnostic**. The withdrawn claim is also correctly withdrawn — a nested `begin()` publishes no half-built frame. The surviving sentence in `runCore`'s own comment, _"`begin()` would rebuild the draft the outer seam is still building"_, is a different and still-true claim: my probe shows the outer's pre-nested draft writes are discarded, which is what _rebuild_ names.

F-85's row carries the same correction with the old sentence struck rather than deleted.

## 10. The falsifiers

| Mutation | Result |
| --- | --- |
| delete the `if (reentry)` unwind | **14 failed** — every re-entry row |
| `if (reentry)` → `if (raised === null)` | **1 failed** — the swallow row, and only it |
| `throw null` → a slugged `Error` again | **14 failed** — the identity row on `message`, the rest on `toBeNull()` |
| `if (reentry \|\| raised === null)` | **1195 passed** — **F-170** |

The helper's own claim about `NOTHING_THROWN` also checks out. Making `escapeOf` return `null` for a completed run **and** deleting the guard leaves **10 of the 14 rows vacuously green**; only the four carrying an extra `failures).toHaveLength(0)` survive. The sentinel is load-bearing for the other ten exactly as its doc says, and that is a real hazard the `null` escape created and the doc anticipated.

## 11. F-164 and F-166 dissolve rather than rename

- **F-164** was _two module-private sentinels held apart by nothing_. There is now **one** — `FAILED` — so there is no second symbol for an edit to collapse into it, and `FAILED`'s own JSDoc claim is again a claim about one value. The finding has no subject left, which is dissolution and not a renaming. Its successor risk is the mirror image and is **F-170**: the escape value is now one behavior code can produce.
- **F-166** was _the replacement is the one value that cannot be interpolated_. `` `${null}` `` is `'null'`, `'x' + null` is `'xnull'`, `JSON.stringify` keeps it, and the constructor still takes the `stage === null` arm — verified in §5 and pinned by a real interpolation. The record's generalisation — _an identity withdrawal chooses a replacement value, and the replacement is on a public field even when the identity was not_ — is the right lesson and is stated as such.

## 12. Size

Measured through the instrument's own `measureAll` at `f897d5b0` against `529c0098` (the intervening `fec9c3af` touches no source). **Every figure in the new row reproduces to the byte, and both ranges cover every row they quote:**

| Claim | Measured |
| --- | --- |
| minified falls **5–8 B** on every composition row | −7 ×5 sortable, −5/−5/−5/−6 free drag, −8 `both behaviors` ✓ |
| sortable rows **−17 to −9** brotli | −14, −9, −11, −17, −17 — all inside, both endpoints attained ✓ |
| free-drag rows **−9 to +9** brotli | −7, +2, +9, −9 — all inside, both endpoints attained ✓ |
| `both behaviors` −17 | 11,925 → 11,908 ✓ |
| `kernel.js` −5 / −1 | 16,839 → 16,834; 6,057 → 6,056 ✓ |
| baseline A −6 / −13 | 30,465 → 30,459; 10,384 → 10,371 ✓ |
| both control rows byte-identical | `drag.js` 252/142, baseline B 22,573/6,889 ✓ |
| premium **215 B, 2.03 %** | 10,586 − 10,371 = 215; 2.031 % ✓ |
| `free drag + landing` moves **+9** | 7,999 → 8,008 ✓ |

**F-165's correction to the preceding row is also right**: sortable **0 to +10** (+9, 0, +10, +3, +10) and free-drag **−10 to +2** (0, −8, −10, +2) both include every row, and the endpoints are the two rows the finding named. The signed convention is applied consistently in both rows, and the note explaining _why_ signed rather than magnitude — because this change moves rows in both directions — is the right reason and is stated where the next range will be read.

---

## 13. Findings

- **F-170** (tier C) — _The latch is pinned as the authority in one direction only, and the escape value is now one production code re-raises._ The mutation `if (reentry || raised === null)` — the driver consulting the raised value **in addition to** the latch — passes the **entire 1195-test suite**. It is not academic: `throw input.error` at [`sortable/spec.ts:1575`](../../../src/sortable/spec.ts#L1575) and [`free-drag/spec.ts:752`](../../../src/free-drag/spec.ts#L752) re-raises a consumer's rejection value verbatim, so `onReorder: () => Promise.reject(null)` throws `null` inside `settlement.prepare` on an ordinary drop. Under the mutation that consumer's `onError` receives `stage: null` and `drag: controller destroyed` — the controller destroyed — instead of `FAILURE_RESOLUTION`. **Demonstrated**: pointing the existing _should classify a rejected round-trip promise_ row at `Promise.reject(null)` passes against the real source and fails against the mutation with `expected null to be 8`. **The shipped code is correct** (§3) and no test in the package throws `null` from behavior code. This is F-164's shape with the polarity reversed — dissolving the symbol removed the collapse target and introduced a collision with a value a consumer can supply — and it is the stronger of the two, since `Symbol()` was unobtainable and `null` is one `Promise.reject` away. §2, §3, §10.
- **F-171** (tier C) — _F-167's corrected boundary carries one clause that asserts the opposite of the paragraph's own point._ [02 §236](../../../.plan/contract/02-kernel-behavior-contract.md#L236) says _"the two `context.notify` arms that D-152 routed onto that path are still **inside** the window, since `openStage` is set when `requestFailure` runs."_ Of the five `context.notify` sites in `seams.ts`, exactly one is inside: `requestFailure`'s `UNCLASSIFIED` arm. `runPhase`'s two classification arms follow `openStage = NO_STAGE`; `runCore`'s `staged-unconsumed` precedes the assignment; `requestFailure`'s second arm is guarded on `openStage === NO_STAGE`. Both readings of _"the two"_ leave at least one named arm outside. In the same sentence, _"Nothing opens one there — `context.fail` … enqueues"_ is right by an incomplete route: `context.notify` reaches the consumer's `onError` on that same path and outside the window, and what stops _it_ is the row's other enforcement point, `drain` returning while `queue.running`. §8.

**Not findings, recorded so the reasoning is visible.** The `if (raised === null)` mutation being caught by a single row is a thin margin but a real one, and that row's comment names exactly the property it holds. _"Brotli mostly rises"_ on the preceding size row describes 5 rises against 3 falls and 2 zeros; the sortable rows it is about are all ≥ 0, so I read it as accurate about its subject. The three `oxlint` errors in `tests/kernel/lifetimes.node.test.ts` reproduce at `25084a9c`. The untracked `tst.md` at the package root is not part of this commit and I left it alone.

---

## 14. What would falsify this

- **F-170** — apply `if (reentry || raised === null)` and run the suite; 1195 green refutes nothing and confirms the gap. For the consequence, edit _should classify a rejected round-trip promise_ to reject `null` and run it against both trees.
- **F-171** — the five `context.notify` sites are line-cited; each is either lexically before `openStage = stage`, after `openStage = NO_STAGE`, or guarded on a specific `openStage` value.
- **§3** — the driver probe is ~30 lines against `src/kernel/seams.ts` and reruns in a minute; a `context.fail` that did not receive `null`, or anything escaping `runCore`, would refute it.
- **§9** — neuter `refuseReentry`, model `begin`/`commit` as `kernel.ts` does, and drive nested `runCore` from `prepare` and from `effect`. A landed transaction from the `prepare` case, or a diagnostic on either, would refute the record.
- **§12** — `git worktree add` at `529c0098`, build, measure, and diff the two tables.