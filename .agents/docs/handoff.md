# Finishing a unit of work

> Retrieved when finalizing a unit of work — before formatting, linting, typechecking or committing.

## Verify what you changed

The `fmt`, `lint-fix`, `typecheck` and other recipes live in each package's own `Justfile`, so run them from the relevant package directory (`packages/core`, `packages/tproc`, `packages/material-x`, or another workspace). Paths passed to them are relative to that package.

For repository-level Markdown, use the root-file commands below. Package recipes own package files; root recipes take no file arguments and run across the workspace.

Every edited `.ts`, `.tsx`, `.css` or `.html` file, and every created or updated Markdown file, in this order:

1. format with `npx just fmt <changed files>`;
2. lint and autofix with `npx just lint-fix <changed files>`;
3. format again with `npx just fmt <changed files>`;
4. confirm with `npx just lint <changed files>`. If an error survives, list it — do not resolve lint errors by hand; report them and continue;
5. typecheck with `npx just typecheck` in the affected package. The root recipe checks all packages and builds their prerequisites. Ignore errors in files you did not touch, unless your change caused them.

**`fmt` runs on both sides of `lint-fix`, because an autofix is a writer too and its output need not be formatted.** The first pass hands `lint-fix` a formatted file, so an autofix works on the same text the formatter would commit. The second pass formats whatever the autofix wrote: oxlint's `func-names` autofix turns an anonymous `function (` into `function  name(` with a double space, and without a later `fmt` that double space reaches the commit. Because `fmt` writes last, the file's final formatting is whatever `fmt` produced. Step 4 re-reads that file, so a lint result is never taken from a state that was later rewritten.

**One tool decides formatting, and a lint rule may not re-decide it.** `just fmt` is the authority; a lint rule that reports formatting is a second formatter, and where two formatters disagree there is no state this sequence can reach. A formatting diagnostic surviving at step 4 on a file `fmt` calls correct is therefore a defect in the gate rather than in the file — report it as one, and do not hand-edit the file to satisfy the linter against the formatter.

Two things that catch people out:

- **Rebuild `@ydinjs/core` (`npx just build` from `packages/core`) before typechecking `@ydinjs/material-x`** when you have changed a core source file it consumes. Material X resolves `@ydinjs/core` through its built `.d.ts` at the package root rather than through `src`, so type changes are invisible until core is rebuilt.
- The **root** `Justfile`'s `fmt`, `fmt-check`, `lint` and `lint-fix` take no file arguments. They run every package and then the repository-level files no package owns — everything outside `packages/`. `oxfmt` writes all of them, Markdown included, so every file in the tree has exactly one formatter and none is offered to two. To format one root-level file on its own, that writer is `npx oxfmt <files>`.

For a bounded set of repository-level Markdown files, the corresponding loop is:

```sh
npx oxfmt <changed-files>
npx oxlint --fix <changed-files>
npx eslint --flag unstable_native_nodejs_ts_config -c eslint.config.ts --fix <changed-files>
npx oxfmt <changed-files>
npx oxlint <changed-files>
npx eslint --flag unstable_native_nodejs_ts_config -c eslint.config.ts <changed-files>
```

Linters may report Markdown as unsupported or ignored; record that rather than claiming a code-lint pass. A unit changing only Markdown owes formatting and link checks, plus `git diff --check`; it does not require TypeScript builds or tests. Source and tooling changes still owe their applicable typechecks and tests. Use the component and visual-contract skills when the changed tests require them. Record a check failure and its scope; do not turn incomplete verification into acceptance.

## Record the handoff

Put substantive results in the owning package's `packages/<package>/.plan/` record or the repository's `.plan/` record, following [documentation.md](documentation.md). Update an existing record when it already carries the task. A documentation unit may carry its result in the updated documents; it does not need a second handoff artifact.

Identify the input or reviewed revision, scope, verification and limits, unresolved items, and one bounded next task or the stopping boundary. Use the existing scoped record vocabulary from [review-findings.md](review-findings.md); do not add another identifier register. Reviews preserve the commit actually read and their independent scope.

The closing message normally gives status, resulting commit or reviewed revision, record path, and next action or blocker in three to five short lines. The owner relays it to the local coordinator, which checks the records before preparing the next task. See [agent-workflow.md](agent-workflow.md#records-and-concise-returns).

Before returning, save cited evidence and stop the unit's background processes. Remove only scratch worktrees and build directories the unit created once they are no longer needed. Preserve unrelated edits, other sessions' work and shared caches; state the owner and purpose of retained scratch work.

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