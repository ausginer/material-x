# Working in this repository

The durable instructions for anyone — human or agent — making changes here. Vendor harness files live beside this one and import it; they add nothing normative.

Resident in every agent's context, so it carries only what applies before a role knows what work it is doing. Everything else is named by the role that needs it, when it needs it.

## Before you change anything tracked

- **Tracked changes belong on a non-`main` branch.** Verify the branch first; if it is `main`, stop and ask. Do not create or switch branches implicitly unless asked.
- **Do not amend, squash, rebase, rewrite or delete an existing commit** unless asked.
- **Push the current work branch to `origin` once a unit of work is finalized** — after the last commit of the unit, not after each one. **Do not open or merge a PR, force-push, push `main`, or rename, delete or otherwise move any other shared ref** unless asked.
- **Never bypass branch protection, rulesets or repository policy.** If an operation is rejected, report the blocker rather than force-pushing or changing rules around it.

Read [`CONTRIBUTING.md`](CONTRIBUTING.md) before writing or changing source. Before finalizing a unit of work — formatting, linting, typechecking, committing or pushing — read [`.agents/docs/handoff.md`](.agents/docs/handoff.md).

## Before dispatching a governed worker

The effort guard loads from project settings, and **a fresh checkout's first
session runs before it is loadable**: registering the repository marketplace and
loading its plugin happen on successive starts. A worker dispatched in that
window is unchecked, and an unchecked session is indistinguishable from a clean
one, because nothing is watching.

A guarded session says so. `Effort guard active` arrives as startup context in
every session the guard is loaded into, `agent-router` included, and it says so
whether or not the role definitions resolved — the string answers _is the guard
loaded_, and a resolution failure is reported as a separate sentence beside it.

- **Seen it — dispatch normally.**
- **Not seen it — run `claude plugin marketplace add ./` and start a new
  session before spawning any worker.** A restart is required either way: a
  plugin does not become loaded in a session already running.

**This binds every governed worker**: `architect`, `implementer`, `consolidator`,
`reviewer`, `integrity`, `cleanup` and `der` — the set the guard governs, not a
subset of it. It does not bind `agent-router`'s own turns; the router carries a
role and is governed, but declares `model: haiku` and so bears no effort
obligation.

**Dispatch only from the main checkout.** A linked worktree carries its own
`.claude/` at its own commit, so it can govern part of the role set and allow
the rest, or govern all of it at a superseded generation. Where the guard is
loaded there it refuses dispatch outright; where it is not loaded there is no
gate string to see, and this rule is the whole of the protection. A
worktree-rooted session may still run as a single worker — that is what worktree
isolation is for — but it is not the router and dispatches nothing.

[`agent-workflow.md`](.agents/docs/agent-workflow.md) §Dispatch is the model;
[`harness-effort-guard.md`](.agents/docs/harness-effort-guard.md) §How it loads
is the mechanism.

## Evidence

Verify cheap mechanical claims yourself, in the agent that cites them. **Delegate discovery, never verification** — a sub-agent returns candidates; the citing agent confirms the ones it reports. Delegate only when the search justifies a separate context.

Probes, diagnostics, fixtures and benchmarks are fine for any role that needs one to establish a fact. TypeScript runs directly — `node my-file.ts` — with no build or loader step.

## Where things are

- [`CONTRIBUTING.md`](CONTRIBUTING.md) — how code is written: source conventions, and the size and ownership policy. This is a library, not an application: write for a truthful fellow developer who would prefer better performance, a cleaner API and a smaller bundle over defensive checks against invalid usage.
- [`.agents/docs/`](.agents/docs/) — conventions and design references: `@ydinjs` architecture, CSS inheritance, attribute-vs-state styling, accessibility, the test layers, the trait flattener plugin, where documentation belongs, and how a review round is run.
- `.claude/skills/` — task-scoped procedures for `@ydinjs/material-x` component tests, `@ydinjs/tproc` visual contracts, and anything under `.data/tokens`. They apply even when a request does not name them.
- `packages/*/.plan/` — the record: decisions, reviews, measurements, and why anything is the way it is.
