# Q-19, Q-20, Q-21 — the declared-slot taxonomy

**Read at** `9c0780b5`, on `drag2/fin-review`. **Inputs**: [`d170-arc-summary.md`](d170-arc-summary.md); I-36, D-36, D-37, D-38, D-51, F-304 and D-170 §The ownership boundary; the production sites in `src/sortable/`. **Mints** D-176 and F-324; settles Q-19, Q-20, Q-21; decides F-312 and F-322. Nothing is implemented.

**The three routed questions were not equally hard, and only one of them was really about its own site.** Q-20 is a contract question that the two governing documents answer differently, and following it exposes a defect in the taxonomy rather than in `linear-shift.ts`. Q-21 is an ownership boundary with a clean answer and a wrong-looking obvious repair. Q-19 is a style question that turns out to have a lifecycle argument in it.

## 1. Q-20 — the contradiction, and why neither side of it is the answer

I-36 defines act (a) over "a member the consumer filled, which the export table and `SortableSlots` enumerate in full". `settle` is a member of `SortableSlots`. F-304 retired the guard standing before it on the ground that `runtime.settle` is library-owned.

**F-304's ground is false as stated, and the contract already said so.** `SortableDisplacementInstaller` is exported from `sortable.js` — the docblock's own reason is "so a consumer who writes one can hoist it into a typed `const`" — and `DisplacementContribution` and `DisplacementSettle` are published at the middle tier under D-12. That `layoutAnimation()` fills the slot in every shipped composition is a fact about `layout-animation.ts`. **D-51 forbids exactly that inference, in terms**: read "declared consumer slot" throughout D-37 and D-51 as "a slot filled by code the library does not own", warning that "the narrower reading would silently empty this list the moment the sortable stopped supplying runners". F-304 made the substitution D-51 warns against, one document away from the warning.

**But D-51's own repair does not survive being applied here, and that is the decision.** D-51's test is _who filled it_. It works for `LandingHandle.destroy()` because that member's two cases are separated by **tier** — a static fact about which entry point the consumer used, visible to whoever writes the call, and D-63 is built on exactly that. `settle`'s two cases are separated by **which installer value reached one config key at one tier**. `linear-shift.ts` holds a `DisplacementSettle | null`; `rect-index.ts` holds the same; neither can tell `layoutAnimation()`'s walk from a third party's, and no reachable fact distinguishes them.

A rule whose truth value the code cannot read is not an invariant. It also fails D-51's own standard on its own terms — _a finite domain with an unstated exception is not finite_ — because a composition-indexed domain is not one domain but one per composition, and the whole value D-37 bought with the narrowing was that the domain can be checked.

**So the test is fillability, not authorship** (D-176). A declared consumer slot is any **invocable** member the library obtains from a published config key or feature contribution, whoever supplies the value. `SortableSlots`, `FreeDragSlots` and the export table enumerate the **candidates**; a data member is not one. The domain is finite, static, and readable at the call site. It is also a strict superset of the ownership reading, so nothing D-51 permitted becomes forbidden — a reading before a library-filled slot costs one latch read and is never wrong.

### The exception was a list, and the list was wrong

D-51 states the discriminating property exactly — _relinquishment returns something to the consumer, it does not ask anything of them_ — and then narrows it to a closed enumeration, out of a fear the property does not deserve. Under the declaration test the enumeration is demonstrably incomplete, so D-176 promotes the property to a **predicate over call sites**: reached only from teardown or unwind, purpose is release, no operation work, nothing published, return ignored, wrapped.

**`retireHooks` is what shows the list was wrong.** Each composed feature's `retire?: Disposer` is pushed into `retireHooks` by both assemblers, and both behaviors walk it from `retire()` — `sortable/spec.ts:1868`, `free-drag/spec.ts:1057` — which is teardown and therefore always after logical closure. Under the ownership reading these were invisible, because every shipped disposer is library-supplied. Under the declaration test they are declared slots invoked after closure, and they satisfy the predicate exactly, individual wrapper included. The construction unwinds in both `assemble.ts` files are outside the question: no controller has closed.

This is the "broader inconsistency in the declared-slot taxonomy" rather than a special case for `settle`, and it lands in a satisfying place — the exception clause was not too permissive but too narrow, and it was too narrow because it was written as an enumeration under a membership test that hid its own members.

### Two discharges, and the asymmetry in the tree is the right one

A soliciting slot is discharged either by the invoker reading the latch immediately before the call, or by **threading the latch into the slot's declared type** so the slot's contract obliges a head reading.

- `DisplacementReport` takes `live` and requires the head reading, for a stated reason: the sink calls `animate()` and reads `finished` on consumer-owned rows, "so a reading taken before the walk says nothing about the calls inside it".
- `DisplacementSettle` takes no latch and needs none: it "must answer from its own bookkeeping" and "must not read layout", so it performs no consumer-reachable interior step for an interior reading to protect.

So the asymmetry is **justified rather than an oversight**, and it settles the remediation shape without touching a published type. Adding `live` to `DisplacementSettle` would change the middle-tier surface to push an obligation onto every third-party sink author for an interior the contract forbids it to have.

**`settle` is the only soliciting slot in the package that takes neither discharge.** That is the sharpest statement of F-312.

### F-312 is real, and its remediation is a restoration

At `261a3a16` the reading stood at `linear-shift.ts:367`, **between `runtime.box(probe)` and `runtime.settle(...)`**, stopping with `drop()` — verbatim the placement I-36 mandates. F-304 read it as sitting "after the slot call it could never have protected". True of `box`; irrelevant, because the slot it protected was two statements later.

**The second site was not in the finding and is the same defect.** `RectIndex.refresh` calls `settle(values, items, n)` after the scan loop, whose last acts are `getBox(item)` and `box.getBoundingClientRect()` — and the loop's guard sits _before_ `getBox`, by design and correctly. Nothing reads the latch between the last geometry read and `settle`, and when `getBox` is null the whole rebuild takes no reading at all. So `refresh` owes one unconditionally, immediately before `settle`.

**Required property.** At every site invoking a soliciting declared slot, after any preceding consumer-reachable step in the same statement sequence, the invoking party reads the logical latch and stops. Neither site needs new plumbing: `moved` already holds `runtime.live` and stops through `#drop()`; `refresh` already takes `live` and stops through its own `retire(); return false`. The `LinearShift` class still acquires no `#live` field, so D-170's conversion instruction survives intact.

Two comments become false with the repair — `linear-shift.ts`'s "**No liveness reading here**, and its absence is the placement rule rather than an omission", and the class docblock's "in this module that party is never this class". Both are corrected, not deleted: in `moved` this class _is_ the party performing the act.

**`verifyEquivalence` is outside and stays outside.** It passes `() => true` deliberately and is scoped out of shipped builds, so a fixture closing its controller from inside a geometry read cannot stop the scan measuring it. Recorded in D-176 so remediation does not "repair" it.

### Tier, corrected

I-36 assigns act (a) Tier C. Under the repository's current scale, Tier A is "a correctly integrated consumer observes something different at runtime", and invoking a slot the consumer filled after the consumer destroyed the controller runs the consumer's own function body — which is the observation, and is precisely why D-36's bracket cannot make a call consequence-free ("for a call the consequence _is_ the call"). The round's Tier A stands; I-36's tier line is corrected.

### What is reopened

I-36 quotes a measurement as the argument for D-37's narrowing: "four are irreducible — all four act (a)". That census was taken while membership was read as _who filled the slot_, under which every slot a shipped feature fills is outside — and `settle` is absent from the list, which is how F-312 became reachable. Under D-176 the census is a mechanical question over a static candidate set, and the answer is not known to be four. **F-324**, tier B on the second limb, because I-36 quotes the number.

## 2. Q-21 — `RectIndex` is the sole owner

`RectIndex.refresh` documents `false` as "returns `false` — and **only** then — when the rebuild stopped at that reading", and its single `return false` runs `this.retire()` first, because "`retire()` is this class's one definition of _stop_". The callee's `false` therefore already means _I stopped and retired myself_. `LinearShift`'s `index.retire()` on that path is a defensive check against a collaborator breaking its own documented return contract, which `CONTRIBUTING.md` §Definition of success admits only for state "reachable through **correct** use of the contract" — and this is not.

**The boundary is symmetric and the module already states both halves.** `RectIndex` "stays dimension-neutral" and interprets no axis rule; `LinearShift` "holds no writable handle into the cache's storage". Each entity stops its own state and no collaborator's. `LinearShift` keeps `#forget()` there and drops `index.retire()`.

**The obvious repair is the wrong one.** F-322 observes that the pair is statement-for-statement `LinearShift.retire()` at `:370-373`, which invites collapsing to `this.retire()`. That member is `#forget(); #index.retire()` and would re-retire. `LinearShift.retire()` itself is unchanged: its caller is the retire hook, and nothing has retired the cache underneath it.

## 3. Q-19 — inline `#homeGap`

`CONTRIBUTING.md` §2.1 inlines a single-call function unless it is a meaningful semantic or invariant boundary. This one is not. Its docblock's whole claim — "the gap the item came from, recomputed rather than stored" — is already stated at the call site in fuller form ("the home gap is recomputed from the committed snapshot, so it needs no per-operation slot"), and its `frame` parameter exists only to be unpacked with two non-null assertions the call site can write directly.

**The deciding argument is legibility, and it is a lifecycle one.** The terminal barrier three lines below the call reasons about "both branches above" by naming `movePlaceholder` **inside `homeGap`** — so a barrier and one of the two writes it guards sit in different blocks. Inlining puts them in one, where D-176's placement rule is checkable by reading rather than by following a call. Which is the only reason this question earned an answer beyond "it is four statements".

Non-blocking, and settled last on purpose.

## Falsifier

A composed `displacement` whose `settle` records its invocations, against a `box` resolver that destroys the controller on the last candidate: `settle` must receive no call after the destroy, at both sites — through `RectIndex.refresh`'s scan, and through `LinearShift.moved`'s probe measurement, where `#drop()` must be taken instead. Without it F-312 is repaired and unpinned, which is the shape F-316 names one finding earlier in the same round.

## Record gap closed rather than inherited

The round allocated `F-312`…`F-323` and `Q-19`…`Q-21` in its summary, and none had a canonical entry: `entry.sh` answered _unknown local id_ for all fifteen, and none was in the MINTED register. That is F-296's defect one round later, repaired the same way — by minting, not by dropping the addresses. All fifteen are minted here with the round's own tiers and claims; the twelve this pass does not decide keep their `open` status and their routing.