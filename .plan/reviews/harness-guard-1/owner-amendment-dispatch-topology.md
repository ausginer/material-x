# Owner amendment — governed dispatch topology

**2026-09-07.** Repairs the first observed defect in the `agent-router` dispatch path. A harness repair, not a change to the worker topology: `agent-router` remains the haiku main-session role, `architect` and `implementer` remain resumable workers, `consolidator` and the four lenses remain one-shot. The Review Swarm filesystem-isolation question is deliberately untouched, and so is permission-mode policy.

## The observed failure

An owner prompt addressed to `architect` produced a `general-purpose` subagent carrying a rewritten investigation prompt. The observation log is unambiguous about the shape:

- the dispatching `PreToolUse` came from `agent_type: agent-router`;
- the `SubagentStart` that followed was `agent_type: general-purpose`;
- there is no `SubagentStart: architect` in the run;
- the generic child resolved `out-of-domain`, so the guard allowed it, and no effort invariant applied to anything it did.

Two invariants failed together: the router did not select the requested role, and the guard allowed a governed dispatcher to escape into an out-of-domain worker.

## What made it possible

**The router's wording confused two independent fields.** It said `architect` and `implementer` are spawned with a `name` equal to the role, and said nothing about `subagent_type`. `name` is an address for a later resume; `subagent_type` is the only field that decides what the worker is, what model and effort it runs at, and whether it is governed at all. A call carrying `name: architect` and `subagent_type: general-purpose` satisfies the sentence as written and produces a general-purpose worker answering to the word `architect`.

**And the guard could not see it, structurally.** Every row of the effort decision table is reached only after the acting role resolves inside the guard's domain. A generic child resolves `out-of-domain`, which is an allow. So the substitution was invisible to the invariant **precisely because it left the domain the invariant governs** — the failure is not a gap the table happened to miss, it is a place the table cannot look.

That is the reason a prompt fix alone was rejected. A role definition is advice to a model; the thing it is advising against here is a call the model can make for a plausible reason, and nothing downstream would say so.

## What was decided

**1. Router dispatch is stated in tool arguments.** `agent-router.md` now names `subagent_type` as the role selector and `name` as an address, in a table mapping the owner-addressed role to both fields, with the wrong shape written out explicitly:

```
WRONG   subagent_type: general-purpose   name: architect
```

**2. The relay rule is stated as a prohibition on composing.** The owner's request is the worker's `prompt`, copied unchanged — not summarized, paraphrased, extracted from, or rewritten into an investigation brief. The observed failure rewrote the prompt as well as the role, and only the second half was previously refusable.

**3. The consolidator names its lenses by type.** Each launch selects `subagent_type: "reviewer" | "integrity" | "cleanup" | "der"`. The existing requirements — four lenses, fresh, one-shot, parallel, logically isolated — are unchanged.

**4. The guard asserts the topology and fails closed.** `agent-router` may spawn only the seven repository worker roles; `consolidator` only its four lenses. A substitution from either is denied before the child starts. Two rules, both narrow:

- **`topology-escape`** — the dispatcher selected a role its topology does not allow. An `Agent` call omitting `subagent_type` counts as selecting `general-purpose`, because that is what the tool does with it; reading absence as _no role chosen_ would leave the plainest escape open.
- **`topology-identity`** — the call's `name` claims a governed role its `subagent_type` does not select. A descriptive name is the caller's business and is not judged.

The rows are read **before** everything about effort, including the resolver's own failures, because the escape is what those rows cannot see; and **after** the worktree refusal, which is about the checkout rather than the call. `SendMessage` selects no role — it reaches a worker whose type was fixed when it was spawned — so a resume is not judged.

**Scope was held deliberately.** Out-of-domain agents are not an error anywhere else. An architect delegating a search, or an implementer spawning `Explore`, stays legitimate, and a dispatcher the map does not name is unconstrained. The existing effort behaviour is untouched: this is an additional assertion, not state repair or session management.

## Evidence

**Discrimination.** Five mutations of the landed code, each run against the full suite: removing the topology check (14 failures), reading an absent `subagent_type` as no selection (1), removing the identity clause (3), removing the consolidator from the map (3), and treating `SendMessage` as a spawn (1). No mutation survives.

**The payload shape is observed, not assumed.** A live `PreToolUse` for the `Agent` tool was captured before the design was fixed. It carries `tool_input.subagent_type` and `tool_input.name`, so the exact target role is pinned in tests directly rather than through prose.

**Runtime acceptance, from fresh processes.** A changed role definition does not take effect in a session already running, so the session that made these edits is not evidence. Two new CLI sessions, enforcement on:

| Step | Record |
| --- | --- |
| 1 | `SessionStart` `agent-router` |
| 2 | `PreToolUse` `agent-router`, `dispatch_target: architect`, allow exempt |
| 3 | `SubagentStart` `agent_type: architect`, `declared: high` |
| 4 | `SubagentStop` `architect`, `declared=high actual=high`, allow match |

**No `general-purpose` record appears in the run at all**, which is the claim — the earlier failure was legible only as such a record existing.

The consolidator path reaches depth 2 on the same terms: `dispatch_target: consolidator` from the router, then `PreToolUse consolidator, dispatch_target: cleanup, declared=medium actual=medium, allow match`, then `SubagentStart cleanup` and its matching `SubagentStop`. The lens was selected as the governed role, not by name and not by prose.

`dispatch_target` was added to the verdict record to carry both claims. A denied dispatch leaves no `SubagentStart` to read the chosen role from, so the field sits on the verdict that decides rather than being inferred from the child that followed.

**Not observed, and not claimed:** a live refusal of a topology escape. The router did not attempt one, and no prompt was written to induce one — a fixture instructing a model to misbehave establishes the model's compliance rather than the guard's refusal. The refusal is covered by unit and end-to-end cases over the real payload shape, on the same footing as the worktree row.

## Drift risk accepted

The topology map is written in `verdict.ts` and duplicates a rule that also appears in two role definitions. That duplication is deliberate — a prompt is advice, a hook is a refusal — but the map and the checkout can still diverge if a role is renamed. `installation.test.ts` holds every role the map names to a definition in this checkout, so a rename fails a test rather than denying every dispatch at runtime. The reverse is not checked: a role no dispatcher may select is ordinary, and `Explore` is one.