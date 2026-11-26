# A file per decision — plan

**Status: proposed on 2026-11-26 by the architect, for `repo:RD-64`, which the owner accepted the same day:** _"RD-64 - да"_ ("RD-64, yes"), relayed by the coordinator. This branch, `repo/decision-files-1`, is from `origin/main` at `6aa5330e3`. **The owner answered [Q1](#questions) on 2026-11-26, (a): the move waits until #297, #293, #295 and #298 have merged.** **He answered [Q2](#rulings-on-the-feature-proof) the same day, (a): the order of #302, #301 and #303 is free.** It said: _"The plan waits for the owner's answer to Q1 before the move is timed."_ The implementer can start on items 1 to 4 of the [work list](#work-list) now.

`RD-64` and `RD-63` are on #297's branch, `repo/findings-rules-1` at `494b12db4`, and not on `main`. **This unit carries nothing of #297 and waits for it:** the move is made after #297 is on `main` and merged into this branch. #297 adds `RD-63` and `RD-64` to the index and dated notes to `RD-17` and `RD-56`. A move made before it would leave #297 to make those four changes again in files. The plan names `RD-64`'s properties by number, and they are read at `494b12db4`.

## What moves

Read at `6aa5330e3` ([reading](checks/links.txt), [probe](probes/links.mjs)):

| What | Count |
| --- | --- |
| Entries: `#### RD-n` in `.plan/00-index.md`, `#### DRD-n` and `#### DRO-n` in `packages/drag/.plan/00-index.md` | 155: 62, 72 and 21. With #297, 157 |
| Their bytes, each from its heading to the next heading of level 1 to 4 | 1,033,164: 499,595 and 533,569 |
| Relative links inside them, which point from a new directory | 592, and 1 to a fragment of the same index |
| Links elsewhere into an index | 353, in 282 files |
| Rows of drag's _Decision status_ | 72 |

**What stays in an index:** its preamble, the findings, the questions, drag's dispositions and status paragraphs, and drag's _Owner decisions_ preamble. `DRI-` stays in drag's `contract.md`. `RD-64` property 5 lists them.

## The move

`RD-64` properties 1 to 3 and 5 to 8 govern. These rules make them exact:

1. **A file is what `.scripts/entry.sh` prints for its address,** from the heading to the next heading of level 1 to 4, with the text unchanged except for the two kinds below. The file is `.plan/decisions/<id>.md` under the scope's root. It begins with its `####` heading, which keeps the resolver's claim rule.
2. **Drag's _Decision status_ row of an entry** becomes the paragraph after its heading, as `**Status:** <the row's text>`. The table and its section go.
3. **A section of an index that loses its entries** keeps its heading and gets one sentence: its decisions are in `decisions/`, one file each, named by the identifier. _Owner decisions_ keeps its preamble too.
4. **A relative link inside a moved entry,** its status paragraph of rule 2 included, is made relative to the new directory, and resolves to the same file. A link to the index, or to a fragment of the index, follows rule 5; a fragment in the same file is a fragment of the index.
5. **A link elsewhere into an index**, an index's own fragment links included, by the link's text and the line it is on, the first row that applies:

   | The link | It becomes | Count at `6aa5330e3` |
   | --- | --- | --: |
   | A fragment of a moved entry, such as `#rd-26--…` | That entry's file, with no fragment | 4 |
   | Another fragment, such as `#rf-72--…` or `#owner-decisions` | Unchanged | 4 |
   | No fragment, and the link's own text names one moved identifier of the scope it links to and no finding | That identifier's file | — |
   | No fragment, and the line names one moved identifier and no `RF-`, `DRF-` or `RQ-` | That identifier's file | 61 |
   | No fragment, and the line names several moved identifiers and no finding | The scope's `decisions/` directory | 75 |
   | Anything else: a line that names a finding, or no identifier | Unchanged. The index still exists, and its preamble says where the decisions are | 209 |

   A rule that is wrong for a line is reported, and that line is read by hand. These rules are what `RD-64` property 6 calls reading by hand for lines that cite several entries or none.

6. **The move is one commit, the output of a script** committed in `probes/`. It runs on the branch after the last merge of `main`. When `main` changes again before the merge, the implementer merges `main`, resolves each index conflict with `main`'s side, and runs the script again. The script regenerates every file from the index and rewrites the links again. It is idempotent: on its own output it changes nothing.
7. **Nothing is moved by hand,** and no entry's text is edited in the move's commit.

**Absolute links** inside the moved entries (18) and links on GitHub to an index, such as an issue's, don't change.

**Dated 2026-11-26 by Mx Architect B, on the dry run's report** ([report](decision-files-report.md), at `536e129cd`), requested by the coordinator. An architect other than the main one amends this plan on the owner's word, and mints nothing.

- **The link's text decides before the line does.** Rule 5 gains its third row. A link whose text names one decision goes to that decision's file, even on a line that names others, because the text is the author's own statement of the target. It decides the three links that the dry run left to a person: `.plan/list-sortable-1/list-sortable-plan.md:9` (`repo:RD-31` and `drag:DRD-70`) and `packages/drag/.plan/displacement-1/displacement-plan.md:3` (`DRD-72`). The identifier counts only if it belongs to the linked index's scope, qualified or by its prefix, so `drag:DRD-70` in a link to the repository's index isn't this row's. The row also applies to links that the dry run sent to a directory or left unchanged, and its count is the next dry run's. Rule 5's lead said: _"**A link elsewhere into an index**, by the line it is on:"_
- **A status row's links are rewritten by rule 4: confirmed.** After rule 2, the row is the file's paragraph, and a link in it is a link inside the moved entry. Kept as written, the 121 links would break, which `RD-64` property 6 forbids. Rule 4 said: _"**A relative link inside a moved entry** is made relative to the new directory, and resolves to the same file. A link to the index, or to a fragment of the index, follows rule 5."_
- **An index's own link to a moved entry's fragment is rule 5's first row: confirmed.** The index's link to `#rd-31--…` becomes `decisions/RD-31.md`, because the fragment no longer exists in the index after the move. The same reading covers a same-file fragment inside a moved entry: `#rf-136--…` in `RD-59` becomes `../00-index.md#rf-136--…`. The plan's counts, read at `6aa5330e3` by `probes/links.mjs`, which skips same-file links, stay as they were read. The report's counts replace them.
- **The report's other choices are confirmed:** a link in a fenced block or an inline code span isn't read, and a link to a directory keeps its trailing `/`.
- **The resolver, adopted from the ruling relayed earlier the same day:** a current-state path that doesn't exist in the working tree reads as no documents, with a fourth row and its witness. The section said: _"Nothing else in it changes."_, with three rows, and the work list's item 2 said _"the three rows of its tests"_.

**Dated 2026-11-26 by Mx Architect B, on the rerun's one stop** ([report](decision-files-report.md), [changes](checks/dry-run-changed.txt), at `95d7b7dd0`), requested by the coordinator. `.plan/findings-on-github-1/findings-on-github-plan.md:3` ends with a sentence that names `RD-56` and links the words _before and after the cut-over_ to `../00-index.md`, as it reads at `e2a0e05eb`. The link means `RD-56`, and at `e2a0e05eb` rule 5's fourth row sent it to `RD-56`'s file. Main's merge (#297) added `RD-63` and `RD-64` to the line, and the link's text names no identifier. So the fifth row now sends it to `decisions/`, as the rules say.

- **The link is pointed at its entry in the source, outside the move:** its target becomes `../00-index.md#rd-56--…`, the fragment of `RD-56`'s heading. That is a re-pointed link, which `documentation.md` §6 allows in place, in this note's commit, which isn't the move's. The move then sends it to `../decisions/RD-56.md` by rule 5's first row, on this and every later run. Rules 6 and 7 hold: the move's commit is still the script's output alone, and the script has no exception.
- **Rejected, a named exception in the script:** one exception invites the next, and a rerun after a later change of that line would carry an exception that no longer fits.
- **Rejected, deciding by the sentence instead of the line:** splitting Markdown into sentences is fragile, because of code spans, abbreviations and links that contain periods, and it changes outcomes across hundreds of lines for one link.
- **Rejected, leaving it as the rules give:** the directory resolves, but it loses a target that the line had before main's merge.
- **Any later line of this kind** is fixed the same way: the link is pointed at its entry's fragment in its own commit before the move's, and the dry run reports it, as rule 5 says.

**Dated 2026-11-26 by Mx Architect B, on the next rerun's stop** (the report at `06c735eb8`), requested by the coordinator. The note above quoted the findings plan's line with its link, so rule 5 would have rewritten the quote. It now describes the line instead of quoting it, and the line itself is at `e2a0e05eb`. It quoted the line's last sentence in italics, with the link live, and a quote of it here would be a link again.

- **A code span is CommonMark's.** The plan's _"a link in a fenced block or an inline code span isn't read"_ means a span as CommonMark reads it: a run of backticks opens it, and the next run of the same length closes it. `probes/move.mjs` counts backticks before the link, odd or even. That disagrees with CommonMark for a span that holds a backtick, such as a quoted identifier, and the formatter writes such a span with two backticks, so the count can't be made to agree. The quote above, written as code with two backticks, was still read as a link, which is how this was found. The implementer changes the script to read spans as CommonMark does, and reruns the dry run. The report's own quote of that line, at `06c735eb8`, is such a span ([reading](checks/dry-run-architect.txt)).

## The resolver

`.scripts/entry.ts`: the rows of `drag` and `repo` add `.plan/decisions`. It already reads a directory as its Markdown documents in path order, at a commit with `ls-tree` too. A commit before the move has no such directory, and `ls-tree` lists nothing for it, so `--duplicates <commit>` still reads an old commit. One other change: in the working tree, a current-state path that doesn't exist reads as no documents, as `ls-tree` lists nothing for it at a commit. Any other error of `stat` still throws. Nothing else in it changes.

**Rows,** in `.scripts/entry.node.test.ts`, with its fixtures:

- an entry in `.plan/decisions/RD-1.md` resolves as `repo:RD-1`, and one in `packages/drag/.plan/decisions/DRD-1.md` as `drag:DRD-1`;
- an identifier in both an index and a decisions file is a duplicate, for the lookup and for `--duplicates`, naming both places;
- `--duplicates <commit>` at a commit without the directory reads the index alone;
- in a working tree without the directory, a lookup of an index entry resolves, and `--duplicates` passes and reads the index alone.

**Witness:** without the directory in the two rows, the first two rows fail. CI's `verify` runs `entry.sh --duplicates`, so a branch that keeps an index's moved section after merging `main` fails there: that is `RD-64` property 7's guard, and the second row is its witness. Without the condition on a path that doesn't exist, the fourth row fails with `ENOENT`.

## The documents

Each says where a decision is, and nothing else changes in it:

| Document | Change |
| --- | --- |
| `CONTRIBUTING.md`, _Reading one entry of a record_ | A decision is its own file under `decisions/`. The `awk` idiom reads an entry of an index, such as a finding, and a decision is read with `cat` of its file. How to list a scope's titles: `grep -h '^#### ' packages/drag/.plan/decisions/*.md \| sort -V`. A row in its change record |
| `.agents/docs/agent-workflow.md` | _The record stays one file_ is replaced by: a decision is a file, two units conflict only when they change one decision, which the stack order expresses, and two that mint one number add one file, which git reports. The sentence on who owns `RD-` names the record and not only the index |
| `.agents/docs/review-findings.md` | Its sentence that the index owns `RD-`/`RF-`/`RQ-`/`RI-`: decisions are in `decisions/`, findings in the index |
| `.agents/docs/documentation.md` | §8's row for `.plan/`, and a §9 row |
| The two indexes' preambles | Where the decisions are. The `awk` example reads a finding |

`coordinator.md`'s line, that the index owns the repository's records, stays true, and `architecture.md` and `test-architecture.md` don't name the index. The six documents of `RD-64`'s costs were a search for the words, and are these four and the preambles. No role definition names an index.

**What it supersedes:** `RD-17` property 6, and its _Not adopted_ entry _"Splitting the index now"_, at this unit's merge, as #297's note on `RD-17` says. The architect writes the notes on `RD-17` and `RD-64` that it is in force, after the review.

## Order against open pull requests

Read at `6aa5330e3` ([reading](checks/open-branches.txt)).

| Pull request | Changes | At the move |
| --- | --- | --- |
| #297 `repo/findings-rules-1` | `RD-17`, `RD-56`, `RD-63`, `RD-64`. Records only | **Merges first.** The move waits for it |
| #298 `repo/devcontainer-firefox-1` | `RD-13` | Before the move, or remakes its change after |
| #295 `repo/engines-2` | `RD-62`, `drag:DRO-18`. Records only | Before the move, or remakes its change after |
| #293 `repo/axe-checks-1` | `RD-57`, and `RF-144` | Before the move, or remakes its change after |
| #296, #291, #288, #286 | Findings only: `RF-145`, `RF-146`, `RF-134`, `RF-132`, `RF-139` | Either side. Their hunks are in _Findings_, which stays |

**To remake a change after the move:** merge `main`, take `main`'s side of each conflict in a moved section, and make the branch's change again in the entry's file, by hand. The script isn't run there, because a branch's index is older than `main`'s files, and the script would write its older text over them. The `--duplicates` check fails a branch that keeps the old section.

**Other branches on `origin`** that change an index and have no open pull request are merged units whose branch stayed, or abandoned ones. One that comes back remakes its change in the same way.

**When:** after #297 merges, and at a time when no other pull request is about to change a decision entry. The move takes a few minutes to run again, so the window is between its last regeneration and the owner's merge: the coordinator routes no change of a decision entry into an index during it. A decision minted then waits for the merge, and is written as a file.

## Work list

**Implementer,** on this branch:

1. **The script,** `probes/move.mjs`, from rules 1 to 7. It prints, for each run, the counts of the [table](#the-move) and the lines that rule 5 leaves to a person.
2. **The resolver's two rows and the four rows of its tests,** with the witness.
3. **The documents** of [the documents](#the-documents), in [technical English](../../.agents/docs/technical-english.md).
4. **A dry run** on a scratch copy of the tree, not committed: the counts, the lines left to a person, and property 2's witness below. Report anything that a rule doesn't cover, and stop on it.
5. **After #297, #293, #295 and #298 are on `main`, by Q1 (a):** merge `main`, run the script, and commit its output alone.
6. **The checks:**
   - **`RD-64` property 2's witness:** for each moved identifier, `.scripts/entry.sh <scope>:<id>` before the move and after it prints the same text, except the rewritten links and the status paragraph. The comparison is committed as a reading, with the count of identifiers.
   - **Every relative link in a Markdown file of the tree resolves** to a file or directory, by a script, before and after the move. The count of broken links after isn't above the count before. The reading names both.
   - `entry.sh --duplicates` passes. The script run again on its output changes nothing.
   - The `.ts` checks of `handoff.md` for `entry.ts` and its tests, and the `repo` Vitest project. The Markdown checks for the documents.
7. **The report,** in the unit's directory: the commits, the counts, the readings, and each line that rule 5 left to a person and what was done.

**Reviewer,** a feature proof:

- **Reproduce the move:** check out the move's parent, run the committed script, and compare its output with the move's commit, byte for byte.
- **Property 2's witness, independently,** over every identifier, and the link check, with a script of the reviewer's own.
- **A sample of the rewritten links** from each row of rule 5, ten or all of them, read against the line's meaning.
- **The resolver's rows and their witness,** and `--duplicates` on a branch that keeps an index's section after merging `main`, made in a scratch copy.
- **The documents:** each sentence that says where a decision is is true after the move, and no other sentence changed.

**Architect:** rules on what a dry run or the review reports, and writes the notes on `RD-17` and `RD-64` at the end.

**Size: medium.** The diff is large and mechanical, and the work is the script, two resolver rows, three tests, four documents and the readings.

## Costs

- **One large diff:** about 1.03 MB moves into 155 files, and 140 links elsewhere are rewritten. A reviewer reproduces it rather than reading it.
- **History:** a decision's file begins at the move. Its earlier history is the index's, read at the move's parent. `git log --follow` doesn't cross a file split from a larger one.
- **GitHub's directory view** shows file names and no titles, sorted as text.
- **A window** in which no decision entry is changed in an index, and remakes by hand for #293, #295 and #298 if they are still open.
- **Links that stay on an index** (209) still resolve. 75 go to a directory and not to one entry.

## Questions

**Q1, for the owner — when does the move happen?**

- **(a) After #297, #293, #295 and #298 have merged. Recommended.** Nothing is remade by hand. The script, the resolver and the documents can be written and reviewed meanwhile, so the wait is only for the move's commit.
- **(b) Right after #297 merges.** #293, #295 and #298 each remake their change of one or two entries in files, by hand, before they merge.

Nothing else is the owner's. The rules above are the architect's.

**Answered on 2026-11-26 by the owner, (a),** relayed by the coordinator: _"Q1 (a)"_. Recorded by the architect the same day. Item 5 of the [work list](#work-list) waits for #297, #293, #295 and #298 on `main`, and no pull request remakes a change by hand. The same day he set #297 and #295 to merge automatically. Nothing else in the plan changes.

## Rulings on the feature proof

**Dated 2026-11-26 by the architect, on the [feature proof](../reviews/decision-files-1/feature-proof-claude.md) read at `6b7ed6263`,** findings `reviewer-1` to `reviewer-4`. The coordinator requested the rulings. `reviewer-5` is the implementer's, as the proof routes it. Every fix below goes in a commit of its own after the move's, so rule 7 still holds. Each fix stays in place when rule 6 runs the script again.

**`reviewer-1`: a check is owed, in this unit.** `RD-64` property 1 says _"A new decision is a new file"_, and nothing enforces it. A branch that adds an entry merges with the move with no conflict, and every check passes. The proof read this for #301 and #303, and so does this note's [reading](checks/open-branches-remake.txt). The case isn't limited to those two. Any branch from before the move that mints a decision and comes back is the same case.

- **Required property:** where a scope's `.plan/decisions/` holds a document, in the working tree or at the commit read, the check that CI already runs (`.scripts/entry.sh --duplicates`) fails when another document of that scope has a heading with a prefix that property 1 moves. Those prefixes are `RD` in `repo`, and `DRD` and `DRO` in `drag`. The failure names each `<path>:<line>`, and its message says that a decision is outside `decisions/`, because the address isn't duplicated. A scope without the directory reads as it does now, so `--duplicates <commit>` on a commit before the move still passes. `DRI-` in `contract.md` isn't such a prefix.
- **Rows:** a fixture whose `.plan/decisions/` has `RD-1.md` and whose index has `#### RD-2`. `--duplicates` fails and names the index's line, both in the working tree and at a commit. Witness: without the condition, the row fails. Rows 3 and 4 still pass.
- **Where it runs:** `verify`'s `scope` job runs `--duplicates` in every mode. A `pull_request` run checks out the pull request merged with `main`, so after the move is on `main`, an open branch that still has an entry in an index fails on its next run.

**What #301 and #303 do, if either merges after the move.** Merge `main`, and the check fails. Run `probes/move.mjs` on the merged branch, and commit its output alone. The script moves only the entries that are still in an index, and rewrites the links that name them. Before committing, confirm that the script wrote no file under `decisions/` that already existed: in `git status`, each such file shows as `??`, and nothing under `decisions/` shows as `M`.

- **The reading** ([`open-branches-remake.txt`](checks/open-branches-remake.txt)): on #303 the script writes `RD-67.md`, and on #301 it writes `RD-65.md` and `RD-66.md`. Afterwards no `#### RD-` heading is left in the index, `--duplicates` passes, and a second run changes nothing.
- **Why the script and not by hand:** [the order](#order-against-open-pull-requests) says _"The script isn't run there, because a branch's index is older than `main`'s files, and the script would write its older text over them."_ That sentence still holds for a branch that changes an existing entry, which still makes its change by hand. A branch that only adds entries and merges cleanly has no older text of a moved entry in its index. The check that the script created only new files confirms this.
- **If either merges before the move,** rule 6's rerun moves its entries with the rest.
- **The report's two sentences are wrong, and the implementer corrects them in a dated note:** #301 has no index conflict and adds `RD-65` and `RD-66`, and #303 adds `RD-67`.
- **The order is the owner's question:** Q2, below.

**`reviewer-2`: the link opens the index, through the fragment of the index's title:** `../../.plan/00-index.md#repository-record--index`. Rule 5's second row keeps any fragment that isn't a moved entry's, so every later run keeps this link.

**`reviewer-3`: a rewritten link whose line cites a section that stays in an index opens that section, through its heading's fragment.** Rule 5's second row keeps that fragment too. `documentation.md` §6 allows a link in a record to be re-pointed in place.

- **The proof's four lines** go to the _Disposition_ section that each one names.
- **The fifth, `size-acceptance-follow-up-report.md:3`,** goes to its disposition as well. `entry.sh` still finds the three decisions that the line names, and no other path leads to the disposition.
- **The implementer reads the other candidates:** the rewritten links in [`move-classified.tsv`](checks/move-classified.tsv) (`toFile`, `toDir` and `textFile`) whose line contains `§`, `Disposition`, `Owner decisions`, `_Findings_` or `_Questions_`. There are 44, the proof's five among them. The implementer re-points each link that cites a section that stays in an index.
- **Rejected: a rule in the script.** `§` doesn't tell an index's section from a decision's: `size-pass-unit-report.md:3` cites `DRD-51` (§First unit). So these lines are read by hand, as rule 5 says, and the fix is made in the source.

**`reviewer-4`: accepted as it is, except for two links.** Each link's text cites where the entry was when the record was written, and its target is where the entry is now, which is what `RD-64` property 6 asks. Changing the text of 115 links would edit records' text for a move, which rule 7 and `documentation.md` §6 don't allow.

- **The two exceptions** are change-record rows whose link opens a directory although the row names one decision. They are re-pointed to that decision's file: `.agents/docs/review-findings.md:31` to `../../.plan/decisions/RD-1.md`, and `CONTRIBUTING.md:454` to `packages/drag/.plan/decisions/DRD-29.md`.
- **A later run keeps them,** because a link to a decision's file doesn't point into an index.

**Q2, for the owner: the order of #302, #301 and #303.** `RD-64` property 7 says _"The unit merges when no open branch changes a decision entry in an index"_. That condition doesn't hold while #301 and #303 have their entries in the index.

- **(a) Recommended: the order is free.** Whichever pull request is ready first merges first, and #302 merges once its fixes pass their recheck. Property 7's first sentence is amended in place, with its former text, to _"changes an existing decision entry"_. A branch that adds an entry remakes it after the move, by the script, as described above, and the check makes it do so. The amendment changes when the unit merges, not what the tree holds after the merge. With the check in place, the order doesn't affect correctness, and #302 doesn't have to hold a 290-file move against `main` while `main` keeps changing.
- **(b) #301 and #303 merge first.** Then #302 merges `main` and runs the script again by rule 6. Property 7 stays as written. #302 waits for #301's remediation of `RD-66` and its seven findings, and for their recheck, and every merge of `main` in the meantime means another rerun.

**Answered on 2026-11-26 by the owner, (a),** relayed by the coordinator: _"(a)"_. Recorded by the architect the same day. The order is free, and `RD-64` property 7 is amended in place as (a) says, with its former text in `RD-64`'s dated note. Nothing else in the plan changes.

**Dated 2026-11-26 by the architect, on the recheck's `recheck-1`** ([recheck](../reviews/decision-files-1/recheck-claude.md), read at `2cf0fcadf`), requested by the coordinator. **Rule 6 is amended: a rerun keeps the branch's own changes to decision files.** The script regenerates every entry that is in an index, and a merge that takes `main`'s side of an index conflict puts back every entry in the conflicting hunk. So the rerun writes `RD-64.md` again from `main`'s text, and it drops property 7's amendment and both dated notes. Rule 6 said: _"When `main` changes again before the merge, the implementer merges `main`, resolves each index conflict with `main`'s side, and runs the script again."_ It now has three steps more:

1. **The script's output is committed alone,** so rule 7 still holds.
2. **The branch's changes to decision files are applied again:** `git diff <S> <H> -- .plan/decisions packages/drag/.plan/decisions | git apply --3way`, in a commit of its own. `<H>` is the branch's head before the merge. `<S>` is its last commit that is the script's output alone, `e94ab0e9b` until a rerun. A conflict means that `main` changed the same entry, and it is resolved by hand.
3. **The reading shows** `git diff --stat <H> HEAD` over the two `decisions/` directories and the two indexes. It lists only the entries that `main` changed.

- **Probed by the architect** in a scratch clone, not committed. A commit on `e457ed209` that adds a note to `RD-10` was merged into `2cf0fcadf` with `-X theirs`, and the script was run. The diff then listed `RD-10.md` and `RD-64.md`. After step 2, which applied cleanly, it listed `RD-10.md` alone, and `--duplicates` passed.
- **Rejected: the amendment and notes in the index.** An entry in an index fails the check, and property 1 puts a decision in its file.
- **Rejected: a guard in the script.** The script can't tell `main`'s newer text from the branch's older text without the merge's history. Steps 2 and 3 have that history.
- **What the implementer owes:** a reading of a rerun with an index's entries present, in place of [`fixes-rerun.txt`](checks/fixes-rerun.txt)'s run on emptied indexes. It is the probe above with steps 1 to 3 committed in a scratch clone: `main`'s change in its file, and `RD-64.md` as it is at the head.
- **In practice:** while no existing decision entry changes on `main` before #302 merges, no rerun puts an entry back, and none of this runs. [The order's](#order-against-open-pull-requests) window already asks the coordinator to route no change of a decision entry into an index meanwhile. #301 and #303 only add entries, and they take the remake path, which writes only new files.