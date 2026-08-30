# Agent workflow

How the multi-agent system is arranged: which roles exist, how a review round is run, and how the roles are configured. This is coordinator and human documentation. **No role reads it at runtime** — each role's own definition under `.claude/agents/` is the executable truth for what that role does, what it loads, and what authority it holds.

## Roles

| Role           | Owns                                                                                          |
| -------------- | --------------------------------------------------------------------------------------------- |
| `reviewer`     | Feature proof — implementation against the plan, contracts, tests and parity requirements     |
| `integrity`    | Package coherence — neighbouring flows, public surface, invariants, drift outside the change  |
| `cleanup`      | Code discipline — machinery the code's responsibility does not require                        |
| `der`          | Surviving justification — machinery resting on a decision or assumption that may have expired |
| `consolidator` | Synthesis — validates, deduplicates, merges, rejects, routes. The root console                |
| `architect`    | Decisions that need architectural, contract, parity or public-surface authority               |
| `implementer`  | Implementation within settled constraints                                                     |

For important checkpoints, an independent model may be used instead of the Claude `reviewer` role.

Two boundaries hold across the whole system and are stated in each role that they bind: **reviewers find and document rather than fix or decide**, and **only the architect creates, amends, supersedes or renumbers a `D-*`.** Any role may report one as expired, contradicted or unimplemented.

## Handoff

```
implementation → independent passes (parallel, isolated) → consolidation
              → decision (only when needed) → remediation → closure review
```

Not every finding needs the architect; straightforward defects go from consolidation to the implementer.

## Review round

The consolidator is the root console: it launches the passes, in parallel and isolated from each other, and then synthesises them. **The rules it launches under — which passes run at which boundary, that no pass receives another's report, and that the passes are parallel sub-agents rather than a team — are stated in [`consolidator.md`](../../.claude/agents/consolidator.md), which is the role that applies them.**

The reason behind the isolation is the part worth knowing here: a pass that sees another's findings stops being a second opinion.

What a pass produces — the report shape, the artifact path, the local ids and the tier vocabulary — is in [`review-findings.md`](review-findings.md), which the passes retrieve themselves.

## Prompts

Keep prompts as short as possible. The role definition and the documents carry the context; a prompt identifies the task and the role.

`@"reviewer (agent)" Could you please review the project against plan.md as part of Checkpoint D?`

`@"architect (agent)" Could you please analyze C2-01 in checkpoint-d-2.md?`

## Agent configuration

Model and reasoning effort are frontmatter in `.claude/agents/`, which is the executable truth. The principle behind them: spend reasoning on synthesis and on lenses that must form a hypothesis nobody wrote down; a lens applying a written rulebook runs cheaper.

Roles keep normal local development tools. A reviewer's `disallowedTools` removes the most obvious edit path and **guarantees nothing** — `Write` and `Bash` remain. That a review changed no production code is established by the diff against the pre-round baseline.

**Three harness properties worth knowing.** A sub-agent inherits the resident instruction set — `CLAUDE.md` and `AGENTS.md` — with no supported opt-out, which is why the rulebook and every convention are referenced rather than resident and are named by the roles that need them. A bare `@path` line is expanded only in those resident files: **inside a role definition it stays literal text**, so a role states its dependencies as read instructions rather than imports. And a newly added role is not invocable immediately — the agent roster refreshes on its own a little later in the session, so a role written and called in one breath fails once and then works.
