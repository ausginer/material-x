# A file per decision — report

**Items 1 to 4 of the [plan](decision-files-plan.md#work-list), by the implementer, on 2026-11-26,** on `repo/decision-files-1`, from `d8954069e`. Requested by the coordinator. Item 5, the move, waits for #293 and #298 on `main` (Q1 (a); #297 and #295 have merged), and nothing has moved. Items 6 and 7 come with it. The code is at `c7b7c0621`, with `main` at `4b7e6e181` merged.

## The resolver

`.scripts/entry.ts`: the `drag` and `repo` rows read `.plan/decisions` after their other documents. **In the working tree, a current-state path that doesn't exist reads as no documents,** and any other error of `stat` still throws. Without that, every lookup and `--duplicates` failed on this branch from the rows' commit until the move, because the directory doesn't exist before it, and git can't commit an empty one. The plan said that nothing else in the file changes. The implementer asked, and **Mx Architect B ruled (a)** the same day, relayed by the coordinator: the condition, a fourth row, and its witness. **The plan adopts the ruling at `57f3e6cac`, by Mx Architect B's dated note.**

**Rows,** in `.scripts/entry.node.test.ts`, in a block of their own:

1. An entry in `.plan/decisions/RD-1.md` resolves as `repo:RD-1`, and one in `packages/drag/.plan/decisions/DRD-1.md` as `drag:DRD-1`.
2. An identifier in an index and in a decisions file fails the lookup as a duplicate, and `--duplicates` names both places.
3. `--duplicates HEAD` at a commit without the directory reads the index alone and passes, while the working tree, which adds the directory and the same identifier, fails.
4. In a working tree without the directory, a lookup of an index entry resolves, and `--duplicates` passes.

**Witnesses** ([reading](checks/resolver-witnesses.txt)): without the directory in the two rows, rows 1, 2 and 3 fail. Row 3 fails too, because its working tree then passes. Without the condition, row 4 fails with `ENOENT`, with every other row whose fixture has no directory, and the rows that read this repository.

## The script

[`probes/move.mjs`](probes/move.mjs), from rules 1 to 7. Each file is what `entry.sh` prints for the entry, with drag's status row as the paragraph after the heading and its relative links rewritten. Each index keeps its other text, and each emptied section keeps its heading and one sentence with a link to `decisions/`. Drag's _Owner decisions_ keeps its preamble after that sentence. _Decision status_ goes. A Markdown file here ends without a newline, as `.editorconfig` says, so the files and the indexes do too.

**Two readings of the rules, which Mx Architect B's note confirms at `57f3e6cac`,** and the plan's rules 4 and 5 now state:

- **A status row's links.** 121 relative links in drag's status rows were written from the index. The script rewrites them by rule 4, as the entry's, so they resolve from `decisions/`. Rule 2 says that the row's text becomes the paragraph, and rule 4 names only the entry's links. Without the rewrite, the dry run broke 121 links, and property 6 doesn't allow that.
- **A fragment link in an index's own text.** `.plan/00-index.md:3533`, in _Findings_, links to `#rd-31--…`. The script reads it as rule 5's first row, a link into an index with a moved entry's fragment, and it becomes `decisions/RD-31.md`. The plan's probe skips a fragment link in the same file, so its table doesn't count it.

**Other choices, which the note also confirms:** a link in a fenced block or in an inline code span isn't read. A link to a directory keeps its trailing `/`. A same-file fragment link in a moved entry is resolved against the index, so `#rf-136--…` in `RD-59` becomes `../00-index.md#rf-136--…`.

**Rule 5's third row,** from the same note: a link with no fragment whose own text names one moved identifier of the scope it links to, qualified by that scope's name or unqualified, and no finding, goes to that identifier's file. It comes before the two rows that read the line. The script reads a link's text from its `]` back to the matching `[`.

## The dry run

At `cdbf8c757`, with `main` at `4b7e6e181` merged, rule 5's third row and Mx Architect B's ruling on the last stop, in a scratch clone, not committed ([reading](checks/dry-run.txt), [every link it classified](checks/dry-run-classified.tsv)). The plan's table, read at `6aa5330e3`, against the dry run:

| What | Plan | Dry run |
| --- | --: | --: |
| Entries `RD`, `DRD`, `DRO` | 62, 72, 21 | 64, 72, 21, with #297's `RD-63` and `RD-64` |
| Bytes | 499,595 and 533,569 | 519,533 and 533,956 |
| Relative links inside the entries, and fragment links | 592 and 1 | 597 and 1, with the 121 of the status rows: 718 |
| Rule 5, a moved entry's fragment | 4 | 6, with the index's own and the ruled link |
| Rule 5, another fragment | 4 | 4 |
| Rule 5, the link's text names one identifier | — | 16 |
| Rule 5, the line names one identifier | 61 | 55 |
| Rule 5, the line names several identifiers | 75 | 68, with the plan's quotation below |
| Rule 5, unchanged | 209 | 206 |
| Status rows | 72 | 72 |

The bytes differ by one per entry from the plan's probe, which counts a line break at the end of each entry, and by what `main` added since. **The script leaves no link to a person.** It reports the links in code and keeps them: `.plan/00-index.md:1375`, `static [Symbol.hasInstance](o)` in `RD-26`, and this report's own quotations of the link below.

**What changed from the first dry run,** at `e2a0e05eb` ([every link](checks/dry-run-changed.txt), keyed by file and line text, because the merge moved the index's lines):

- **11 links get a new target by the third row,** each the file of the identifier that its text names: `.agents/docs/test-architecture.md:160` (`RD-2`), `.plan/card-1/card-plan.md:3` (`RD-53`), `.plan/list-sortable-1/list-sortable-plan.md:3` (`RD-31`) and `:9` (`RD-31` and `drag:DRD-70`), `.plan/reviews/card-1/feature-proof-claude.md:3` (`RD-53`), `.plan/slider-1/slider-plan.md:3` (`RD-55`), `.plan/top-app-bar-1/top-app-bar-plan.md:3` (`RD-54`), `.plan/trait-decorators-1/trait-migration-plan.md:5` (`RD-26`), `.plan/trait-private-fields-1/trait-private-fields-plan.md:7` (`RD-33`), and `packages/drag/.plan/displacement-1/displacement-plan.md:3` (`DRD-72`). Five of them went to a directory before, and six were unchanged, the three that the first run left to a person among them.
- **5 links keep their target,** and the third row decides them instead of the line's one identifier.
- **One link changed because `main` changed its line: decided.** `.plan/findings-on-github-1/findings-on-github-plan.md:3`, ``RD-56` states what holds [before and after the cut-over](../00-index.md)``. With `RD-63` and `RD-64` added to its line, rule 5 sent it to `../decisions/`, though it means `RD-56`. **Mx Architect B ruled at `cdbf8c757`:** the link carries `RD-56`'s fragment, `#rd-56--a-finding-lives-in-one-github-issue-whose-body-is-its-contract-and-the-registers-hold-decisions`, so rule 5's first row sends it to `../decisions/RD-56.md`, with no change to the script. The dry run at `cdbf8c757` does so ([changes](checks/dry-run-changed.txt)).
- **A new link, and the rules make it a misquotation** (stop): `.plan/decision-files-1/decision-files-plan.md:55`, Mx Architect B's note at `cdbf8c757`, quotes the line above as it was, in link syntax: ``_"`RD-56` states what holds [before and after the cut-over](../00-index.md)."_``. The quoted link resolves to the index and its line names `RD-56`, `RD-63` and `RD-64`, so rule 5's fifth row sends it to `../decisions/`, and the quotation no longer reads as the line did. The script does what the rules say. The text is the architect's, and this report changes nothing in it. Writing the quotation in code, as this report does, takes it out of the move.

**The checks on the dry run's tree:**

- **`RD-64` property 2's witness** ([reading](checks/dry-run-witness.txt), [probe](probes/witness.mjs)): for each of the 157 identifiers, `entry.sh` at `cdbf8c757` and on the dry run's tree print the same text with each link target masked and the status paragraph left out. 597 link targets differ, and 72 status paragraphs are added. No identifier differs in anything else.
- **Relative links** ([reading](checks/dry-run-links.txt), [probe](probes/links-resolve.mjs)): 37 don't resolve before and 37 after, the same 37 targets, all older than this unit. Two of them are in `RD-3` and `RD-4`, and after the move they are in their files, rewritten from there. The count of links grows by 5: the three sections' sentences, the fragment of `RD-59` and the index's own fragment, which were same-file links before.
- `entry.sh --duplicates` passes. The script run again on its committed output changes no file. `oxfmt --check` passes on the 290 changed and new Markdown files.

**A scratch worktree, against `AGENTS.md`.** The first dry run used a `git worktree add` in the session's scratch directory, which `agent-workflow.md` forbids without the owner's word. It was removed, and every reading above was made again in a scratch clone.

## The documents

`CONTRIBUTING.md`'s _Reading one entry of a record_ with a row in its change record, `agent-workflow.md`'s bullet and its sentence on `RD-`, `review-findings.md`'s sentence, `documentation.md` §8's row with a §9 row, and the two indexes' preambles. Each says where a decision is, and each `awk` example reads a finding: `drag:DRF-13`, `repo:RF-1` and `drag:DRF-1`. No link is added to a `decisions/` directory, which doesn't exist until the move.

## Checks

`.scripts/entry.ts` and its tests: `oxfmt`, `oxlint` and ESLint, `tsc -p tsconfig.json`, and the `repo` Vitest project, 171 rows. The Markdown: `oxfmt`, the links by `links-resolve.mjs`, with the same 37 that don't resolve at `d8954069e`, and `git diff --check`.

## Open

- **`.plan/decision-files-1/decision-files-plan.md:55`,** the quotation above, for the architect.
- Items 5 to 7, after #293 and #298 merge.