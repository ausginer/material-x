# Size pass (P4): opening assessment

**Opened:** 2026-11-12 on `drag/size` from `0a28f909a`, the squash merge of #15, on the owner's request. **Read by:** the architect. **Governing:** CONTRIBUTING Part II, `DRD-40` property 6 as `DRD-51` amends it, and `DRO-4` for the budgets and the re-base. **Decided here:** `DRD-51`. **For the owner:** `DRO-14`. **Plan:** [`performance-plan.md`](performance-plan.md) §2 P4.

**Scope:** find the runtime machinery that the accepted contract and the runtime gains don't need, price each candidate by composition, and recommend the first bounded unit. **No production or instrument change.** The budgets are unchanged, and the deferred campaigns stay stopped: the page check, B3', the in-page floors, `--prove` and `--floors`. The experimental code is in [`probes/size-pass/`](probes/size-pass/README.md), and the raw readings are in [`2026-11-12-size-pass-readings.txt`](measurements/2026-11-12-size-pass-readings.txt).

## 1. Method

- **One probe, the gate's rows.** [`size.ts.txt`](probes/size-pass/size.ts.txt) imports `COMPOSITIONS` from `bench/size/measure.ts` and bundles each row with the same Rolldown options (`platform: 'neutral'`, `__DEV__` defined `false`, `minify: true`, Rolldown 1.2.15, Node v26.13.0). Its Brotli column equals `measure.ts`'s output for every row at `0a28f909a`.
- **Compression settings**, all from `node:zlib`:
  - **Brotli-11:** `brotliCompressSync(bytes)` with no options, which is quality 11, window 22 and generic mode. This is the figure that `measure.ts` gates on.
  - **gzip-9:** `gzipSync(bytes, { level: 9 })`, with zlib's defaults otherwise: window bits 15, memory level 8, default strategy, header included.
  - **gzip-6:** the same at level 6, zlib's default level. It is within 13 B of gzip-9 on every row, so the tables give gzip-9 only.
- **Each candidate is a patch** against `0a28f909a`, applied in a detached worktree. Joint readings are measured on the combined patch and never summed (§15). Example: C3 alone takes 2 B off "sortable + xy", and C1 and C2 together take 30 B. Measured together with C4, the four take 26 B.
- **Attribution.** `--modules` bundles each row with every module as its own chunk and reports minified bytes per module. Those figures rank modules. They don't add up to the row, and nothing is booked from them.
- **Control rows (§18).** Before each reading, the rows outside a candidate's module graph are expected to read exactly 0 B. Every reading met that, as §5 shows.

## 2. The baseline at `0a28f909a`

Bytes. "Over" is Brotli minus the ceiling. The prototype arm is `599684791`, measured by `measure.ts --prototype` in the same session. Strings are the UTF-8 bytes of the string literals and template text that survive minification.

| Row | Minified | gzip-9 | gzip-6 | Brotli-11 | Ceiling | Over | Prototype Brotli | Strings |
| --- | --: | --: | --: | --: | --: | --: | --: | --: |
| draggable alone (control 2024) | 6733 | 2433 | 2436 | 2197 | 2139 | **+58** | 3704 | 327 |
| draggable + lift | 11544 | 4410 | 4412 | 3974 | 4169 | −195 | — | 1296 |
| example: resize handle | 9390 | 3675 | 3678 | 3310 | 3313 | −3 | 3844 | 486 |
| example: drop zone | 13183 | 5111 | 5117 | 4610 | 4431 | **+179** | 3974 | 1395 |
| example: canvas group | 9526 | 3633 | 3636 | 3306 | 3314 | −8 | 4294 | 432 |
| freeDrag | 15201 | 5585 | 5598 | 5036 | 4967 | **+69** | 4589 | 1358 |
| freeDrag + bounds + landing | 16366 | 6072 | 6085 | 5476 | 5210 | **+266** | 4856 | 1435 |
| sortable + y | 20741 | 7434 | 7444 | 6721 | 6733 | −12 | 6401 | 1609 |
| sortable + xy | 20297 | 7333 | 7342 | 6602 | 6617 | −15 | 6271 | 1609 |
| complete | 22420 | 8159 | 8169 | 7356 | 7065 | **+291** | 6804 | 1697 |

The five red rows and their excess are the ones `DRO-4` records after the window. "draggable alone"'s control moved by 173 B since it was set on 2026-11-07.

**Where the bytes are.** Every row carries the kernel's seven modules, 6,733 B minified, and `kernel/session.ts` is the largest module in every row at 4,221 B. Then, by row: `lift.ts` at 3,001 B in every lifted row; `@ydinjs/box-quad` at 1,367 to 2,240 B; `sortable/operation.ts` at 2,564 B; `kernel/gesture.ts` at 2,090 B; `sortable/behavior.ts` at 2,083 B; `free-drag/operation.ts` at 1,704 B; and `sortable/rect-index.ts` at 1,693 B. Private names are already mangled: 517 occurrences in a bundle of every entry, at 2 B each. The surviving property names are DOM names and published members.

## 3. Part II's order of attack, class by class

1. **Nannying and redundant validation: nothing to remove.** Every guard that three read-only inventories and the architect checked is reachable through correct use: the platform (pointer capture, a missed release, WebKit's click without `pointerId`), the end user's layout (the lift's three checks behind `lift/visual-no-box-space`: a 3D ancestor, a fragmented or `display: contents` visual), a consumer's documented disconnect (DRI-3), foreign code (`readMessage` under DRI-7) or a contract-specified `null` (`bounds`, `handle()`). The threshold isn't validated, and the contract doesn't say it is finite. That is a contract gap to note, and no check is owed.
2. **Compatibility and dead runtime vocabulary: none ships.** The numeric phase and direction constants fold to literals (§4). `sortable/keyboard.ts` exports `DIRECTION_UP` and `DIRECTION_DOWN`, which no entry re-exports. They appear in the bundle only as the literals `110` and `111`, so they cost 0 B.
3. **Diagnostic payload: already identities.** What ships is `drag: `, `DragFault`, `unreadable value`, `lift/visual-no-box-space` and three `sortable/…` codes, under 150 B of text in the largest row. A consumer, a third-party placeholder or the end user's layout can trigger each one, so §1.3 ships them. Most of the string bytes in the lifted rows are `LIFTED_PROPS` and `UA_PROPS`, the lift's capture and restore list, which is behavior. **This class, which led the measured package in §1.3, has nothing left here.**
4. **Duplicate state and unreachable states:** C3 and C3b (`DRF-13`) and C4 (`DRF-14`).
5. **Single-use abstractions:** C2 (`CallbackList`'s factories) and C5 (the lift's two capture functions). `free-drag/geometry.ts`'s two builders each have one caller, but the module is a stated "pure geometry" boundary. They weren't measured, because the expected saving is a few argument passes.
6. **Runtime indirection:** C1 (`DRF-20`).
7. **Optional-feature leakage:** C6. Apart from it, the graphs are clean: `freeDrag` alone has no edge to `bounds`, `drop-targets` or a landing, and `draggable` alone has none to `shared/invalidation`, `shared/landing` or the lift. `measure.ts`'s `absent` lists assert this.
8. **Copies and repacking:** nothing worth a unit. The lift's `land` copies the timing's two fields, which is `DRF-3`'s ownership reason. `Gesture.#open` passes nine arguments to `Session`, which keeps five of them in its own fields. That is `DRD-24`'s and `DRD-26`'s ownership split, not a size finding (§13).

**Not candidates, by decision:** merging the session into the controller, returning a separate controller object (`DRD-34` superseded `DRD-24`'s sentence) and the session's phase beside the controller's slot (`DRD-26`). Each moves ownership that §13 and `DRD-40` property 7 fix during a size pass. `@ydinjs/box-quad` is another package's code.

## 4. What the gate allows

The kernel is close to what its contract requires. The minified kernel ([readings](measurements/2026-11-12-size-pass-readings.txt), base section) is mostly the pass, the session's five phases, the click guard, focus restoration, the verdict's first-completion rule and the disposer lists, each of which a DRI states. **The pass finds tens of bytes per row, not hundreds,** and most of what it finds moves a decision or a boundary, so it is the owner's (`DRO-14`).

## 5. The candidates, measured

Differences from `0a28f909a`: minified / gzip-9 / Brotli-11, in bytes. A dash means exactly 0/0/0 on every row in that group. Full per-row tables are in the readings file.

| Id | What it removes | Rows outside its graph | Kernel-only rows | Lifted rows | `sortable` rows | Hot path | What it touches |
| --- | --- | --- | --- | --- | --- | --- | --- |
| C1 | `DRF-20`: an idle `requestStep` enters the step list instead of being its pass's first step | none | −45 / −9 to −10 / −5 to −14 | −45 / −9 to −11 / −9 to −15 | −45 / −11 to −12 / −8 to −15 | **Adds work per idle request**, which `sortable`'s frame task and `dropTargets`' frame task make from `requestAnimationFrame`, up to once per frame during a drag: a scan of the empty list, an `unshift`, the reader's turn and two `pop`s | `DRD-32`, `DRD-35` property 3; §0 |
| C2 | `CallbackList.queue()`, `stack()` and the private constructor: three call sites name `'unshift'` or `'push'` | none | −62 / −27 to −29 / −20 to −21 | −62 / −27 to −29 / −14 to −22 | −62 / −27 to −29 / −12 to −25 | None: one construction per controller and per operation either way | `DRD-36`, decided on the owner's direction, names the private constructor and both factories |
| C3 | `DRF-13`: `AxisQuery.insertion` is never `null`. The four `null` arms in `y.ts` and `xy.ts` and the two `!` go | — | — | — | −30 / −6 to −8 / −2 to −10 | Removes a test per frame | Nothing. The axis types are internal |
| C3b | C3, and the two `gap < 0` branches that C3 makes unreachable in `linear-shift.ts`'s `refresh` | — | — | — | y rows −44 / −14 / −17; "sortable + xy" −30 / −8 / −2 | Removes two tests per frame | Nothing. `refresh`'s only caller is `y.ts` |
| C4 | `DRF-14`: the invalidation step marks the bounds stale once | — | — | `freeDrag` rows −26 / 0 to −1 / −1 to −2 | — | Removes one call per invalidation | Nothing. Each activation marks the bounds stale before its first read |
| C5 | `captureInlineStyles` and `captureTopLayer` inlined into `Lifter.acquire` | — | — | −76 to −80 / −8 to −18 / −22 to **+2** | (in "lifted") | Removes two closures per grab | §2.1's boundary, so §17. **Brotli and gzip disagree in sign on "complete":** +2 B Brotli, −14 B gzip-9 |
| C6 | `RectIndex.advance` and `remeasurePlaceholder`, which only `y()` calls, moved into `linear-shift.ts` | — | — | — | "sortable + xy" −226 / −92 / **−76**; y rows −71 / −28 / −13 to −18 | Unchanged loop. One getter read per committed move and per placeholder re-read | §7. `linear-shift.ts` writes the cache's buffers through getters typed read-only. That gives back `RectIndex`'s encapsulation (+13 to +16 B, reported under `DRO-10` and not accepted) |

**Joint readings,** which are the figures to book (Brotli-11):

| Row | U1 = C3b + C4 | K = C1 + C2 | J1 = C1 + C2 + C3 + C4 | J2 = J1 + C5 + C6 |
| --- | --: | --: | --: | --: |
| draggable alone | 0 | −26 | −26 | −26 |
| draggable + lift | 0 | −33 | −33 | −42 |
| example: resize handle | 0 | −34 | −34 | −34 |
| example: drop zone | 0 | −42 | −42 | −44 |
| example: canvas group | 0 | −34 | −34 | −34 |
| freeDrag | −1 | −34 | −37 | −55 |
| freeDrag + bounds + landing | −2 | −33 | −34 | −51 |
| sortable + y | −17 | −33 | −42 | −73 |
| sortable + xy | −2 | −30 | −26 | −120 |
| complete | −17 | −39 | −42 | −75 |

**No set makes a red row green.** After J2, every candidate measured: "draggable alone" is 32 B over and its control 147 B off, "example: drop zone" 135 B over, "freeDrag" 14 B over, "freeDrag + bounds + landing" 215 B over and "complete" 216 B over. The excess is what the owner accepted in `DRO-6` to `DRO-12` and in the runtime pass, not removable machinery. **So `DRO-4`'s re-base remains the owner's decision.** §18 places it after the pass, against figures the owner accepts.

## 6. The first unit

**Recommended: U1, `DRF-13` and `DRF-14` together.** It is the only measured set that needs no owner decision. It changes no decision, no boundary, no public type and no observable behavior. It only removes work from the paths it touches. It closes two open findings, and it serves as the pass's control: five rows must read exactly 0 B.

- **Expected:** "sortable + y" and "complete" −17 B Brotli, "sortable + xy" −2 B, "freeDrag" −1 B, "freeDrag + bounds + landing" −2 B, and exactly 0 B on the five kernel, lift and example rows that don't import `sortable/*` or `free-drag/*`. "sortable + y" then has 29 B left under its ceiling, and "sortable + xy" 17 B.
- **Witnessed by the architect on the patch** ([probe README](probes/size-pass/README.md)): typecheck passes, and six browser test files, 105 tests, pass in Chromium. The unit's own verification is the full suite and the three-engine run.
- **The required properties are in `DRD-51` §First unit.** They include `operation.ts`'s `SetNonNullable` going with the `null`. The patch keeps that type, which is a type-level change only.

A handoff is written when the owner starts the unit. `DRD-51` states everything it needs.

## 7. For the owner

`DRO-14` holds C1, C2, C5 and C6, each with the architect's recommendation. In short: **C6 and C2 are worth taking.** C6 is the largest leak the pass found, and C2 is the only kernel saving with no runtime cost. **C1 and C5 are not.** C1 adds per-frame work for 5 to 15 B, which §0 rejects by default. C5 removes a meaningful boundary, and its Brotli figure on "complete" goes the wrong way.

## 8. Limits

- **One toolchain:** Rolldown 1.2.15 with its own minifier. Another bundler or minifier gives other figures, and §4's unmeasured case, ESM without concatenation, still applies.
- **gzip is recorded and not gated.** `measure.ts` and its ceilings are unchanged. Adding a gzip column to the gate would be an instrument change, which `DRD-23` governs. The prototype arm has no gzip reading.
- **Not measured:** inlining `free-drag/geometry.ts`'s builders, `bounds`' `held` field against a boolean, and merging `Gesture.#destroyed` with `#resolveDestroyed`. The inventories judged each to be a few bytes, and none is a deletion of machinery. `DRF-15`, `shared/timing.ts`'s one importer, is a module boundary at 0 B.
- **No timing reading.** U1 only removes work, and so do C2, C3, C4 and C6 by reading. C1 adds work, and C6 adds one getter read per committed move. The unit that takes either one runs the exact hot-path tests, and C1 also runs the timing rows (`DRD-51` property 4).