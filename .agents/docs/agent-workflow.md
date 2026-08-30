# Agent workflow

Separate roles for review, architectural decisions, and implementation. This file carries only what **every** role needs; each role's own lens lives in its definition under `.claude/agents/`, so no role loads another's rules.

## Roles

| Role | Owns |
| --- | --- |
| `reviewer` | Feature proof — implementation against the plan, contracts, tests and parity requirements |
| `integrity` | Package coherence — neighbouring flows, public surface, invariants, drift outside the change |
| `cleanup` | Code discipline — machinery the code's responsibility does not require |
| `der` | Surviving justification — machinery resting on a decision or assumption that may have expired |
| `consolidator` | Synthesis — validates, deduplicates, merges, rejects, routes. The root console |
| `architect` | Decisions that need architectural, contract, parity or public-surface authority |
| `implementer` | Implementation within settled constraints |

For important checkpoints, an independent model may be used instead of the Claude `reviewer` role.

## Authority

- Reviewers **find and document**; they do not fix.
- Reviewers do not decide. A finding that needs an architectural, contract or public-surface call is routed, not answered.
- **Neither a reviewer nor the consolidator mints a decision.** They cite existing `D-*` as evidence and may report one as expired, contradicted or unimplemented; creating, amending, superseding or renumbering one is the architect's alone.
- Consolidation is not a second architect. It may reject a finding on evidence; it may not settle a design question.
- The implementer does not redesign settled architecture. An unsettled or contradicted decision goes back rather than being decided silently.
- Probes, diagnostics, fixtures and benchmarks are fine for any role that needs them to establish a fact.

## Handoff

```
implementation → independent passes (parallel, isolated) → consolidation
              → decision (only when needed) → remediation → closure review
```

Not every finding needs the architect; straightforward defects go from consolidation to the implementer.

## Review round

The consolidator is the root console. It launches the passes and then synthesises them.

**Passes are independent.** They run in parallel, in one message, and no pass receives another's report, findings or artifact path. Only the consolidator reads more than one. They are parallel subagents, never a team — they must not message each other.

`reviewer` runs on every implementation handoff. `integrity` runs at checkpoint and round boundaries. `cleanup` and `der` run on demand. `consolidator` runs when two or more passes did.

## Evidence and delegation

Verify cheap mechanical claims yourself, in the agent that cites them. **Delegate discovery, never verification** — a sub-agent returns candidates, and the citing agent confirms the ones it reports. Delegate only when the search is large enough to justify a separate context.

The rule exists because delegated call counts were once reported as findings and were wrong: [`source-shape-audit-claude.md`](../../packages/drag2/.plan/reviews/phase-23/source-shape-audit-claude.md).

## Problem reports

- Finding
- Current behavior / contract
- Why it is a problem
- Evidence / reproduction
- Required property

Describe **what is wrong and what property must hold**, not how to fix it. Avoid putting proposed fixes into prompts or review documents unless choosing the fix is itself the task.

## Review artifacts

`packages/<pkg>/.plan/reviews/<round>/<topic>-<author>.md`; consolidation as `<round>-summary.md`.

A report carries three things, because the consolidator decides with each of them:

- **the commit files were read at** — reports from different trees cannot be merged;
- **scope** — what the pass covered and what it did not, so a silent area is distinguishable from a clean one;
- **findings** — each with a reviewer-local id (`cleanup-1`, `integrity-3`), a tier (A/B/C), a one-line claim, and its evidence.

**Canonical ids are assigned at consolidation.** There is no collision-free allocator for `F-`/`Q-`/`I-` — they are hand-numbered — so parallel passes would race. Each pass numbers within itself; the summary assigns canonical ids and carries the mapping.

## Tier

**Tier is assigned by consequence.** Never by provenance, and never by how many lenses reported it.

| Tier | What it means |
| --- | --- |
| **A** | A correctly integrated consumer observes something different at runtime: rendering, behaviour, timing, or a published value |
| **B** | No program behaviour changes, but a correct integrator can be misled by what the package says, **or** an instrument the repository relies on is unsound |
| **C** | Internal only: no consumer-observable effect, and nothing the repository relies on depends on it |

A finding that is _systematic_ rather than isolated does not change tier — it changes priority **within** one. That distinction is the whole of the vocabulary's job: while it was undefined, one round split three ways on identical evidence, one pass arguing from consequence and another from the fact that a retired mechanism had left its prose behind.

## Prompts

Keep prompts as short as possible. The documents carry the context; a prompt identifies the task and the role.

`@"reviewer (agent)" Could you please review the project against plan.md as part of Checkpoint D?`

`@"architect (agent)" Could you please analyze C2-01 in checkpoint-d-2.md?`

## Agent configuration

Model and reasoning effort are frontmatter in `.claude/agents/`, which is the executable truth. The principle behind them: spend reasoning on synthesis and on lenses that must form a hypothesis nobody wrote down; a lens applying a written rulebook runs cheaper.

Roles keep normal local development tools. A reviewer's `disallowedTools` removes the most obvious edit path and **guarantees nothing** — `Write` and `Bash` remain. That a review changed no production code is established by the diff against the pre-round baseline.

**Two harness properties worth knowing.** A sub-agent inherits the full resident instruction set — `CLAUDE.md`, `AGENTS.md` and `CONTRIBUTING.md`, about 7,000 words — with no supported opt-out, so a four-lens round pays it four times; a dedicated launcher with an explicit system prompt is the remedy if that cost starts to bite. And a newly added role is not invocable immediately — the agent roster refreshes on its own a little later in the session, so a role written and called in one breath fails once and then works.