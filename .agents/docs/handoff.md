# Finishing a unit of work

> Retrieved when finalizing a unit of work — before formatting, linting, typechecking or committing.

## Verify what you changed

The `fmt`, `lint-fix`, `typecheck` and other recipes live in each package's own `Justfile`, so run them from the relevant package directory (`packages/core`, `packages/tproc`, `packages/material-x`, or another workspace). Paths passed to them are relative to that package.

Every edited `.ts`, `.tsx`, `.css` or `.html` file, and every created or updated Markdown file:

- format with `npx just fmt <changed files>`;
- lint and autofix with `npx just lint-fix <changed files>`. If autofix fails for a file, list it — do not resolve lint errors by hand; report them and continue;
- typecheck with `npx just typecheck`. This checks all packages. Ignore errors in files you did not touch, unless your change caused them.

Two things that catch people out:

- **Rebuild `@ydinjs/core` (`npx just build` from `packages/core`) before typechecking `@ydinjs/material-x`** when you have changed a core source file it consumes. Material X resolves `@ydinjs/core` through its built `.d.ts` at the package root rather than through `src`, so type changes are invisible until core is rebuilt.
- The **root** `Justfile`'s `fmt` and `lint-fix` take no file arguments — they run every package. Root-level Markdown is not in any package, so format it with `npx prettier --write <files>`.

## Commit the finalized state

**Commit every finalized handoff state without waiting to be asked.** A state is finalized when your unit of work is complete and ready to hand to the next role or to the user:

- an architect commits the completed contract or plan before handing it to an implementer;
- an implementer commits the completed implementation before review;
- a reviewer commits the completed review artifact before handing findings back;
- remediation is committed once that remediation pass is complete.

- Commit only changes belonging to the completed unit. Never sweep unrelated work into the commit; stage paths deliberately when the working tree holds anything else.
- If there is no tracked diff, do not create an empty commit.
- Use a **short, subject-only** commit message unless a body is explicitly requested. Never copy completion reports, test output, review summaries or plan prose into it.
- Describe the substance of the completed unit, not its workflow position: prefer `host: add explicit capability grants and diagnostics` over `host: phase 2`, `address review` or `finalize implementation`. For a review or planning artifact, name what the artifact establishes or evaluates rather than the checkpoint it belongs to.

## Publish the branch

**A finalized handoff is pushed, not only committed.** Once the unit's last commit is in, `git push` the current work branch to `origin`. Where the unit took several commits, push once after all of them rather than after each — the next role needs the finished state, not the intermediate ones.

Push the work branch and nothing else. Opening or merging a PR, force-pushing, pushing `main`, and moving any other shared ref all still require being asked, as do rewriting history and working around branch protection; those restrictions are resident in `AGENTS.md` and apply from the start of a session, not only here.

If the push is rejected — protected branch, non-fast-forward, missing upstream — report the blocker. Do not force, and do not reshape history to make it land.