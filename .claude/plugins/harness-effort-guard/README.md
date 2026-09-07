# harness-effort-guard

Treats the `effort:` declared by an agent definition as a runtime invariant, and the
dispatch topology of the governed dispatchers as a second one.

A role's frontmatter says what reasoning effort it must run at. Nothing enforces that: a main-thread `--agent` session can apply the role's `model:` and drop its `effort:`, and `/effort`, `/compact`, resume and a `CLAUDE_CODE_EFFORT_LEVEL` in the environment can each move effective effort away from the declaration. A run then looks like it happened as designed while some role reasoned cheaper than its definition requires, and nothing in the transcript says so.

This plugin compares the two on every tool call and fails closed when they disagree.

## What it governs

Markdown role definitions in `<project root>/.claude/agents/`, and nothing else — not user-scope agents, plugin agents, built-ins, or the precedence order between them. Modelling that order would mean keeping a second, silently drifting copy of the host's resolution rules. A name the plugin does not own is a name it does not judge, and is allowed through untouched.

Governing a name is not the same as holding it to an effort. A definition that declares `model: haiku` stays in the domain — the plugin owns the name, resolves it, and logs it — but is outside the effort invariant, because the model it names does not participate in the effort mechanism at all. Requiring a declaration there would demand a contract the runtime cannot satisfy.

The test is the literal `model:` field of the definition, matched exactly against `haiku`. Not a prefix, not an alias, not a family, and not a capability lookup: the guard would have to infer which models carry effort, and it has no reliable source for that. A model that later gains or loses effort support changes one word in one file.

The project root is the nearest ancestor of the starting directory holding a `.claude/agents/` directory. A tree that declares no roles has an empty domain, and an empty domain allows.

## Decision

Applied to `PreToolUse`, `Stop` and `SubagentStop` — the events that carry `effort` by contract:

| Role                         | Declared | Reported | Outcome                                     |
| ---------------------------- | -------- | -------- | ------------------------------------------- |
| not acting, or out of domain | —        | —        | allow                                       |
| governed, `model: haiku`     | none     | any      | allow — outside the effort invariant        |
| governed, `model: haiku`     | `X`      | any      | **deny** — the declaration is unsatisfiable |
| governed                     | none     | any      | **deny** — the role declares no `effort:`   |
| governed                     | `X`      | none     | **deny**                                    |
| governed                     | `X`      | `X`      | allow                                       |
| governed                     | `X`      | `Y`      | **deny**                                    |

The exempt rows are read before every row that concerns effort, so a `model: haiku` role reaches none of them: absent reported effort is the expected observation for it, not a violation. The environment check below is the one thing read ahead of them.

A `model: haiku` definition that also declares `effort:` is the one way such a role denies. That file promises a level the runtime will never report, and the guard treats it as a defect in the one namespace it owns — the same standing as two definitions claiming a single name. Choosing silently between the two fields would either enforce a number that cannot be reached or discard a declaration the author wrote on purpose.

`CLAUDE_CODE_EFFORT_LEVEL` being set denies for **every** governed role, exempt ones included, and that check is made before the exemption. It is a process-wide hard override: no per-role effort can be honoured anywhere in the session while it is present, so the condition is a property of the session rather than of the role that happens to be acting. The remedy is to remove the variable and start again; the guard offers no other, and does not fall back to observing.

Denying the exempt main-session role is the point rather than a side effect. That role's surface is dispatch, so a denial there stops every worker from coming into existence — which is as close to refusing the session as a hook can get, startup itself being unrefusable.

**Dispatch from a linked worktree is refused, whoever asks.** A tool call that would bring another worker into being — `Agent`, `Task`, `SendMessage` — denies when the project root holds `.git` as a regular file rather than a directory. A worktree carries its own `.claude/` at its own commit, so it can govern part of the role set and silently allow the rest, or govern all of it at a superseded generation and enforce the wrong contract while looking guarded. No per-worktree configuration fixes the second shape, because the defect is the commit rather than the settings. This row is read before any question about the role, and it refuses the act rather than the caller: a worktree session that dispatches nothing is untouched, which is what lets an isolated single worker run there.

Where the guard is not loaded in the worktree at all, it cannot refuse anything; that case is covered by the startup gate the host repository documents, not by this plugin.

## Governed dispatch topology

A second assertion, sharing the decision path and nothing else. It answers a failure the effort table cannot see: a governed dispatcher spawning an **out-of-domain** worker where the topology requires a governed one. The child resolves `out-of-domain`, which is an allow — so the substitution is invisible to the invariant precisely because it left the domain the invariant governs. Observed: a router asked for `architect` spawned `general-purpose`, and every record in the run says `allow`.

Two dispatchers are constrained, and nothing else is:

| Dispatcher     | May spawn                                                                             |
| -------------- | ------------------------------------------------------------------------------------- |
| `agent-router` | `architect`, `implementer`, `consolidator`, `reviewer`, `integrity`, `cleanup`, `der` |
| `consolidator` | `reviewer`, `integrity`, `cleanup`, `der`                                             |

**A dispatcher the table does not name is unconstrained.** An architect delegating a search to a general-purpose agent, or an implementer spawning `Explore`, is legitimate and stays legitimate. The assertion is narrow by construction: out-of-domain agents are not an error anywhere else, and making them one would refuse work the topology never had an opinion about.

The subject is the `subagent_type` of a **spawning** call — `Agent` or `Task`. `SendMessage` is dispatch for the worktree row and selects no role here: it reaches a worker whose type was fixed when it was spawned. An `Agent` call omitting `subagent_type` is read as selecting `general-purpose`, because that is what the tool does with it; reading absence as _no role chosen_ would leave the plainest escape open.

`name` is checked against `subagent_type`, and only where the name claims a governed role. The two fields are independent — one addresses a worker for a later resume, the other decides what it is — so `name: architect` alongside `subagent_type: general-purpose` is a coherent call that produces a general-purpose worker answering to the word `architect`. A descriptive name is the caller's business and is not judged.

| Dispatcher   | `subagent_type` | `name`      | Outcome                                 |
| ------------ | --------------- | ----------- | --------------------------------------- |
| not in table | anything        | anything    | allow                                   |
| in table     | permitted       | absent      | allow                                   |
| in table     | permitted       | descriptive | allow                                   |
| in table     | permitted       | that role   | allow                                   |
| in table     | not permitted   | anything    | **deny** — `topology-escape`            |
| in table     | absent          | anything    | **deny** — `topology-escape`, defaulted |
| in table     | permitted       | other role  | **deny** — `topology-identity`          |

The rows are read **before** everything about effort, including the resolver's own failures, because the escape is what those rows cannot see. They are read **after** the worktree refusal, which is about the checkout rather than the call.

The topology is written in [`verdict.ts`](scripts/verdict.ts) rather than derived: no role definition states who may spawn whom. It duplicates a rule that also appears in `agent-router.md` and `consolidator.md`, deliberately — a prompt is advice to a model, and this is a refusal. `installation.test.ts` holds every role the table names to a definition in the checkout, so a renamed role fails a test rather than denying every dispatch at runtime.

Missing reported effort, a model-capped downgrade and a plain mismatch are all violations. The plugin reports expected against actual and stops there — it does not classify the cause or repair session state.

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

- `announcement` — from `SessionStart` or `SubagentStart`. These carry no effort, so the record has no `actual` and no `verdict` field at all rather than null ones. Nothing reading the log can count a normal session start as a failed check.
- `verdict` — from an effort-bearing event, adding `actual`, `decision` and `cause`, plus `dispatch_target` on a spawning call. That field is present or absent rather than nullable, on the same reasoning as `model`: a null would claim the call chose no role, where the truth is that it was not a call that chooses. It is what lets the log answer _which role did this dispatcher select_ — a denied dispatch leaves no `SubagentStart` to read it from.
- `unreadable` — the hook could not parse its own input, so it carries the error and nothing else, not even which event it was. It exists because the alternative is a gap, and a gap reads as a call that never happened rather than one that went unchecked.

`announcement` and `verdict` both carry `worktree`, which says whether the root the guard judged was a linked worktree.

A record's `resolution` field carries `exempt` for a role outside the effort invariant, with `declared` null. Exempt roles appear in the log like any other governed role: the trust question — did this role act unchecked, or was it checked — is answered for them too.

Both kinds carry `model` whenever the event reports one, and omit the field when it does not. It is on the verdict kinds as well as the announcements deliberately: whether the runtime names the acting model _at the decision point_ is what decides whether the invariant could ever key on anything but a declaration, and a log recording the field on only some events answers that question with its own shape rather than the runtime's.

A run is trusted only when every governed role that acted appears with `declared == actual`, **and appears at all**: an absent role was not checked, which means unguarded rather than clean.

## Installation

The repository that owns this plugin declares it in a local marketplace
(`.claude-plugin/marketplace.json`) and enables it from project settings
(`.claude/settings.json`), so an ordinary session started at the checkout root
loads it with no command-line flags, and nothing about the plugin depends on
`--plugin-dir`.

The tests load nothing. They run `scripts/guard.ts` directly, feeding it hook
payloads on stdin and reading back its stdout and its log, so no case here
exercises a plugin load at all — that is established by live sessions and
recorded in the host repository's own document.

## Requirements

Node with type stripping (24+); the scripts run as `.ts` with no build step. `tsconfig.json` is for typechecking and editors only.

The tests take no dependency either — they are `node:test` files run on the same runtime, from this directory:

```sh
node --test 'tests/*.test.ts'
```

They resolve fixture definitions written into a throwaway project root rather than the repository's own roles, so a case stating what `model: haiku` resolves to keeps stating it after the tree's roles change.
