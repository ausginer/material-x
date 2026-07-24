# Experiment 03 — Packed protocol word (settlement status bitfield)

**Plan reference:** Track B, item 6 — "Integer discriminants → optional packed protocol
word," item 7 — "Preserve narrowing through a generic `isPhase`-style guard."

**Status:** ❌ Rejected — break-even at probe scale; ceiling too low to justify the
complexity.

---

## Hypothesis (refined from the plan's generic bitfield)

The classifier repeatedly tests *combinations* of discrete settlement facts, e.g.:

```ts
case LANDING_PINNED:
  return isActivePin(state, event)
    ? state.settlement?.presentation === PRESENTATION_PENDING
      ? LIFECYCLE_SETTLE_PROGRESS
      : LIFECYCLE_SETTLE_COMPLETE
    : LIFECYCLE_IGNORE;
```

If those enum facts were packed into one integer, each nested ternary could become a
single mask test — collapsing branch logic, not just stripping tokens. That is a
different (and more legitimate) mechanism than experiments 01–02.

## The ceiling, predicted before building

Nearly every classifier arm that tests an enum *also* performs an **identity** check —
`isActiveOp(state, event.operationId)`, `sameLanding(landing.currency, event)`,
`drop.resolutionId === event.resolutionId`. Those:

1. cannot be packed (they compare runtime ids), and
2. force the object dereference anyway (you still reach into `settlement.landing` for
   `.currency`), so the mask cannot even remove the property access — only the
   `=== ENUM` comparison next to it.

On top of that, a mask test does **not narrow** the TS union, so anywhere a later line
needs the narrowed object (`landing.currency`), the enum check has to stay regardless.
Net: the packed word can only replace the **non-narrowing boolean** checks
(`presentation === PENDING`, `isLandingSettled(landing)`).

## Probe (draggable-only, contained)

A derived `settlementStatus: number` field on `DraggableState` (not the shared
`SettlementState`), packing two bits:

```ts
const STATUS_PRESENTATION_PENDING = 1;
const STATUS_LANDING_SETTLED = 2;
function packSettlementStatus(s): number {
  return (s.presentation === PRESENTATION_PENDING ? STATUS_PRESENTATION_PENDING : 0)
    | (isLandingSettled(s.landing) ? STATUS_LANDING_SETTLED : 0);
}
```

Recomputed in the root reducer only when `settlement` changed (so the referential
no-effect guard is preserved — the word is reused whenever `settlement === from.settlement`).
Three classifier arms (`LANDING_PINNED`, `SETTLEMENT_COMPLETED`, `PRESENTATION_SETTLED`)
switched to `state.settlementStatus & BIT`. Builds ✓, typechecks ✓, **97/97 draggable
tests pass**.

## Result

| bundle    | baseline | probe    | delta        |
| --------- | -------- | -------- | ------------ |
| draggable | 6.55 kB  | 6.56 kB  | **+0.01 kB** |
| combined  | 12.63 kB | 12.66 kB | +0.03 kB     |

Essentially **neutral** — the classifier collapse was real, but the machinery (the state
field, the pack helper, the derive-on-commit logic, the bit constants) cost about what it
saved.

## Reading the result

- Genuinely closer to break-even than experiments 01–02, which were clear losses. The
  branch-collapse mechanism *does* recover something the token transforms did not.
- **But the probe pays the full fixed cost for only 3 collapse sites.** That fixed cost
  (field + helper + derive) is amortized; a full rollout — both features' classifiers
  *and* the settlement slices' own `presentation`/`landing.stage` checks (~15–20 sites) —
  could plausibly tip it to a small net *win*.
- Even then, the win is capped by the un-packable identity checks (the ceiling above), and
  it buys permanent costs: extra runtime state, bitwise ops (trips `no-bitwise`, needs a
  lint exception), and one more field coupled to the no-effect guard.

## Verdict

Break-even at probe scale, low ceiling, real complexity — not worth a full rollout.
Filed and reverted. If bundle size ever becomes a hard release blocker and every 100 B
counts, the full-scale amortized version is the one Track B lever worth revisiting; until
then it is not.

## Takeaways

- The branch-collapse framing is the *only* one of the three representation experiments
  that reached neutral rather than a loss — worth remembering that logic collapse ≠ token
  stripping.
- Identity checks are the hard floor: any transform that leaves `isActiveOp` /
  `sameLanding` / `resolutionId` comparisons in place (all of them do) keeps the object
  dereferences and caps the win.
- Cross-cutting conclusion with [01](01-tuples.md) and [02](02-classes.md): Track B's
  representation levers do not move the bundle on this toolchain. Recommend stopping the
  representation track and investing in the benchmark harness (quantify Track A's runtime
  wins) or the §13 release blockers instead.
