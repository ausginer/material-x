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

**A summary proposes canonical ids; the register that owns the family assigns them.** There is no collision-free allocator for `F-`/`Q-`/`I-` — they are hand-numbered — so parallel passes would race. Each pass numbers within itself, and the summary resolves that race by carrying a `Local → canonical` mapping. **That mapping is a proposal until the register carries the rows**, and the registered id wins a collision: a summary that mints canonical ids and writes them nowhere else creates a second allocation surface, which is how two rounds an hour apart once gave one id to six defects. So a pass that mints an id writes its entry into the owning register — `00-index.md` for `D-`/`F-`, the document holding the family for the rest — **in the same commit that first uses it**.

## Tier

**Tier is assigned by consequence.** Never by provenance, and never by how many lenses reported it.

| Tier | What it means |
| --- | --- |
| **A** | A correctly integrated consumer observes something different at runtime: rendering, behaviour, timing, or a published value |
| **B** | No program behaviour changes, but a correct integrator can be misled by what the package says, **or** an instrument the repository relies on is unsound |
| **C** | Internal only: no consumer-observable effect, and nothing the repository relies on depends on it |

A finding that is _systematic_ rather than isolated does not change tier — it changes priority **within** one. That distinction is the whole of the vocabulary's job: while it was undefined, one round split three ways on identical evidence, one pass arguing from consequence and another from the fact that a retired mechanism had left its prose behind.