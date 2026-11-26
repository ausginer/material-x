#### DRD-22 — What the 2026-11-06 performance reading established

**Status:** active, applied in the remediation's validation

**The [reading](../measurements/2026-11-06-reading.md) and its raw data stand as recorded. Two of its conclusions are withdrawn as acceptance. The rules for the remediation's validation change.**

- **Cycle timing: "no difference" is withdrawn** (`drag/production:reviewer-4`). The verdicts compared the difference of medians with the control's range across rounds, which carries the drift that moves all arms together. Paired within rounds, production's task time is above both before arms in 7 of 7 rounds on 50 cycles at 20 items, by +1,804 µs against drag2 and +1,364 µs against the prototype, which is about 10 to 13 % of a cycle. At 2,000 items it is +3,984 µs against drag2. The A/A pair shows no consistent sign. **Status: unresolved, probably slower.** The reviewer scanned 52 comparisons and could not re-measure on a quiet machine, and the instrument proof never injected into a cycle row. So this is not a measured regression either.
- **Retained heap: the flag stands as the instrument's output** (`drag/production:reviewer-5`). The 0 B floor of an absolute-heap comparison flags any difference in compiled code. The attribution to code and engine tables is plausible, with object and closure totals within 144 B, but its scripts are not in the tree. **Status: decided by manual attribution, not by the instrument.**
- **The landing layout miss** is addressed by `DRD-15` and owes the exact rule.
- **The other rows keep their recorded verdicts until the paired rule re-judges them** from the same raw data. That costs no new run.
- **New rules, fixed before the next run.** Timing is judged by paired differences within rounds against the A/A pair, and a result is reported with its sign count and median whatever the verdict. Retained memory is judged by retained JavaScript objects, separately from code, with the instrument in the tree. The [remediation handoff](../remediation-handoff.md) states both, bounds the runs to the affected rows, and requires an injection on a cycle row first.

**No performance tradeoff is accepted here.** A slower row goes to the owner under CONTRIBUTING §0 as `DRO-4`.