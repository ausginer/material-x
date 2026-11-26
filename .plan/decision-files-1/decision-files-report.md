# A file per decision — report

**Items 1 to 4 of the [plan](decision-files-plan.md#work-list), by the implementer, on 2026-11-26,** on `repo/decision-files-1`, from `d8954069e`. Requested by the coordinator. Item 5, the move, waits for #297, #293, #295 and #298 on `main` (Q1 (a)), and nothing has moved. Items 6 and 7 come with it. The code is at `e2a0e05eb`.

## The resolver, and a ruling that the plan doesn't have yet

`.scripts/entry.ts`: the `drag` and `repo` rows read `.plan/decisions` after their other documents. **In the working tree, a current-state path that doesn't exist reads as no documents,** and any other error of `stat` still throws. Without that, every lookup and `--duplicates` failed on this branch from the rows' commit until the move, because the directory doesn't exist before it, and git can't commit an empty one. The plan said that nothing else in the file changes. The implementer asked, and **Mx Architect B ruled (a)** the same day, relayed by the coordinator: the condition, a fourth row, and its witness. Mx Architect adopts the ruling in the plan's text.

**Rows,** in `.scripts/entry.node.test.ts`, in a block of their own:

1. An entry in `.plan/decisions/RD-1.md` resolves as `repo:RD-1`, and one in `packages/drag/.plan/decisions/DRD-1.md` as `drag:DRD-1`.
2. An identifier in an index and in a decisions file fails the lookup as a duplicate, and `--duplicates` names both places.
3. `--duplicates HEAD` at a commit without the directory reads the index alone and passes, while the working tree, which adds the directory and the same identifier, fails.
4. In a working tree without the directory, a lookup of an index entry resolves, and `--duplicates` passes.

**Witnesses** ([reading](checks/resolver-witnesses.txt)): without the directory in the two rows, rows 1, 2 and 3 fail. Row 3 fails too, because its working tree then passes. Without the condition, row 4 fails with `ENOENT`, with every other row whose fixture has no directory, and the rows that read this repository.

## The script

[`probes/move.mjs`](probes/move.mjs), from rules 1 to 7. Each file is what `entry.sh` prints for the entry, with drag's status row as the paragraph after the heading and its relative links rewritten. Each index keeps its other text, and each emptied section keeps its heading and one sentence with a link to `decisions/`. Drag's _Owner decisions_ keeps its preamble after that sentence. _Decision status_ goes. A Markdown file here ends without a newline, as `.editorconfig` says, so the files and the indexes do too.

**Two readings of the rules,** for the architect to confirm:

- **A status row's links.** 121 relative links in drag's status rows were written from the index. The script rewrites them by rule 4, as the entry's, so they resolve from `decisions/`. Rule 2 says that the row's text becomes the paragraph, and rule 4 names only the entry's links. Without the rewrite, the dry run broke 121 links, and property 6 doesn't allow that.
- **A fragment link in an index's own text.** `.plan/00-index.md:3533`, in _Findings_, links to `#rd-31--…`. The script reads it as rule 5's first row, a link into an index with a moved entry's fragment, and it becomes `decisions/RD-31.md`. The plan's probe skips a fragment link in the same file, so its table doesn't count it.

**Other choices** the rules leave open: a link in a fenced block or in an inline code span isn't read. A link to a directory keeps its trailing `/`. A same-file fragment link in a moved entry is resolved against the index, so `#rf-136--…` in `RD-59` becomes `../00-index.md#rf-136--…`.

## The dry run

At `e2a0e05eb`, in a scratch clone, not committed ([reading](checks/dry-run.txt), [every link it classified](checks/dry-run-classified.tsv)). The plan's table, read at `6aa5330e3`, against the dry run:

| What | Plan | Dry run |
| --- | --: | --: |
| Entries `RD`, `DRD`, `DRO` | 62, 72, 21 | 62, 72, 21 |
| Bytes | 499,595 and 533,569 | 499,533 and 533,476 |
| Relative links inside the entries, and fragment links | 592 and 1 | 592 and 1, with the 121 of the status rows: 713 |
| Rule 5, a moved entry's fragment | 4 | 5, with the index's own |
| Rule 5, another fragment | 4 | 4 |
| Rule 5, one identifier | 61 | 61 |
| Rule 5, several identifiers | 75 | 72 |
| Rule 5, unchanged | 209 | 212 |
| Status rows | 72 | 72 |

The bytes differ by one per entry: the plan's probe counts a line break at the end of each entry, and the script doesn't. The fragment row differs by the link of `.plan/00-index.md:3533` above. **Three links move from _several identifiers_ to _unchanged_,** and they are the lines below.

**Left to a person, and not decided** (stop):

| Line | The link's text, and its target | What the rule does, and why it isn't decided |
| --- | --- | --- |
| `.plan/list-sortable-1/list-sortable-plan.md:9` | `repo:RD-31`, to `../00-index.md` | The line names `repo:RD-31` and `drag:DRD-70`, so rule 5 sends it to `.plan/decisions/`. The link's own text names `RD-31`, whose file is `../decisions/RD-31.md` |
| the same line | `drag:DRD-70`, to `../../packages/drag/.plan/00-index.md` | The same line, so rule 5 sends it to drag's `decisions/`. Its text names `DRD-70` |
| `packages/drag/.plan/displacement-1/displacement-plan.md:3` | `DRD-72`, to `../00-index.md` | The line names `DRD-72` and `repo:RD-60`, so rule 5 sends it to drag's `decisions/`. Its text names `DRD-72` |

The script keeps these three, so they still link to an index, and reports them. Rule 5 judges by the line, and each line names one decision of each scope. The candidate the architect may rule: when the link's own text names one moved identifier of the link's scope, the link goes to that identifier's file. `.plan/00-index.md:1373`, also reported, is code: `static [Symbol.hasInstance](o)`, in `RD-26`, and isn't a link.

**The checks on the dry run's tree:**

- **`RD-64` property 2's witness** ([reading](checks/dry-run-witness.txt), [probe](probes/witness.mjs)): for each of the 155 identifiers, `entry.sh` at `e2a0e05eb` and on the dry run's tree print the same text with each link target masked and the status paragraph left out. 592 link targets differ, and 72 status paragraphs are added. No identifier differs in anything else.
- **Relative links** ([reading](checks/dry-run-links.txt), [probe](probes/links-resolve.mjs)): 37 don't resolve before and 37 after, the same 37, all older than this unit. The count of links grows by 5: the three sections' sentences, the fragment of `RD-59` and the index's own fragment, which were same-file links before.
- `entry.sh --duplicates` passes. The script run again on its committed output changes no file. `oxfmt --check` passes on the 284 changed and new Markdown files.

**A scratch worktree, against `AGENTS.md`.** The first dry run used a `git worktree add` in the session's scratch directory, which `agent-workflow.md` forbids without the owner's word. It was removed, and every reading above was made again in a scratch clone.

## The documents

`CONTRIBUTING.md`'s _Reading one entry of a record_ with a row in its change record, `agent-workflow.md`'s bullet and its sentence on `RD-`, `review-findings.md`'s sentence, `documentation.md` §8's row with a §9 row, and the two indexes' preambles. Each says where a decision is, and each `awk` example reads a finding: `drag:DRF-13`, `repo:RF-1` and `drag:DRF-1`. No link is added to a `decisions/` directory, which doesn't exist until the move.

## Checks

`.scripts/entry.ts` and its tests: `oxfmt`, `oxlint` and ESLint, `tsc -p tsconfig.json`, and the `repo` Vitest project, 171 rows. The Markdown: `oxfmt`, the links by `links-resolve.mjs`, with the same 37 that don't resolve at `d8954069e`, and `git diff --check`.

## Open

- The three links above, for the architect.
- The two readings of the rules above, for the architect to confirm.
- **The root format check fails on `probes/links.mjs`,** the architect's probe, which is unformatted since its commit, `49b332966`. Every other file passes. This unit doesn't change it.
- Items 5 to 7, after #297, #293, #295 and #298 merge.