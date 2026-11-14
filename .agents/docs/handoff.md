# Finishing a unit of work

> Retrieved when finalizing a unit of work — before formatting, linting, typechecking or committing.

## Verify what you changed

The `fmt`, `lint-fix`, `typecheck` and other recipes live in each package's own `Justfile`, so run them from the relevant package directory (`packages/core`, `packages/tproc`, `packages/material-x`, or another workspace). Paths passed to them are relative to that package.

Every edited `.ts`, `.tsx`, `.css` or `.html` file, in this order:

1. format with `npx just fmt <changed files>`;
2. lint and autofix with `npx just lint-fix <changed files>`;
3. format again with `npx just fmt <changed files>`;
4. confirm with `npx just lint <changed files>`. If an error survives, list it — do not resolve lint errors by hand; report them and continue;
5. typecheck with `npx just typecheck` in the affected package. The root recipe checks all packages and builds their prerequisites. Ignore errors in files you did not touch, unless your change caused them.

**`fmt` runs on both sides of `lint-fix` because an autofix can write unformatted text**: oxlint's `func-names` autofix turns an anonymous `function (` into `function  name(` with a double space. Step 4 reads the file after `fmt` has written last, so a lint result never comes from a state that was later rewritten.

**One tool decides formatting, and a lint rule may not re-decide it.** `just fmt` is the authority; a lint rule that reports formatting is a second formatter. A formatting diagnostic that survives step 4 on a file `fmt` calls correct is a defect in the gate rather than in the file. Report it as one, and do not hand-edit the file to satisfy the linter against the formatter.

Two things that catch people out:

- **Rebuild `@ydinjs/core` (`npx just build` from `packages/core`) before typechecking `@ydinjs/material-x`** when you have changed a core source file it consumes. Material X resolves `@ydinjs/core` through its built `.d.ts` at the package root rather than through `src`, so type changes are invisible until core is rebuilt.
- The **root** `Justfile`'s `fmt`, `fmt-check`, `lint` and `lint-fix` take no file arguments. They run every package and then the repository-level files no package owns — everything outside `packages/`. `oxfmt` writes all of them, Markdown included, so every file in the tree has exactly one formatter and none is offered to two.

For a bounded set of repository-level code files, which the root recipes cannot target, the same order uses the tools directly:

```sh
npx oxfmt <changed-files>
npx oxlint --fix <changed-files>
npx eslint --flag unstable_native_nodejs_ts_config -c eslint.config.ts --fix <changed-files>
npx oxfmt <changed-files>
npx oxlint <changed-files>
npx eslint --flag unstable_native_nodejs_ts_config -c eslint.config.ts <changed-files>
```

Source and tooling changes owe their applicable typechecks and tests. Use the component and visual-contract skills when the changed tests require them. Record a check failure and its scope; do not turn incomplete verification into acceptance.

### Markdown

Every created or updated Markdown file owes these checks. A unit changing only Markdown does not also require TypeScript builds or tests.

1. Format with `npx just fmt <changed files>` from the owning package, or `npx oxfmt <changed files>` for a repository-level file.
2. Validate changed links and anchors. [`references.node.test.ts`](../../packages/drag2/tests/references.node.test.ts) covers citations in drag2's normative tree. No repository instrument covers other Markdown, so check those links manually or with a scratch script, and report the check as that.
3. Run `git diff --check`.

Lint a Markdown file only when a linter is configured for it, and keep it out of the file list otherwise. At present none is: `oxlint` finds no Markdown files, which makes `just lint` exit non-zero, and ESLint ignores them. Record that lint did not apply rather than claiming a code-lint pass.

## Record the handoff

Put substantive results in the owning package's `packages/<package>/.plan/` record or the repository's `.plan/` record, following [documentation.md](documentation.md). Update an existing record when it already carries the task. A documentation unit may carry its result in the updated documents; it does not need a second handoff artifact.

A finalized handoff identifies:

- the input or reviewed revision and governing records;
- the outcome and scope, with paths to the substantive result;
- verification, discriminating witnesses or mutations when owed, and limits;
- unresolved findings, obligations and pending acceptance;
- one bounded next task and its recipient, or the stopping boundary.

Use the existing scoped record vocabulary from [review-findings.md](review-findings.md); do not add another identifier register. Reviews preserve the commit actually read and their independent scope.

The closing message is normally three to five short lines: status, resulting commit or reviewed revision, record path, and next action or blocker. State missing verification plainly. The owner relays the message as [coordinator-setup.md](coordinator-setup.md#manual-relay) describes.

Before returning, save cited evidence in the owning record and stop the unit's background processes. The agent that created a scratch probe, worktree or build directory removes it after that, once it is no longer needed, and removes nothing it did not create. Preserve unrelated edits, other sessions' work and shared caches; state the owner and purpose of retained scratch work.

For a runnable prototype in an assigned isolated worktree, follow [Architecture prototypes](agent-workflow.md#architecture-prototypes): deliver the code committed at its normal source paths in that worktree, not only as patches or retained scratch files.

## Commit the finalized state

**Commit every finalized handoff state without waiting to be asked.** A state is finalized when your unit of work is complete and ready to hand to the next role or to the user. Each role commits its result before handing it on: an architect's contract or plan, an implementer's implementation, a reviewer's review artifact, or a completed remediation pass.

- Commit only changes belonging to the completed unit. Never sweep unrelated work into the commit; stage paths deliberately when the working tree holds anything else.
- If there is no tracked diff, do not create an empty commit.
- Use a **short, subject-only** commit message unless a body is explicitly requested. Never copy completion reports, test output, review summaries or plan prose into it.
- Describe the substance of the completed unit, not its workflow position: prefer `host: add explicit capability grants and diagnostics` over `host: phase 2`, `address review` or `finalize implementation`. For a review or planning artifact, name what the artifact establishes or evaluates rather than the checkpoint it belongs to.

## Publish the branch

**A finalized handoff is pushed, not only committed.** Once the unit's last commit is in, `git push` the current work branch to `origin`, and push nothing else; the next role needs the finished state, not the intermediate ones.

[`AGENTS.md`](../../AGENTS.md#before-you-change-anything-tracked) owns the restrictions on other refs, history rewrites and branch protection, and what to do when an operation is rejected. A push can be rejected for a protected branch, a non-fast-forward update or a missing upstream.