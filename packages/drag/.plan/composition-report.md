# Composition report

**Input:** `drag/production` at `f91bd324a`, which carries [`composition-handoff.md`](composition-handoff.md). Its package source and tests equal `d4286ce64`'s. **Governing records:** [`contract.md`](contract.md), and `DRD-24`, `DRD-25` and `DRO-6` in [`00-index.md`](00-index.md).

**Outcome:** item 1 landed in its class form, which adopts the session-owner prototype. §1a did not land. Item 2 landed. No stop condition was met, and nothing is returned. Commits, in order:

| Commit | Item | Content |
| --- | --- | --- |
| `276947f82` | 1 | The prototype's `src/draggable.ts`, applied unchanged. Parent: `f91bd324a` |
| `2506dcbb6` | 2 | `src/sortable.ts` and `tests/sortable.browser.test.ts` (`DRD-25`) |
| the commit carrying this report | 3 | This report and [`2026-11-07-composition-gates.txt`](measurements/2026-11-07-composition-gates.txt) |

Raw summaries of every gate, witness and mutation below are in [`2026-11-07-composition-gates.txt`](measurements/2026-11-07-composition-gates.txt).

## Owner decision: `DRO-6`

**Approved by the owner on 2026-11-07, relayed in the prompt that started this unit:**

- The prototype's recorded size and allocation costs are accepted for adoption. These are the figures in `DRO-6` and in the [prototype record](probes/session-owner/README.md) §Size and §Allocation.
- The current priority is a clear architecture with well-defined ownership.
- **Timing evaluation and tuning are deferred.** The approval makes no claim about speed.

This unit took no timing reading, and started no timing campaign. It re-based no ceiling or control. **Not done here:** the decision register still states `DRO-6`'s default and `DRO-4`'s timing clause. Updating them is left to the architect (§Open for the architect).

## Item 1: the operation class (`DRD-24`)

**Commit `276947f82`, parent `f91bd324a`.** It changes only `packages/drag/src/draggable.ts`.

- **Applied as recorded.** `git diff e06476d2b HEAD -- packages/drag/src` was empty before the apply. `git apply --check` and `git apply` of [`draggable.diff.txt`](probes/session-owner/draggable.diff.txt) succeeded with no conflict.
- **Nothing else changed.** The handoff loop (`fmt`, `lint-fix`, `fmt`, `lint`) changed nothing. The added and removed lines of the working diff equal those of the recorded diff, compared line by line.

| Check | Result at `276947f82` |
| --- | --- |
| Three-engine suite, no test edited | 6 failed, 866 passed, 16 skipped (888). These are the two displacement tests in each of Chromium, Firefox and WebKit. **The parent `f91bd324a` gives the same 6 failures and the same counts** |
| Typecheck and lint | Pass |
| Per-sample allocation test | Passes: `hot-path` › "should allocate per sample only the CSS string a lifted write needs", in Chromium, `shipped` project |
| `draggable` alone | **6935 B minified, 2220 B Brotli**, exactly the prototype's figures |
| Size rows | The seven rows that `DRO-6` lists fail, by the figures `DRO-6` gives. The control moved by 196 B. Nothing was re-based |

`just test` (Chromium and node) at `276947f82`: 9 failed, 307 passed. The failures are the two displacement tests and the seven size rows.

## Item 2: the built-ins (`DRD-25`)

**Commit `2506dcbb6`.**

- **Displacement.** `sortable()` calls `config.displacement` once, before it constructs the behavior. It passes the sink to `SortableBehavior`'s new third constructor parameter, and registers the sink's `retire` with the kernel's `use`, as before. The constructor no longer calls the installer. It still installs the axis.
- **Placeholder context.** `activate` passes `createPlaceholder` a new object with exactly `item`, `visual`, `box` and `rect`, read from the operation's `Drag`. This is one allocation per activation. A source comment says why the factory gets an object of its own.
- **`items()` ownership.** The `items` TSDoc in `SortableConfig` gains one sentence: each pull copies the returned array, so the consumer keeps its array and may change it at any time. `#pull` is as `d4286ce64` restored it.

### Tests, witnesses and mutation

All witnesses ran in Chromium, Firefox and WebKit. A witness ran the tests at `2506dcbb6` against `d4286ce64`'s `src`.

| Test | Cites | Witness: at `d4286ce64` | Mutation |
| --- | --- | --- | --- |
| `destruction` › "should cancel a running landing and the row animations" (existing) | `drag:DRI-10` | **Fails** in three engines: `expected 2 to be +0` | — |
| `sortable options` › "should keep a row animation past the terminal, until destruction" (existing) | — (its `describe` cites none) | **Fails** in three engines: `expected 2 to be +0` | — |
| `drag:DRD-25 option callbacks` › "should pass the placeholder factory only item, visual, box and rect" (new) | `drag:DRD-25` | **Fails** in three engines. The factory's argument has 21 own keys, among them `state` | — |
| `drag:DRI-14 collection` › "should land a canceled drag at home when the consumer reordered its own array" (new) | `drag:DRI-14` | Passes, because `d4286ce64` has the copy | **Fails in three engines when `#pull` returns `this.#config.items()` without the copy:** `expected 80 to be less than 1` |

**The placeholder test** records its argument, and asserts that the set of own keys is exactly `item`, `visual`, `box` and `rect`, that `item` is the pressed row, and that `requestCancel` and `state` are not `in` the object. The first witness run used a sorted-key assertion that lint refused (`require-array-sort-compare`). The final set assertion was re-run against `d4286ce64`'s `src` in three engines, and fails there too.

**The `items()` test** follows `DRD-25`'s candidate:

1. The consumer's `items()` returns one array that it keeps.
2. `onReorder` moves the item within that array and returns a verdict that never settles.
3. The pointer drops `r0` 90 px down, on the gap before `r3`.
4. `Escape` cancels the operation. The result is `end:canceled`.

The landing is linear and lasts 10 s. The test pauses every animation on the item at time 0. It then asserts that the item is drawn where it was dropped, within 1 px. The release puts the item at its home, so this holds only when the landing targets home. Without the copy, the landing targets the proposed gap, and the start position is wrong by the gap's distance from home, 80 px in every engine. This observation reads geometry at a fixed animation time, so it doesn't depend on frame timing.

### Checks at `2506dcbb6`

| Check | Result |
| --- | --- |
| Three-engine suite (`just test-engines`) | **63 of 63 files, 878 passed, 16 skipped (894)** |
| `just test` (Chromium and node) | 7 failed, 311 passed (318). The failures are the seven `DRO-6` size rows |
| `just lint`, `just typecheck`, `just fmt-check` | Pass |
| Handoff loop on `src/sortable.ts` and `tests/sortable.browser.test.ts` | Pass, after the sorted-key assertion was rewritten as a set comparison |

## Gate results: `just size`

These are gate results, not `DRO-4` readings, and nothing is re-based. Brotli bytes, with minified bytes in parentheses.

| Row | `f91bd324a` (parent) | `276947f82` (item 1) | `2506dcbb6` (item 2, last code commit) | Gate at `2506dcbb6` |
| --- | --: | --: | --: | --- |
| `draggable` alone | 2117 (6563) | 2220 (6935) | 2220 (6935) | Over its 2139 B ceiling by 81 B. The control moved by 196 B |
| `draggable` + `lift` | 4075 (11929) | 4192 (12301) | 4192 (12301) | Over by 23 B |
| example: resize handle | 3244 (9230) | 3340 (9602) | 3340 (9602) | Over by 27 B |
| example: drop zone | 4341 (12649) | 4462 (13021) | 4462 (13021) | Over by 31 B |
| example: canvas group | 3269 (9384) | 3366 (9756) | 3366 (9756) | Over by 52 B |
| `freeDrag` | 4926 (14827) | 5035 (15199) | 5035 (15199) | Over by 68 B |
| `freeDrag` + `bounds` + `landing` | 5184 (15513) | 5283 (15885) | 5283 (15885) | Over by 73 B |
| `sortable` + `y` | 6529 (19940) | 6629 (20316) | 6658 (20353) | Passes |
| `sortable` + `xy` | 6464 (19556) | 6570 (19932) | 6605 (19969) | Passes |
| `complete` | 6902 (20972) | 7003 (21348) | 7033 (21385) | Passes |

- **At the parent**, every row passes except the control. `draggable` alone already reads 93 B over its 2024 B control figure, as the prototype record found.
- **Item 1** moves every row by +372 to +376 B minified and +96 to +121 B Brotli, as `DRO-6` and the prototype record give.
- **Item 2** moves only the three `sortable` rows, by +37 B minified and +29 to +35 B Brotli. Each row without `sortable.ts` in its graph is unchanged, which is the expected result. Item 2's only code changes in `sortable.ts` are the four-property context object and the sink passed as a constructor argument.

The report commit changes only `.plan` files, so the reading at `2506dcbb6` is also the reading at this unit's last commit.

## Open for the architect

- **The decision register.** `DRO-6` still reads "Default: not adopted", and `00-index.md`'s status paragraph says item 1 waits for the owner. `DRO-6` and `DRO-4` also say that timing is judged in `DRO-4`'s reading under `DRD-22`'s rules. The owner has deferred timing evaluation and tuning, so those entries need the architect's update. This unit edited no decision entry.
- **`DRO-4`'s re-base.** The seven rows and the control are red at `2506dcbb6`, by the figures above. `DRO-4` re-bases them from the reading at this unit's last commit. That reading names `276947f82` as the cause of the kernel growth, and `2506dcbb6` as the cause of the `sortable` rows' growth.

## Limits

- **Engine environment.** Chromium is the image's browser. Firefox 157.0 and WebKit 27.2 are Playwright 1.64.1's builds in the user's Playwright cache. WebKit runs with the user-space libraries and environment of `~/.cache/ms-playwright/webkit-env.sh`, which the prototype record describes. Every run in this report used the same setup.
- **The per-sample allocation test runs only in Chromium.**
- **No timing was taken**, by the owner's deferral.
- **The witnesses ran in the main checkout's working tree,** with `src` taken from `f91bd324a` for the first run and from `d4286ce64` for the re-run. The two commits have identical package files outside `.plan`. The tree was then restored and compared with the saved work.

## Next

**Stop.** A combined independent review round reads the remediation and this unit together, at this unit's last commit. The owner then reads `DRO-1` to `DRO-5`, with `DRO-4`'s figures taken at that commit.