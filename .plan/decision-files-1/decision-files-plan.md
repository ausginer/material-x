# A file per decision — plan

**Status: proposed on 2026-11-26 by the architect, for `repo:RD-64`, which the owner accepted the same day:** _"RD-64 - да"_ ("RD-64, yes"), relayed by the coordinator. This branch, `repo/decision-files-1`, is from `origin/main` at `6aa5330e3`. **The owner answered [Q1](#questions) on 2026-11-26, (a): the move waits until #297, #293, #295 and #298 have merged.** It said: _"The plan waits for the owner's answer to Q1 before the move is timed."_ The implementer can start on items 1 to 4 of the [work list](#work-list) now.

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

**Dated 2026-11-26 by Mx Architect B, on the rerun's one stop** ([report](decision-files-report.md), [changes](checks/dry-run-changed.txt), at `95d7b7dd0`), requested by the coordinator. `.plan/findings-on-github-1/findings-on-github-plan.md:3` ends ``"`RD-56` states what holds [before and after the cut-over](../00-index.md)."``, quoted in code so that the move leaves the quote as it was. The link means `RD-56`, and at `e2a0e05eb` rule 5's fourth row sent it to `RD-56`'s file. Main's merge (#297) added `RD-63` and `RD-64` to the line, and the link's text names no identifier. So the fifth row now sends it to `decisions/`, as the rules say.

- **The link is pointed at its entry in the source, outside the move:** its target becomes `../00-index.md#rd-56--…`, the fragment of `RD-56`'s heading. That is a re-pointed link, which `documentation.md` §6 allows in place, in this note's commit, which isn't the move's. The move then sends it to `../decisions/RD-56.md` by rule 5's first row, on this and every later run. Rules 6 and 7 hold: the move's commit is still the script's output alone, and the script has no exception.
- **Rejected, a named exception in the script:** one exception invites the next, and a rerun after a later change of that line would carry an exception that no longer fits.
- **Rejected, deciding by the sentence instead of the line:** splitting Markdown into sentences is fragile, because of code spans, abbreviations and links that contain periods, and it changes outcomes across hundreds of lines for one link.
- **Rejected, leaving it as the rules give:** the directory resolves, but it loses a target that the line had before main's merge.
- **Any later line of this kind** is fixed the same way: the link is pointed at its entry's fragment in its own commit before the move's, and the dry run reports it, as rule 5 says.

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