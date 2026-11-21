# Working in this repository

The durable instructions for anyone — human or agent — making changes here. Vendor harness files live beside this one and import it; they add nothing normative.

Resident in every agent's context, so it carries only what applies before a role knows what work it is doing. Everything else is named by the role that needs it, when it needs it.

## Before you change anything tracked

- **Tracked changes belong on a non-`main` branch.** Verify the branch first; if it is `main`, stop and ask. Do not create or switch branches implicitly unless asked.
- **Do not amend, squash, rebase, rewrite or delete an existing commit** unless asked.
- **Push the current work branch to `origin` once a unit of work is finalized** — after the last commit of the unit, not after each one. **Do not force-push, push `main`, or rename, delete or otherwise move any other shared ref** unless asked.
- **An agent may open the branch's pull request without being asked,** once a unit is finalized and pushed and the branch has no open pull request. A plan alone doesn't finalize a unit that implements it: the plan and its implementation share one branch and one pull request, and a change to project documentation has its own ([one pull request per unit](.agents/docs/agent-workflow.md#one-branch-and-one-pull-request-per-unit)). **The owner merges pull requests:** leave it open for the owner, and do not merge it or enable auto-merge.
- **Commit messages, pull request descriptions and everything written to GitHub carry no session link** — no `Claude-Session:` trailer and no `claude.ai/code/session_…` URL. A `Co-Authored-By:` trailer is fine. **No bare `@name` either,** unless it is meant to notify that account: GitHub notifies the owner of every `@name` in a pull request, issue or comment, so a role, a placeholder or code goes in backticks. Everything written to GitHub, issues and comments included, is in English. Before reading an issue's text or writing to the work queue, read [`.agents/docs/work-queue.md`](.agents/docs/work-queue.md).
- **Never bypass branch protection, rulesets or repository policy.** If an operation is rejected, report the blocker rather than force-pushing or changing rules around it.

Read [`CONTRIBUTING.md`](CONTRIBUTING.md) before writing or changing source. Before finalizing a unit of work — formatting, linting, typechecking, committing or pushing — read [`.agents/docs/handoff.md`](.agents/docs/handoff.md).

Before choosing identifiers or writing English comments, documentation, instructions or reports, read [technical English and self-documenting code](.agents/docs/technical-english.md).

## Evidence

Verify cheap mechanical claims yourself, in the agent that cites them. **Delegate discovery, never verification** — a sub-agent returns candidates; the citing agent confirms the ones it reports. Delegate only when the search justifies a separate context.

Probes, diagnostics, fixtures and benchmarks are fine for any role that needs one to establish a fact. TypeScript runs directly — `node my-file.ts` — with no build or loader step.

Dependencies are installed and binaries run with aube (`aube install`, `aube add`, `aube exec`), never with npm, `npx`, `aubx` or `aube dlx`.

**In a destructive shell command, expand every variable in a path with `${VAR:?}`**: `rm -rf "${S:?}/probe"`, not `rm -rf $S/probe`. An unset or empty variable then stops the command instead of turning the path into `/probe`. Check each variable where the path is assembled, not only the result. `d=$B/$1` followed by `rm -rf "${d:?}"` guards nothing: with `B` and `$1` empty, `d` is `/`. Write `d="${B:?}/${1:?}"`.

**If SSH to github.com fails host key verification,** as after a container rebuild, restore `~/.ssh/known_hosts` from GitHub's authenticated API: `gh api meta --jq '.ssh_keys[] | "github.com " + .' >> ~/.ssh/known_hosts`. Never accept a host key through `ssh-keyscan`, `StrictHostKeyChecking=no` or `accept-new`.

## Where things are

- For local coordination, start with [`.agents/docs/coordinator.md`](.agents/docs/coordinator.md) and [`.agents/docs/coordinator-setup.md`](.agents/docs/coordinator-setup.md). The owner relays prompts between Codex and standalone Claude role sessions, or a Claude `coordinator` session sends them directly; role definitions still govern those sessions.
- **A role session starts with `cl <profile> [<slot>]`** ([`.scripts/cl.sh`](.scripts/cl.sh)), which selects the role and the effort its definition declares. `--agent` alone applies the definition's model and not its `effort:`.
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — how code is written: source conventions, and the size and ownership policy. This is a library, not an application: write for a truthful fellow developer who would prefer better performance, a cleaner API and a smaller bundle over defensive checks against invalid usage.
- [`.agents/docs/`](.agents/docs/) — conventions and design references: `@ydinjs` architecture, CSS inheritance, attribute-vs-state styling, accessibility, the test layers, the trait flattener plugin, where documentation belongs, and how a review round is run.
- [`.agents/docs/releasing.md`](.agents/docs/releasing.md) — how an `@ydinjs` package is released: the owner's steps, what the release workflow checks, check runs, and the first publish.
- `.claude/skills/` — task-scoped procedures for `@ydinjs/material-x` component tests, `@ydinjs/tproc` visual contracts, and anything under `packages/tproc/tokens`. They apply even when a request does not name them.
- `packages/*/.plan/` — the record: decisions, reviews, measurements, and why anything is the way it is.