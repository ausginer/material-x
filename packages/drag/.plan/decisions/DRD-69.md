#### DRD-69 — `988643dc9` is adopted: the loops read their fields directly, and no member carries a guarantee about its receiver

**Status:** active, decided on 2026-11-15 by the architect on the owner's commit `988643dc9` and direction `DRO-21`. Adopts the commit. No member carries a guarantee about its receiver, and no built-in declares `this` for a receiver check. Amended the contract's public surface in its record commit. Supersedes `DRD-20`'s bullet on controller methods and `this`, `DRD-35` property 7's `this` requirement, `DRD-37` property 4 and `DRD-63` property 2. **When decided, unimplemented:** [`size-acceptance-cleanup-handoff.md`](../size-acceptance-cleanup-handoff.md) items 7 to 9 implement it. **Implemented at `a3423c793`** apart from `SortableBehavior.invalidate`'s `this`. **Property 4 amended on 2026-11-15 at `7f963e54a`** to name that member, which its rule covered and its list left out. [`size-acceptance-follow-up-handoff.md`](../size-acceptance-follow-up-handoff.md) item 1 implements it. **Implemented in full at `7763a67a1`,** and accepted at `db76672a3` (§Disposition of the size acceptance follow-up report)

**Decided on 2026-11-15 by the architect, on the owner's commit `988643dc9` and direction (`DRO-21`),** relayed by the coordinator on `drag/size-acceptance`.

**Adopted from `988643dc9`, as committed:**

- the loops of `RectIndex`, `RetainingRectIndex.retain`, `LinearShift`, `xy()`'s `moved`, `layoutAnimation`'s sink and the drop-target tracker read fields directly instead of locals;
- `SortableController` and `FreeDragController` declare their members as methods instead of read-only arrow properties;
- `Invalidatable.invalidate` declares no `this`.

**Required properties:**

1. **No statement about detached calls.** A member of a controller, of a `Lifter` or of a `Drag` is called on its object. The contract, the README and the JSDoc make no statement about calling a member detached, in either direction. The contract is amended in this decision's record commit.
2. **The README's composition passes `cancelLanding` with the lifter as its receiver,** as `controller.use(lifter.cancelLanding, lifter)`. No README example calls or passes a member detached. `Lifter.cancelLanding`'s JSDoc loses "It works when detached." Its form in `src/lift.ts` doesn't change, and nor do the library's own sites.
3. **No test asserts a detached call.** `drag:DRD-20 detached controller methods` in `tests/classes.browser.test.ts` goes, and so does its file comment's claim that the members and `cancelLanding` work when detached.
4. **No built-in member declares `this` for a receiver check.** `Retirable.retire`, the drop-target tracker's `#resolve` and `#release`, and `SortableBehavior.invalidate` lose their `this` parameter, as `Invalidatable.invalidate` did. Every site that passes a built-in member to `requestStep` or `use` still passes its receiver. The declaration tests of the built-ins' receivers go: `drag:DRD-35 capabilities declare their receiver` with `passAlone`, and `drag:DRD-63 each built-in receiver is its own type` with `passSwapped`. That includes the unused `@ts-expect-error` at `tests/callbacks.declaration.test.ts:197`.
5. **The public receiver argument stays.** `requestStep` and `use` on a controller and on a `Drag` keep their overloads, which take a receiver that is an object, and their declaration tests stay (`DRI-8`, `DRI-9`, `DRI-10`, and `drag:DRD-35 the receiver is an object`).
6. **TSDoc on `Invalidatable` and `Retirable`.** Each interface and its member have a TSDoc comment that states what the member does and who calls it, at the implementing tree:
   - `invalidate` marks what the implementer holds as stale and reads no layout, because scroll and resize call it many times a second. That restates the comment `988643dc9` removed.
   - `retire` releases what the implementer holds for its controller or operation, and says where it runs, as `sortable` passes it to `use`.
7. **Comments that the loop change made false go.** At `988643dc9`, `RectIndex.collect` still says "Locals, not repeated field reads inside the loops." The other loops' comments that say they read a local, or read once, go too.
8. **Emitted code.** Properties 2, 4, 6 and 7 change comments in the emitted `.js` and declarations in the `.d.ts`, and no code.

**The loop change's cost.**

- **Size:** −28 to +10 B Brotli per row against `3228d1f07` (`DRD-68`'s table). That figure includes the controller members' change.
- **Timing: no `compare.ts` check is owed.** CONTRIBUTING §0 and §14 ask for a measurement when bytes are traded for work on a hot path, and the removed locals were there to avoid repeated field reads. The architect measured the pattern instead, because no `compare.ts` row resolves a cost of this size: `DRD-43` puts the cycle rows' floor near 411 µs, and `DRD-61`'s focused checks read "no difference shown". The [probe](../probes/loop-field-reads/README.md) models two of the loops, `RectIndex.shift` over 2,000 slots and the drop-target hit test over 20 targets, with a local and with a field read, in Node 26.13.0's V8, interleaved over 15 rounds, twice. **Result:** about 1.5 ns per slot or target in both forms. The median difference is −0.013 to +0.007 ns, and its sign splits 5 to 9 positive of 15. So it shows no cost at that resolution. **Limits:** it is a model of two loops, not the library's classes, and it ran in Node, not Chromium. Of the other loops, `measure` and the tracker's measurement read layout in each iteration. `collect`'s copy, the slot growth and `retain` run once per rebuild, beside a rebuild that reads each measured row's layout. **Speed is otherwise unmeasured,** as for `DRD-61` and `DRD-62`.

**Why.**

- **It is the owner's direction (`DRO-21`).** A promise about which members work detached is public surface that the library would have to keep, and the owner chose not to make one.
- **The internal `this` declarations protected only the library's own six sites,** and `988643dc9` already removed the one on `Invalidatable`. Keeping them on `Retirable` and the tracker would leave a rule that holds at some sites and not others.
- **The cost, accepted with the direction:** typecheck no longer refuses a built-in member passed to `requestStep` or `use` without its receiver, or with another built-in as its receiver. Such a site would throw on a private field when it ran, and the fault would reach `reportError` (`DRI-7`).

**Supersedes:**

- `DRD-20`'s bullet that controller methods don't depend on `this`, as `DRD-34` limited it to the `sortable` and `freeDrag` controllers;
- `DRD-35` property 7's requirement, added by `DRD-63`, that every built-in method passed with its receiver declares `this`. Its call sites stay;
- `DRD-37` property 4, as `DRD-63` amended it;
- `DRD-63` property 2.

**Amended on 2026-11-15 at `7f963e54a`, by the architect, on the cleanup report's first open item.** Property 4 names `SortableBehavior.invalidate`. Its rule already covered that member: `DRD-63` added its `this: SortableBehavior` as a receiver declaration, for "`sortable`'s `invalidate` step", and it is the sixth of the six sites in §Why. The list left it out, and so did the handoff. **What it said before:** "`Retirable.retire` and the drop-target tracker's `#resolve` and `#release` lose their `this` parameter".

**Implemented by** [`size-acceptance-cleanup-handoff.md`](../size-acceptance-cleanup-handoff.md) items 7 to 9, at `a3423c793`, apart from `SortableBehavior.invalidate`, which [`size-acceptance-follow-up-handoff.md`](../size-acceptance-follow-up-handoff.md) item 1 implements at `7763a67a1`. Accepted at `db76672a3` (§Disposition of the size acceptance follow-up report).