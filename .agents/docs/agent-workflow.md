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

## Dispatch

Three layers, named separately because one word was doing two jobs.

| Layer                  | What it is                                         | Governed                          |
| ---------------------- | -------------------------------------------------- | --------------------------------- |
| Owner-side coordinator | the person, and whatever they think with           | outside the system                |
| `agent-router`         | the Claude Code main session                       | a role, exempt from the invariant |
| Workers                | `architect`, `implementer`, `consolidator`, lenses | governed, effort-bearing          |

**The main session is `agent-router`**, a project role declaring `model: haiku`
and no `effort:` — governed, resolved and logged, and carrying no effort
obligation because haiku does not participate in the mechanism. It is not
roleless: it appears in the log like any other role, so the trust claim that
every governed role which acted must appear covers the main thread too.

**Its surface is `Agent`, `SendMessage` and `ListAgents`, and nothing else.**
The rule that the router does no repository work is that allowlist rather than
prose. This is stronger than the `disallowedTools` precedent §Agent configuration
warns about: an allowlist that never names `Bash` or `Write` removes the vector
instead of the obvious path to it. Read access is excluded deliberately — a
router that reads the repository grows context, forms opinions about the work,
and becomes the developer role the boundary exists to prevent. When a task
concerns a file, the router names the path and the worker opens it.

**It relays; it does not author.** The owner's prompt passes through rather than
being rewritten, which is what keeps output quality independent of the router's
model: haiku is enough to address an envelope and is never asked to compose the
letter.

**`architect` and `implementer` are resumable named workers.** Spawn each with a
`name` equal to its role and afterwards reach it by that name; a message resumes
a finished worker with its context, role, model and declared effort intact. One
name per role, so spawning the same name again replaces the generation.

**`consolidator` and the review lenses are one-shot.** `consolidator`,
`reviewer`, `integrity`, `cleanup` and `der` are spawned fresh every time and
never resumed. A round is the unit, and the next round wants a clean lens rather
than the previous round's conclusions. A consolidator spawns the four passes
itself, which is depth 2 and observed on the same terms as depth 1.

**Retirement is a repository event, not a token threshold.**

| Worker                        | Retire when                                                |
| ----------------------------- | ---------------------------------------------------------- |
| `implementer`                 | the unit of work is committed and pushed                   |
| `architect`                   | the contract, plan or phase it was reasoning about closes  |
| `consolidator`, review passes | always — every invocation is a new worker                  |
| `agent-router`                | the conversation stops being useful, retiring every worker |

Replacement is spawning the same name again. Nothing needs measuring to decide
it, which is the reason the boundaries are events.

**What makes retirement safe.** A worker's conversation is disposable working
memory. Durable state is the repository — commits, contracts, `D-*` records,
plans, review artifacts and handoffs, as [`AGENTS.md`](../../AGENTS.md),
[`review-findings.md`](review-findings.md) and [`handoff.md`](handoff.md)
already define. **Anything a worker knows that is not in the repository is lost
when it is retired, by design**, so a worker records or commits before that
point — which the boundaries above are chosen to coincide with.

**Dispatch happens from the main checkout only**, and a session carrying
`CLAUDE_CODE_EFFORT_LEVEL` cannot dispatch at all: the guard denies the router's
first tool call, whose surface is dispatch, so no worker comes into existence.
The remedy is to remove the variable and restart. Both gates are in
[`AGENTS.md`](../../AGENTS.md) §Before dispatching a governed worker.

Why this arrangement rather than persistent standalone role sessions, and what
was measured to choose it, is in
[`harness-orchestration.md`](harness-orchestration.md).

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

**Three harness properties worth knowing.** A sub-agent inherits the resident instruction set — `CLAUDE.md` and `AGENTS.md` — with no supported opt-out, which is why the rulebook and every convention are referenced rather than resident and are named by the roles that need them. A bare `@path` line is expanded only in those resident files: **inside a role definition it stays literal text**, so a role states its dependencies as read instructions rather than imports. And a new or changed role definition, like a changed resident file, does not take effect in a session that is already running: the stale version persists for minutes rather than resolving on a useful timescale, while a freshly started process picks the change up immediately. Anything that depends on a role's definition or on the resident set is therefore verified from a new session, never from the one that changed it.
