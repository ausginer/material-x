#### DRO-7 — The costs of the ownership revision

**Default: none is accepted until you read it.** [`ownership-handoff.md`](../ownership-handoff.md) implements `DRD-26` to `DRD-28`, and its report gives these figures, each with the commit it measured:

- **Size:** every row of `just size`, minified and Brotli, at each of the unit's commits. Each is compared with the figures that the [composition report](../composition-report.md) recorded at `2506dcbb6`, whose source equals `0dcb80fb1`'s. `bb644d6d7` has no complete reading, because its lifted rows don't build.
- **Allocation, counted by reading and with the method stated:**
  - per press that never activates;
  - per pointer operation, with and without `lift`;
  - per keyboard command;
  - per lifted activation inside the lift, and per controller for the `Lifter`.
- **Per sample:** the per-sample allocation test result. A lifted behavior's `translate` call now reads the `Lift` from its state, one or two property reads more. That is not measured.

**Expected by reading, not measured. Revised with `DRD-27` on 2026-11-07:**

- **`draggable` alone should shrink:** the session loses the lift's call, hold and landing, and the controller loses the landing slot and two interface members.
- **The lifted rows move by the composition's code,** which each built-in now writes: a `Lifter` per controller, the acquisition and `land`, and `cancelLanding` passed to `use`. The lift itself loses the `report` path and gains the registration of its release.
- **A press that never activates allocates as at `0dcb80fb1`.** `6d5ba89e7`'s expected saving is withdrawn, because the `Drag` is built at the opening again.
- **Each lifted controller allocates a `Lifter`.** Each lifted activation allocates the `Lift`, its `translate` and the release's disposer or disposers. At `bb644d6d7` it allocated the hold, its `land` and `translate`.
- Removing `isCurrent` and adding an ended state should change size by a few bytes in either direction.
- Returning the modules to the root should change no row.

**No timing is taken,** because you deferred timing. **What reading decides:** you accept the figures, or you name a part to remove before merge. **No recommendation until the figures exist.**

**Status, 2026-11-07:** the figures are in the [ownership report](../ownership-report.md), measured at `039e8e153`, `433a0e06c` and `89995c27e`. One is incomplete. **The per-sample test passed, but its kernel assertion couldn't fail** (§Disposition of the ownership report). So that result covers only the lift's `translate`. The kernel's per-sample figure comes from [`instrument-repair-handoff.md`](../instrument-repair-handoff.md) item 1's unmutated runs. The size and allocation figures don't depend on it. **Added 2026-11-08:** `DRD-29`'s figures come from [`lift-representation-handoff.md`](../lift-representation-handoff.md) item 4: size, allocation by reading, and the lift's bytes per sample before and after, which `DRF-2`'s repair makes measurable. They are reported apart from the kernel's per-sample reading, which is still open. **Added 2026-11-08, after the unit:** the [report](../lift-representation-report.md) has them, and the architect reviewed them in [`operation-lifetime-assessment.md`](../operation-lifetime-assessment.md) §1, without accepting any. The size table is consistent. The allocation count by reading agrees: one function less per lifted controller, one object more per lifted activation, and no change per landing. Per sample, the result is only that `DRD-29` adds no allocation the size of `DRF-2`'s mutation.

**Accepted by the owner on 2026-11-10,** before the combined review: "да, принимаем. Трейдофф вполне очевидный" ("yes, we accept. The trade-off is quite obvious"), relayed in the [round summary](../reviews/combined-ownership/combined-ownership-summary.md). The acceptance covers the figures above: the ownership report's, `DRD-29`'s in the lift representation report, and the kernel's per-sample figure, 13.33 to 17.49 B per move ([`instrument-repair-report.md`](../instrument-repair-report.md) §Item 1). **The acceptance re-bases nothing.** That includes the per-sample test's `< 16` threshold. The accepted figure spans the threshold, so that test fails on accepted source in some runs. It is a known failure until a reading under `DRO-4` re-bases the threshold, or until optimization lowers the figure ([`combined-review-assessment.md`](../combined-review-assessment.md) §2).