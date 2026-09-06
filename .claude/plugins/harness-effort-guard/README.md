# harness-effort-guard

Treats the `effort:` declared by an agent definition as a runtime invariant.

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

The exempt rows are read first, so a `model: haiku` role reaches no other row. Nothing about the turn can move it: absent reported effort is the expected observation for it, not a violation.

A `model: haiku` definition that also declares `effort:` is the one way such a role denies. That file promises a level the runtime will never report, and the guard treats it as a defect in the one namespace it owns — the same standing as two definitions claiming a single name. Choosing silently between the two fields would either enforce a number that cannot be reached or discard a declaration the author wrote on purpose.

`CLAUDE_CODE_EFFORT_LEVEL` being set denies for any governed role bearing the invariant: it is a process-wide hard override, so per-role effort cannot be honoured while it is present. An exempt role still allows and is still recorded with `poisoned: true` — it has no declared level to dishonour, and blocking it would report a session-wide fault at the one role that cannot cause or fix it. The launcher refuses such a session outright, and every role bearing the invariant denies within it.

Missing reported effort, a model-capped downgrade and a plain mismatch are all violations. The plugin reports expected against actual and stops there — it does not classify the cause or repair session state.

## What it can and cannot prevent

- **Tool actions fail closed.** `PreToolUse` runs before the tool, so a denied call never executes.
- **A text-only turn can only be invalidated afterwards.** A turn that calls no tool reaches no enforcement point; by the time `Stop` observes the effort the inference is already paid for. Those events report and never block — a `Stop`-triggered retry would re-run at the same wrong effort and loop.

So the invariant is _no wrong-effort role takes an action_, plus _no wrong-effort turn goes unrecorded_. It is not _no wrong-effort inference happens_.

## Modes

`HARNESS_EFFORT_GUARD_MODE=enforce` applies denials. Anything else — including unset — observes: the same verdict is computed and recorded, and nothing is blocked.

## The log

`${CLAUDE_PLUGIN_DATA}/observations.jsonl`, one JSON object per line, in two kinds that are not interchangeable:

- `announcement` — from `SessionStart` or `SubagentStart`. These carry no effort, so the record has no `actual` and no `verdict` field at all rather than null ones. Nothing reading the log can count a normal session start as a failed check.
- `verdict` — from an effort-bearing event, adding `actual`, `decision` and `cause`.

A record's `resolution` field carries `exempt` for a role outside the effort invariant, with `declared` null. Exempt roles appear in the log like any other governed role: the trust question — did this role act unchecked, or was it checked — is answered for them too.

A run is trusted only when every governed role that acted appears with `declared == actual`, **and appears at all**: an absent role was not checked, which means unguarded rather than clean.

## Requirements

Node with type stripping (24+); the scripts run as `.ts` with no build step. `tsconfig.json` is for typechecking and editors only.
