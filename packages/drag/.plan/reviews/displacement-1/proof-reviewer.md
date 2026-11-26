# Every row move is animated (#265 r3): feature proof

**Lens:** `reviewer`, feature proof of `#265 r3`, `DRD-72` and `DRI-22`, for pull request #275. Requested by the coordinator.

**Commit read:** `cc2f71f3a` on `drag/displacement-1`. Its source is `fcbd26a4d`'s. "`main`'s source" below is `packages/drag/src` at `5d09c0cf4`, the merge before the implementation.

**Outcome:** the properties hold on the cases that the finding and the plan list, in the three engines. Two classes of case contradict property 1, and the first also contradicts property 3: `reviewer-1` and `reviewer-2`, both tier A. `reviewer-3` is tier C.

## Method

Probes of my own, with real input, in [`proof-reviewer-probes/`](proof-reviewer-probes/). The main one ([`proof-cases`](proof-reviewer-probes/proof-cases.browser.test.ts.txt)) gives the rows animations of an hour, samples each row's drawn center in every frame, and calls a change of 1 px between two frames a jump. It has 47 cases for each set of axis, ancestor, visual, list style and landing. Another probe runs animations of 500 ms and asks that no frame draws a row further from its end than the frame before.

- **The probe discriminates.** On `main`'s source it reports a jump for each of the finding's cases. With mutations on the head it reports 72 jumps of 184 without the drop's report, and 124 without the return's.
- **One engine at a time.** Outputs: [`cases.txt`](proof-reviewer-probes/cases.txt), [`append.txt`](proof-reviewer-probes/append.txt), [`props.txt`](proof-reviewer-probes/props.txt), [`scroll.txt`](proof-reviewer-probes/scroll.txt), [`load.txt`](proof-reviewer-probes/load.txt), [`mutations.txt`](proof-reviewer-probes/mutations.txt), [`webkit-size.txt`](proof-reviewer-probes/webkit-size.txt). Trailing spaces were removed, and `cases.txt` has counts and the jumps.
- The probes ran as untracked files in `packages/drag/tests`, with the two source copies beside them, and were removed. Mutations were written into `src` and restored. `git status` shows only this report.
- Corrected during the work, so that nobody reads them as results: a first set of twenty loaded runs matched no test and was discarded. A filter hid some of WebKit's jumps, and the counts of `ok` lines showed it. The rect counts in `src` include the suite's oracle, so both sides were read again as copies that the oracle doesn't instrument.

## Scope

**Covered:** properties 1 to 8 of #265, `DRD-72` 1 to 10 and `DRI-22` where they say the same, the three points that the architect asked of the proof, and an absent item in three engines.

**Exempt by the coordinator's prompt, and not read as findings:** the JSDoc of `onReorder`, the README sentence, the absent item's row with a landing, the Chromium run of the changed files, the size gate, the pull request's "r2" and "For the architect", and `DRF-56`.

**Not read:** Safari, touch and a pen, assistive technology, the time of a long list, the consumer and `shipped` projects and the suites beside `displacement.browser.test.ts` (CI's engines pass at this head), the sizes, `bench/`, and a framework's own commit. Property 7 was read on `main`'s source only in Chromium. A child visual in a wrapping list was read in WebKit only in part, as below. The known Firefox limit, a return while a page scroll settles, wasn't repeated.

## Findings

### `reviewer-1` — tier A — a commit that inserts every row in its new order makes the rows jump and slide back

- **Current behavior:** `onReorder` commits with `for (const row of newOrder) list.append(row)` and accepts, at once or after 50 ms. The rows before the item jump by the item's size, or to another line with `xy()`, and then slide back. In a drop after a resolved move they end where they were before the jump.
- **Contract:** #265 property 3: _"The animation is true through the consumer's commit and the placeholder's release. A commit that moves the neighbor's node instead of the item's doesn't end it."_ Property 2: _"No frame of any case draws a row further from its place than the frame before."_ `DRI-22`: _"also when the commit moves the row's own node."_
- **Why it is a problem:** the consumer commits before it accepts, so this isn't the late commit of property 8. For a pointer drop it is new: on `main` the rows stand still. For a key it moves a row that the drop's write never displaced.
- **Evidence,** [`append.txt`](proof-reviewer-probes/append.txt), Chromium, Firefox and WebKit, the same numbers in each, with a landing and without:

  | Case | `main`'s source | Head |
  | --- | --- | --- |
  | `y()`, drop after a resolved move, down, up | still, still | 40 px, 40 px |
  | `xy()`, the same | still, still | 164.9 px, 80 px |
  | `y()`, key down of `r1` | 60 px, at `r2`, the row that moves | 60 px, at `r0`, which has no reason to move |
  | `xy()`, the same | 90 px, at `r2` | 90 px, at `r0` |
  | `y()`, the flick: the crossed rows | 40 px | 40 px |

  By reading: the appends leave the placeholder before every row, so the accepted item isn't beside it. The return moves the placeholder to the item, and reports what that write moved. The commit had moved the same rows by the opposite distance in the same task, so together they moved nothing.

- **Required property:** rows that the commit and the return together leave where they were drawn stay there.
- **The two texts differ here.** `DRD-72` property 1 reports _"the distance that the write moved it"_, which the implementation does. #265 property 1 asks for a move _"from where it was drawn"_.

### `reviewer-2` — tier A — in a key move, a row is animated from a place where it was not drawn, when the lift or the commit changes the flow

- **Current behavior:** the rows are read after the lift has removed the item and the placeholder has been inserted, in one task. When the placeholder doesn't replace the item's whole footprint, that place was never drawn, and the neighbor jumps by the difference in the first frame and then slides. Two lists have it:
  - **rows with margins on one side,** with no style on the placeholder. `DRI-14` says that such a list meets `y()`'s term;
  - **a visual that isn't the item,** where the item keeps a footprint of its own, such as 6 px of padding. Here the commit moves the footprint, and no report has it.
- **Contract:** #265 property 1: each row that a placeholder write displaces _"moves smoothly from where it was drawn, in the three engines and for `y()` and `xy()`: in a key move"_. With `DRD-72` property 1's text the behavior conforms, because the lift and the commit aren't placeholder writes. **Which text governs is the architect's call.**
- **Why it is a problem:** a jump is what the finding is about, and nothing that a user or an integrator reads excludes these lists.
- **Evidence,** [`cases.txt`](proof-reviewer-probes/cases.txt), first frames of a key move with a commit at once. `main`'s source was read in Chromium:

  | List | Head | `main`'s source | Engines |
  | --- | --- | --- | --- |
  | `y()`, `margin-bottom: 8px` | 8 px, then 60 | 68 px | 3 |
  | `y()`, child visual, padding 6 px | 12 px, then 60 | 72 px | 3 |
  | `xy()`, `margin: 4px` | 8 px | 83 px | Chromium |
  | `xy()`, child visual, padding, `gap: 8px` | 20 px | 100 px | Chromium |
  | `xy()`, child visual, padding, `box` is the item, key to the last place | **162.5 px** | 80.9 px | Chromium |

  The last one is worse than `main`: the placeholder is as wide as the item and stands beside the item's padding, so the row that the key crosses wraps to another line, and it is drawn from there.

- **The other cases of these lists** jump by the same 8, 12 or 20 px where the placeholder or the item is released or committed: `Escape`, a rejection and an absent item with margins, and a pointer drop with either. On `main` a resolved pointer drop has the same jump, so that part is pre-existing. A flick in `xy()` with `margin: 4px` jumps 136.7 px, for 109.1 on `main`, and the resolved drop of that list 136.7 px on both. The returns are much better than on `main` (8 px for 136.7, for example).
- **What limits it,** in Chromium: with `[data-drag-placeholder] { margin-bottom: 8px }` all 46 cases hold. A flex `gap` with the item as the visual holds. A child visual in an item of no size of its own holds. With padding, `y()`'s returns hold, and so do its absent items. No style was found that repairs the padding.
- **Seen with it:** the item isn't among the rows, so its own remaining box, if it draws one, jumps with a key, by up to 72 px in these lists.
- **Required property:** either the first frame of a key move draws each displaced row where the frame before drew it, or the contract says which lists that isn't so for.

### `reviewer-3` — tier C — a `timing` that throws once leaves a row that the operation moved nowhere drawn away from its place

- **Current behavior:** `timing` throws at its first call in a key move and not at the next. The drop's write has moved the row, and nothing is animated. The fault's return reports the opposite distance, and its row is drawn 50 px (`y()`) or 155.2 px (`xy()`) from its place, and slides back. With `xy()` and a throw at the second call, the row that was not animated jumps 10 px.
- **Contract:** #265 property 2, _"a move that the operation undoes at once [...] leaves the rows where they are"_. `DRD-72`'s implementation note says that _"a throw leaves nothing behind"_.
- **Why it is C:** only a consumer whose `timing` throws meets it, and the throw is reported as a fault, as property 10 says. The operation ends and the list is clean.
- **Evidence:** [`props.txt`](proof-reviewer-probes/props.txt), `timing throws at call`, three engines.
- **Required property:** the rows of an operation that ended by a throw of `timing` at the drop aren't drawn from where the drop put them.

## What was read for each property

| Property of #265 | Result |
| --- | --- |
| 1 | Holds in the three engines for the 46 cases of each of `y()` and `xy()`, with a landing and without: keys in both directions and to each end, with five forms of commit, a flick in both directions, each return at rest and in mid-flight, `pointercancel`, a fault, and an accepted move that isn't committed. Contradicted by `reviewer-1` and `reviewer-2`. |
| 1, an absent item | Holds in the three engines for `y()` and `xy()`, with a landing and without, at rest and in mid-flight, for the first, a middle and the last item: 24 of 24 in each engine. |
| 1, a transformed ancestor | Holds for a command and a return: `y()` in a scale and in `zoom`, `xy()` in a rotation with a scale. The three engines, but for the note on WebKit. |
| 1, a visual that isn't the item | Holds where the item has no footprint of its own. With one, `reviewer-2`. |
| 2 | Holds for a rejection at once, in a microtask, and `onReorder` that throws. At 500 ms, linear and ease-out, no frame draws a row further from its end: 24 of 24 in each engine, WebKit's four `Escape` lines read from the `Escape` on. Contradicted by `reviewer-1`, and by `reviewer-3` for a throwing `timing`. The witness was repeated: with the return after every end but a fault, 4 rows of the suite and 12 of the probe fail. |
| 3 | Holds for five forms of commit that keep the placeholder beside a row. Contradicted by `reviewer-1`. |
| 4 | Holds for a key and a pointer, with transforms and with a child visual. A press that activates nothing keeps the animation. Witness repeated: 1 row of the suite, 8 lines of the probe. |
| 5 | Holds in the three engines in a drag, a key and a return. A change alone ends nothing, and the next report ends it. Witness repeated: 5 rows. |
| 6 | Holds: 160 ms and ease-out is in the suite, and the call has no argument. |
| 7 | Holds in Chromium: on uninstrumented copies of both sources, the counts of rects, `offset` sizes, computed styles, `matchMedia`, `compareDocumentPosition`, `animate`, the pulls and the reads of the array (a proxy) are the same in 24 operations without `displacement`, and the reads of the array in 4 drags. With it, no read and no pull of the array after the drop or at a cancel, in the three engines. |
| 8 | Destruction while a verdict is pending, after the end, and in `timing` leaves no animation and no placeholder. The returns with no place to go are in the suite, and were not repeated. |

**The scroll:** a page and a box, scrolled so that the item is at the top edge, with `overflow-anchor` and without, in a key, `Escape` and a rejection: no row jumps in the three engines (16 of 16 with `displacement` in each).

**The two rows of departure 5,** Chromium, beside six busy processes, at a load of 17 to 27 on 12 cores:

- the two rows alone, twenty runs: 40 of 40 pass;
- the same with the earlier 60 s animations, twenty runs: 40 of 40 pass;
- the whole file, twenty runs: 85 of 85 in each.

No failure, so no message to save. The cause of the one earlier failure stays unestablished, and the 60 s form didn't reproduce it.

**Mutations,** Chromium ([`mutations.txt`](proof-reviewer-probes/mutations.txt)): the five witnesses that #265 names fail as the record says (40, 36, 4, 1 and 5 rows). Of nine others, five fail in the suite. Four pass in this file:

- _the last gap takes no anchor_ is equivalent: no row follows the last one;
- _the vector is not local_ fails 72 lines of the probe. The file has no transformed ancestor, and the other suites weren't run with it;
- _home kept at a rebase_ and _the placeholder's parent is not compared_ fail nothing in the file or the probe. Neither has a rebase that changes the home's neighbors, or an item that the consumer moved to another container.

## Observations, not findings

- **A WebKit layout fault, not this unit's.** An item that is sized by its content keeps its old width in WebKit when its child is lifted, in a flex line and as a float, until a layout is forced. It is so on `main`'s source and without `displacement` ([`webkit-size.txt`](proof-reviewer-probes/webkit-size.txt)). In a wrapping flex list with a child visual, 36 of 46 lines jump at the head and 40 on `main`. With floats and a rotated ancestor, 43 of 46 lines hold, and the other three are this fault. So the combination of `xy()`, a child visual and a transformed ancestor is read in WebKit only in part. The combination with the item as the visual holds.
- **The collection emptied with the item in it:** when a pull returns no row at all and the rows stay in the list, the rows jump. They aren't rows of the operation then.
- **`timing` is called as a method of the private sink,** so a `timing` written as a method that reads `this` gets the sink. Its type has no `this`.

## For the trial of the findings tool

- **Read:** the tool's output for `265 r3`, with its three amendments, once. `DRD-72` in `00-index.md` with its notes, `DRI-22`, `DRF-56`, the plan and `displacement-1/`. The pull request's description and checks. **The issue's page wasn't read.**
- **The tool:** exit 0, no refusal, no error, `Comments left out: 0`.
- **Two texts of one property.** #265 property 1 says _"moves smoothly from where it was drawn"_, and `DRD-72` property 1 _"with the distance that the write moved it"_. They agree on a plain list and differ in `reviewer-1` and `reviewer-2`, where the implementation follows the second. `findings.md` says that the body alone is the contract, and the body says that `DRD-72` has the decisions that change a public surface or a contract. Neither says which one governs where they differ. I judged by the body and report the difference.
- **Witness text and record:** property 2's witness in the body is the record's _fault's return removed_ under another name. It was found by the count.
- **The revision:** the plan says `r2` still in its work list, as history. Nothing depended on it.

## Verification of this commit

Markdown and saved text only. `oxfmt` on the report, `git diff --check`, and the root format check. The relative links were checked against the files. Lint doesn't apply to Markdown.