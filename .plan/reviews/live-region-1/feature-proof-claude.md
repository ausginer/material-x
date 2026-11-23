# The sortable list's announcement and live region (RF-103) — feature proof

**Files were read at:** `333c9f7ae`, the head of #197 (`material-x/live-region-1`), in slot `b`. The base is `origin/main` at `35ea25892`, and `b80d944d0` is the move alone. Base and move readings replaced files in the same tree with their text at those commits, and the head was restored afterwards. Probes and mutations were removed after their runs. The last build in slot `b` is the head's, with core, drag and box-quad rebuilt. Browsers: Playwright's Chromium, Firefox and WebKit.

**Subject:** `repo:RF-103` in [`00-index.md`](../../00-index.md), with its eight properties, the owner's rulings and the implementer's dated paragraph; `repo:RD-31` property 4; [`observations-6`](../../observations-6/); the implementer's [readings](../../live-region-1/checks/); and the diff `35ea25892...333c9f7ae`.

**Verdict: the eight required properties and the owner's rulings are implemented as written, in the three engines, and every size and row count in the record reproduces.** No finding is a departure from the entry, and I know of none that stops the merge. `reviewer-1` (tier A) is the entry's own wording: positions compared literally can announce a move that didn't happen and silence one that did. It goes to the architect. `reviewer-2` (tier A, pre-existing) is drag's fault report when the lifted item is removed, and RF-103 doesn't cover it. `reviewer-3` (tier C) is two statements in the record and the pull request about the move's size.

## Scope

**Covered.**

- **Rows.** `tests/list`, `tests/core/polyfills` and `tests/text-field` in three engines: 623 passed, 4 skipped ([`rows.txt`](checks/rows.txt)). With the base's `sortable-list.ts`, all 39 new rows fail and the 6 existing announcement rows pass ([`mutations.txt`](checks/mutations.txt)). This is the record's witness. CI on #197 at this head passes every job that ran.
- **Properties 1 and 2, real moves only** ([readings](checks/announcements-and-overflow.txt), [probe](probes/announcements-and-overflow.browser.test.ts.txt)). The three engines agree on each of these. The region was watched for every text it was given, not only for the last one.
  - Nothing is announced when the consumer never commits, by keyboard or pointer; when it rejects; when it rejects and moves the item anyway; on <kbd>Escape</kbd> during the commit wait; when the item is removed, or moved to another list; and for commits 520 to 1,000 ms after the proposal, by keyboard, and 560, 700 and 1,000 ms by pointer.
  - The item's own position is announced for commits at the proposed slot up to 480 ms, by keyboard up and down and by pointer, and for a commit at the end by pointer. The rows cover a commit at the end by keyboard.
  - **There is no landing window.** `onEnd` runs in the same task as the release, before the landing (drag's README), and the `drag` state ends at about 500 ms with `--_drag-duration: 400ms` too ([probe](probes/landing.browser.test.ts.txt)). So a commit during the landing is after the bound, and is silent, as property 2 says.
  - Announcing `request.to` fails the two rows that commit at another slot, in each engine.
  - Two mutations fail no row: `items` read in place of `read()` in `onEnd`, and the `accepted` check widened to any result with a request. The first gives the same values, because `slotchange` has already refreshed `items` when `onEnd` runs. The second differs only when a rejected item has been moved or shifted, which no row sets up. My probe reads those cases as silent at the head. RF-103's row list doesn't ask for them, so this is a note and not a finding.
- **Property 3, overflow.** Beyond the six rows' containers, the probe compares every ancestor's and the document's scroll size in 17 more, with about 500 characters in the region: a transformed scroller, `filter`, `backdrop-filter`, `perspective`, `will-change`, `contain: layout`, `contain: paint` and `container-type` around a scroller, vertical writing mode, right-to-left, a box under 1 px, a zero-size box with borders, a rotated and a scaled box. 50 of 51 readings are equal with the region and without it. The exception is Firefox, where an _inline_ ancestor with a `filter` reads `scrollHeight` 1 with the region and 0 without. An inline box isn't a scroll container, and no ancestor outside it changes, so I don't count it against the property.
- **WebKit's overflow rows have a witness.** With `position: absolute` and no `top` and `left`, with no `position`, and with the stylesheet not adopted, 5 of the 6 rows fail in WebKit, as they do in Chromium and Firefox. The sixth, _an empty transformed box_, fails in WebKit on the base. So every WebKit row can fail on the defect RF-103 registers.
- **Why the implementer's three edits fail nothing in WebKit.** Playwright's WebKit doesn't count a fixed box in any ancestor's `scrollWidth` or `scrollHeight`. With the region at `top: 5000px` or `left: 5000px` in a transformed box, every reading is unchanged there, where Chromium and Firefox grow by the same offset (`WIT` lines). So `top`, `left` and `min(1px, 100%)` have no effect on this observation in WebKit, and no row of this form could discriminate between them. The record's limit is accurate, and it isn't a defect of the rows.
- **Fixed against absolute.** `position: absolute` with `top: 0; left: 0` passes every row in the three engines. It adds no overflow in any container I tried. RF-103 leaves the method open, so the rows are right not to separate them.
- **Properties 4 to 7** ([`sizes-and-graph.txt`](checks/sizes-and-graph.txt), [probe](probes/graph.mjs)). The module exports one function, with the template and the stylesheet in `core/polyfills/aria-notify/`. It has no queue, no priority and no detection, and `sortable-list.ts` computes the position. `useListCore` and `ListCore.ts` aren't in the diff. There is no barrel, and neither polyfill module imports the other. Of the 19 runtime entries' bundles, only `list/sortable-list` contains the module, the template's text or the stylesheet. `list/list`, the three items and both text fields contain none. The region has no `style` attribute and the shadow root has a second adopted sheet, in each engine.
- **The TODO** says to replace the module with `Element.ariaNotify` and delete it once Playwright's WebKit has the method and a check with VoiceOver passes, which is the entry's condition. It isn't in the JSDoc, so it doesn't reach a declaration.
- **Property 8.** `b80d944d0` changes only the path: the moved file is identical, two imports and the test's path and `describe` name change, and no source, test or tool file outside `.plan/` names the old path. The built `ListItemCore.js` has the same lines apart from that path, in another order.
- **Sizes.** All 20 rows reproduce at the base, the move and the head, byte for byte: `list/sortable-list` 8,701 → 8,798 B, `complete` 22,724 → 22,740 B, and the move's +13, −4 and −8 B.
- **Gates at the head:** `fmt-check` on the changed files, `lint` on the changed `.ts` files and `typecheck` in material-x pass, and `git diff --check` is clean.

**Not covered:** Safari, a screen reader (#150), the accessibility tree beyond `display` and `visibility`, a CSP on the real element, and the visual project. I ran the list, polyfill and text-field tests locally, and the rest only through CI. I didn't re-run the implementer's three CSS edits as rows. The `WIT` lines read the `position: fixed` one without offsets, with the same result.

## Findings

### reviewer-1

**Tier A. Comparing positions literally announces a move that didn't happen, and silences a committed one, when another item is inserted or removed before the verdict.** The implementer disclosed this.

- **Current behaviour** ([`shifts.txt`](checks/shifts.txt), [probe](probes/shifts.browser.test.ts.txt)), the same in the three engines, in A, B, C, D:
  - <kbd>ArrowDown</kbd> on A, the consumer doesn't commit, and Z is prepended after 100 ms. The list announces _"Item 2 of 5."_ at once, and ends the wait there, because the slot now shows A at `to`. The base does the same.
  - <kbd>ArrowDown</kbd> on C, and the consumer commits C after D and removes A, in one task or with A's removal 100 ms earlier. The order is B, D, C. C has passed D, and nothing is announced. The base announced _"Item 4 of 3."_
- **Contract.** Property 2 says nothing is announced when the item _"is then still at the position it was proposed from"_, and property 1 fixes the position as the item's. Both readings follow the text, and the positions are true. So **RF-103's properties cover these cases, and the implementation conforms.** The entry's title, _"announces moves that didn't happen"_, and `RD-31` property 4, which announces _"each accepted move by position"_, aren't met in them.
- **Why it is a problem.** It is the defect RF-103 describes, for a narrower cause: a screen-reader user who can't see the order is told of a move that another change made, or isn't told of one that they made. A list that other sources also change, such as a shared or streamed one, reaches both.
- **Required property.** Whether the announcement follows the item's move or its index is stated by the entry, including when other items change during the wait, and a row observes each case that the statement decides.
- **Routing.** To the architect, as a contract question about property 2. It isn't a departure by the implementer. The first case is unchanged by this pull request, and the second replaces a false announcement with none.

### reviewer-2

**Tier A, pre-existing, outside RF-103.** When the consumer removes the lifted item during the commit wait, or moves it to another list, `sortable/landing-placeholder-lost` is reported through `reportError`.

- **Current behaviour.** The report is one `DragFault` at the bound, in the three engines, whether the item is removed in the handler or 100 ms later. It is identical on the base ([`shifts.txt`](checks/shifts.txt)), so the claim that it is pre-existing holds. At the head the list announces nothing in this case, where the base announced _"Item 2 of 3."_
- **Contract.** Drag's own rows fix it: _"should report and skip a landing when the consumer unmounted the item, and stay usable"_ (`packages/drag/tests/landing.browser.test.ts`), and a framework row like it. `mx-sortable-list`'s JSDoc says nothing about removing the item. RF-103's eight properties don't mention it, and its row silences the report and asserts only the announcement.
- **Why it is a problem.** The list itself accepts the verdict at the bound without checking that the item is still there. A consumer whose `reorder` handler deletes the item, or moves it to another list, then gets an error report that they didn't cause and can't prevent except by rejecting the event.
- **Required property.** Whether a consumer may remove the item during the commit wait is stated, and if it may, the list reports no error for it.
- **Routing.** To the architect, to register or refuse. It doesn't belong to this unit.

### reviewer-3

**Tier C. Two statements about the move's size are wrong, and neither affects a property.**

- **The entry's.** RF-103 says of the move that _"it shows no size change by itself"_. It does: `list/list-item` +13 B, `list/list-link-item` −4 B and `text-field/multiline-text-field` −8 B, while `complete` doesn't change. So **the implementer's reading contradicts that sentence, and the reading is right.** The sentence supports the choice of a separate commit and is no property. Property 8 asks for no behavior change, and it holds.
- **The cause.** The record and the pull request's description say that the _formatter_ reorders two imports. With the imports at their original positions, `just fmt` leaves the files unchanged and `fmt-check` passes. ESLint's `import-x/order` rejects them and `lint-fix` moves them ([`import-order.txt`](checks/import-order.txt)). The rest of the explanation holds: with that order restored, all three rows return to the base's sizes exactly, and `list/sortable-list` stays at 8,798 B. The move couldn't pass lint and be size-neutral.
- **Required property.** The record states the measured change and what causes it. The entry's sentence is the architect's. The implementer's paragraph and the pull request's description are the implementer's.

## Recheck of the remediation

**Files were read at** `ceb8ec651`, against RF-103 as amended in `610b9838b`, by a reviewer that didn't make the review above. The diff from `333c9f7ae` was read in full. Evidence: [`recheck.txt`](checks/recheck.txt), with its [probe](probes/recheck.browser.test.ts.txt) and [mutations](probes/recheck-mutate.mjs.txt).

**Verdict: `reviewer-1` and `reviewer-3` are resolved, and the amended property 2 is implemented as written, in the announcement and in the wait, in the three engines.** `reviewer-2` is `drag:DRF-55`, another unit, and I didn't recheck it. Two new findings, both Tier C: `recheck-1` goes to the architect, and `recheck-2` is a missing row. Neither stops the merge. **The branch conflicts with `main`** in `packages/drag/.plan/00-index.md` (`DRF-54` there and `DRF-55` here), so GitHub runs no CI at this head: the last green run is for `610b9838b`.

- **`reviewer-1`: resolved.** An uncommitted A with Z prepended announces nothing and waits for the bound (504 ms). C committed with A removed announces _"Item 3 of 3."_ and ends the wait at the commit, in one task (57 ms) and apart (154 ms). 30 cases agree with the rule in the three engines, among them:
  - several additions and removals, uncommitted: nothing, and the wait runs to the bound; committed, in one task or apart: the item's own position, at the commit;
  - the same upward, and by pointer, with a removal of the passed items;
  - the item returned to its own place, a rejection, a commit at 700 ms, and a new item between A and B without a commit: nothing;
  - A committed and then removed at 100 ms: announced at the commit. Committed and removed in one task: nothing, with drag's report (`DRF-55`).
- **The rows.** 303 pass in the three engines. With `333c9f7ae`'s file 27 fail, nine in each engine, and they are the nine that the record names. The literal comparison fails 18 in the wait and nine in the announcement, as the record says. **The three rows that can't fail on `333c9f7ae` are able to fail:** the announcement of the insertion in the commit's task, by a count taken at the proposal; the wait of the insertion before the commit, by a wait that always runs to the bound; the announcement of the passed item's removal, by an announcement that compares with `to`. Dropping either filter, reading the others after the event, and keeping the item among them each fail rows too.
- **The JSDoc of `reorder`** says _"until the list's children show the move"_, as the ruling has it. The behavior agrees, with the one reading that the rule itself fixes: a removed passed item ends the wait with no commit, and nothing is announced.
- **`reviewer-3`: resolved.** The entry's sentence, the implementer's paragraph and the pull request's description state the three rows' change and ESLint's `import-x/order`.
- **Sizes.** Rebuilt here, the two rows reproduce byte for byte: `list/sortable-list` 8,798 → 8,846 B and `complete` 22,740 → 22,848 B. The other 18 don't change. **The difference between +48 and +108 is the compressor's, not more code:** minified, the two bundles grow by the same amount, 189 and 190 B raw. With names left unmangled they grow by +97 and +87 B Brotli, in one span of code. Mangling reassigns short names across the whole `complete` bundle (4,196 of 4,327 statements are identical), which Brotli prices by chance. The repair before it went the other way, +97 and +16 B. In total both are close: +145 and +124 B.
- **Gates:** `fmt-check`, `lint` and `typecheck` in material-x pass. `tests/list` and `tests/core/polyfills` pass in the three engines (604, 4 skipped).

**Not covered:** Safari, a screen reader (#150), material-x's other tests, and CI at this head.

### Finding: the entry states one limit of the count, and it has another

**`recheck-1`, Tier C. Routed to the architect.**

- **Current behaviour / contract:** property 2's limit says that when another source reorders the remaining items around the item, the order may be the one a commit gives, and the list _"shows the same DOM for both, and announces it"_. The implementation conforms to the count. The limit describes an announcement with no move. A silence with a move isn't described:
  - C is committed after D, and the consumer moves A last in the same task (B, D, C, A). C has passed D, and nothing is announced: A left from before C and D came, so the count is still 2. The wait runs to the bound. If A moves 50 ms after the commit, _"Item 4 of 4."_ is announced for the same final order.
  - All other items are replaced by new ones, and the item is committed among them: nothing is announced, and the wait ends at once, because no other survives. By the rule this is an item among newcomers. `333c9f7ae` would have announced it.
  - The passed B leaves at 50 ms and returns at 100 ms, and A is committed at 200 ms: the wait ended at 52 ms, so the commit is silent.
- **Why it is a problem:** a reader of the entry, or of `RD-31` property 4 (_"each accepted move by position"_), takes the false announcement for the only case. The DOM of the first limit's example isn't the commit's either: A uncommitted with D moved first gives D, A, B, C, announced as _"Item 2 of 4."_, where a commit gives B, A, C, D.
- **Evidence:** cases 10, 13, 14, 20 and 21 in `recheck.txt`, the same in the three engines.
- **Required property:** the entry states the cases in which the count can't tell a move from other sources' changes, in both directions, or the rule tells them apart.

### Finding: no row fails when the wait ignores that the item has left the list

**`recheck-2`, Tier C.** The implementer's paragraph says that an item that isn't in the list _"neither ends the wait nor is announced"_. Removing `index >= 0` from the wait fails no row of 101. The result differs: in A, B, C with A removed 50 ms after <kbd>ArrowDown</kbd>, the wait ends at 57 ms instead of 505 ms. The announcement isn't affected, and its own `index >= 0` has a row. Property 2 asks for no row of its own for this. **Required property:** the clause is observed by a row, or isn't claimed.