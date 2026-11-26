#### DRO-8 — The costs of the activation result

**Default: none is accepted until you read it.** [`activation-result-handoff.md`](../activation-result-handoff.md) implements `DRD-30`, and its report gives these figures, each with the commit it measured:

- **Size:** every row of `just size`, minified and Brotli, at the unit's base and at each of its commits.
- **Allocation, counted by reading with the method of the ownership report:** per press that never activates, per activation, per controller and per landing. The kernel, `freeDrag`, `sortable` and each example in the size table are counted separately.
- **Per sample:** the `DRF-2` test's `lift.ts:translate` figures, and the kernel per-sample test's results as the suites report them, not interpreted.

**Expected by reading, not measured:**

- `freeDrag`: one object less per press, because its admission's `state` is the visual, and one more per activation, the operation.
- `sortable`: no change per activation if the operation also serves as the axis context. Otherwise one more.
- The examples: one operation per activation where the example has no state object today.
- The kernel: no change per operation. The admission's `state` moves from the `Drag` to the session.
- Size: the operation classes' member names aren't shortened by the minifier. No figure is estimated. `freeDrag` is already over its ceiling.

**What reading decides:** you accept the figures, or name a part to remove before merge.

**Added 2026-11-08, after the unit:** the [report](../activation-result-report.md) has the figures, measured at `1d5d3fa13` and `da139407e`. The architect read them in [`activation-result-assessment.md`](../activation-result-assessment.md) §5 and accepted none.

- **Size.** The kernel: −29 B minified and +16 B Brotli. `freeDrag`: +102 B minified and +96 B Brotli, now 152 B over its ceiling. `sortable`: −80 B minified and +62 to +69 B Brotli. How much of this comes from member names isn't separated, because no ablation was run.
- **Allocation.** It agrees with reading for the kernel and the built-ins. The examples also allocate one function per hook on each activation, because a literal operation's hooks close over the `Drag`.
- **Per sample.** The `DRF-2` figures are 136.73 to 140.09 B per move, inside the earlier unmutated range. So no added allocation the size of `DRF-2`'s mutation.
- **The amendment's motion object.** It adds one object per `freeDrag` activation and removes one per controller. Its size comes from the assessment's §6 unit.

**Accepted by the owner on 2026-11-10,** with `DRO-7` and in the same words. The acceptance covers the figures above, measured at `1d5d3fa13` and `da139407e`, with the example closures and the motion object. **The acceptance re-bases nothing.**