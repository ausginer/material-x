# A file per decision (RD-64, #302) — feature proof

**Files were read at:** `6b7ed6263019e663010dcaa0a6e101f9aab333f4`, the head of `repo/decision-files-1`, in slot `f`, equal to `origin`. The move `e94ab0e9b` was reproduced from its parent `b197acdd3`, which merges `main` at `e457ed209`, in a scratch clone of the local repository and not in a worktree. Open pull requests were read at the heads that `gh pr list` gave on 2026-11-26: #301 `08b72380c`, #303 `5a7cf7e75`, #304 `b9d2f81f1` and #296 `9eb37d5cd`.

**Contract:** `repo:RD-64`, properties 1 to 8, and the unit's [plan](../../decision-files-1/decision-files-plan.md), with its rules 1 to 7, Mx Architect B's dated notes, the resolver's four rows and the reviewer's work list. **Subject:** the [report](../../decision-files-1/decision-files-report.md)'s _The move_ and its readings.

**Verdict: the move is what the plan says. Two findings are Tier B and three are Tier C. No finding is Tier A.** The committed script, run on `b197acdd3`, gives `e94ab0e9b`'s tree byte for byte. Property 2's witness, the link check and the resolver's rows hold by this review's own scripts. The Tier B findings are about the state after the move:

- **`reviewer-1`:** two open pull requests add three decisions to the repository index. Merged after the move, they conflict nowhere, and every check passes. `RD-64` property 7's merge condition doesn't hold at this time.
- **`reviewer-2`:** one sentence that this unit wrote in `agent-workflow.md` now sends its reader to the wrong place.

## Readings

**The move, reproduced** ([reading](checks/move-reproduced.txt)). In a `git clone --no-checkout` of the local repository, detached at `b197acdd3`, `node .plan/decision-files-1/probes/move.mjs --classified <tsv>` exits 0. `git add -A; git diff --cached --quiet e94ab0e9b` then exits 0, so the tree is `e94ab0e9b`'s. `e94ab0e9b` has one parent, `b197acdd3`. The script is the same at `b197acdd3` and at `e94ab0e9b`. The printed counts and the lines left to a person equal the script's output in the report's [reading](../../decision-files-1/checks/move.txt), and the classified links equal [`move-classified.tsv`](../../decision-files-1/checks/move-classified.tsv), byte for byte.

**Idempotence.** Two runs:

- **The script, run again on its committed output,** changes no file, and `git status` is empty. This run is idempotent trivially, because the indexes have no entries left: it reads 0 entries, rewrites 0 links, and keeps 211 links unchanged and 4 other fragments.
- **The plan's real rerun case (rule 6),** the committed output with both indexes restored from `b197acdd3`, as a merge of `main` resolved to `main`'s side gives them: the script writes 157 files and changes the 2 indexes. The tree is `e94ab0e9b`'s again.

**`RD-64` property 2's witness** ([reading](checks/witness.txt), [probe](probes/witness.mjs)). This probe reads `probes/witness.mjs` and `entry.sh` neither. For each heading `#### RD-n`, `#### DRD-n` and `#### DRO-n` of the two indexes at `b197acdd3`, it cuts the entry to the next heading of level 1 to 4. It compares the entry with the entry's file at `e94ab0e9b`, with each link target taken out. Each target that differs must resolve to the same path and fragment from the file's directory as from the index. Each drag status paragraph must be the entry's _Decision status_ row, with the same comparison.

| What | Count |
| --- | --: |
| Identifiers | 157 |
| Equal except for link targets | 157 |
| Link targets changed | 736 |
| Changed targets that resolve to the same path and fragment | 735 |
| A same-file fragment that now names the index (`RD-59`'s `#rf-136--…`) | 1 |
| Absolute targets, unchanged | 22 |
| Relative targets that didn't change | 1, `RD-26`'s `o`, in code |
| Status paragraphs equal to their rows | 72 of 72 |

The report's 615 targets are these 736 without the 121 in the status paragraphs.

**Relative links** ([before](checks/links-b197acdd3.txt), [after](checks/links-e94ab0e9b.txt), [head](checks/links-6b7ed6263.txt), [probe](probes/links.mjs)). This probe reads each commit through `git ls-tree` and `git show`, and not through a working tree. It reads reference definitions and angle-bracket destinations, which `links-resolve.mjs` doesn't read. It skips code spans by CommonMark's reading. The results are 7,274 links in 524 files at `b197acdd3`, and 7,279 in 681 files at `e94ab0e9b`, with 37 that don't resolve at each. Keyed by file and target, the two sets of 37 differ only where `RD-3` and `RD-4` moved: two links in `.plan/00-index.md` are now in `.plan/decisions/RD-3.md` and `RD-4.md`, rewritten from there. At the head, there are 7,286 links and 37 that don't resolve. The one fragment into a record that names no heading, `packages/drag/.plan/unit-layout-exploration.md:182`, is the same before and after.

**`entry.sh --duplicates`** passes at `e94ab0e9b` and at `6b7ed6263`, and with the argument `b197acdd3` ([reading](checks/resolver-and-branches.txt)). CI's `scope` job ran it on the head: _"no duplicated address in drag, repo"_.

**The resolver** (`.scripts/entry.ts`, `e2a0e05eb`). The `drag` and `repo` rows add `.plan/decisions` after their other documents. In the working tree, `workingTree` returns no documents for a path that `stat` reports as `ENOENT`, and rethrows any other error. Nothing else in the file changed against `main`. The repo project, `.scripts/entry.node.test.ts`, passes 24 of 24 at the head. The four rows, at `:395`, `:416`, `:433` and `:463`, are the plan's four. Witnesses, one change at a time ([reading](checks/resolver-and-branches.txt)):

- **Without the directory in the two rows,** rows 1, 2 and 3 fail, and so do two rows that read this repository, `:52` and `:82`, because its decisions are files at this head.
- **Without the `ENOENT` condition,** row 4 fails with `ENOENT`, as the plan says, and so do row 2 and six earlier rows whose fixtures have no directory. Row 3 still passes: see `reviewer-5`.

**Property 7's guard, in a scratch copy.** A branch from `b197acdd3` adds a dated note to `RD-62` in the index and merges `e94ab0e9b`. The merge conflicts in `.plan/00-index.md`. With the branch's side kept, `--duplicates` exits 1 and names 64 addresses, the first `repo:RD-1` at `.plan/00-index.md:15` and `.plan/decisions/RD-1.md:1`. The guard holds for a changed entry. For a new entry, see `reviewer-1`.

**Rule 5, the links read against their lines** ([every changed link with its text](checks/rule5-links.txt), [probe](probes/sample.mjs)):

- **The third row (16):** each link's text names the identifier whose file it now opens. All 16 were read.
- **A moved entry's fragment (6):** all 6 were read. Each opens the entry that its fragment named.
- **Another fragment (4):** the targets are unchanged, and the sections still exist.
- **The line's one identifier (56):** 10 were read. Each of them means that decision. One line outside the sample doesn't: see `reviewer-3`.
- **Several identifiers (67):** 11 were read, and every line that cites a section of drag's index was also read. A directory serves 9 of the 11, because each of them names several decisions in the one link. The exceptions are `reviewer-2` and `reviewer-3`.

**The documents.** `CONTRIBUTING.md`'s _Reading one entry of a record_, with its change-record row, `agent-workflow.md`'s bullet and its sentence on `RD-`, `review-findings.md`'s sentence, `documentation.md` §8's row and its §9 row, and the two indexes' preambles say where a decision is. Each statement is true at `e94ab0e9b`. In the scratch clone, the `grep … | sort -V` idiom lists 93 drag titles, starting `DRD-1`, `DRD-2`, `DRD-3`. The three `awk` examples print `DRF-13`, `RF-1` and `DRF-1`. The guard sentence's `DRD-1`/`DRD-13` became `DRF-1`/`DRF-13`, which follows the changed example. No other sentence changed. The exception is the link in `reviewer-2`.

**CI at the head:** run [45856417508](https://github.com/ausginer/material-x/actions/runs/45856417508), `pull_request`, on `6b7ed6263`. **Its mode is full and not reduced, although both head commits carry `[noci]`**: `scope` printed _"mode: full, because the range changes paths that are neither records nor Markdown"_ (the branch's `entry.ts` and `main`'s merge). So `records` is skipped. Its state is recorded under [CI](#ci).

## Scope

**Read:** the move's reproduction and both forms of idempotence; property 2 over all 157 identifiers; the link check at three commits; `--duplicates`; the resolver's diff, its four rows and both witnesses; property 7's guard in a scratch copy; the rule 5 links named above; the documents; the open pull requests' heads, each merged with the move in a scratch copy; CI's run on the head.

**Not read:** the 290-file diff, line by line, which the reproduction replaces; the dry run's readings, which the move's readings supersede; `RD-17`'s notes, which the architect writes after the review; the docs site's build and Storybook as consumers of the indexes, which `RD-64`'s _Not read_ leaves to the unit and the report doesn't name. Firefox and WebKit were not run locally: the changed code is Node-only, and CI runs the full suite in each engine.

## Findings

### reviewer-1 — Three decisions in open pull requests merge into the repository index after the move, with no conflict, and pass every check

Tier B, for the coordinator and the architect, and the report's two sentences for the implementer. No consumer observes it. The check that the plan names as property 7's guard doesn't cover the case that the report relies on, and the report tells the reviewer of #301 that a conflict will prompt the remake. There is no conflict.

- **Current behavior** ([reading](checks/resolver-and-branches.txt)): each open pull request's head was merged with `e94ab0e9b`. #301 (`08b72380c`) adds `RD-65` and `RD-66`, and #303 (`5a7cf7e75`) adds `RD-67`, all three under the repository index's _Decisions_. Neither merge conflicts in an index. After #301's merge, `.plan/00-index.md` has the sentence _"The decisions are in `decisions/`, one file each, named by the identifier."_, followed by `#### RD-65` and `#### RD-66`. `--duplicates` exits 0, and `entry.sh repo:RD-65` resolves the entry from the index. A branch from `b197acdd3` that adds an entry at the end of _Decisions_ also merges with no conflict.
- **What the records say:**
  - **`RD-64` property 1:** _"A new decision is a new file."_
  - **Property 7:** _"The unit merges when no open branch changes a decision entry in an index, which the coordinator reads before the merge. A branch that changes one later takes `main`'s side of the conflict and makes its change again in the file."_
  - **The report, on #301:** _"After it merges `main`, it takes `main`'s side of the index conflict and writes the entry as `.plan/decisions/RD-65.md`"_. It names `RD-65` only.
  - **The report, on `repo/session-context-1`:** it _"has no index change at `origin`"_. Its pull request, #303, now adds `RD-67` to the index.
- **The coordinator's question, whether the `--duplicates` gap matters for this unit's properties:** it doesn't affect the move's proof. Properties 2, 3 and 6 hold at this head, and the guard that the plan names holds for a changed entry. It does matter for property 1 on `main` and for property 7's merge condition. Property 7's merge condition doesn't hold while #301 and #303 are open with those entries. If either merges after this unit, nothing mechanical shows that its entries are in the index: no conflict occurs, and no check fails. If either merges first, the plan's rule 6 rerun moves its entries with the rest.
- **Required property:** at the merge, no open branch adds or changes a decision entry in an index, or each one that does is known and has a stated path to a file. The report says what happens when #301 and #303 merge `main` after the move. Whether a decision heading left in an index needs a mechanical check is the architect's decision.

### reviewer-2 — `agent-workflow.md`'s sentence that this unit wrote links _the rest is in its index_ to the decisions directory

Tier B, for the architect, and then the implementer. This is an instruction document that every role reads, and the sentence states where the repository's records are.

- **Current behavior:** `.agents/docs/agent-workflow.md:123` was written in `e2a0e05eb` with the word _index_ linked to the index itself. The line also names `repo:RD-1` and `repo:RD-5`, so rule 5's fifth row sent the link to the directory. At `e94ab0e9b` the sentence reads: _"its decisions are files in `.plan/decisions/`, and the rest is in its index"_, and the word _index_ links to `../../.plan/decisions/`. The findings and the questions aren't in that directory.
- **What the records say:** the plan's reviewer list: _"each sentence that says where a decision is is true after the move"_. Rule 5: _"A rule that is wrong for a line is reported, and that line is read by hand."_ The report: _"The script left no link to a person"_ and _"Nothing happened that the rules didn't foresee."_ The link is in the dry run's classified links, and no one reported it.
- **Evidence:** [`rule5-links.txt`](checks/rule5-links.txt), the `toDir` row for `.agents/docs/agent-workflow.md:123`. Mx Architect B ruled on a similar case, the findings plan's line 3. In that case the link meant one entry, and here it means the index itself.
- **Required property:** the sentence's link opens the index, and it still does after any later rerun of the script, as rule 6 requires.

### reviewer-3 — Four record links that cite a disposition, which stays in drag's index, now open a decision file or the decisions directory

Tier C, for the architect. These are records, and no consumer or instrument reads them.

- **Current behavior:** each line cites a _Disposition_ section, which property 5 keeps in `packages/drag/.plan/00-index.md`. Each line also names one or more moved identifiers and no finding, so rule 5's fourth or fifth row rewrote the link. The section isn't at the new target:
  - `packages/drag/.plan/instrument-repair-handoff.md:3`: _"how its findings were handled, are in `00-index.md` §Disposition of the ownership report"_ → `decisions/DRD-23.md`;
  - `packages/drag/.plan/mangle-rollback-handoff.md:156`: _"after the report was accepted (`00-index.md` §Disposition of the mangling rollback report)"_ → `decisions/`;
  - `packages/drag/.plan/probes/y-geometry-terms-ruling/README.md:3`: _"§Disposition of the `y()` geometry terms report in `00-index.md`"_ → `../../decisions/`;
  - `packages/drag/.plan/reviews/drag2-guarantees/remediation-recheck-reviewer.md:5`: _"§Disposition of the guarantee tests proof in `00-index.md`"_ → `../../decisions/`.

  `packages/drag/.plan/size-acceptance-follow-up-report.md:3` cites three decisions and a disposition with one link. The directory serves the decisions, and the disposition is lost.

- **What the records say:** `RD-64` property 6: _"A link that pointed into an index for a moved entry points to its file."_ These links didn't point into the index for a moved entry. The rules don't read a § citation of an index section, and the script reported none of these lines.
- **Required property:** a link that cites a section that stays in an index still opens that index.

### reviewer-4 — About 115 links whose text is a file name `00-index.md` now open a decision file or the decisions directory

Tier C, for the architect: an observation on rule 5 as written, which changes a link's target and not its text.

- **Current behavior** ([`rule5-links.txt`](checks/rule5-links.txt)): 115 rewritten links have the code text `00-index.md`, `../00-index.md` or `.plan/00-index.md`. Their targets are in `decisions/`. 110 of them are in plans, reports, handoffs and reviews. Five are in current documents: the change-record rows `.agents/docs/documentation.md:214`, `.agents/docs/review-findings.md:31` and `CONTRIBUTING.md:452`–`454`. Two of these rows say _Record: `00-index.md` RD-1_ and _… DRD-29_, and their links open the directory and not the decision that they name, because the line also names `RD-5` and `DRD-27`.
- **Why it is reported:** the plan's rules don't consider a link's text, and `RD-64` property 6 asks only that a link resolves. A reader sees a file name and opens another file. Whether that is accepted is the architect's decision. `documentation.md` §6 keeps a record append-only, and allows a re-pointed link or a corrected citation in place.
- **Required property:** the plan states whether a link whose text names the index, and whose target is now a decision, is accepted as it is.

### reviewer-5 — Row 3's working-tree half asserts only the exit status, so a crash satisfies it

Tier C, for the implementer: a test's strength, not a property that the plan requires.

- **Current behavior:** `.scripts/entry.node.test.ts:433` expects `tree.code` to be 1, because the working tree adds `RD-1` in a file as well as the index. Without the `ENOENT` condition (witness B), `--duplicates` in that fixture throws `ENOENT` on the drag scope's missing directory, exits 1, and the row passes ([reading](checks/resolver-and-branches.txt)).
- **Why it is a problem:** the row's name says that the commit's documents are read without the directory. Its second half doesn't distinguish a reported duplicate from a crash. Row 2 does, because it asserts the message.
- **Required property:** row 3's working-tree half fails when the duplicate isn't reported.

## CI

Run [45856417508](https://github.com/ausginer/material-x/actions/runs/45856417508), full mode, on `6b7ed6263`: **`verify` passed.** Each job's result: `scope`, `static`, `docs`, `chromium`, `firefox`, `webkit`, `measurements` and the three `system-deps` jobs passed. `records` and `deploy` were skipped, because the mode is full and the branch isn't `main`. The `verify` job is [140043711420](https://github.com/ausginer/material-x/actions/runs/45856417508/job/140043711420).