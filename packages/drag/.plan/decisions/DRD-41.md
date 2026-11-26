#### DRD-41 — The step-list injection shows that the bytes rule doesn't flag kernel work that allocates nothing

**Status:** active, decided on 2026-11-10 by the architect on the instrument unit's return at `b8f1d1b35`. Amends [`performance-instrument-handoff.md`](../performance-instrument-handoff.md) and [`performance-plan.md`](../performance-plan.md) §2 P1. Implemented at `676bdd3ba` (that handoff's item 2a). Q1 fails as required, and the witness is quiet and counted in the `--prove` recorded at `c279973a3`. Read by the architect on 2026-11-11 ([assessment](../performance-instrument-assessment.md)): conforms

**`compare.ts`'s injection "one entry on the step list per frame" keeps its name, patch and scenario, and is expected not to flag. It is the bytes rule's specificity witness: kernel code that runs on every frame and allocates no object stays under the rule. The rule's sensitivity is shown by "1 KB allocated per move" and by `DRF-1`'s array of four numbers in `Gesture.enter`, which every sample and every frame reach.**

Decided on 2026-11-10 by the architect, on the [instrument unit's return](../performance-instrument-report.md) at `b8f1d1b35` (§Returned).

**Why:**

- **The injection's cost was the allocation an entry made, and the step list no longer makes one.** At `b91db2818` the patch pushed onto `#steps` in `draggable.ts`, and the bytes row read 73 to 80 B per move under `requestStep` ([remediation report](../remediation-report.md) §Instrument proof). Since `DRD-35` and `DRD-36` the list is a `CallbackList`. It keeps a callback and its receiver in two slots of one array, which it reuses, and `DRD-35` property 9 requires no object per entry. The same route at the current source didn't flag in 3 of 3 rounds. Its kernel keys read 1 to 7 B per move, as base does ([`n3-prove.json`](../measurements/2026-11-10-performance-n3-prove.json)). The regression the injection modelled has no byte cost now, so its quiet reading is correct.
- **Making it flag again would test the patch and nothing else.** It would need an allocation added to the route for that reason alone. That allocation would repeat `DRF-1`'s witness, which allocates in `Gesture.enter` on every entry and read 96 to 108 B per move.
- **A path needs no flagging witness of its own under the location rule.** The rule selects by module, so code in a kernel module is selected whichever path calls it. The frame path's functions are keyed under the kernel in every arm of that run, such as `kernel/gesture.ts:requestStep` and `kernel/session.ts:requestStep`. A witness on the frame path was needed while the rule selected by name.
- **The opposite error had no witness.** N3 showed that an allocation outside the kernel doesn't flag. Nothing showed that extra kernel calls with no allocation don't flag. The existing patch is that case, on a route that no scenario otherwise sends through the list.

**Required properties:**

1. The injection's name, file, `find`, `replace` and scenario are unchanged. Its expectation is that no verdict on its row flags.
2. `--prove` passes only when every injection expected to flag flags, and every injection expected to stay quiet doesn't flag. Its printed line and its JSON tell a met quiet expectation from a broken one.
3. The header comment and the injection's comment state what the witness tests.
4. A quiet result counts only from a run in which the bytes row's flagging injections flag. A `--only` run that selects the quiet injection alone shows that it applies, and nothing about the rule.
5. A flag on the quiet injection is a return to the architect. Either the rule flags kernel work that allocates nothing, or the step list allocates per entry, against `DRD-35` property 9. Neither is repaired by changing the expectation.

**Rejected:**

- **Withdraw the injection.** It is the only check that the rule doesn't flag kernel work with no allocation, and the only one that runs `DRD-35` property 9 once per frame. Keeping it costs one bytes run of 3 rounds.
- **Add an allocation to the route**, for the reason above.
- **Move it to a timing row.** An entry costs a few array operations per frame. Item 3's floors will show whether a timing row could see that, and a gate on it would guard no decision.

**What this amends:** [`performance-instrument-handoff.md`](../performance-instrument-handoff.md), at its boundary on each injection's expectation, item 2's N2 row and item 5 step 1, and [`performance-plan.md`](../performance-plan.md) §2 P1 step 4. `DRD-23`'s last bullet is unchanged.