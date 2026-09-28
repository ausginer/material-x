# One reading, immediately before the consumer call — and `#abort()` is the stop, not the cleanup

**Read at `982285f0`**, branch `drag2/fin-review`, on 2026-09-04. Nothing implemented; step 1a and step 2 unstarted; the ownership rules of §The ownership boundary are not revisited and the lint gate is untouched. Bounded to `RectIndex.refresh`, `#abort()`, the proposed `remeasureHole`, and the two immediate callers.

The contract in force is D-36 (logical closure immediate, physical teardown deferred to the outermost library transaction), D-37 / I-36 (the liveness domain is finite: declared-slot invocation, admission, publication — internal work may finish if it survives the boundary in no observable form; the whole-program "reads no further geometry" ceilings are **withdrawn**), and D-38 (the reading is the logical latch, never a physical-teardown observation).

Three facts settle almost everything below, and each is checked rather than assumed:

- **The reading is the latch.** `spec.ts:179` binds it as `const live = (): boolean => !host.closed;`, so no site here reads a disposed session or an aborted signal. D-38 is satisfied and stays satisfied.
- **`getBoundingClientRect` is not a declared consumer slot.** The declared slots are what the consumer filled and the export table and `SortableSlots` enumerate; `box`/`visual` is one, a candidate's own geometry read is not. I-36 names "a geometry read on a consumer-owned node" among the acts with **no consequence left to stop**.
- **Physical teardown reaches this cache.** `spec.ts`'s `retire()` walks `slots.retireHooks` backwards, and `assemble.ts:77` pushes `axis.insertion.retire` into it, which runs `RectIndex.retire()`. So state this cache holds at logical closure is undone at the boundary — that is the structural discharge D-36 is claiming, and it is wired, not asserted.

---

## 1. The four readings, one at a time

`refresh` takes **2N + 2** readings with a resolver composed and **N + 2** without, where N is the destination count.

### Check 1 — at entry, after the warm return

**Forbidden act it protects: the first `getBox` of the rebuild.** Its own comment says so — a committed move invalidates on every failing path and `release.prepare` resolves straight afterwards, so a rebuild can begin on a controller consumer code already destroyed _earlier in the same seam_. That makes it a genuine I-36 (a) "between invocations" reading: the previous invocation is `action.effect`'s `measureInSeam` walk, which I-36 names as the fourth irreducible site.

**Classification: declared-slot invocation.** Not discharged by the boundary, because for a call the consequence _is_ the call.

**Minimum placement: it is the same obligation as check 2, and collapses into it.** A reading placed immediately _before_ each `getBox` covers the first one too. The obligation does not disappear; its statement stops being two rules. And in a composition with **no** resolver, `refresh` invokes no declared slot at all, so nothing is owed and the entry reading has no subject.

### Check 2 — after `getBox(item)`

**Forbidden act it protects: the _next_ iteration's `getBox`.** Nothing between the call and this reading is forbidden — the writes are internal.

**And on its own it is insufficient, which is the reentrancy case.** Between check 2 of iteration _i_ and `getBox` of iteration _i+1_ sits `box.getBoundingClientRect()`, which is consumer-overridable and may close the controller. A reading taken _after_ the slot call cannot see a close raised _after_ it. Check 3 is what covers that today, so the pair is correct and neither placement states the rule.

### Check 3 — after `box.getBoundingClientRect()`

**Two jobs, and they part company.** (i) It stops the next iteration's `getBox` after a close raised from the geometry read — the case check 2 misses, and a real I-36 (a) obligation. (ii) On the **last** candidate there is no next `getBox`, and what it stops there is the trailing bookkeeping: `count = n`, `items.length = n`, `#measured = version`, `#dirty = false`, plus the placeholder read before it.

Job (i) survives, and is the same obligation as checks 1 and 2. Job (ii) is **internal work that does not survive the boundary**: teardown retires this cache, so the clean flag, the count and the pinned rows are all undone. It is the withdrawn ceiling.

**Minimum placement: before `getBox`, not after geometry.** After-geometry satisfies the obligation today only because nothing but the writes stands between it and the next slot call — it is correct by accident of ordering and stops being correct the moment a statement that can close is added after it. _Immediately before each declared-slot invocation_ is the placement that states the rule, and it is the same single reading checks 1 and 2 collapse into.

### Check 4 — after `placeholder.getBoundingClientRect()`

**It protects nothing that is still forbidden.** No declared slot follows it; the six hole writes and the trailing bookkeeping are internal and are undone at the boundary; the `Insertion` the caller may build from the result is a **publication**, and publication is kernel-owned and already discharged by the boundary revalidations I-36 enumerates (`preparationValid`, `runAdmission`'s post-callback recheck, `settlementLive`, `joinLive`). **Retires.**

### The minimum

> **One reading, immediately before each `getBox` invocation.** With a resolver composed that is **N** readings; with none it is **zero**, because `refresh` then invokes no declared consumer slot at all.

Down from 2N + 2 and N + 2. The warm path keeps its zero readings, and for the reason its own comment gives first: it calls no resolver, so nothing is owed. **The second half of that comment — "it cannot be reached on a destroyed controller anyway: `retire()` sets `#dirty`, and teardown always runs it" — is false under D-36** and must go; see §3.

---

## 2. `remeasureHole` does not take `live`

**Proposed:** `remeasureHole(placeholder, live, start, end, centre): boolean`. **Adjudicated:** `remeasureHole(placeholder, start, end, centre): void`.

The operation reads the placeholder's rect and writes three of the six hole fields. The read is a consumer-overridable member on a consumer-owned node and **is not a declared slot**; the writes are internal; it admits nothing and publishes nothing. Under D-37 it performs no forbidden act, so it needs no liveness capability — the old barrier is there because the ceiling used to forbid the read itself.

**The obligation the old check was standing in for does not vanish; it belongs to whoever calls a slot next.** A close raised from the placeholder's own `getBoundingClientRect` is caught by the reading before the first `getBox` inside the `refresh` that follows it in `linear-shift.refresh`. That is one reading rather than two, and it is taken at the act it protects rather than at the act that might have caused it.

Consequences to record: the operation cannot fail, so it returns `void` rather than `boolean`, and `linear-shift.refresh` loses the `forget(); index.retire(); return false` arm in its `hollow` branch — the same repair still happens one statement later, on `index.refresh`'s own `false`. **This is a change to the API §The ownership boundary published**, and it is why that clause is amended rather than merely cited.

---

## 3. `#abort()` — necessary, for a reason its own comment denies

**Its rationale is wrong post-D-36.** It says `destroy()` "has already run `retire()` on this very cache through the assembler's retire hooks". D-36 defers physical teardown to the outermost transaction boundary, and `#abort()` runs _inside_ that transaction: at that instant the retire hooks have **not** run. The same false claim is repeated in the warm-path comment and in two browser-test docblocks (F-301).

**It remains necessary, and the true reason is the deferral window.** The warm return is taken **before any reading**. Between logical closure and the boundary, further `refresh` calls at the same snapshot version are reachable. If a closed rebuild were allowed to fall through to the trailing bookkeeping mid-loop, it would leave the cache **clean at that version with a partially written buffer**, and every warm return in the window would serve it. Nothing else prevents that: the entry reading is not on the warm path, and teardown has not yet run. So the warm path is safe because **`#abort()` never leaves a closed rebuild clean** — not because teardown has already happened.

**What it must restore: the staleness pair.** `#dirty = true` and `#measured = -1`, which is what makes the warm return unable to serve the partial buffer. Emptying `items` and zeroing `count` are kept — not because the boundary would not undo them, but because `retire()` is the single definition of _stop_ in this class and splitting it to save two statements on a path that has already failed would create a second definition of it.

**The terminal `false` is required, and it is the stop rather than the cleanup.** `#abort()` is reached from inside the candidate loop; the non-local exit is the mechanism by which the latch reading actually prevents the next `getBox`. For a call the consequence _is_ the call — D-37's own words for why exactly the declared-slot invocations are irreducible — so no bracket can undo it and no state restoration substitutes for returning. Secondarily it is what makes `linear-shift` forget a prediction taken against a rebuild that did not complete.

**One consequence for its form.** With one surviving reading, `#abort()` has **one call site**, and "the one terminal exit `refresh`'s four barriers share" is no longer a reason for it to exist as a member. CONTRIBUTING §2.1 makes it an inline candidate: `this.retire(); return false;`. Its rationale does not disappear with it — it is the warm path's justification, and belongs beside the warm return that depends on it.

---

## 4. What this costs in landed tests, stated because it is not free

Six browser cases pin these readings. Under the minimum:

- **`y` and `xy` "should stop resolving candidates once the controller closes"** — pass unchanged. They are the surviving obligation.
- **`y` "should resolve no further visual once a candidate closed the controller"** — passes, and becomes the discriminating case for the whole rule: the close is raised from a candidate's own geometry read and the next `getBox` is what must not happen.
- **`y` and `xy` "should read no placeholder geometry once the controller closes"** — pass, but **not for the reason they state**. Their prose says measuring the consumer's placeholder after a close is an indirect consumer call under I-36; D-37 withdrew that. They pass because a later candidate remains, so a declared slot was next. Left uncorrected they are a trap: the property they name is no longer guaranteed in general (F-303).
- **`y` "should read no placeholder geometry once the **last** candidate closed the controller"** and **"should leave the cache retired after the last candidate closed the controller"** — **fail**. Both drive the no-resolver composition, where nothing is owed: the loop completes, the buffer is complete and correct, the placeholder is read once and the cache is marked clean at a version whose data is right. The first asserts the withdrawn geometry ceiling directly. The second asserts an I-20 retention that D-36's bracket discharges — the rows are pinned for the remainder of one transaction and released by the teardown that `assemble.ts` wires.

**These two are not collateral damage to be minimised; they are the measurement.** They pin, at unit level, exactly the proof domain D-37 retired, and they are the reason to state the disposition rather than let an implementer discover a red suite and infer that the reduction was wrong. **The implementer retargets them rather than deleting them silently**: what replaces the last-candidate shape is nothing, because the last candidate is the case in which no obligation exists, and the discriminating shape is already present and passing. Their prose, and the two "placeholder geometry" cases', is corrected to say what survives.

---

## 5. Two sites in immediate callers, named and not adjudicated here

Both are the same class as check 2 and are outside this decision's four:

- `linear-shift.moved` calls `runtime.box(probe)` — a declared slot — and reads `runtime.live()` **after** it, with no reading before. Whether one is owed depends on whether another slot invocation precedes it inside the same seam.
- `xy.resolve` reads `runtime.live()` before `placeholder.compareDocumentPosition(items[nearest])`, which is a consumer-owned node's platform member and not a declared slot.

Recorded as **F-304**, open, tier C. Adjudicating them here would be the general lifecycle audit this was scoped away from, and neither blocks step 1a.

---

## 6. Method

`D-36`, `D-37`, `D-38` and `I-36` read through `.scripts/entry.sh`. `rect-index.ts`, `linear-shift.ts`, `xy.ts` and the two browser suites' barrier groups read in full at `982285f0`; `spec.ts:179` checked for the latch binding, `spec.ts:1773` and `assemble.ts:77` for the teardown path that reaches this cache's `retire`, and `layout-animation.ts:238` to confirm the settle walk reaches no consumer-owned member. The reading counts are from the code, per composition, not estimated. Test outcomes under the minimum are derived by walking each fixture's candidate list against the proposed placement; they are predictions about a change that has not been made, and are stated as such.

**LSP plugin — available; not used**: the subject is the order of statements against a lifecycle contract, and every site was already enumerated by the contract and by hand.