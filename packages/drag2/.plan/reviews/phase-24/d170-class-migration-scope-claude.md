# The class migration, scoped: which factories carry the entity, and in what order

**Read at `791a340b`**, branch `drag2/fin-review`. No production code or test was changed.

**The representation question is settled and is not reopened here.** Complex, long-lived entities with owned mutable state and lifecycle are represented as classes. This record answers only _which_ factories carry such an entity, what its boundary is, and in what order the conversions can be made without converting anything twice. Bundle size is not a criterion and is not used as one.

**A nested lifetime record and an outer class are composed, not opposed.** D-168 built the first; the outer class holds what remains after it. Where a factory's shorter-lived state is not yet named, the outer boundary cannot be drawn at all, and that is a sequencing fact rather than an objection.

---

## 1. Why the previous audit's answer does not carry

D-169 graded each factory by **whether it had a defect**. The owner's rule grades it by **what it is**. The two questions separate cleanly on one entry: `createSeamDriver` has no defect — one lifetime, reset systematically by one function, no banner needed — and it is still a long-lived entity that owns a reentrancy latch and a staged value across calls. D-169 retained it; this record converts it.

D-169's conclusion clause is therefore replaced. Three of its parts survive intact and are carried forward as inputs, because none of them depended on the retention conclusion: the lifetime-opacity finding (F-278), the shadow census (F-279), the disabled-rule finding (F-280) and the reset-coherence finding (F-281).

---

## 2. The classification

Twenty-one factories. **Nine hold no mutable state at all**, and are excluded before the question is asked.

|  | scope of one instance | verdict |
| --- | --- | --- |
| `createKernel` | controller | **A** — entity, convert last |
| `createSortableSpec` | controller | **C** — extract first |
| `createFreeDragSpec` | controller | **C** — extract first |
| `createSeamDriver` | controller | **A** — entity |
| `createLinearShift` | controller × axis | **A** — entity |
| `createRectIndex` | controller × axis | **A** — entity, convert first |
| `createLifetime` | operation (×3) | **B** — handle |
| `createFrameTask` | controller | **B** — handle |
| `createActionQueue` | controller | **B** — data record |
| `acquireLift`, `acquireTopLayer`, `acquirePointerCapture`, `createPlaceholder`, `createLandingTiming` | per call | **B** — construction |
| `createRealm`, `createUnwind`, `createInvalidator`, `createOperationLifetimes`, both controllers, both composed behaviors, `draggable` | — | **B** — no state |

**B is not a consolation grade.** Three of its entries hold mutable state and were checked against the rule rather than assumed out: `createLifetime` (2 bindings, one-shot `finalized` latch), `createFrameTask` (3 bindings, schedule/cancel) and `createActionQueue` (4 fields). Each is a **handle over one resource**, not an entity with a domain: no invariant spans two of its fields, no member's correctness depends on the order two others ran in, and each is under seventy lines. State alone is not the test the rule states; _complex, long-lived, with a lifecycle_ is, and these meet one clause of three.

`createActionQueue` is the one deliberate outlier and stays as it is for a stated reason: it returns a **plain mutable record operated on by free module functions** (`enqueue`, `drain`, `clearQueue`), which is a considered split of state from behavior, not an unnamed entity. It is a field of the kernel and travels with it.

---

## 3. Bucket A — the entities, with boundary, lifetime and constraint

### 3.1 `createRectIndex` — [`src/sortable/rect-index.ts:339`](../../src/sortable/rect-index.ts)

- **Entity boundary.** The geometry cache for one axis feature on one controller: two `Float64Array` buffers, the element array, and the coherence invariant binding `dirty`, `measured`, `count` and `items.length`. The growth policy is part of the entity and deliberately keeps no predictive state.
- **Owned lifetime.** One, and it is the object's own — all four bindings live exactly as long as the instance. `refresh` → `invalidate` → `retire` is a lifecycle, and `retire()` is idempotent by construction.
- **Detached members: none.** All fourteen external sites in `linear-shift.ts` and `xy.ts` invoke through the receiver; only data members (`count`, `values`, `items`) are read off it, which a class supports unchanged.
- **It already simulates a receiver.** [`rect-index.ts:350`](../../src/sortable/rect-index.ts) declares `let index: RectIndex` _before_ the object literal so a member can call another member, with eight further reads and writes through it. The conversion deletes machinery rather than adding it.

### 3.2 `createLinearShift` — [`src/sortable/linear-shift.ts:141`](../../src/sortable/linear-shift.ts)

- **Entity boundary.** The prediction cache for one axis: `dirty`, `last`, `seen`, `constant`, `hollow`, `claimed`, over a `RectIndex` it holds and invalidates. Its invariant — _the buffer either describes the tree or is dirty_ — spans four of the six, which is what distinguishes it from bucket B's handles.
- **Owned lifetime.** One, the object's. It has four reset paths rather than one, which is F-281 and is a defect a class neither creates nor cures.
- **Detached members, two hops.** `invalidate: shift.invalidate` and `retire: shift.retire` at [`sortable/y.ts:264`](../../src/sortable/y.ts) and [`:288`](../../src/sortable/y.ts), then detached **again** into `retireHooks.push(axis.insertion.retire)` at [`assemble.ts:78`](../../src/sortable/assemble.ts) and `invalidateInsertion: axis.insertion.invalidate` at [`:122`](../../src/sortable/assemble.ts). Both reach a call site that never sees the owner. This is the constraint to design around; it is not a reason to decline.

### 3.3 `createSeamDriver` — [`src/kernel/seams.ts:260`](../../src/kernel/seams.ts)

- **Entity boundary.** The phase machine: `openStage`, `failureRequested`, `unclassifiedReason`, `staged`, and the reentry latch. It enforces _exactly one phase open at a time_ across calls, which is an invariant over the whole object rather than a property of any field.
- **Owned lifetime.** One — the open phase — reset by `runPhase` on every open. Nothing is misfiled and no banner is doing work.
- **Detached members: one.** `fail: driver.requestFailure` at [`kernel.ts:2396`](../../src/kernel/kernel.ts), into the `host` record. One site, one hop.

### 3.4 `createKernel` — [`src/kernel/kernel.ts:274`](../../src/kernel/kernel.ts)

- **Entity boundary.** The controller. It owns the frame pair, ingress, the action queue, the seam driver, the operation and activation records, teardown and the destroy promise. It is the archetype the rule describes.
- **`host` is not the entity and does not become the class.** [`kernel.ts:2362`](../../src/kernel/kernel.ts) composes it from four owners — `realm`/`root` data, a live getter over `queue.closed`, `dispatch`/`cancel`/`destroy` from the kernel, `fail` from the driver. It is a capability façade and stays a record; the class sits behind it.
- **Owned lifetimes: five, and two are already named.** D-168 named the operation and the activation. What remains unnamed is **the attempt trio** — `resolution`, `settlement`, `settlementInput`, three correlated nullables cleared together in `retireAttempts()` at [`kernel.ts:508`](../../src/kernel/kernel.ts) — plus the phase pair (`armedStamp`, `stamp`, `admitting`) and the dispatch pair (`actionTag`, `actionArgument`). The attempt trio is D-168's own pattern one order smaller, and unlike the specs' state it is already typed: `ResolutionAttempt`, `SettlementAttempt` and `SettlementInput` each name their own lifetime at the type level, so the boundary is legible without the extraction. It is therefore a sub-step of the conversion, not a precondition for it.
- **Detached members: three, and two are on the public surface.** `cancel: host.cancel` and `destroy: host.destroy` are spread into the returned controller in **both** features — [`sortable/controller.ts:59,64`](../../src/sortable/controller.ts) and [`free-drag/controller.ts:89,90`](../../src/free-drag/controller.ts) — each with a comment stating that this is deliberate. These are the library's published `controller.cancel()` and `controller.destroy()`. Converting `cancel` and `destroy` to prototype methods breaks the public API at a site three files away from the change, with `this` undefined, and nothing in the pipeline would say so. This is the migration's single sharpest hazard and it is why §5 is a gate rather than a recommendation.

---

## 4. Bucket C — the two specs, and why the outer boundary cannot yet be drawn

### 4.1 The returned object is a protocol, so the class is not it

`BehaviorSpec` is a record with **nested namespaces** — `config`, `command`, `activation`, `action`, `release`, `settlement` — alongside data fields (`createFramePart`, `resetFramePart`, `reportError`) and top-level methods. A class instance cannot be a `BehaviorSpec`: the nested groups would be object literals of bound members either way. So the conversion is not _the returned object becomes an instance_; it is **the behavior entity becomes a class and the spec record becomes a thin protocol adapter over it**. That distinction decides which fields the class holds, which is why the boundary has to be drawn before, not during.

### 4.2 The boundary is not currently known, and one binding proves it

Each spec carries a comment assigning lifetimes to the block beneath it, and in both the comment is false.

**[`sortable/spec.ts:225`](../../src/sortable/spec.ts)** — _"Everything per-operation below is cleared in `retire()`, and that is the only place it is cleared."_ Nine bindings sit under it. `retire()` ([`:1762`](../../src/sortable/spec.ts)) reaches six. Of the three it does not, `snapshot` (230) and `sourceIdentity` (242) are **controller-lifetime by design and must survive an operation**, and `spatialSeq` (255) is **controller-monotonic**, minted once and never reset — correct as written, and correct for the same reason `version` (204) is, which sits _above_ the banner. A fourth, `spatialFrame` (275), carries its own doc block stating it is created per controller and not per operation — a binding contradicting the sentence directly above it.

**[`free-drag/spec.ts:73`](../../src/free-drag/spec.ts)** names six bindings as retire-cleared; `retire()` ([`:969`](../../src/free-drag/spec.ts)) clears five. `pendingFailure` is transaction-scoped and cleared at 673 and 795.

So the actual lifetimes are **three per spec, not one**: controller, operation, and transaction/seam. Placing a field on a class requires knowing which of the three it belongs to, and for at least four bindings in `sortable/spec.ts` the file currently asserts the wrong one. **Converting first would freeze the misfiling into a field list**, where it is harder to see than it is today and where the comment that carries it would finally look authoritative.

### 4.3 What the extraction buys before any class exists

Naming the per-operation and per-transaction lifetimes as records inside each spec factory, D-168's pattern:

- **makes the banner unnecessary** — the type says which lifetime a value belongs to, which is what D-168 measured as the gain on the harder case;
- **removes the two `lift` shadows outright** (F-279) — `moved(current, lift)` cannot hide `operation.lift`, at [`sortable/spec.ts:932`](../../src/sortable/spec.ts) over 253 and [`free-drag/spec.ts:449`](../../src/free-drag/spec.ts) over 78;
- **removes the `scope.motion` / bare `motion` collision** that prompted the audit, by giving the scratch buffer a qualified home distinct from the operation's motion lifetime;
- **leaves exactly the controller-lifetime set behind**, which is the class's field list, arrived at by subtraction rather than by transcription.

**A class alone reaches the first two and not the third or fourth**, because `this` is one flat namespace: `this.motion` and `this.lift` read identically. That is the whole of the sequencing argument, and it is an argument about order, not about whether to convert.

---

## 5. The gate: the rule that would catch the migration's characteristic failure is off

`@typescript-eslint/unbound-method` is `'off'` at [`eslint.config.ts:33`](../../../../eslint.config.ts), in a block of three overrides with no comment and no recorded reason, and `oxlint` does not implement it. Nothing in the pipeline reports a method read without a receiver.

Every bucket-A entity except `RectIndex` publishes at least one member detached, and the kernel publishes two of them **to consumers**. The characteristic failure of this migration is a member that stops working when it becomes a prototype method, at a site the conversion never touches. There is one instrument for that class of defect, it is already written, and it is switched off — and F-274 already records one detached member reaching a published surface unnoticed under exactly these conditions.

**Enabling it is step 0.** It is a repository-scope change rather than a drag2 one, which is why it is stated here as a precondition and routed rather than made.

`@typescript-eslint/no-shadow` at [`:32`](../../../../eslint.config.ts) is the second half of F-280 and is the instrument for §4.3's second bullet. It is worth enabling in the same pass, but the migration does not depend on it.

---

## 6. The migration order

Dependency edges: `RectIndex` ← `LinearShift` ← the axis features ← `SortableSpec`; `SeamDriver` ← `Kernel`; both specs ← `Kernel`, through `host`. Nothing else is ordered.

| # | step | why here |
| --: | --- | --- |
| 0 | **Enable `unbound-method`** (repository scope) | Every step after this one is unguarded without it, and the two riskiest sites are public. |
| 1 | **`createRectIndex` → class** | Zero detached members, two call sites, one package-private type, and a hand-rolled receiver to delete. It is the only candidate with no constraint to design around, so it establishes the pattern against no risk. |
| 2 | **`createLinearShift` → class** | Holds a `RectIndex`, so it follows it. One call site, and the two-hop detachment is the first real exercise of step 0's instrument. |
| 3 | **`createSeamDriver` → class** | Independent of 1–2, one detached member, no dependents but the kernel's `host` literal. Can run in parallel with 1–2. |
| 4 | **Extract the spec lifetimes** — free-drag, then sortable | No class yet. Free-drag first: 918 lines, six per-operation bindings, one misfiling. Sortable second: it is where the boundary is genuinely unknown, and the smaller file will have settled the record's shape. |
| 5 | **Lift each spec's controller-lifetime residue into a class**, with `BehaviorSpec` as its adapter | Only possible after 4, and only meaningful after 4: the field list is 4's remainder. |
| 6 | **`createKernel` → class**, with the attempt trio extracted in the same pass | Last: largest, and the only one whose members are published detached to consumers. By this point the pattern is established, the lint gate has been exercised on 2 and 3, and the specs' adapters have already absorbed one boundary-type change. |

**Why this is the smallest order.** Each step's dependencies are converted or unaffected before it runs; steps 1–3 change no cross-file protocol type at all; only 5 and 6 touch a boundary; and nothing is converted twice — in particular the specs are not converted before their fields are known, which is the one way this sequence could have produced rework.

**What may be dropped without disturbing the rest.** Step 3 is independent of everything but 6. Steps 4–5 may stop after free-drag if the result is not worth the second file, since the two specs share no code.

---

## 7. What D-169 keeps and what it loses

**Lost — the conclusion.** _The closure factories are retained across `src/**`_ answers a question that is no longer open, and its supporting argument (that a record dominates a class because it fixes lifetimes as well as shadowing) was framed as a choice between the two. Under composition it is not a choice; it is §6's steps 4 and 5 in order.

**Kept — the test it minted**, which now does different work. _A factory carries an entity it fails to name when it holds two or more mutable bindings whose lifetime is shorter than the factory's own; a comment banner does not discharge it._ It no longer decides whether to convert. It decides **whether a candidate is bucket A or bucket C** — that is, whether the outer boundary can be drawn today or has to be uncovered first. Both specs fail it; `createKernel` fails it once, on the attempt trio, with the mitigation §3.4 states; every other bucket-A entry passes.

**Kept — the correction to D-167 on `RectIndex`**, and it is now load-bearing rather than incidental: it is what makes step 1 available as the risk-free opener.

**Kept — the findings.** F-278, F-279, F-280, F-281 all stand. F-280 is **promoted from an observation to a precondition** by §5.

**D-167 is superseded**, not amended: its operative clause is _classes are not adopted_.

---

## 7a. A repair made before this record could be written

`791a340b` (_repo: format_) reflowed [`.plan/contract/00-index.md`](../../contract/00-index.md) and **disarmed the decision instrument**. Rows separated by blank lines survived; the ledger's one _consecutive_ run was joined into a single 5 121-character line, so D-165 through D-169 stopped being addressable and `tests/decisions.node.test.ts` failed two assertions, naming five decisions the ledger appeared never to state. The findings table's post-F-230 run went the same way.

**Reproduced rather than inferred**: `npx oxfmt` over a copy of the restored file drops 54 lines and 5 of its 346 row starts, exactly D-165 to D-169. `proseWrap: never` is the mechanism — a run of rows with no adjacent table header is a paragraph, and a paragraph is put on one line.

The file was restored from `daf0592f`, which loses only the run's italic-marker normalization, and the instruments are 58 of 58. **F-231 closed this same failure on 2026-08-31 with a convention** — _this file is never formatted_ — and a convention is not an instrument: neither `.prettierignore` nor `.oxfmtrc.json`'s `ignorePatterns` names the path. It is F-282, and it is routed to repository scope beside F-280 rather than decided here. Blank-lining the two orphaned runs would not settle it, because F-231's original damage was cell re-padding inside the real tables, which no line-structure change prevents.

**It is recorded in this record rather than its own** because it was found while trying to write the ledger row above, and because the two share a routing: both are instruments this package depends on that only the repository can arm.

---

## 8. Method

Every claim above was read at `791a340b` in this agent. The factory census, the binding lists and the lifetime tables come from reading both spec heads, both `retire()` bodies, the kernel's factory-scope declarations (277–610) and its `host` literal and return. The detached-member census is a grep for a member read in argument, property or return position, confirmed by reading each site: `kernel.ts` 555, 652, 2396; `sortable/controller.ts` 59, 64; `free-drag/controller.ts` 89, 90; `sortable/y.ts` 264, 288; `sortable/assemble.ts` 78, 122; `sortable/spec.ts` 850. `RectIndex`'s freedom from detachment is the negative of the same search over all fourteen of its external sites.

**One correction to the previous record is made here rather than there.** D-169's §3 said `sortable/spec.ts`'s banner covers eleven bindings and `retire()` clears five. The banner's scope is the run of declarations beneath it — nine bindings, 230 to 303 — and `retire()` reaches six of them, `spatialFrame.cancel()` included. The finding is unchanged and slightly sharper: three of the nine are controller-lifetime and a fourth needs its own doc block to contradict the sentence above it. A review record is dated provenance and stands as written; this paragraph and D-170's ledger row carry the correction.

**LSP plugin — available; used**: `findReferences` on `createRectIndex` and on the `index` self-reference at [`rect-index.ts:350`](../../src/sortable/rect-index.ts), which are step 1's two load-bearing claims and need exhaustiveness rather than a grep's best effort. The remaining censuses are AST- and text-level and were taken with the parser and with grep.