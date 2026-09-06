# harness-effort-guard

Treats the `effort:` declared by an agent definition as a runtime invariant.

A role's frontmatter says what reasoning effort it must run at. Nothing enforces that: a main-thread `--agent` session can apply the role's `model:` and drop its `effort:`, and `/effort`, `/compact`, resume and a `CLAUDE_CODE_EFFORT_LEVEL` in the environment can each move effective effort away from the declaration. A run then looks like it happened as designed while some role reasoned cheaper than its definition requires, and nothing in the transcript says so.

This plugin compares the two on every tool call and fails closed when they disagree.

## What it governs

Markdown role definitions in `<project root>/.claude/agents/`, and nothing else — not user-scope agents, plugin agents, built-ins, or the precedence order between them. Modelling that order would mean keeping a second, silently drifting copy of the host's resolution rules. A name the plugin does not own is a name it does not judge, and is allowed through untouched.

The project root is the nearest ancestor of the starting directory holding a `.claude/agents/` directory. A tree that declares no roles has an empty domain, and an empty domain allows.

## Decision

Applied to `PreToolUse`, `Stop` and `SubagentStop` — the events that carry `effort` by contract:

| Role | Declared | Reported | Outcome |
| --- | --- | --- | --- |
| not acting, or out of domain | — | — | allow |
| governed | none | any | **deny** — the role declares no `effort:` |
| governed | `X` | none | **deny** |
| governed | `X` | `X` | allow |
| governed | `X` | `Y` | **deny** |

`CLAUDE_CODE_EFFORT_LEVEL` being set denies for any governed role: it is a process-wide hard override, so per-role effort cannot be honoured while it is present.

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

A run is trusted only when every governed role that acted appears with `declared == actual`, **and appears at all**: an absent role was not checked, which means unguarded rather than clean.

## Requirements

Node with type stripping (24+); the scripts run as `.ts` with no build step. `tsconfig.json` is for typechecking and editors only.