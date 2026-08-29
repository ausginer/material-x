# Working in this repository

The durable instructions for anyone — human or agent — making changes here. Vendor-specific harness instructions live beside this file and import it; they add nothing normative of their own.

The rules that apply while writing code — source conventions, and the size and ownership policy — are resident:

@CONTRIBUTING.md

## How the documentation is organised

Read [`.agents/docs/documentation.md`](.agents/docs/documentation.md) before writing or restructuring documentation. It decides where a given piece of writing belongs, how JSDoc and ordinary source comments are written, and why nothing outside `packages/*/.plan/` carries history.

The short form:

| Path | What it is |
| --- | --- |
| `AGENTS.md` | This file — how to work here |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | How code is written: source conventions, and the size and ownership policy. Apply it to everything you write |
| [`.agents/docs/`](.agents/docs/) | Conventions and design references |
| `.claude/skills/` | Task-scoped procedures |
| `packages/*/.plan/` | The record: decisions, reviews, measurements, and why anything is the way it is |

Design references worth knowing exist: [`architecture.md`](.agents/docs/architecture.md) for `@ydinjs` architecture, [`css-inheritance.md`](.agents/docs/css-inheritance.md) for the CSS architecture, [`accessibility.md`](.agents/docs/accessibility.md) for the accessibility review, [`test-architecture.md`](.agents/docs/test-architecture.md) for the reasoning behind the test layers.

## Size and ownership

Apply [`CONTRIBUTING.md`](CONTRIBUTING.md) Part II to the code you write. This is a library, not a user-facing application: write for a truthful fellow developer who would prefer better performance, a cleaner API and a smaller bundle over defensive checks against invalid usage.

## Running things

TypeScript runs directly — `node my-file.ts` — with no build or loader step.

The `fmt`, `lint-fix`, `typecheck` and other recipes live in each package's own `Justfile`, so run them from the relevant package directory (`packages/core`, `packages/tproc`, `packages/material-x`, or another workspace). Paths passed to them are relative to that package.

Every edited `.ts`, `.tsx`, `.css` or `.html` file, and every created or updated Markdown file:

- format with `npx just fmt <changed files>`;
- lint and autofix with `npx just lint-fix <changed files>`. If autofix fails for a file, list it — do not resolve lint errors by hand; report them and continue;
- typecheck with `npx just typecheck`. This checks all packages. Ignore errors in files you did not touch, unless your change caused them.

Two things that catch people out:

- **Install dependencies with `npm i <name>` rather than editing `package.json`**, so the latest compatible version is resolved.
- **Rebuild `@ydinjs/core` (`npx just build` from `packages/core`) before typechecking `@ydinjs/material-x`** when you have changed a core source file it consumes. Material X resolves `@ydinjs/core` through its built `.d.ts` at the package root rather than through `src`, so type changes are invisible until core is rebuilt.

To see what a `.css.ts` file compiles to, run `npx just debug <path relative to the package>`; the CSS is printed to stdout.

`@ydinjs/material-x` runtime entrypoints are listed in `packages/material-x/files.json`. Update it when adding or removing a component. `src/button` is the closest thing to the intended component layout; follow it when migrating others.

## Task-scoped procedures

- **`@ydinjs/material-x` component tests** — adding, moving or reviewing them: [`.claude/skills/test-component/SKILL.md`](.claude/skills/test-component/SKILL.md).
- **`@ydinjs/tproc` visual contracts** — a `*.spec.browser.test.ts`, a token binding, the resolve-token bridge, a normalization adapter: [`.claude/skills/test-visual-contract/SKILL.md`](.claude/skills/test-visual-contract/SKILL.md).
- **Anything under `.data/tokens`**: [`.claude/skills/use-tokens-db/SKILL.md`](.claude/skills/use-tokens-db/SKILL.md).

These apply even when a request does not name them.

## Git workflow

Never make tracked changes or commits directly on `main`. All tracked changes belong on a non-`main` work branch.

Before making tracked changes, verify that the current branch is not `main`. If it is, stop and ask for a work branch. Do not create or switch branches implicitly unless asked.

**Commit every finalized handoff state without waiting to be asked.** A state is finalized when your unit of work is complete and ready to hand to the next role or to the user:

- an architect commits the completed contract or plan before handing it to an implementer;
- an implementer commits the completed implementation before review;
- a reviewer commits the completed review artifact before handing findings back;
- remediation is committed once that remediation pass is complete.

- Commit only changes belonging to the completed unit. Never sweep unrelated work into the commit; stage paths deliberately when the working tree holds anything else.
- If there is no tracked diff, do not create an empty commit.
- Use a **short, subject-only** commit message unless a body is explicitly requested. Never copy completion reports, test output, review summaries or plan prose into it.
- Describe the substance of the completed unit, not its workflow position: prefer `host: add explicit capability grants and diagnostics` over `host: phase 2`, `address review` or `finalize implementation`. For a review or planning artifact, name what the artifact establishes or evaluates rather than the checkpoint it belongs to.
- Do not amend, squash, rebase, rewrite or delete existing commits unless asked.
- Do not push, create or merge a PR, rename or delete shared branches, or otherwise move shared refs unless asked. A local commit is automatic; publication is not.
- Never bypass branch protection, rulesets or other repository policy. If a Git operation is rejected by GitHub or by policy, stop and report the blocker rather than disabling protection, force-pushing, changing rules, or working around it.