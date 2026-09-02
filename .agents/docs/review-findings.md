# Review findings

> Retrieved before writing anything into a review report, including a report with no findings.

What a finding is, and how a review pass reports it.

## Problem reports

- Finding
- Current behavior / contract
- Why it is a problem
- Evidence / reproduction
- Required property

Describe **what is wrong and what property must hold**, not how to fix it. Avoid putting proposed fixes into review documents unless choosing the fix is itself the task.

## Artifacts

`packages/<pkg>/.plan/reviews/<round>/<topic>-<author>.md`; consolidation as `<round>-summary.md`.

A report carries three things, because the consolidator decides with each of them:

- **the commit files were read at** — reports from different trees cannot be merged;
- **scope** — what the pass covered and what it did not, so a silent area is distinguishable from a clean one;
- **findings** — each with a reviewer-local id (`cleanup-1`, `integrity-3`), a tier, a one-line claim, and its evidence.

A null result is a result and is stated explicitly. _The forward pass found no surviving machinery_ is an outcome; silence is not.

**Canonical ids are assigned at consolidation.** There is no collision-free allocator for `F-`/`Q-`/`I-` — they are hand-numbered — so parallel passes would race. Each pass numbers within itself; the summary assigns canonical ids and carries the local→canonical mapping.

## Tier

**Tier is assigned by consequence.** Never by provenance, and never by how many lenses reported it.

| Tier | What it means |
| --- | --- |
| **A** | A correctly integrated consumer observes something different at runtime: rendering, behaviour, timing, or a published value |
| **B** | No program behaviour changes, but a correct integrator can be misled by what the package says, **or** an instrument the repository relies on is unsound |
| **C** | Internal only: no consumer-observable effect, and nothing the repository relies on depends on it |

A finding that is _systematic_ rather than isolated does not change tier — it changes priority **within** one. That distinction is the whole of the vocabulary's job: while it was undefined, one round split three ways on identical evidence, one pass arguing from consequence and another from the fact that a retired mechanism had left its prose behind.