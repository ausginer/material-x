# What the vocabulary-root budget proves after D-132 and D-133 (D-134)

**Scope.** One row of [`bench/size/measure.ts`](../../bench/size/measure.ts) — `vocabulary root - drag.js` — and whether its ceiling still enforces anything. Measurement and policy only; the D-132/D-133 production slice is settled and is not reopened. Read at `27047ae3`.

**The numbers.** Landed **159 B** against a budget of **300**, so **141 B of headroom**. F-77's calibrating injection moved the root **121 to 190 B**, and was caught by the then-**150** ceiling with 40 B to spare. The same delta applied to today's artifact lands at 228 — **72 B under the ceiling**.

---

## 0. Verdict

**The row keeps both halves and the ceiling is re-based downward, because the two halves prove different things and the ceiling is currently sized for the one that has its own assertion.**

- `only: ['kernel/errors.js']` proves _the shared root reaches no other tier_. Structural, kilobyte-scale.
- The **budget** proves the one regression class the graph half is blind to: machinery arriving from `kernel/failures.js` **inlined as literals into** `kernel/errors.js`, moving no module count. Byte-scale by construction.

D-130 re-justified the ceiling as _catching the vocabulary root pulling the kernel, which is a kilobyte-scale event_ — **and that is what `only` catches.** Sizing the budget for it removed the only property the budget alone could hold. **F-106.**

---

## 1. The two halves, stated apart

They have never been written down as separate claims, and the row's comment moves between them inside one paragraph. Separated:

| Half | Claim | Blind to |
| --- | --- | --- |
| `only` | The root bundles to one module | Anything that arrives _inside_ that module |
| `budget` | The root's one module stays the size of two classes | Nothing — it is the residual detector |

The row's own comment already states why the second is not redundant: `tsdown` inlines the `FAILURE_*` constants as literals, so **machinery from `failures.ts` lands inside `kernel/errors.js` and moves no module count at all**. And [`tests/packaging.node.test.ts`](../../tests/packaging.node.test.ts) cannot cover it either — it walks the unshaken _source_ graph, where `drag.js` genuinely does reach `kernel/failures.js`.

**So the budget is the sole detector for its class, and a sole detector sized to a different class detects nothing.**

## 2. What D-130's re-base did, and why nobody noticed

D-130 moved the ceiling 150 → 300 for a stated reason that was locally reasonable: the root had just gained a second class, and _a tight budget on a 146 B file would fail on ordinary message wording._ The volatility was real at the time — D-130 had just added a message string per warning site, and D-132 then added a twelve-entry name table.

**D-133 removed that volatility.** The root is now two classes and two short library-authored strings; every `DraggableWarning` message is supplied by its caller and lives in the caller's module. The premise that justified the loose ceiling expired with the table.

**And the row still carries the argument for the tight one.** The same comment block says, of the _previous_ ceiling: _This row's budget is 29 B of headroom, not the standing ~150 B, and that is the row working rather than an oversight … one module's worth of slack is larger than the artifact, and the row would report success while the thing it exists to prevent happened._ That paragraph is correct, is unstruck, and contradicts the paragraph four below it. **This is F-81's class inside an instrument** — a landed decision leaving standing the prose that justified its predecessor — and it is the reason a reader can open this row today and come away with either sizing rule.

## 3. The regression is not gone; it moved up one level

F-77's _original_ predicted shape — a runtime reference from `DraggableError` to `STAGE_TO_CODE` — is **unwriteable**, not merely unguarded: both tables are deleted and `errors.ts` names `FailureStage` as a type only. That is a genuine structural win and the row records it correctly.

**But D-132 opened a new edge and the row says so**: `drag.js` itself imports the twelve constants from `./kernel/failures.js` in order to re-export them, measured at 0 B and 0 modules **because the re-export shakes**. A tree-shaking outcome is exactly the condition this row exists for — _a module pulled in, mostly shaken, showing up as a small delta that reads like success._ The row's own conclusion is right: **it is more necessary after D-132 than before it.**

The current regression class, therefore: **anything that makes that re-export unshakeable, or gives `errors.ts` a runtime need for a stage value.** Both land as inlined numeric literals inside the root's single module. Twelve of them plus whatever references them is a tens-of-bytes event — invisible at 141 B of headroom, and invisible to `only` by construction.

## 4. The ceiling is uncalibrated, because its injection is unrunnable

The row's authority rests on a reproduction: _Verified by injecting F-77's own predicted regression … the graph stays at one module and the artifact grows 121 to 190 B._ **That injection can no longer be written** — it names a deleted table — so the ceiling is now justified by an experiment nobody can repeat.

This is D-96's rule one level down. That decision refused seven measurement arms on the ground that _a number which cannot support its stated decision is worse than no number, because it is quoted afterwards as though it could_. **A calibrated ceiling owes a reproducible injection, and when the injection stops being writeable the ceiling stops being calibrated.** Both D-132 and D-133 cited this injection record while the half it credits to the budget no longer held.

## 5. Retiring the budget half — considered and refused

The cheaper answer is to delete `budget` from this row and let `only` carry it: the residual regression adds no module, does not reach another tier, and costs a consumer perhaps sixty bytes once.

**Refused, on when it would happen.** 03 §The export topology asked for the three-root topology to be checked against something other than the table it was derived from, and the claim under test is _a consumer who wants `err instanceof DraggableError` pays one module and almost nothing_. D-132 put a `kernel/failures.js` import into `drag.js` for the first time. Retiring the detector at the moment its subject became reachable is the worst available timing, and it would leave the 0 B / 0 modules figure — the thing four separate records now cite — resting on prose.

## 6. Required properties for the re-base

The mechanism does not change; only its calibration and its justification. This is an implementation step, kept separate.

- **The ceiling must be breached by an injection that adds a runtime reference from `drag.js`'s graph to `kernel/failures.js`** — the current form of F-77's regression — while the graph half stays at one module.
- **It must not be breached by rewording the two library-authored strings in `errors.ts`.** That band is now single-digit to low-tens, not the hundreds D-130 sized against.
- **The injection is named in the row and is writeable against the tree it sits in.** When it stops being writeable, the ceiling is re-derived rather than re-cited.
- **The contradictory paragraph goes.** The row may state one sizing rule. The 29-B-headroom argument is the surviving one and should be restored as the rule rather than left as history beside its replacement.
- Derivation available to whoever lands it: landed 159, historical injection +69, wording band low-tens — a headroom in the ~30 B range satisfies both constraints and is the convention this row documented before D-130 overwrote the number.

**No other row moves.** This is a ceiling that was never re-based to follow an artifact; it is a ceiling being returned to the artifact it guards.

## 7. Ratified rather than changed

- **The row still declines to import the twelve constants**, and the reasoning is right: importing them would fold their cost into the figure and destroy the one-module claim. The 0 B / 0 modules answer is observable _only_ while the row declines them.
- **No second row is owed for the constants.** A later pass will be tempted to add one; it would measure a consumer who asked for them, which is a different question. The claim _a consumer who imports only the classes does not pay for the constants_ is what this row already measures.
- **Both classes stay in the import.** D-130's reasoning holds — naming one would let the other shake out and quietly stop measuring half the entry.
- **The graph half is unchanged and needs nothing.** It catches the second of F-77's two predicted regressions today exactly as it did when F-77 closed.

## 8. The finding

**F-106.** A budget's justification was replaced without its predecessor's being struck, leaving one instrument carrying two incompatible sizing rules — and the surviving rule is the one that was overwritten. The narrow lesson is the ceiling. The general one is that **an instrument's comment is load-bearing prose and is subject to the same expired-premise class as a contract's**, which F-81 recorded for source and the record has never applied to `bench/`. Not generalised into an instrument here: the population is one, and D-114 (b)'s landing discipline is the lever.