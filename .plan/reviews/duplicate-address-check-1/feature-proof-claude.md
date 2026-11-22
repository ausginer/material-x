# Feature proof: the check for a duplicated record address (#153, PR #156)

**Read at** `910aee555` on `repo/duplicate-address-check-1`, against the plan and result in [`duplicate-address-check-plan.md`](../../duplicate-address-check-1/duplicate-address-check-plan.md) and the architect's recommendation that the owner adopted. That recommendation asks for a whole-register pass that reuses `.scripts/entry.ts`'s matcher and runs where every pull request runs, in `scope` or `static` and not in `records`, so that it gates. A local command is named in `handoff.md`, prepared as a patch for its own pull request. Issue #153. The base is `main` at `6a67badfd`, which is still `main`. Reviewer: Claude, a feature-proof pass that didn't implement the unit, on the coordinator's task of 2026-11-22.

The pass ran in slot `d`, switched to the branch. That clone holds `1cf222c32` through a local branch, `core/use-slot-nodes-1`. To see what CI sees, I also used a fresh filtered clone of `origin` at the PR's merge ref, in scratch, which is removed.

**Scope:**

- **Covered:** every claim the coordinator listed, whether the scope list is complete, the stated limit, CI on the head, and the documentation patch.
- **Rerun, not taken from the record:**
  - the resolver's 19 rows on the head and with `main`'s `entry.ts`, and under four mutations ([reading](checks/mutations.txt));
  - the witness, on `1cf222c32`, `origin/main` and the working tree, and `drag2` at `0870abd75` ([reading](checks/witness.txt));
  - the check, a missing commit, and the patch, in a fresh clone of `origin` ([reading](checks/fresh-clone.txt)).
- **Read from CI:** run `45008707443` on the head: the `scope` step, the failing `chromium` job, the `verify` job, and the ruleset that `main` applies ([reading](checks/ci.txt)).
- **Registers:** every tracked Markdown file with a heading that the resolver's `ENTRY` pattern matches ([reading](checks/registers.txt)).
- **Probe:** [`entry-mutate.sh`](probes/entry-mutate.sh) applies each mutation and restores the file.
- **Not run:** the workflow with a planted duplicate. I read the gate's wiring instead (below).

**Verdict:** the check meets #153's property for every tree it reads. It reads every current register, uses the lookup's own matcher, treats drag's two documents as one register, names each line, and gates every ready pull request and push to `main`. The scope list is complete, and the stated limit is acceptable. Two findings go to the implementer, and both are about the rows, not the check:

- One of the five new rows depends on a commit that no ref on `origin` holds. It fails in CI, so the PR's `verify` is red because of its own row (`reviewer-1`).
- Without that row, nothing in CI would notice if reading at a commit broke (`reviewer-2`).

## The claims

| Claim | Holds | Evidence |
| --- | --- | --- |
| `--duplicates [<commit>]` reads every current scope's register through one `headings()` | Yes | `checkDuplicates` and `matching` both enumerate entries through `headings()`, over `ENTRY`. `mC`, a looser pattern of the pass's own that also takes `#####`, fails the sub-clause row |
| It treats drag's `00-index.md` and `contract.md` as one register | Yes | `mB` (each scope's first document only) fails the cross-document row and only that row |
| It names every `path:line` of each duplicated address | Yes | `1cf222c32`: `repo:RF-74` at lines 3729 and 3770, and `repo:RF-75` at lines 3754 and 3795. Paths are relative to the scope's root, as the lookup's own duplicate error prints them |
| It leaves the retired scope `drag2` out | Yes | `scope.commit === undefined` filters it. Its 11 documents at `0870abd75` hold no duplicate under the same pattern |
| It is a step in `scope` after the mode decision, on every pull request and push to `main` in both modes, and it gates | Yes | The step follows `ci-scope.ts`. `scope` runs on every non-draft pull request event, on push to `main`, and on dispatch. `verify` requires `expect scope success` in both modes, and `verify` is the ruleset's one required check. When the step fails, the jobs that need `scope` are skipped, so such a run reports no test results, and `verify` fails on `scope` |
| It fails on `1cf222c32` and passes on `main` | Yes, in a clone that holds `1cf222c32` | [witness](checks/witness.txt). CI's `scope` step printed `no duplicated address in drag, repo` on the merge ref |
| The five new rows fail on `main`'s resolver and pass after, and the 14 existing rows are unchanged | Locally, yes. In CI, no | With `main`'s `entry.ts`, exactly the five fail. On the head, all 19 pass in this clone. The test file's diff is one appended hunk. In CI, the `1cf222c32` row fails: `reviewer-1` |
| The documentation patch applies to `main` | Yes | `git apply --check` passes at the merge ref, where `handoff.md` equals `main`'s |

## The scope list

**Complete.** Outside review files, only `.plan/00-index.md` (128 headings), `packages/drag/.plan/00-index.md` (144) and `packages/drag/.plan/contract.md` (21) hold a heading of the resolver's form, and they are exactly the current documents of `repo` and `drag` in `SCOPES`. Of the other `.plan/` directories, `packages/box-quad/.plan` holds no such heading, and material-x's record is the repository's. The `TE-` rows that `repo:RQ-1` names are a table inside one document. They resolve through that file and not through `entry.ts`, so they aren't addresses that the check could guard. The plan's rule holds: a new scope is a row in `SCOPES`, and the check reads it with no further change.

## The stated limit

**Acceptable, and stated accurately.** The plan's own wording is the limit: _"the second of two branches that take the same number fails once the first has merged, the next time its checks run. A branch that isn't re-run after that merge is caught on the push to `main`."_

The plan doesn't name the cause of the second case. The `Main protection` ruleset sets `strict_required_status_checks_policy: false` ([reading](checks/ci.txt)), so a pull request's green `verify` isn't refreshed when `main` moves, and a second branch can merge on a check that read the tree before the first merge. In that case the duplicate is on `main` until a fix. It isn't silent: the push run's `scope` fails and names both lines.

I judge it acceptable for three reasons:

- **#153's done-condition holds.** That condition is that every pull request's checks fail on a register that holds the same address twice. The tree a check reads is what the check can be held to, and in this case neither branch's tree holds the number twice.
- **The rest is outside the unit.** Closing the window would take a ruleset that requires up-to-date branches, which is the owner's choice, or an allocator across branches. Neither belongs to this unit.
- **Registration already narrows the window.** Each new entry says that it checked the highest number on every branch on `origin`.

## Findings

### reviewer-1 — The row for 1cf222c32 needs a commit that no ref on origin holds, so it fails in CI and the PR's gate is red

**Tier B.** Route: the implementer.

- **Current behaviour:** _"should name the duplicates that the merge 1cf222c32 left"_ runs `--duplicates 1cf222c32` in the repository under test. `core/use-slot-nodes-1`, the only branch that contained that merge, is gone from `origin`. In CI's checkout (`fetch-depth: 0`), the row receives `null` where it expects `['repo:RF-74', 'repo:RF-75']`. So the `chromium` job fails with 1 failed and 2565 passed, and `verify` fails on it. In a fresh clone of `origin`, `git cat-file -e 1cf222c32^{commit}` fails, and the check exits 1 with Node's stack trace for `git ls-tree`. The row passes only in a clone that kept the commit, such as slot `d`, and that is where the record read it.
- **Why it is a problem:** the unit's own row makes its gate fail, and the record reports all five rows as passing without saying that the result depends on a local object. The witness in `checks/witness.txt` remains valid as a record of what that commit held. The problem is only that a row depends on it.
- **Evidence:** [CI](checks/ci.txt), [fresh clone](checks/fresh-clone.txt).
- **Required property:** every row passes in a clone of `origin` as CI makes one. The record says where its witness is reproducible.

### reviewer-2 — No row that can run in CI notices a broken read at a commit

**Tier B.** Route: the implementer.

- **Current behaviour:** _"should read the documents at a commit when one is given"_ asserts only the exit codes `[1, 0]`. A failed read also exits 1, through an unhandled rejection. Under `mD`, where the pass's read at a commit always rejects, that row passes and only the `1cf222c32` row fails, which is the row of `reviewer-1`. A commit that the clone lacks gives the same exit 1 and a stack trace. Meanwhile the lookup reports a missing retired commit as its own error, naming the commit.
- **Why it is a problem:** `--duplicates <commit>` is the plan's way to read a historical tree. A detected duplicate and a failed read are indistinguishable by exit code. Once `reviewer-1` is resolved without a replacement, no row in CI could tell them apart.
- **Evidence:** the `mD` section of the [mutations reading](checks/mutations.txt), and [fresh clone](checks/fresh-clone.txt).
- **Required property:** a row that runs in CI fails when `--duplicates <commit>` can't read the commit's documents. A detected duplicate stays distinguishable from a failed read.

## Not findings

- **Paths relative to the scope's root.** `drag:DRD-1` prints `.plan/00-index.md:1`, which means `packages/drag/.plan/00-index.md`. The lookup's duplicate error prints paths the same way, and the scope prefix says which root applies.
- **A duplicate skips the run's test jobs.** This follows from putting the check in `scope`, which is the recommendation the owner adopted. `verify` still names `scope` as the failure.

## Recheck of the repairs, 2026-11-22

**Read at** `fd28e50b7`, the implementer's repair on `ab50d9e63`, in slot `d`. The subject is the dated repair paragraph in [`duplicate-address-check-plan.md`](../../duplicate-address-check-1/duplicate-address-check-plan.md) and its [mutations](../../duplicate-address-check-1/checks/repair-mutations.txt). This is a targeted recheck of `reviewer-1` and `reviewer-2` above, by a second reviewer, not a new proof. Readings: [`recheck.txt`](checks/recheck.txt). Each mutation was applied alone to `.scripts/entry.ts` and reverted.

**Verdict: both repairs meet their required properties.** One tier C note on the record's layout, `recheck-1`.

- **`reviewer-1`, repaired.**
  - **The new row** builds its repository with `git init` and no commit. It writes `.scripts/fixtures/entry-duplicates-1cf222c32.txt` as `.plan/00-index.md` and runs `--duplicates` on the working tree, so it needs no object that `origin` lacks.
  - **The fixture is exact.** It is byte-equal (`cmp`) to lines 3710–3816 of `.plan/00-index.md` at `1cf222c32`, read in this clone, which holds the commit through a local branch. No remote branch contains the commit. Its headings are `RF-73`, then `RF-74` and `RF-75` twice each, at lines 20, 45, 61 and 86. Those are the commit's own lines in [`witness.txt`](checks/witness.txt), 3729, 3754, 3770 and 3795, less 3709. So the fixture keeps every duplicate that the commit's whole file reports.
  - **The row asserts the whole report** below its first line, so an extra or missing address fails it. The implementer's `mG` shows that the row fails when the pass needs three claims.
  - **In CI** at `fd28e50b7`, `chromium` runs `.scripts/entry.node.test.ts`'s 20 rows in the `repo` project and passes, and so does `verify`. The plan now says where the original witness is reproducible.
- **`reviewer-2`, repaired.**
  - **The commit row** asserts both runs' whole outputs: `repo:RD-1` at lines 1 and 3 at `HEAD`, and `no duplicated address in drag, repo` in the working tree.
  - **Three mutations, run in this tree:**
    - `mD`, the review's read that always rejects, fails exactly that row;
    - `mI`, my own, a read at a commit that returns no documents and so reports a clean commit, fails exactly that row too;
    - `mF`, the deleted refusal, fails exactly the new refusal row.
  - **On the command line,** `--duplicates 0000000` prints _"cannot read 0000000: this clone does not hold it as a commit"_ and exits 1, with no stack trace and no duplicate report. `--duplicates 1cf222c32` still reports the two addresses in this clone. So a failed read and a found duplicate no longer share a report.
- **All 20 resolver rows pass** in this tree, as the plan says.

**Not covered:** a fresh clone of `origin`. I made none, as the coordinator asked. CI's checkout stands in for it.

### recheck-1

**Tier C.** The plan's dated _"Repaired 2026-11-22 by the implementer"_ paragraph starts at the end of the _"Not run"_ bullet, on the same line, so it reads as part of that bullet.

- **Current text:** line 39 of `duplicate-address-check-plan.md` reads _"- **Not run:** the workflow itself. The step runs on this pull request's own checks. **Repaired 2026-11-22 by the implementer,** for `reviewer-1` …"_. Its bullets follow after a blank line.
- **Required property:** the dated paragraph stands on its own, as the record's other dated paragraphs do.
- **Routing:** to the implementer, as a record correction on the branch.