# A check that fails on a duplicated record address

Plan for [#153](https://github.com/ausginer/material-x/issues/153), on `repo/duplicate-address-check-1`, by the implementer on 2026-11-22. The issue has no record entry. The design is the architect's recommendation, which the owner adopted on 2026-11-22 and the coordinator relayed. This plan states the parts that the recommendation leaves to the implementer.

## What fails today

`.scripts/entry.sh <scope>:<id>` refuses an identifier that a scope's current-state documents define twice, but only for the address it is asked about. Nothing reads a whole register. So a duplicate reaches `main` unless a reader resolves that address or notices. Two ways have produced one or can:

- **A merge that keeps both sides of a conflict.** `1cf222c32`, `origin/main` merged into `core/use-slot-nodes-1` after #126's squash merge, defines `RF-74` and `RF-75` twice in `.plan/00-index.md`.
- **Two branches that take the same next number.** Each branch is consistent alone, and the register holds the number twice once both merge.

## The check

- **`.scripts/entry.sh --duplicates [<commit>]`** reads every scope's current-state documents, finds every entry heading with the resolver's own `ENTRY` pattern, and fails when one local identifier heads more than one entry in a scope. For each such address it prints `<scope>:<id>` and each `<path>:<line>` that claims it. Exit 0 prints the scopes it read. With `<commit>`, it reads the documents at that commit instead of the working tree, which is how a witness reads a historical tree without a second worktree.
- **One matcher.** The resolver's lookup and the whole-register pass both enumerate entries through one function over `ENTRY`, so the two can't disagree about what a heading claims. A sub-clause (`#####`) and a heading that mentions an identifier claim nothing, as `CONTRIBUTING.md` says.
- **A scope's documents are one register.** drag's `00-index.md` and `contract.md` are one scope, so an identifier claimed in both is a duplicate, as the resolver already treats it.
- **Retired scopes are left out.** `drag2` is read at `0870abd75`, which can't change, so no merge can add a duplicate to it. Reading it would also make the check fail in a clone that lacks that commit, for a reason that has nothing to do with the change under test. The witness reads it once.
- **Review files aren't registers.** A review's finding headings such as `#### reviewer-1` match the pattern and aren't addresses that a scope resolves, so only the scopes' current-state documents are read. A new scope is a row in `SCOPES`, and the check covers it with no further change.

## Where it runs

- **In the `scope` job of `verify.yml`, as a step after the mode decision.** `scope` runs on every pull request and every push to `main`, in both modes, and installs nothing. The check needs only Node's built-in modules, so it adds no install. A failing check fails `scope`, and the gate requires `scope` to succeed in both modes. `records` runs only in reduced mode, so a step there would not gate a full run.
- **A pull request's run reads its merge ref,** `main` merged with the branch, so the second of two branches that take the same number fails once the first has merged, the next time its checks run. A branch that isn't re-run after that merge is caught on the push to `main`. The check can't see a number that two open branches both hold, because neither tree holds it twice.
- **Locally,** the same command runs before a push. `handoff.md`'s Markdown section names it. Project documentation has its own pull request, so that change is a patch in this unit's `checks/`, as `.plan/form-validation-1/checks/docs-unit.patch.txt` was.

## Proof

- Tests in `.scripts/entry.node.test.ts` drive the wrapper on a fixture repository: a register with a planted duplicate fails and names both lines, a clean one passes, and a duplicate across two documents of one scope fails.
- **Witness:** the check fails on `1cf222c32` and names `repo:RF-74` and `repo:RF-75`, and passes on `origin/main` and on the branch.

## Result

Implemented on `repo/duplicate-address-check-1` by the implementer on 2026-11-22, as planned.

- **The check:** `.scripts/entry.ts` takes `--duplicates [<commit>]`. The lookup and the pass both enumerate entries through `headings()`, over `ENTRY`. `verify.yml`'s `scope` job runs `.scripts/entry.sh --duplicates` after the mode decision.
- **Rows:** five in `.scripts/entry.node.test.ts`, under `entry.sh --duplicates`: two entries taking one number, the lines of each named; one id claimed in two documents of drag's scope; a sub-clause and a mention that repeat an id and pass; a duplicate committed and fixed in the working tree, read at the commit and in the tree; and `1cf222c32`. The five fail on `main`'s resolver, which has no `--duplicates`, and pass after the change, with the 14 resolver rows unchanged ([before](checks/tests-before-fix.txt), [after](checks/tests-after-fix.txt)).
- **Witness** ([reading](checks/witness.txt)): `1cf222c32` fails and names `repo:RF-74` and `repo:RF-75`, each at two lines of `.plan/00-index.md`. `origin/main` at `6a67badfd` and the branch's working tree pass. The retired scope `drag2`, read once at `0870abd75` with the same heading pattern, holds no duplicate in its 11 documents.
- **The documentation change** is [`checks/docs-unit.patch.txt`](checks/docs-unit.patch.txt): a fourth step in `handoff.md`'s Markdown section that names the command. It applies to `main` at `6a67badfd` with `git apply`. It is left for its own pull request.
- **Not run:** the workflow itself. The step runs on this pull request's own checks. **Repaired 2026-11-22 by the implementer,** for `reviewer-1` and `reviewer-2` of the [feature proof](../reviews/duplicate-address-check-1/feature-proof-claude.md) at `ab50d9e63`, relayed by the coordinator.

- **`reviewer-1`:** the `1cf222c32` row read that commit in the repository under test, and no ref on `origin` holds it, so the row failed in CI. It now reads `.scripts/fixtures/entry-duplicates-1cf222c32.txt` in a fixture repository that `git init` creates with no history. The fixture is lines 3710 to 3816 of `.plan/00-index.md` at `1cf222c32`, from `RF-73` to the end of the second `RF-75`, byte-equal to that span in a clone that holds the commit. The row asserts the check's whole report: `repo:RF-74` at lines 20 and 61, and `repo:RF-75` at lines 45 and 86. The [witness](checks/witness.txt) stays as the reading of the commit itself, which is reproducible only in a clone that kept the commit, such as slot `d`.
- **`reviewer-2`:** the row for reading at a commit asserted only exit codes. It now asserts what each run printed: at `HEAD`, `repo:RD-1` at lines 1 and 3; in the working tree, `no duplicated address in drag, repo`. A commit that the clone doesn't hold is now refused before any read, with its own error, `cannot read <commit>: this clone does not hold it as a commit`. So a failed read and a found duplicate no longer share a report, and a new row checks the refusal.
- **Witness** ([mutations](checks/repair-mutations.txt)): with the pass's read at a commit always rejecting (the review's `mD`), or with the pass ignoring the commit and reading the working tree, the commit row fails. Without the refusal, the new refusal row fails. With the pass reporting an address only when three entries claim it, the `1cf222c32` row fails, with the other three duplicate rows. Each mutation fails only the rows named. All 20 resolver rows pass on the repaired tree.