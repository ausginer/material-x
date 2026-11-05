# Targeted recheck of D-209's remediation

**Tree read.** Input `cfed5f9daedb9ea5476874c28b2cb603487e00f8` on `drag2/fin-review2`, whose `src/` is `f6172d3be770c3f37ea0a1d723960ace05d61c9b`. The diff baseline is `302ab0a37`, whose `src/` is `db3c402a4`, the same as reviewed `1e5efc518`. The remediation's record stops at `980cc0053`, whose `src/` is `779b4b0f5`.

**Subject.** [`request-application-claude.md`](../architecture/request-application-claude.md) §33.12 and the remediation section of [`d209-discarded-failures.md`](../../measurements/d209-discarded-failures.md).

**Where it ran.** Private worktrees with their own installs and builds, at `cfed5f9da`, `980cc0053` and `302ab0a37`. The main checkout was not used to run anything. Each mutation was restored and `src/` re-read as clean after it. Readings and probe sources are in [`probes/d209-recheck/`](../../probes/d209-recheck/).

**Scope.** §33.12's five items: delivered outcomes and rows (ab) to (an), the permitted code hunks, member lists and declarations, Y1 to Y4, X5s, X6s and N1, the published wording, and composition, controls, the suite and lint. It also covers the owner's suppression in `cfed5f9da`, the lint attribution, and the `Promise.reject` spelling of (ae).

It did **not** cover:

- the six properties or §32.6's rows, beyond what the suite reports;
- §33.1 and §33.2's decided silences, or any further slot or carrier;
- A, a3, or any statistical or allocation round;
- RF-24, RF-25 or F-447's cause;
- `df77b8ff3`'s future-phase planning edit;
- X1, X7 and X8, which §33.10 runs and §33.12 does not list;
- browsers other than Chromium.

## Result

**No correctness or semantic defect in the diff, and no failed outcome. The only reading that differs from the record is one row count, and it is the record's miscount.** Two tier C items go to the architect. Neither touches code that runs. D-209 is not accepted here, and F-446 and F-448 stay open.

**One decision stays with the architect.** §33.11's _lint must report none_ was unmet at `980cc0053`, by one error that predates the remediation. It holds at `cfed5f9da` only because of the owner's suppression, and the record's row asking the architect to decide it is still open (reviewer-1).

## Findings

| Id | Tier | Claim |
| --- | --- | --- |
| reviewer-1 | C | The record stops at `980cc0053`: its tree hash, its lint statement and its open row all predate the suppression |
| reviewer-2 | C | (ae)'s row comment and `tests/COVERAGE.md` cell describe an `async` slot, and the row runs a non-`async` one |

**reviewer-1.**

- **Current behavior.** `d209-discarded-failures.md` names `779b4b0f5` as the new `src/` tree, says §33.11's lint requirement is not met, and keeps _Decide it, against §33.11's none_ open for the architect. The tip's `src/` is `f6172d3be`, and lint over the changed files reports nothing.
- **Why it is a problem.** §32.10 reruns its checks and records a tree. An acceptance that follows the record would name a tree that is not the tip, and the record does not say who resolved the error or how. The difference is one comment line, so nothing it measured moves.
- **Evidence.** The lint section below, and `git rev-parse cfed5f9da:packages/drag2/src`.
- **Required property.** The accepted tree and the lint outcome agree with what the record states, and the suppression's disposition is written down by its owner. Whether that is an amendment or a note belongs to the architect.

**reviewer-2.**

- **Current behavior.** §33.9 drives (ae) as _an `async` slot requests a cancel, then throws_. The row's slot is not `async`: it requests the cancel and returns `Promise.reject`. Its comment and its `tests/COVERAGE.md` cell still say `async`. The record discloses the spelling, and those two texts do not.
- **Why it is a problem.** A reader of the cell takes it that an `async` function was run. The outcome is not in doubt, as the next section shows. The gap is only in what the text says ran.
- **Evidence.** `tests/diagnostic-intake.browser.test.ts`, _should consume a rejection arriving after the cancel applied_, and `tests/COVERAGE.md`'s R33 (ae).
- **Required property.** What the coverage text says ran is what ran, or the architect accepts the spelling as discharging (ae).

## The `Promise.reject` spelling of (ae)

**It meets the required behavior, and it exercises the same path as the `async` spelling.**

- **By reading.** A throw in an `async` function's synchronous part rejects its promise before the call returns, so `invoke` receives an already rejected native promise, as `Promise.reject` gives it. `#openResolution` reads `then` and subscribes in the same call, and it distinguishes nothing else.
- **Driven, in both behaviors.** A scratch copy of the row's file ran both spellings side by side. Both show `onEnd canceled` in the log before the dispatch returns, so the rejection cannot arrive first. After `settled()`, both have delivered nothing and raised no `unhandledrejection`.
- **The row can fail.** Two probe mutations reddened the row and the `async` spelling together, in both behaviors:

| Probe mutation | Row | `async` spelling | Observed |
| --- | --- | --- | --- |
| Ma, the latch's identity test dropped | red | red | a late rejection reaches `onError` after `onEnd canceled` |
| Mb, no rejection handler subscribed | red | red | `unhandledrejection` receives the error |

**The record's reason is confirmed.** `oxlint` and `@typescript-eslint/require-await` both refuse the `async` spelling with no `await`. (y) already uses `Promise.reject`.

**Three neighbouring async routes, driven the same way in both behaviors:**

| Slot | Delivered |
| --- | --- |
| `async`, `await` first, then `requestCancel` and a throw | `onEnd canceled`, nothing else, no `unhandledrejection` |
| `async`, no request, a throw | `DraggableError` at `FAILURE_RESOLUTION`, then `onEnd canceled` |
| `async`, `requestDestroy`, with or without a held cancel, then a throw | nothing, no `onEnd`, no `unhandledrejection` |

## Lint and the owner's suppression

| Revision | `src/sortable/spec.ts` | Changed TypeScript files |
| --- | --- | --- |
| `302ab0a37` | **1 error,** line 1286, `@typescript-eslint/consistent-return` on `prepareSettlement`. `oxlint` clean | not read |
| `980cc0053` | **1 error,** the same, line 1289. `oxlint` clean | the same one error, and no other |
| `cfed5f9da` | clean under both, and clean with `--report-unused-disable-directives` | **none,** over all 13 files |

**The baseline attribution holds.** The error reads at the baseline, on a method the remediation did not touch. `spec.ts`, the lint configurations and the lockfile are all unchanged from `e2aabaf3b` to `302ab0a37`, and `prepareSettlement` dates from `bfd2832db`, so the error predates D-209. The file joined the changed set only through §33.8's comment hunk.

**The suppression clears exactly that error and changes no executable code:**

- The commit adds one comment line, and the directive is used.
- The comment-stripped diff from `980cc0053` to `cfed5f9da` is empty.
- All 52 built `.js` files and all 33 declarations are byte-identical to `980cc0053`'s. Only source maps differ, as the added line shifts them (`readings.txt` lists them).
- The doc comment above the directive stays in the source, and the class is not in a published declaration.

**The switch is exhaustive, and the compiler enforces it.** Its five arms match `SettlementInput`'s five types. Removing one arm in scratch reports `TS2366` at the method, so the suppression does not remove the check the code comment describes.

## §33.4's table and the rows

**Every row of §33.9 is present and passes at `cfed5f9da`, in the behaviors it names,** and its assertions match its required outcome.

| Route | Reported as | Seen in |
| --- | --- | --- |
| Applied live | `DraggableError`, `FAILURE_RESOLUTION` | the standing control, and the probe's `async` route |
| Discarded by destruction | `superseded-by-destruction` | (v), (ai) |
| A cancel applied ahead | `superseded-by-cancel`, after the terminal | (ab), (al) |
| A cancel applied ahead, then destruction | `superseded-by-cancel`, after the terminal | (ac), (am) |
| Cancel and destruction both held at the throw | `superseded-by-destruction` | (ad), (ai) |
| Arrived after the cancel applied | nothing | (ae), and the probe |
| Arrived after destruction applied | nothing | (y), and the probe |

(af) to (ah), (aj), (ak) and (an) read as §33.9 states. (ah) is two rows, as the record says. `should classify a malformed point rather than discarding it` is unchanged. §33.6's retitle changes no assertion, and its two lint lines report nothing.

## Hunks, members and declarations

| Against | Files differing | Comment-stripped hunks |
| --- | --: | --- |
| `980cc0053` | 1 | none |
| `3ff2d2acf`, tree `db3c402a4` | 8 | `kernel.ts` only: `#settleResolution`'s closure and `#handleResolutionSettled`'s retired branch |
| `e2aabaf3b` | 8 | `execution.ts`: the import and `#step`'s non-`LIVE` branch. `kernel.ts`: `#failOperation`'s `discard`, `#settleResolution`'s branch and the retired branch |

- **Permitted sites.** These are §33.11's sites and no others. The `src/` comments the remediation added carry no record identifier.
- **Members, by the TypeScript AST:** `ExecutionBracket` 21, `ArmedController` 75, `Kernel` 15 and `ActionQueue` 4, identical to both revisions.
- **Declarations:** 33 files. Four differ in text from the baseline, `free-drag/config`, `free-drag/controller`, `kernel/spec` and `sortable/config`, and none differs once comments are stripped.

## Mutations

Run once each at `cfed5f9da`, over the record's five files. **Every count and every reddened name equals [`remediation-mutations.txt`](../../probes/d209-implementation/remediation-mutations.txt).**

| Mutation | Pass | Fail | Must redden, §33.10                             |
| -------- | ---: | ---: | ----------------------------------------------- |
| none     |  351 |    0 |                                                 |
| Y1       |  348 |    3 | (ab), (al)                                      |
| Y2       |  345 |    6 | (ab), (ac), (al), (am)                          |
| Y3       |  342 |    9 | (ad), (ai), (v), (w)                            |
| Y4       |  347 |    4 | (af), (x)                                       |
| X5s      |  350 |    1 | (aj)                                            |
| X6s      |  339 |   12 | (ai)                                            |
| N1       |  314 |   37 | as §32.7, and (k) stays green in both behaviors |

## Published wording

**Every text in §33.5's table reads as decided,** once reflow is normalized, and none of the replaced phrases survives: the two `config.ts` texts, the three `kernel/spec.ts` texts, `drag.ts`'s header, `moveTo`, and the README's three passages. `DraggableWarning` in `kernel/errors.ts` stays, as decided. §33.8's other comment hunks are in place.

**Against delivered behavior:**

- **The cancel route and the warning's order:** (ab) and (ac).
- **The rejection consumed:** (ae) and the probe.
- **`moveTo`'s four cases:** (ag) and (ah) for three, and _past release_, which the record says has no row, driven here from `onDrop`: nothing delivered, then `onEnd accepted`.
- **The README's `handle`, `visual`, `box`, `home` and `placeholder` routes and `connectedCallback`:** not re-driven. They rest on the review's drive, and no hunk reaches them.

**Read and not raised.** `BehaviorContext.requestDestroy` says _a fault queued behind that unit is reported_, and `dispatch` beside it says a queued action's argument is dropped unread. The specific sentence states §33.2's decided exception, and both are §33.5's wording.

## Composition, controls, suite and typecheck

**Composition,** by `measureAll()` at `cfed5f9da`. **All fifteen rows equal the record** in minified bytes, Brotli and modules, and all are under their ceilings. The least slack is 22 B, on `minimal`. `drag.js` stays at 142 and baseline B at 6,916. The same read at `302ab0a37` gives the record's _before_ column.

**Controls.** Only the five `control:` values moved in `measure.ts`, and no `budget:` moved. Both ends of each interval were read at the trees the entry names, `448ce5015` being `db3c402a4` and `6386f12e1` being `779b4b0f5`:

| Control                   | Before | After |
| ------------------------- | -----: | ----: |
| `free drag minimal`       |  8,337 | 8,357 |
| `free drag + bounds`      |  8,553 | 8,592 |
| `free drag + landing`     |  8,497 | 8,516 |
| `free drag complete`      |  8,712 | 8,734 |
| `kernel root - kernel.js` |  6,398 | 6,418 |

No manifest or lockfile changed in the diff. `size.node`'s exact rows all pass. There are seven, from seven `control:` values, and the record's _all six_ miscounts them.

**The whole suite, once:** 1,474 pass, 6 fail, 68 skipped, of 1,548. 73 of 78 files pass. The failing set is §33.11's:

- `decisions.node`: _should hold every witness it claims_.
- `docs.node`: _should resolve every reference a public type makes_, and the three closure rows.
- `tests/sortable/react.browser.test.ts` and `stories.browser.test.ts` do not load.
- **`consumer.node`'s sourcemap row failed with 32 entries,** which §33.11 reads as F-447. The record's run did not see it, which accounts for the one-row and one-file difference from its 1,475 and 74.

**Typecheck:** the package's `tsc` reports only the two `.scripts/` errors.

## Limits

- **Each reading ran once,** in Chromium, on one machine. Nothing here is an acceptance.
- **The kernel-tier wrong-label limit stands, unverified.** A seam that fails and then synchronously rejects the round-trip's thenable in one interval would, by §33.14's reading, carry the cancel's code. This pass did not drive it, and no row reaches it. So the `#settleResolution` comment's _a retired one means a cancel applied ahead of it_ holds subject to that limit.
- **The retired branch's phase test was not re-derived.** §33.14's note stands.
- **No statement about A, a3, regression or cost** is made of this tree, as §33.13 states.
- **The probe rows are scratch.** They live in a copy of the row's file and were not linted to the repository's rules, because the `async` spelling is what `require-await` refuses.

## What stays open

| Item | Owner | Required action |
| --- | --- | --- |
| §33.11's lint outcome, the suppression's disposition, and reviewer-1 | architect | Decide against §33.11, and state the tree acceptance names |
| reviewer-2, (ae)'s spelling | architect | Accept the spelling, or route the text |
| D-209's acceptance, F-446 and F-448 | architect | §32.10, next |