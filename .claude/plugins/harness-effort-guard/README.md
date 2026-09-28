# harness-effort-guard

Treats what an agent definition declares as a runtime invariant — the role that is acting, the `model:` it declares and the `effort:` it declares — and the dispatch topology of the governed dispatchers as a second one.

A role's frontmatter says what reasoning effort it must run at. Nothing enforces that: a main-thread `--agent` session can apply the role's `model:` and drop its `effort:`, and `/effort`, `/compact`, resume and a `CLAUDE_CODE_EFFORT_LEVEL` in the environment can each move effective effort away from the declaration. A run then looks like it happened as designed while some role reasoned cheaper than its definition requires, and nothing in the transcript says so.

This plugin compares them on every tool call and fails closed when they disagree.

**The role contract it asserts** has three executable properties, and it asserts them rather than repairing them:

    governed identity = the role `subagent_type` selected
    model             = that role's frontmatter `model:`
    effort            = that role's frontmatter `effort:`

Model and effort are independent. A worker matching one and violating the other is still invalid.

## What it governs

Markdown role definitions in `<project root>/.claude/agents/`, and nothing else — not user-scope agents, plugin agents, built-ins, or the precedence order between them. Modelling that order would mean keeping a second, silently drifting copy of the host's resolution rules. A name the plugin does not own is a name it does not judge, and is allowed through untouched.

Governing a name is not the same as holding it to an effort. A definition that declares `model: haiku` stays in the domain — the plugin owns the name, resolves it, and logs it — but is outside the effort invariant, because the model it names does not participate in the effort mechanism at all. Requiring a declaration there would demand a contract the runtime cannot satisfy.

The test is the literal `model:` field of the definition, matched exactly against `haiku`. Not a prefix, not an alias, not a family, and not a capability lookup: the guard would have to infer which models carry effort, and it has no reliable source for that. A model that later gains or loses effort support changes one word in one file.

The project root is the nearest ancestor of the starting directory holding a `.claude/agents/` directory. A tree that declares no roles has an empty domain, and an empty domain allows.

## Governed identity

Three things the runtime collapses into one field, which must be kept apart:

- **address** — the `name` a spawning call assigns. Caller-owned, arbitrary, and not authoritative even as an address: the runtime silently rewrites a name already used in the session, so `x` becomes `x-2`. Never an input to a verdict.
- **reported actor** — the payload's `agent_type`. On the ordinary subagent path it is the selected role; on the in-process teammate path it is the assigned address. Evidence about what the runtime called this worker, and nothing more.
- **governed role** — the role `subagent_type` selected. The only identity the effort invariant, the model invariant and the dispatch topology may key on.

`agent_id` is the discriminator, present on every child event and absent on every main-thread one.

| `agent_id` | Event | Governed role comes from |
| --- | --- | --- |
| absent | any | `agent_type` — a main thread carries the role `--agent` gave it |
| present | effort-bearing | the runtime's per-agent record, keyed by that exact `agent_id` |
| present | lifecycle | nothing — identity is **deferred** |

**The record is keyed on `agent_id` and located from a path the payload supplies.** The session transcript is `<dir>/<session>.jsonl`, and the session's workers are recorded beside it at `<dir>/<session>/subagents/agent-<agent_id>.meta.json`. No home directory, no assumed projects root, and nothing parsed out of `agent_id` — which embeds the address on one path and must not be read for it. The role is `customAgentType ?? agentType`, correct on both observed shapes: the teammate record puts the selected role in `customAgentType` and the address in `agentType`; the subagent record omits `customAgentType` and puts the role in `agentType`.

**Nothing else is an input to identity.** Not the runtime `name`, not a suffix of it, not text embedded in `agent_id`, not the prompt, not dispatch order, and not positional matching between spawn calls and starts. The guard owns no identity state at all: no ledger, no correlation table, no pending-name store, nothing to prune and nothing to go stale. A resume keeps the same `agent_id`, so the same record answers for it.

**Every way of failing to establish a child's role denies**, under `unresolved-identity`: no usable path in the payload, no record, an unreadable or malformed one, or a shape naming no role. There is no fallback to the reported `agent_type` — that fallback _is_ the defect this closes, since the address resolves out-of-domain and out-of-domain is an allow. The record is an undocumented artifact of a private layout, and this is the whole of what makes depending on it acceptable: if the runtime moves, renames or reshapes it, governed child work stops at once and one grep of the log says why.

**`SubagentStart` defers rather than guessing.** The record does not exist yet at that event, and that event cannot deny, so nothing is lost. Resolving the address there instead would make the log assert `out-of-domain` about workers that are in fact governed, which is the instrument stating a falsehood about the very thing it exists to witness.

**Legitimate delegation is not narrowed.** Once the true selected role is recovered it goes through the ordinary resolver, so an architect spawning `general-purpose` and an implementer spawning `Explore` resolve `out-of-domain` and `exempt` and are allowed exactly as before. The repair changes which name the resolver is given, not which names it governs.

## Decision

Applied to `PreToolUse`, `Stop` and `SubagentStop` — the events that carry `effort` by contract:

| Role | Declared | Reported | Outcome |
| --- | --- | --- | --- |
| not acting, or out of domain | — | — | allow |
| governed, `model: haiku` | none | any | allow — outside the effort invariant |
| governed, `model: haiku` | `X` | any | **deny** — the declaration is unsatisfiable |
| governed | none | any | **deny** — the role declares no `effort:` |
| governed | `X` | none | **deny** |
| governed | `X` | `X` | allow |
| governed | `X` | `Y` | **deny** |

The exempt rows are read before every row that concerns effort, so a `model: haiku` role reaches none of them: absent reported effort is the expected observation for it, not a violation. The environment check below is the one thing read ahead of them.

A `model: haiku` definition that also declares `effort:` is the one way such a role denies. That file promises a level the runtime will never report, and the guard treats it as a defect in the one namespace it owns — the same standing as two definitions claiming a single name. Choosing silently between the two fields would either enforce a number that cannot be reached or discard a declaration the author wrote on purpose.

`CLAUDE_CODE_EFFORT_LEVEL` being set denies for **every** governed role, exempt ones included, and that check is made before the exemption. It is a process-wide hard override: no per-role effort can be honoured anywhere in the session while it is present, so the condition is a property of the session rather than of the role that happens to be acting. The remedy is to remove the variable and start again; the guard offers no other, and does not fall back to observing.

Denying the exempt roles is the point rather than a side effect. Exempting them would leave a contaminated session able to act through whichever role happens to carry no level, while every role that does carry one is refused — which reports a session-wide fault as if it were a property of the actor. Refusing at the first tool call is as close to refusing the session as a hook can get, startup itself being unrefusable.

**Dispatch from a linked worktree is refused, whoever asks.** A tool call that would bring another worker into being — `Agent`, `Task`, `SendMessage` — denies when the project root holds `.git` as a regular file rather than a directory. A worktree carries its own `.claude/` at its own commit, so it can govern part of the role set and silently allow the rest, or govern all of it at a superseded generation and enforce the wrong contract while looking guarded. No per-worktree configuration fixes the second shape, because the defect is the commit rather than the settings. This row is read before any question about the role, and it refuses the act rather than the caller: a worktree session that dispatches nothing is untouched, which is what lets an isolated single worker run there.

Where the guard is not loaded in the worktree at all, it cannot refuse anything; that case is covered by the startup gate the host repository documents, not by this plugin.

## Governed model

The model a role declares is executable in the same sense as the effort it declares, and the two are checked independently. It is asserted at two points, for two different reasons.

**At dispatch, before the worker exists.** When a spawning call selects a governed `subagent_type`, that role's declared model is resolved and compared against any `model` the call explicitly supplies. A conflict denies at the parent's `PreToolUse` under `dispatch-model`, so no worker of the wrong class is ever created.

| `subagent_type` | Declares | Call supplies | Outcome                     |
| --------------- | -------- | ------------- | --------------------------- |
| `integrity`     | sonnet   | —             | allow                       |
| `integrity`     | sonnet   | `sonnet`      | allow                       |
| `integrity`     | sonnet   | `opus`        | **deny** — `dispatch-model` |
| `reviewer`      | opus     | `opus`        | allow                       |
| out of domain   | —        | anything      | allow                       |

An omitted override is not a conflict: naming a role is how a caller asks for that role's own declaration, and requiring the declaration to be restated would make the definition advisory.

**At the child's own events, where the runtime records a model.** The per-agent record exposes the effective model on the teammate shape and carries no such field on the subagent shape. Where the evidence exists it is compared against the resolved role's declaration and a disagreement denies under `model-mismatch`, parallel to an effort mismatch. Where it does not, the check is recorded as `unverified` and nothing is claimed: a record shape carrying no model supports no verdict about one, and a log that reported silence as a pass would be inventing evidence.

A runtime value matches a declaration when the two are equal, or when the declared alias is one of the dash-separated segments of the runtime identifier — `opus` and `claude-opus-5`. Both forms were observed in the runtime's own records. It is segment membership rather than a prefix or substring test, and a third form is an edit to that one function.

Out-of-domain workers are outside this invariant as they are outside the effort one. Exempt roles are not: a role declaring `model: haiku` is governed, and the model it declares is the model it must run on.

## Governed dispatch topology

A second assertion, sharing the decision path and nothing else. It answers a failure the effort table cannot see: a governed dispatcher spawning an **out-of-domain** worker where the topology requires a governed one. The child resolves `out-of-domain`, which is an allow — so the substitution is invisible to the invariant precisely because it left the domain the invariant governs. Observed: a dispatcher asked for `architect` spawned `general-purpose`, and every record in the run says `allow`.

One dispatcher is constrained, and nothing else is:

| Dispatcher     | May spawn                                 |
| -------------- | ----------------------------------------- |
| `consolidator` | `reviewer`, `integrity`, `cleanup`, `der` |

**A dispatcher the table does not name is unconstrained.** An architect delegating a search to a general-purpose agent, or an implementer spawning `Explore`, is legitimate and stays legitimate. The assertion is narrow by construction: out-of-domain agents are not an error anywhere else, and making them one would refuse work the topology never had an opinion about.

The subject is the `subagent_type` of a **spawning** call — `Agent` or `Task`. `SendMessage` is dispatch for the worktree row and selects no role here: it reaches a worker whose type was fixed when it was spawned. An `Agent` call omitting `subagent_type` is read as selecting `general-purpose`, because that is what the tool does with it; reading absence as _no role chosen_ would leave the plainest escape open.

**The dispatcher's identity is its resolved governed role**, not its reported `agent_type`. A consolidator running as a named teammate reports its address there, and a topology keyed on that field would find no entry for it — leaving the one dispatcher the harness constrains free to spawn whatever it liked.

**A governed role name may not be used as an address, whoever dispatches.** A call whose `name` is the exact name of a role the guard governs, while `subagent_type` selects a different one, is refused everywhere and not only under a constrained dispatcher. The reason is mechanical rather than stylistic: on the subagent path the runtime records the assigned name as the worker's own `agentType`, so such a call would resolve a general-purpose worker as the governed role it was merely named after. A descriptive name remains the caller's business and is not judged.

**A governed review lens may not be spawned under a runtime `name` at all.** This is a compatibility containment, not part of the identity mechanism: the guard understands named workers perfectly well, but the runtime does not yet run one as the role that was selected. Named lenses declaring `high` were observed running at the parent's `medium`, live and under this build. Until that changes the Review Swarm stays on the ordinary unnamed subagent path, which is governed correctly. Named workers stay legitimate everywhere the topology has no opinion, and this row retires when the runtime honours the selection — it is not a reason to drop child record resolution, which named governed dispatchers still need.

| Dispatcher | `subagent_type` | `name` | Outcome |
| --- | --- | --- | --- |
| not in table | anything | absent | allow |
| not in table | anything | descriptive | allow |
| not in table | anything | that role | allow |
| not in table | anything | other role | **deny** — `topology-identity` |
| in table | permitted | absent | allow |
| in table | not permitted | anything | **deny** — `topology-escape` |
| in table | absent | anything | **deny** — `topology-escape`, defaulted |
| in table | permitted | other role | **deny** — `topology-identity` |
| in table | permitted | any name | **deny** — `topology-name` |

The rows are read **before** everything about effort, including the resolver's own failures, because the escape is what those rows cannot see. They are read **after** the worktree refusal, which is about the checkout rather than the call.

The topology is written in [`verdict.ts`](scripts/verdict.ts) rather than derived: no role definition states who may spawn whom. It duplicates a rule that also appears in `consolidator.md`, deliberately — a prompt is advice to a model, and this is a refusal. `installation.test.ts` holds every role the table names to a definition in the checkout, so a renamed role fails a test rather than denying every dispatch at runtime.

Missing reported effort, a model-capped downgrade and a plain mismatch are all violations. The plugin reports expected against actual and stops there — it does not classify the cause or repair session state.

**The order the rows are read in**, since several can be true of one event: worktree dispatch, then unresolved child identity, then the `no-role` allow, then the topology rows — escape, the governed-name masquerade, the named-lens containment — then the dispatch model, then the resolver's own failures, then out-of-domain, then the contaminated environment, then the runtime model, then the exemption, then the effort rows. Identity precedes the `no-role` allow deliberately: a child whose role could not be read carries no role for the opposite reason a main thread does, and allowing it there is exactly the defect being closed.

## What it can and cannot prevent

- **Tool actions fail closed.** `PreToolUse` runs before the tool, so a denied call never executes.
- **`Stop` and `SubagentStop` observe; they do not enforce.** They are wired because a turn that calls no tool reaches no other effort-bearing event, and the trust claim needs such a turn to appear in the log at all. They cannot block: by the time either fires the inference is paid for and no tool call exists to refuse, and a `Stop`-triggered retry would re-run at the same wrong effort and loop. Their denial notice says so rather than claiming a block.

So the invariant is _no wrong-effort role takes an action_, plus _no wrong-effort turn goes unrecorded_. It is not _no wrong-effort inference happens_.

The topology assertion has no such gap. It is only ever reached at `PreToolUse`, because a spawn is a tool call and nothing else is; a denied dispatch means the substitute worker never existed.

## Modes

`HARNESS_EFFORT_GUARD_MODE=enforce` applies denials. Anything else — including unset — observes: the same verdict is computed and recorded, and nothing is blocked. A denial notice states which of the two happened on this event, because the same fault is blocked at an enforcing `PreToolUse` and merely recorded everywhere else.

The plugin reads the variable and takes no view on where it is set. A host repository that wants enforcement to be a property of its checkout rather than of an operator's shell sets it in the `env` block of the same `.claude/settings.json` that enables the plugin; that block reaches the hook and outranks the invoking shell.

## The log

`${CLAUDE_PLUGIN_DATA}/observations.jsonl`, one JSON object per line, in three kinds that are not interchangeable:

- `announcement` — from `SessionStart` or `SubagentStart`. These carry no effort, so the record has no `actual` and no `verdict` field at all rather than null ones. Nothing reading the log can count a normal session start as a failed check. A child's announcement carries `identity_source: deferred` and no `governed_role`, because at that moment there is none to state.
- `verdict` — from an effort-bearing event, adding `actual`, `decision` and `cause`, plus `dispatch_target` on a spawning call. That field is present or absent rather than nullable, on the same reasoning as `model`: a null would claim the call chose no role, where the truth is that it was not a call that chooses. It is what lets the log answer _which role did this dispatcher select_ — a denied dispatch leaves no `SubagentStart` to read it from.
- `unreadable` — the hook could not parse its own input, so it carries the error and nothing else, not even which event it was. It exists because the alternative is a gap, and a gap reads as a call that never happened rather than one that went unchecked.

`announcement` and `verdict` both carry `worktree`, which says whether the root the guard judged was a linked worktree.

**Runtime evidence and harness interpretation stay separately readable**, because the whole failure that motivated the identity repair was invisible for want of a second opinion beside the first. Every record carries both:

- `agent_type` — what the runtime called this actor, verbatim, never overwritten;
- `governed_role` — the role the harness holds it to, absent where none was established;
- `identity_source` — `agent-type` for a main-thread role, `agent-record` for a child resolved from the per-agent record, `deferred` where identity was not yet establishable. Without it the log cannot answer whether a given run was governed by the new path or the old one, which is the first question anyone asks after a runtime upgrade.

Verdicts add the model evidence on the same terms: `declared_model`, `runtime_model` where the record carries one, `model_check` (`match`, `mismatch`, `unverified`, `undeclared`), and on a spawning call `dispatch_target`, `dispatch_name` and `dispatch_model` — the requested address and the explicitly requested model, each present only where the call carried it.

The log is evidence and never mechanism. `observe()` may fail silently, and enforcement stands without it; nothing a verdict depends on is read back from it.

A record's `resolution` field carries `exempt` for a role outside the effort invariant, with `declared` null. Exempt roles appear in the log like any other governed role: the trust question — did this role act unchecked, or was it checked — is answered for them too.

Both kinds carry `model` whenever the event reports one, and omit the field when it does not. It is on the verdict kinds as well as the announcements deliberately: whether the runtime names the acting model _at the decision point_ is what decides whether the invariant could ever key on anything but a declaration, and a log recording the field on only some events answers that question with its own shape rather than the runtime's.

A run is trusted only when every governed role that acted appears with `declared == actual`, **and appears at all**: an absent role was not checked, which means unguarded rather than clean.

## Installation

The repository that owns this plugin declares it in a local marketplace (`.claude-plugin/marketplace.json`) and enables it from project settings (`.claude/settings.json`), so an ordinary session started at the checkout root loads it with no command-line flags, and nothing about the plugin depends on `--plugin-dir`.

The tests load nothing. They run `scripts/guard.ts` directly, feeding it hook payloads on stdin and reading back its stdout and its log, so no case here exercises a plugin load at all — that is established by live sessions and recorded in the host repository's own document.

## Requirements

Node with type stripping (24+); the scripts run as `.ts` with no build step. `tsconfig.json` is for typechecking and editors only.

**No unit test can detect the runtime changing the per-agent record's shape.** The suite pins what the guard believes about that layout, in `identity.test.ts`, so the belief is legible when the fail-closed denials start; it cannot pin the runtime. Detection is the denial plus the log, and the host repository's document carries the live verification that goes with it.

The tests take no dependency either — they are `node:test` files run on the same runtime, from this directory:

```sh
node --test 'tests/*.test.ts'
```

They resolve fixture definitions written into a throwaway project root rather than the repository's own roles, so a case stating what `model: haiku` resolves to keeps stating it after the tree's roles change.