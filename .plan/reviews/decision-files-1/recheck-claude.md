# A file per decision (RD-64, #302) — recheck of the feature proof's findings

**Files were read at:** `19e9ff12f24c97f429d3ef7c0a09d9081241f1a9`, the head of `repo/decision-files-1`, in slot `f`, equal to `origin`. The diff read is `b3f6f7c41..19e9ff12f`: `1d8927fa9` (`reviewer-2`), `9a4d60505` (`reviewer-4`), `02760f583` (`reviewer-3`), `39082cd5c` (`reviewer-5`) and `19e9ff12f` (`reviewer-1`). It is read against the architect's [rulings](../../decision-files-1/decision-files-plan.md#rulings-on-the-feature-proof), the owner's answer to Q2 (a), and `RD-64` property 7 as amended at `b3f6f7c41`. The checks ran in a scratch clone of the local repository, not in a worktree ([readings](checks/recheck.txt)). Open pull requests were read at #301 `08b72380c`, #303 `421c6459b` and #307 `7ef948b2e`.

**Verdict: each of the five fixes does what its ruling says, and the extra links follow the rule. The recheck found one new finding, Tier B, for the architect.** The ruling says that each fix stays in place when rule 6 runs the script again. Each one does. The same rerun, though, writes `RD-64.md` again from the index, and that removes property 7's amendment and its two dated notes. No check reports the loss.

## The fixes

**`reviewer-1`, the check** (`19e9ff12f`). `checkHeadings` in `.scripts/entry.ts` collects decision headings outside `.plan/decisions/`. It does this only in a scope whose documents include a file under that directory, and only for that scope's `decisionFamilies`: `RD` in `repo`, and `DRD` and `DRO` in `drag`. Each one is reported as `<scope>:<id>` with its `<path>:<line>`, under _"decisions outside .plan/decisions/: a decision is a file of its own there"_. Duplicates are reported as before. `DRI` isn't a family. The ruling's required property, its rows and its witness are met:

- **Rows:** the repo project passes 26 of 26. The repository row (`:466`) fails, naming `.plan/00-index.md:3`, both in the working tree and at `HEAD`. The drag row (`:496`) names `DRO-2` and neither `DRF-1` nor `DRI-1`. Rows 3 and 4 pass.
- **Witnesses:** without any family checked, the two new rows fail. Without the directory condition, they fail along with five rows whose fixtures have no directory, rows 3 and 4 among them. With the decisions files not exempt, the two rows fail. This is the implementer's [reading](../../decision-files-1/checks/reviewer-1-witness.txt), row for row.
- **`--duplicates`** passes at the head and with the argument `b197acdd3`.
- **The open branches, reproduced.** `19e9ff12f` merged with #301's head fails on `repo:RD-65` (`.plan/00-index.md:17`) and `repo:RD-66` (`:51`). Merged with #303's head, both the head that the implementer read (`ed9e5a6eb`) and the current one (`421c6459b`), it fails on `repo:RD-67` (`:17`). Merged with #307, it passes. Neither merge conflicts in an index.
- **The ruling's remake,** run on each merged branch. The script writes only new files under `decisions/` (`??`), changes no existing one, and leaves `--duplicates` passing. A second run changes nothing.
- **The report's dated note** corrects both sentences: #301 adds `RD-65` and `RD-66` with no index conflict, and #303 adds `RD-67`.

**`reviewer-2`** (`1d8927fa9`). `agent-workflow.md:123`'s _index_ opens `../../.plan/00-index.md#repository-record--index`. The fragment is the slug of the index's title, and rule 5's second row keeps it.

**`reviewer-4`** (`9a4d60505`). `review-findings.md:31` opens `../../.plan/decisions/RD-1.md`, and `CONTRIBUTING.md:454` opens `packages/drag/.plan/decisions/DRD-29.md`. Both files exist.

**`reviewer-3`** (`02760f583`). A word diff of the three commits shows that only the 11 link targets changed. Each of the 8 fragments in this commit matches a heading of drag's index. The implementer's [reading](../../decision-files-1/checks/section-links.txt) lists 44 candidates. They are exactly the rewritten lines of `move-classified.tsv` that the ruling's filter selects, and no other of the 138 rewritten lines cites a section that stays in an index. That second count is a case-insensitive search for _disposition_, the status sections, _Owner decisions_, _at its pull request_ and _the index's_.

**The three links outside the ruling's list fall under its rule.** The rule is _"a rewritten link whose line cites a section that stays in an index opens that section"_, and it reads the line, as the plan's rejection of a sentence-level reading does. Its fifth case, `size-acceptance-follow-up-report.md:3`, settles a line that also names decisions:

- **`callback-list-completion-report.md:3`:** its governing records include _"§Disposition of the callback list report"_. The fragment is that section's, at line 81, and not the completion report's at line 99.
- **`y-geometry-terms-follow-up-handoff.md:7`:** _"in `00-index.md`, with §Disposition of the `y()` geometry terms report"_.
- **`remediation-handoff.md:3`:** it cites _"the index's disposition table"_ by description, not by name. _Disposition of the 2026-11-07 reviews_ is a table that maps the items of the reviews behind the handoff's 2026-11-07 contract to `DRD-14` through `DRD-23`, exactly the decisions that the line names. So the implementer's reading of the description is sound. The link sits in the sentence _"The decisions are `DRD-14` to `DRD-23` in …"_. Under the line rule that doesn't matter, as at the fifth case, and `entry.sh` finds the decisions.

None of the three needs a further ruling.

**`reviewer-5`** (`39082cd5c`). Row 3's working-tree half also asserts the duplicate's message. Without the `ENOENT` condition, row 3 (`:433`) now fails, along with ten other rows.

**Links at the head:** 7,319 in 682 files, with the same 37 broken file-and-target pairs as at the move. The one fragment that names no heading is the old one in `unit-layout-exploration.md:182`.

## Scope

**Read:** the five fix commits and the report's dated note; `RD-64.md`'s amendment at `c99a8c7db` and `b3f6f7c41`; the check's code, rows and four witnesses; the open branches merged with the head; the ruling's remake on #301 and #303; rule 6 on the head in three forms; the link check; CI's run on the head.

**Not read:** the plan's ruling text beyond what each fix needs. The architect's [`open-branches-remake.txt`](../../decision-files-1/checks/open-branches-remake.txt) isn't repeated beyond the two remakes above. Firefox and WebKit weren't run locally: the change is Node-only, and CI runs all three.

## Findings

### recheck-1 — Rule 6's rerun on this branch writes `RD-64.md` again from the index, which removes property 7's amendment and its two dated notes

Tier B, for the architect, with the reading for the implementer. No consumer observes it. A procedure that the plan prescribes before the merge silently removes text from a decision, and `--duplicates` passes afterwards.

- **Current behavior** ([reading](checks/recheck.txt), _Rule 6_): after the move, this branch changed one decision file, `.plan/decisions/RD-64.md`. `c99a8c7db` and `b3f6f7c41` add two dated notes and amend property 7 in place. Rule 6 regenerates every file from the index once the indexes hold `main`'s entries again. Three forms were run:
  - **The indexes restored from `b197acdd3`:** the script changes 3 files. The two indexes come back as they are at the head. `RD-64.md` returns to the index's text: property 7 says _"changes a decision entry"_ again, and both dated notes are gone. The links that the fixes re-pointed don't change.
  - **The indexes taken whole from `main`'s `e457ed209`:** the same, and both indexes' preambles revert to `main`'s.
  - **A commit like `main`'s that adds a dated note to `RD-10`, merged with `-X theirs`,** so that each conflicting hunk takes `main`'s side: `RD-10.md` gains the note, the preambles keep the branch's text, and `RD-64.md` loses the same text. `--duplicates` passes.
- **What the records say:** rule 6: _"When `main` changes again before the merge, the implementer merges `main`, resolves each index conflict with `main`'s side, and runs the script again. The script regenerates every file from the index."_ The ruling: _"Each fix stays in place when rule 6 runs the script again."_ The plan's [order](../../decision-files-1/decision-files-plan.md#order-against-open-pull-requests) gives the same reason for not running the script on another branch: _"the script would write its older text over them"_. Rule 6 was written before any decision file changed after the move, and this branch now changes one.
- **The reading that the report cites** ([`fixes-rerun.txt`](../../decision-files-1/checks/fixes-rerun.txt)) runs the script with the indexes already emptied. The script then reads no entry and rewrites no link, so the run can't show whether a fix survives. Each fix does survive the real rerun, as above.
- **When it applies:** once `main` changes an existing decision entry in an index before #302 merges, and the implementer follows rule 6. A branch that only adds entries, such as #301 or #303, merges with no conflict, and the ruling's remake runs instead. That remake writes only new files and keeps `RD-64.md` as it is (_The ruling's remake_ in the reading).
- **Required property:** a rerun before the merge keeps every change that this branch made to a decision file after the move, or shows that change before the commit, as the ruling's remake shows a changed file under `decisions/`. The reading that the report cites for rule 6 exercises the rerun with the indexes' entries present.

## CI

Run [45861492273](https://github.com/ausginer/material-x/actions/runs/45861492273), `pull_request`, on `19e9ff12f`, in full mode. `scope` printed _"mode: full, because 19e9ff12f…'s message carries no [noci]"_, and its `--duplicates` printed _"no duplicated address in drag, repo"_ on the pull request merged with `main`. **`verify` passed** (job [140060263436](https://github.com/ausginer/material-x/actions/runs/45861492273/job/140060263436)). `scope`, `static`, `docs`, `chromium`, `firefox`, `webkit`, `measurements` and the three `system-deps` jobs passed. `records` and `deploy` were skipped.