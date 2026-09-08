# D-188 challenged before implementation

**Subject** the Arc C decision at `e600d3561` — D-188 and the finding it mints, F-400 — read as a candidate rather than as settled architecture. **Tree** `e600d3561`. **Evidence sources** [`entity-model-b73b6779-claude.md`](entity-model-b73b6779-claude.md) §C3, [`entity-model-adjudication-claude.md`](entity-model-adjudication-claude.md) §4, and the source at this tree.

**Method.** The writer and reader census was reconstructed from the source rather than read out of the decision, and independently a second time; the two agree. Every behavioural claim below was **executed** in a worktree detached at `e600d3561`, with `node_modules` linked and the main checkout verified clean throughout. All mutations were reverted and the worktree was byte-clean before removal.

**Result in one line.** **Both halves stand.** The withdrawal compares like with like and its three load-bearing facts hold; the deletion is correct, and in fact more strongly correct than the decision argues. What does not stand is the ground the decision calls its **stronger half**, the completeness of its deletion list, and the prerequisite it makes of F-400.

---

## 1. The deletion is right, and the conjunct is constant-true rather than merely subsumed

### The census, reconstructed

`#attempts.settlement` is **read at exactly one site** — `#settlementLive`'s first conjunct (`kernel.ts:1380`). `#settlementLive` has **exactly one caller**, `#measureTarget:1439`. `#measureTarget` has **exactly one caller**, `#openSettlement:1685`. It is **written at three**: `#retireAttempts:495` (reached from `#retireOperation:552`, `#runPhysicalTeardown:646`, `#handleFailed:2121`), `#openSettlement:1670`, and `#handleFailed:2148`.

### The window is closed, and the thenable does not open it

Both callers of `#openSettlement` are queue handlers — `#settleCancellation:1948` ← `#handleCancel` ← `case CANCEL`, and `#handleResolutionSettled:1976` ← `case RESOLUTION_SETTLED`. **The consumer thenable does not reach `#openSettlement` directly**: `#settleResolution:1695` latches and calls `bracket.dispatch(RESOLUTION_SETTLED, attempt)`, and because a fresh microtask stack has `#running === false`, that dispatch _becomes_ the drain. So `#openSettlement` always runs at `#running === true` and `#depth ≥ 1`, whichever way it was reached.

Every writer is therefore refused inside the window, each on its own mechanism:

- `#openSettlement` and `#handleFailed` are queue handlers, and `#drain` returns immediately while `#running` (`execution.ts:212`), so a `dispatch` from behavior or consumer code appends and returns.
- `#runPhysicalTeardown` runs only from the bracket's teardown callback, and `close()` at `#depth ≥ 1` sets `#teardownPending` instead (`execution.ts:196-200`), so a `destroy()` raised inside the window defers.
- `#retireOperation`'s six callers are five queue handlers plus `#mintOperation`'s catch, which sits inside `runIngress` — and `#openIngress` returns early while `current.operation` is non-null, which it is throughout `SETTLING`.

**So the conjunct is not merely subsumed; it is constant-true at its only evaluation point.** The slot is assigned at `:1670` and compared at `:1380` from inside the same synchronous span, and nothing in that span can write it.

### Executed, and the probe is the complement of the decision's

D-188 ran a deletion and read a null result. **The stronger probe is the positive one**: making the conjunct **throw when it discriminates** leaves the browser project at **860 passed, 60 skipped** — it never discriminates in 920 rows. The full proposed C-2 deletion (the `AttemptSlots` member, the field initializer, the clear in `#retireAttempts`, the write in `#openSettlement`, the dead write in `#handleFailed`, the conjunct) typechecks clean and leaves the browser project at **860 passed, 60 skipped**.

**One unattributed flake, reported rather than absorbed.** Across ten runs of the deleted tree one run failed a single row; nine passed, and three baseline runs at `e600d3561` passed. The failing row's name was not captured and it did not reproduce in nine subsequent runs. It is **not attributed to the deletion**, and it is recorded because D-188's C-2 acceptance criterion is a set of existing rows and a flaky suite weakens that criterion.

### The dummy is dead, and the attempt's meaning does not change

`#handleFailed:2148`'s write is unreachable from its own path — the reader chain requires `#openSettlement`, which the failure path does not enter — and any later `#openSettlement` overwrites the slot at `:1670` before `#measureTarget` reads it. `#retireAttempts()` two statements earlier has already nulled it. **Dead by census.** ✓

`#joinSettlement` uses its `attempt` parameter in exactly one statement — `#startTail(fromX, fromY, attempt.targetX, attempt.targetY)` at `:1634` — and re-validates with `#joinLive()`, which carries **no** identity conjunct. So the attempt is already a measurement carrier at the join and nothing about its meaning there changes. ✓

---

## 2. The **stronger half** is false in two of its three clauses

D-188 writes:

> `#settlementLive`'s other four conjuncts already answer every writer on its own terms: `#retireOperation` scrubs the frames, so `current.operation !== null` fails; `#runPhysicalTeardown` runs behind a closed bracket, so `!closed` fails; `#handleFailed` commits `REPORTING`, so `phase === SETTLING` fails.

Two of the three read a writer's **end state** rather than its interleaving, and in both cases foreign code runs in the gap:

| Writer | Slot turns over | The named conjunct fails | Between them |
| --- | --- | --- | --- |
| `#retireOperation` | `:552`, **step 3** | `:589`, **step 6** — the frame scrub | `spec.retire` (step 4) and `lifetimes.dispose` (step 5), **both foreign code** |
| `#handleFailed` | `:2121` | inside `runCore(…, REPORTING)` at `:2165` | `settlement.prepare`, **foreign code**, and the phase is still `SETTLING` |
| `#runPhysicalTeardown` | `:646` | before it — `close()` sets `#closed` at `execution.ts:194` | nothing — **this clause is correct** |

`#retireOperation`'s own source comment states the contradiction directly: _the records must survive steps 4 and 5. Behavior and consumer code runs inside `spec.retire` and inside the disposal, and `current.operation` still names the operation throughout._ **So in both intervals the other four conjuncts all hold while the slot has turned over, and the identity comparison is exactly the sole discriminator D-188 says it never is.**

**The conclusion is unaffected**, because neither writer can run inside the reader's window at all — the unreachability argument carries the deletion by itself. What fails is the decision's claim to a _second, independent_ ground, and a later pass relying on subsumption — to move `#retireAttempts`, to add a second `#settlementLive` caller, or to weaken `#joinLive` — would be relying on a false statement. This is the shape F-375 and F-377 already named: a claim about the tree written from the plan rather than from the tree.

---

## 3. The deletion list is incomplete, and one omission is F-400's own defect

Three present-tense statements become false and none is named in _What the arc deletes_ or in C-3:

- **`AttemptSlots`'s docblock** (`kernel.ts:251`) — _**Three correlated slots**, minted per round-trip and cleared together_ — becomes two.
- **`#attempts`'s field docblock** (`kernel.ts:367-371`) — _named rather than spread across **three fields** … **These three** do not_ — becomes two.
- **[`COVERAGE.md`](../../../tests/COVERAGE.md) §Async attempts, line 135** — _The staleness the row pinned is now answered by identity: `tests/kernel/kernel.browser.test.ts` — should replace an open settlement without disturbing a live tail_, tagged **I-24**.

**The third is not bookkeeping.** That row (`kernel.browser.test.ts:2962`) asserts a failure **stage** and that a tail animation is **not idle**; it touches no identity, and it passes with the conjunct deleted. So the register claims that a named row pins a staleness _by identity_ which that row does not assert — **F-400's defect exactly, in the same file, about the very slot this arc deletes, and D-188 did not find it while looking at the neighbouring sentence.** Filed here as **F-401**.

---

## 4. F-400 is orthogonal to the deletion, and it mis-cites its own evidence

**Orthogonal on every axis that could make it a prerequisite.** Different field (`resolution` vs `settlement`); different guards (`#settleResolution:1698` and `#handleResolutionSettled:1962` vs `#settlementLive:1380`); different invariant (I-4 vs settlement staleness); and **opposite classifications** — D-188 itself says the resolution guards are _reachable through correct use_ while the settlement conjunct is not. The deletion touches neither resolution guard's state nor its semantics: `#openSettlement` still nulls `#attempts.resolution` at `:1665`.

**The rule cited does not carry the ordering.** F-317 is about a _narrowing assertion that does not discriminate_ — an instrument measuring the spelling rather than the membership. It is not a rule about sequencing an arc around an uninstrumented neighbour. The nearest real precedent is B-0's evidence gate, which required a falsifier for each conjunct **being moved** — and whose outcome for the unfalsifiable one was that it did **not** move, until D-186 deleted it on a structural argument with no row at all. That precedent authorises this deletion; it does not gate it.

**And F-400's citation is wrong.** The sentence it quotes — _Every other row about an abandoned resolver asserts the slot comparison `resolution !== attempt`_ — is at **`COVERAGE.md:525`**, under §_Probe A's two unpinned rows, and two totality belts_ (`:512`). §_The footprint's cross axis_ is `:495-511` and is about placeholder geometry; it mentions neither resolvers nor the comparison. The claim is real and the address is not.

F-400 is a genuine tier-B finding and belongs in the arc. It is **not** a prerequisite for C-2.

---

## 5. The withdrawal: like compared with like, and three facts that hold

- **The membership matches.** C3 proposed `resolution` + `settlement` → the operation record and `settlementInput` → C2's capability; §4 kept the first pair and re-routed `settlementInput` to **the transaction entity**. Those are the two destinations D-168 and D-181 refused, so D-188 pairs them correctly. **This is not a materially different proposal collapsed into an earlier refusal.**
- **The chronology holds.** `b73b6779` is dated **2026-09-04**; D-168 landed **2026-09-02**. Both the subject and the adjudication had it. (The decision's clause _and the same day as neither_ is garbled and says nothing; the substance is right.)
- **The mid-operation turnover holds.** `#handleFailed` calls `#retireAttempts()` at `:2121` and writes at `:2148` with `current.operation` unchanged throughout — and **it still does after this arc**, because `settlementInput` and `resolution` continue to turn over there. D-168's ground survives the deletion that moots one of its three fields.
- **The completeness invariant is real.** `OperationRecord`'s docblock and D-168 both state that every ordinary field is filled in `mintOperation`'s literal and never assigned again, `cancelRequest` excepted. Two slots that turn over mid-operation would be two more exceptions.
- **Q-21 has nothing to act on.** `#attempts` is the kernel's own field cleared by the kernel's own method; F-322's rule bites where a **collaborator** clears another entity's state, and no collaborator does. §4's Q-21 argument is conditional on the move having been made — it never claimed a present violation — so the two do not conflict, and the answer to _is there an ownership defect forcing this?_ is **no**.

**One overstatement.** D-188 says the merge discharges **no proof responsibility**, and quotes C3's _moves one property deeper_. §4 explicitly says that phrasing **undersells** it and states a stronger claim: a late resolution would validate against the operation record itself, so operation identity would be checked **structurally** rather than by the slot happening to have been cleared. That is a real proof responsibility, and D-188 rebuts the version the adjudication had already disowned. The withdrawal still stands — the completeness invariant is worth more than the strengthening, and the strengthening is available more cheaply — but the sentence as written is false and the stronger claim is left unanswered.

---

## 6. The measurement consequence is read correctly, and the Touches is not

**D-188 has not over-read §18.** Its third bullet — _a pass landing well under budget ends in a re-base_ — and its fourth, as D-187 amended it — _a re-base is nothing but evidence, so it is triggered by the reading and never by the boundary_ — together with O-13's own _they move on a reading rather than on a boundary_ make Arc C's measurement a reading occasion, and §15 requires that measurement by composition for a change reaching every kernel-carrying row. **If they land well under budget the ceilings re-base at Arc C, and the five controls stay suspended until Arc D.** ✓

**But the Touches is falsified by the decision's own gate.** D-188 says it _requires no change … to O-13_, while O-13 states that the close _supplies **the next** occasion on which those ceilings are read_. Once Arc C reads them, that is false. One clause is owed.

---

## Scope

**Covered, executed:** the full writer/reader census of all three attempt slots, reconstructed twice independently; the drain, dispatch, ingress, close and teardown guards in `execution.ts`; the constant-true probe over 920 rows; the full C-2 deletion under `tsc --noEmit` and ten browser runs against three baseline runs; the named row at `COVERAGE.md:135` under the deletion; the chronology of `b73b6779` against D-168.

**Covered, read:** D-168, D-181, D-187, F-317, F-400, Q-21/F-322, I-4, O-13, register rule (b), `CONTRIBUTING.md` §15 and §18, C3 and §4 in full, and the statement orderings of `#retireOperation`, `#runPhysicalTeardown` and `#handleFailed`.

**Not covered:** the byte measurement itself, which is C-3's and is not anticipated here; whether F-400's two rows are cheapest at the kernel harness, which the decision argues and this pass does not reopen; the identity of the one flaked row.

**One process note.** Both discovery agents were instructed read-only; an empty `tst.md` appeared at the repository root during the session and was deleted. Nothing tracked was touched outside the detached worktree.