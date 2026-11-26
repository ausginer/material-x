# Every row move is animated (#265 r4): recheck of the remediation

**Lens:** `reviewer`, the recheck that `DRD-72`'s last ruling owes, of `#265 r4` for pull request #275. Requested by the coordinator. The [feature proof](proof-reviewer.md) at `7afeebd11` was mine.

**Commit read:** `9b36f075e` on `drag/displacement-1`, the remediation. "`main`'s source" below is `packages/drag/src` at `ee0afea12`, the merged `main`.

**Outcome: accepted. No finding.** `reviewer-1` of the proof is repaired in Chromium, Firefox and WebKit. Each case that it named is still, and so are 18 more cases of mine at the ends of the list. Each new row passes on the head and fails under its mutation, with the same counts in the three engines. Two observations and the trial's notes are at the end.

## Method

As in the proof: probes of my own and the architect's, with real input, rows animations of an hour, each row's drawn center sampled in every frame, and a change of 1 px between two frames called a jump. They ran as untracked files in `packages/drag/tests`, one engine at a time, and were removed. Mutations were written into `src` and restored, and `git status` shows only this report. The drag build in the package root was rebuilt from the head before the `shipped` and `consumer` projects ran. Outputs are in [`recheck-reviewer-probes/`](recheck-reviewer-probes/), with trailing spaces removed.

- [`proof-append`](proof-reviewer-probes/proof-append.browser.test.ts.txt) and [`proof-cases`](proof-reviewer-probes/proof-cases.browser.test.ts.txt) are the proof's, and [`commit-around`](../../displacement-1/probes/commit-around.browser.test.ts.txt) is the architect's. Each ran on the plain item for `y()` and `xy()`, with a landing and without.
- [`proof-ends`](recheck-reviewer-probes/proof-ends.browser.test.ts.txt) is new. It is `commit-around`'s harness with 18 cases whose gap or commit is at an end of the list: a key move to the first and to the last place, with every row appended, with a verdict after 50 ms, and with the old order put back and a rejection; a drop on the first and on the last row, with every row appended, prepended, or put back and rejected; the item put last, last but one and first; `after(previous)`; neighbors moved; and a flick to the last place. None of the new rows has a gap whose next row is absent.
- The mutations of [`mutations.mjs`](recheck-reviewer-probes/mutations.mjs.txt) are the implementer's four new ones, with the text of [`mutate.mjs`](../../displacement-1/probes/mutate.mjs), and four of mine. _The placeholder's parent is not compared_ ran with `mutate.mjs` itself.

## Scope

**Covered:** what `DRD-72`'s last ruling gives the recheck, in Chromium, Firefox and WebKit, one at a time: `proof-append` and `commit-around`, the 47 cases of `proof-cases` for the plain item on `y()` and `xy()`, the rows of its items 2 and 3, and the first two witnesses of 2. `proof-props`' reads of the array and its counts without `displacement`, in Chromium. Also the files that compose a displacement, in the three projects of each engine, the size gate, the README's and `onReorder`'s new texts against #265 and `DRI-22`, and the pull request's description and checks.

**Not read, by the ruling:** the load runs, the scroll, the size of an item in WebKit, and the lists of `DRF-57`.

**Not read:** Safari, touch and a pen, assistive technology, a long list, and a framework's own commit. The drag files that compose no displacement: the change passes them only a `null`, and CI passes at this head (13 checks succeed, 2 are skipped). The mutations in the `consumer` project, and my own mutations against the rows of other files. `docs-build`, typecheck and lint: this review changed no source. The ancestors, child visuals and list styles of `proof-cases`, which the ruling leaves out.

## Results

| Check | Chromium | Firefox | WebKit |
| --- | --- | --- | --- |
| The affected files, three projects ([files](recheck-reviewer-probes/files.txt)) | 540 pass | 534 pass, 6 skipped | 534 pass, 6 skipped |
| `proof-append`, 24 lines ([append](recheck-reviewer-probes/append.txt)) | 24 still | 24 still | 24 still |
| `commit-around`, 76 lines ([commit-around](recheck-reviewer-probes/commit-around.txt)) | 64 still, 12 jump | 64 still, 12 jump | 64 still, 12 jump |
| `proof-cases`, 188 lines ([cases](recheck-reviewer-probes/cases.txt)) | 184 still, 4 jump | 184 still, 4 jump | 184 still, 4 jump |
| `proof-ends`, 72 lines ([ends](recheck-reviewer-probes/ends.txt)) | 72 still | 72 still | 72 still |

- **The affected files** are those that compose a displacement or a sink: `callbacks`, `destruction`, `displacement-sink`, `displacement`, `hot-path`, `layout-animation`, `sortable`, `stories` and `y-geometry`. The six skipped rows are the retention rows of `destruction` and the allocation rows of `hot-path`, which run in Chromium only.
- **`proof-append`:** each case of `reviewer-1` is still, where the proof read jumps of up to 164.9 px.
- **`commit-around`:** the 12 lines that jump are the three commits that a frame draws before their verdict: _all at once, accepted at 50_ for a key and for a drop, and _all, then fails: old order appended, rejected at 50_. #265 property 8 and `DRI-22` give them, and they are the 12 of the implementer's [reading](../../displacement-1/checks/remediation-commit-around.txt). The drop's jump is in the first frame in each engine. A key's is in the first frame or a later one, as the engine draws the commit.
- **`proof-cases`:** the 4 lines that jump are _absent r2, the array empty_, a collection emptied with the item in it, which the architect ruled outside the operation (`DRD-72`'s last ruling, 7). Each other case is still.

**The rows and their witnesses** ([mutations](recheck-reviewer-probes/mutations.txt)), of the 140 rows of `displacement.browser.test.ts`, the same in each engine:

| Mutation | Rows that fail | Its row |
| --- | --: | --- |
| None | 0 |  |
| The rows not read from the gap | 48 | 2, first witness: each new row but the four of the `onStart` cancel |
| The rows read from the gap of an operation that hasn't dropped | 4 | 2, second witness: the `onStart` cancel |
| The gap restored wherever the item stands | 2 | 2, third witness: the rects' rows of `xy()` |
| A lost anchor of the drop's gap not checked | 1 | the drop's anchor that left the container |
| The placeholder's parent is not compared | 1 | 3: the item moved to another container |
| own: the drop's gap anchored on its next row alone | 2 | the item put in the first place |
| own: the gap restored only in a return home | 36 | the accepted commits around the placeholder |
| own: the gap restored only for an accepted item | 12 | the put-backs that reject or throw |
| own: the gap restored on the far side of its anchor | 48 | as the first |

My four mutations also make `proof-ends` jump in 32, 28, 8 and 36 of its 72 lines, and `commit-around` in 12, 48, 28 and 64 of 76, in each engine. Under the first of them, `commit-around` reads as on the head, because none of its gaps is at the end of the list.

**Property 7** ([props](recheck-reviewer-probes/props.txt)), Chromium, on copies that the suite's oracle doesn't instrument: without `displacement`, the counts of rects, `offset` sizes, computed styles, `matchMedia`, `compareDocumentPosition`, `animate`, the pulls and the reads of the array are the same as `main`'s source in each of the 28 lines. With it, the array is neither pulled nor read after the drop or at a cancel. The 56 lines are the same as the proof's head, `cc2f71f3a`, so the cases that the probe reads cost no read more.

**Sizes** ([sizes](recheck-reviewer-probes/sizes.txt)): `aube exec just size` passes. Brotli is _sortable + y_ 6698 (+160), _sortable + xy_ 6651 (+145) and _complete_ 7554 (+398), as the implementer read. These are the ceilings.

**Texts:** the JSDoc of `onReorder` and the README's two passages say what `DRD-72`'s ruling asks in its items 4 and 5, and claim nothing beyond `DRI-22`. The pull request's description names `r4`.

## Observations

Not findings: each is below a rule that the record states.

1. **_complete_ is 5 B above the cost that the coordinator names as accepted,** +398 for +393, the architect's candidate. `DRD-72` returns a row to the owner when it is more than 100 B above the candidate's reading, so it doesn't return. The two compositions without `displacement` are below theirs, by 56 and 62 B.
2. **The README's limit doesn't say "also to another line with `xy()`",** which #265 property 1 and `DRI-22` say. #265 property 1 says that the documentation says the rows may jump, and the README says that they may jump. The ruling's item 5 gave the README's text, and this is that text. Whether the line is owed is the architect's call.

## The trial of `repo:RD-56`

- **Runs:** one, `node .scripts/finding.ts 265 r4`. No refusal. It printed `#265 r4 tier:A OPEN`, the body at `Revision 4` with the architect's stamp, four amendments, and _Comments left out: 0_. The issue's page wasn't read.
- **What the tool printed that doesn't match the record, or that I couldn't check against the head:**
  - **The cost has three numbers in three texts.** The body's Q1 still names the cost of the first candidate, about 0.2 kB and 0.36 kB, which is +235/+209/+360 in `DRD-72`. Its answer, (a), was given on those numbers. The cost that the coordinator names as accepted, +216/+207/+393, is in `DRD-72`'s last ruling only. So the body that governs has no number to read the head's size against, and its "Q1 (a)" accepts a cost that the head exceeds in _complete_ by 38 B. The coordinator had to say which number applies.
  - **_Evidence_ begins "Read at `e57c9f074`."** The amendments say that the evidence names its later readings, and they are inside parentheses after that sentence (`60caca966`, `7afeebd11`). One "Read at" line names one commit for readings of three.
  - **Property 3, "a rejection after which the page has put every row back so, if no frame came between":** "so" can be read as "in its new order", the sentence before, or as "back", the old order. The rows and `DRI-22` read it as the old order. A put-back at 50 ms, with a frame between, falls under property 8.
  - **Property 1's "and the documentation says so"** doesn't say which of its words the documentation owes (observation 2).
  - **Two witnesses that the recheck reads aren't in the body.** "With the put-back in an operation that hasn't dropped" and "wherever the item stands" are `DRD-72`'s list alone. The body's property 3 witness is the first of the three. The implementer's note says the same of the list.
- **Having two texts:** for this recheck the body and `DRD-72` didn't disagree on behavior. They differed only on the numbers above and on the witnesses, which the list named and the body didn't.

## Verification of this report

Markdown and saved text only. `oxfmt` on the report, `git diff --check`, and the root format check. The relative links were checked against the files with a script. Lint doesn't apply to Markdown.