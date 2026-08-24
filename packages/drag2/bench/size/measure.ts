/**
 * The M-3 measurement, whole: compositions, bytes, budgets, module graphs.
 *
 * This is the *specification* of what is measured as much as the tool that
 * measures it, so everything 05 §Measurements — landed 2026-08-02 calls a
 * reproducibility precondition is a value in this file rather than a flag somewhere:
 *
 * - **Bundler**: Rolldown, the version in the workspace lockfile.
 * - **Target/platform**: `neutral`, ESM out, no polyfills.
 * - **Minifier**: Rolldown's built-in (`minify: true`).
 * - **Compression**: Brotli via `node:zlib` at default quality.
 * - **Aliases**: none.
 * - **Repetition**: none, and none is needed — the pipeline is deterministic,
 *   which `tests/bench/size.node.test.ts` asserts rather than assumes.
 *
 * **Why this is not `size-limit`** is written up in
 * `.agents/docs/measure/brief.md`, along with what a repository-wide
 * replacement would have to do. The short version: a composition is a set of
 * named imports *and* a set of modules that must be absent, and only the first
 * half is a byte count. Splitting the halves across two tools means declaring
 * each composition twice, in two formats, and the more interesting half is the
 * one that is not a number.
 *
 * Run: `just size` (fails on a budget breach), or `node bench/size/measure.ts`.
 *
 * ## Looking at what was measured
 *
 * `--files` writes each composition's bundled output under `.measured/`, and
 * `--unminified` writes a readable twin beside it — real identifiers, one
 * statement per line — for reading rather than for counting. Either flag turns
 * writing on; `--unminified` implies `--files`.
 *
 * ```
 * npm run size -- --files --unminified
 * npx just size --files --unminified
 * node bench/size/measure.ts --files
 * ```
 *
 * **No flag changes a reported number, and that is the point.** The figures
 * above are a specification with budgets and landed records attached to them,
 * so the measured generate is always the minified one and the unminified twin
 * is a **second, separate** generate whose bytes are never read. A flag that
 * could move a budget would make every recorded figure a question about how
 * the harness was invoked.
 */
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { brotliCompressSync } from 'node:zlib';
import { rolldown } from 'rolldown';

const ROOT = resolve(import.meta.dirname, '../..');

export type Composition = Readonly<{
  name: string;
  /**
   * The exact named imports a consumer writes, keyed by public subpath. This
   * *is* the fixture: what Rolldown pulls is what a consumer's bundler pulls,
   * and there is no wrapper module whose own body inflates the number.
   */
  imports?: Readonly<Record<string, string>>;
  /** A checked-in module instead, for what a set of imports cannot express. */
  entry?: string;
  /**
   * Brotli-compressed bytes. Set from the first measurement (2026-08-02) with
   * ~0.3 kB of headroom — deliberately tight, because the point of a budget
   * here is to notice a module appearing in a graph, and 0.3 kB is roughly one
   * such module.
   *
   * **Re-based 2026-08-07, Phase 16.** D-33 cost 70 B and D-32 cost ~300 B
   * across *every* composition, including minimal: keyboard sorting is a
   * `BehaviorSpec` member, not an optional feature, so a consumer cannot
   * tree-shake away the second input mode. That is a deliberate accessibility
   * position rather than an oversight — see `.plan/plan.md` Phase 16 — and the
   * budgets say so by moving together.
   *
   * **Re-based again 2026-08-07, Phase 17.** Extracting the packed rect index
   * into a module both axis features share costs the list composition **60 B**
   * — a module boundary under `unbundle`, and one record read where a closure
   * variable used to be. It is recorded rather than absorbed: the alternative
   * was two copies of a geometry cache that must stay in step, where a
   * divergence is a silent correctness bug and not a style one. The 2-D *rule*
   * itself costs the list consumer nothing, which is the constraint the shape
   * decision was made under.
   *
   * **Re-based again 2026-08-08, Checkpoint D review 5 (Phase 21, pulled
   * forward).** The rule this re-base establishes is in `.plan/plan.md` §Phase
   * 21: *a size budget is never a reason to defer a fix for a floor breach; if
   * the fix does not fit, the budget re-bases and the fix lands. What a budget
   * may defer is defence in depth.* The C5 closure pass landed **nine** I-36
   * floor fixes — C5-01's animation-subscription barrier, C5-02's placeholder
   * mechanics, and seven more the stretch sweep found in `placeholder.ts` and
   * `spec.ts`. Mid-pass they took `complete` **1 B over** its 11,040 budget,
   * and the budget re-based rather than the fix shrinking; brotli then gave
   * some of it back as the repeated `rt.closed` guards started sharing a
   * dictionary, so the landed cost is **+91 B** on `complete` against 106 B of
   * headroom. The re-base stays: 15 B is not a margin the next correctness fix
   * should be planning against, and taking the byte count out of the terminal
   * safety argument is the point of pulling it forward. Landed per-composition
   * cost: minimal **+83 B**, minimal (xy) **+77 B**, + layoutAnimation
   * **+90 B**, + landing **+82 B**, complete **+91 B**, baseline A **+97 B**;
   * baseline B is the shipped package and did not move. Every budget is now
   * its measurement plus ~150 B, the headroom the Phase 17 re-base left, and
   * ~~still under one module's worth~~ — **true when written, and not since
   * 2026-08-24; see the D-117 note below**.
   *
   * **Re-based again 2026-08-19, Phase 21 (M-3′), and this is the re-base
   * `plan.md` §Phase 21 promised.** Five sortable rows and baseline A had gone
   * over — by 247–407 B — because the Checkpoint E floor fixes landed under the
   * standing rule that a budget re-bases rather than a correctness fix
   * shrinking. Nothing was absorbed silently: the overruns were carried as
   * muted telemetry (K-6) until a measurement phase could re-base against the
   * artifact that will ship, which is here. Baseline B moves for the first
   * time — its measurement has not changed, only its headroom, so that one
   * rule covers every row.
   *
   * **What the headroom is for, stated rather than left to be inferred.**
   * ~150 B is about one module, and it is sized to notice **a module appearing
   * in a graph** — the failure this file exists to catch. It is deliberately
   * too small to absorb a feature, and anything larger comes back here and is
   * re-based on purpose, with its reason written down. It is not a performance
   * allowance, and it may never be spent to avoid landing a floor fix.
   *
   * ~~A change that fits inside it silently is a change that added no
   * module.~~ **Corrected 2026-08-24 (D-117 implementation review §7.1), and
   * corrected further than that review could see.** The smallest module's cost
   * to enter a graph — `free-drag/bounds.js` into `free drag minimal` — has
   * been measured three times across two **message-text-only** passes:
   * **154 B** at `76176da8`, **149 B** at `b498d69e`, **157 B** here. It
   * crossed the headroom in both directions without a module moving, because
   * a module's marginal cost is what Brotli charges for it *given everything
   * else in the graph*, and that is not a property of the module.
   *
   * So the struck sentence is not stale, it is **unreliable in principle**: no
   * headroom this instrument could carry makes the byte half a sufficient
   * test, and picking one that happens to clear today's figure would only
   * schedule the next correction. **The claim is carried by the graph
   * declarations** — `absent`, `absentPrefixes`, `present`, `only` — which is
   * why `free drag minimal` names this exact module. The byte budget catches
   * growth; the graph declaration catches a module.
   *
   * **Quantifier narrowed 2026-08-24 (F-88):** this said *every composition
   * declares them*, and twelve of the fourteen rows do — in some combination
   * of the four, not that one pair. **The two baselines declare no topology at
   * all**, so on those rows the byte budget is the only instrument, which is
   * the arrangement this paragraph has just called insufficient. Baseline A is
   * where that has consequence: it reaches thirty modules through relative
   * paths into the built package, so a module can enter it unobserved. It is
   * tolerated rather than repaired because it is a checked-in fixture whose
   * whole job is to price composition against `complete`, which does declare —
   * and because `tests/bench/size.node.test.ts` pins its slot set against
   * `assemble()`, which is a different drift than this one and not a
   * substitute for it. **The repair is not a
   * wider budget**: 150 B is calibrated against the failure it catches, and
   * loosening an exact instrument to prop up a redundant one is the wrong
   * direction.
   *
   * Landed figures at that re-base: minimal **10,738**, minimal (xy)
   * **10,787**, + layoutAnimation **11,162**, + landing **11,020**, complete
   * **11,447**, free drag minimal **8,717**, free drag + bounds **8,863**,
   * free drag + landing **9,016**, free drag complete **9,162**, both
   * behaviors **12,995**, baseline A **11,158**, baseline B **6,889**.
   *
   * **Re-based again 2026-08-21, Phase 22 (P-06, D-102), and the reason the
   * rule above requires is that a module appeared — which is exactly what the
   * headroom is sized to notice, so it did its job and the answer is a
   * re-base rather than a wider margin.** `sortable/verified-refresh.js` is
   * the verified incremental refresh, and it costs **+361 to +388 B** on the
   * six rows that reach it.
   *
   * **It was not re-based when P-06 first landed, and the delay is the
   * substance rather than bookkeeping.** The fast path was folded into
   * `createRectIndex`'s shared closure, so `xy()` linked 288 B of an
   * optimization D-100 condition 1 makes unreachable for it — one axis
   * feature's private code in the other's bundle, which is the single thing
   * these exclusivity assertions exist to catch. D-102 held the budgets red
   * until it moved, on the grounds that an absorbed number is a number nobody
   * reads again. It moved: `minimal (xy)` is back to **10,787**,
   * byte-identical to before P-06, so **its budget does not move here** and
   * neither does any free-drag row. What is being re-based is the cost of the
   * optimization in the module graph of the only feature that can execute it.
   *
   * The split is not free on the `y()` side — ~66 B more than the folded form,
   * for the wrapper object and the module boundary — and that is stated rather
   * than netted off against the 288 B it removed. Headroom stays at ~150 B on
   * every re-based row.
   *
   * ~~Landed figures, every row: minimal **11,105**, minimal (xy) **10,787**,
   * + layoutAnimation **11,550**, + landing **11,388**, complete **11,808**,
   * free drag minimal **8,717**, free drag + bounds **8,863**, free drag +
   * landing **9,016**, free drag complete **9,162**, both behaviors
   * **13,363**, baseline A **11,520**, baseline B **6,889**.~~
   *
   * **Superseded as a baseline, and this is the list that caused API-01.** The
   * numbers are correct for 2026-08-21 and are kept as the dated record. What
   * is withdrawn is any use of them as a _current_ measurement: D-103 and D-104
   * moved seven of these rows afterwards without updating the list, and the
   * D-108 re-base below then subtracted it as though it were the pre-change
   * tree — charging D-108 with 14–46 B that were not its own.
   *
   * **The same withdrawal applies to every _Landed figures_ list above this
   * one**, for the same reason and without re-measuring any of them: each was
   * current on its own date and none is updated by a later decision. Only the
   * most recent re-base states a baseline that can be subtracted, and it states
   * what it was measured **against** rather than leaving the reader to find the
   * nearest list.
   *
   * **Re-based again 2026-08-22, Phase 22 (D-108), and this one moves the
   * numbers *up* for a correctness fix rather than for a module.** The kernel's
   * four author-facing checks — `assertFrameShapesMatch`, `assertFrameScrubbed`
   * and the two seam reports — were `__DEV__`-gated on `kernel/dev.ts`'s premise
   * that _behavior authoring is not on the public surface_, which Revision 2.1
   * voided (F-78): the published build shipped `assertFrameShapesMatch(a, b) {}`
   * as an empty stub, so a third-party behavior author got no frame-shape or
   * reset-exhaustiveness validation in any build they could produce. D-108
   * un-gates all four, retires `kernel/dev.ts`, and leaves the sortable's own
   * per-frame binding alone.
   *
   * **This is the case the headroom rule was written for, in the direction it
   * is usually read backwards.** ~150 B is sized to notice a module appearing,
   * and **no module appeared** — the whole cost is the two assert messages, the
   * two report messages, `sameKeys`, `validateFrameDescriptors` and two loops,
   * all previously folded to nothing. It is nonetheless **282–305 B**, roughly
   * twice the headroom, so it comes back here and re-bases visibly rather than
   * being absorbed. The standing rule governs both halves: a budget re-bases
   * rather than a correctness fix shrinking, and headroom may never be spent to
   * avoid landing one.
   *
   * **Corrected 2026-08-22 against the API review (API-01), and the correction
   * is a lesson about this docblock rather than about D-108.** The first
   * published figures — _283–340 B_ — were computed as `landed` minus the
   * _Landed figures_ list of the **previous** re-base above, which is not the
   * pre-change tree: D-103 and D-104 moved seven of these rows *after* that list
   * was written and neither updated it. So 14–46 B of P-06 remediation and P-02
   * shrink cost was attributed to D-108, and the published upper bound of 340 B
   * corresponded to no row at all. The budgets did not change and are not
   * affected — each is the true landed figure plus ~150 B — and the landed
   * figures were right throughout; only the attribution was wrong.
   *
   * **A re-base measures the tree it is re-basing from.** Subtracting the last
   * list in this docblock is a proxy for that and silently absorbs everything
   * that landed in between. The pre-change measurement is therefore recorded
   * beside the landed one from here on, so the next pass has the subtrahend
   * rather than having to trust that a list stayed current.
   *
   * | Row | pre-slice `e086d058` | landed | D-108 |
   * | --- | --- | --- | --- |
   * | minimal | 11,139 | 11,435 | **+296** |
   * | minimal (xy) | 10,801 | 11,085 | **+284** |
   * | + layoutAnimation | 11,571 | 11,874 | **+303** |
   * | + landing | 11,423 | 11,728 | **+305** |
   * | complete | 11,849 | 12,139 | **+290** |
   * | free drag minimal | 8,717 | 9,007 | **+290** |
   * | free drag + bounds | 8,863 | 9,159 | **+296** |
   * | free drag + landing | 9,016 | 9,307 | **+291** |
   * | free drag complete | 9,162 | 9,459 | **+297** |
   * | both behaviors | 13,396 | 13,699 | **+303** |
   * | vocabulary root | 121 | 121 | **0** |
   * | kernel root | 6,514 | 6,797 | **+283** |
   * | baseline A | 11,566 | 11,848 | **+282** |
   * | baseline B | 6,889 | 6,889 | **0** |
   *
   * **Two rows do not move**, and both are deliberate: baseline B is the shipped
   * `@ydinjs/drag` package and never reaches this code, and the `drag.js`
   * vocabulary root is byte-identical at **121 B** — the F-77 assertion doing
   * its job, since the error vocabulary still does not pull the kernel.
   *
   * **The four free-drag rows, `kernel root` and the two unmoved rows are the
   * ones whose first figures were already right**, and that is the tell rather
   * than a coincidence: they are exactly the rows D-103 and D-104 never touched,
   * so for them the stale list and the pre-slice tree were the same numbers.
   *
   * **Landed figures are the `landed` column above**, and are deliberately not
   * repeated as a prose list here. Every earlier re-base ends in one, and it is
   * that habit rather than any single list that produced API-01: a reader
   * looking for _the last measurement_ finds the nearest list, which was current
   * when written and is not current when read. The table states what it was
   * measured against, so it cannot be mistaken for a baseline it is not.
   *
   * **Re-based again 2026-08-23, Phase 23 (D-117), and this is the first
   * re-base that moves every measured row *down*.** The diagnostic remediation
   * replaces shipped narrative prose with `drag: <area>/<condition>` identities
   * at the thirty-nine classified sites. **No check, branch, outcome,
   * lifecycle path or `__DEV__` declaration moved** — the edit is message text
   * and nothing else — so the whole delta is payload a consumer downloads and
   * never reads.
   *
   * **Measured jointly, once, against the pre-slice tree, and not summed from
   * per-class ranks.** D-117's measurement record ranks P1, P2 and P3 in
   * separate ablations and states why they may not be added: the parts
   * understate the whole by 2–9 %, because forty tokens sharing one prefix and
   * one slug vocabulary compress against each other in a way three separate
   * builds cannot see. Its projected **−350…−547 B** is likewise an upper
   * bound — measured with a `__DEV__` gating this closure declines and with
   * one implementer's tokens — and it is not the subtrahend below.
   *
   * | Row | pre-slice `76176da8` | landed | D-117 |
   * | --- | --- | --- | --- |
   * | minimal | 11,162 | 10,706 | **−456** |
   * | minimal (xy) | 10,807 | 10,364 | **−443** |
   * | + layoutAnimation | 11,589 | 11,152 | **−437** |
   * | + landing | 11,449 | 10,979 | **−470** |
   * | complete | 11,859 | 11,405 | **−454** |
   * | free drag minimal | 8,768 | 8,468 | **−300** |
   * | free drag + bounds | 8,922 | 8,617 | **−305** |
   * | free drag + landing | 9,066 | 8,748 | **−318** |
   * | free drag complete | 9,217 | 8,902 | **−315** |
   * | both behaviors | 13,418 | 12,918 | **−500** |
   * | vocabulary root | 121 | 121 | **0** |
   * | kernel root | 6,598 | 6,332 | **−266** |
   * | baseline A | 11,583 | 11,142 | **−441** |
   * | baseline B | 6,889 | 6,889 | **0** |
   *
   * Minified, the same slice is **−913 to −1,387 B** on the compositions and
   * **−781 B** on the kernel root. Both figures are read because they have
   * disagreed in direction before, and here they do not.
   *
   * **`drag.js` is the control row, and it did not move.** D-117 rules the
   * `DraggableError` constructor a *formatting* site rather than a diagnostic
   * one — it detects nothing and its `drag: ${code} failure` is already an
   * identity — so the classification never reaches it and the row stays
   * byte-identical at **121 B**. The measurement predicted **+2 B** for the
   * variant that rewrote it, which its 29 B of headroom would have shown; that
   * variant did not land, and **this row's budget is untouched**. A policy that
   * touches only what it should leaves this row where it was.
   *
   * **Headroom returns to ~150 B on every measured row.** The landed figures
   * left slack of **618–932 B**, four to six times the margin, and a budget
   * that loose stops noticing the module it exists to notice. The rule is the
   * same one that governs a re-base upward — the fix lands and the budget
   * follows — read in the other direction. Baseline B is the shipped package
   * and never reaches this code, so it keeps its figure and its 151 B.
   *
   * **What shrinking the prose did to the marginal cost, recorded rather than
   * absorbed** (D-117 implementation review §7.1). A module entering a graph
   * costs, on the tree these budgets are set from: `free-drag/bounds.js`
   * **+157 B**, `free-drag/landing.js` **+286 B**,
   * `sortable/layout-animation.js` **+440 B** on `minimal` and **+415 B** on
   * `+ landing`. The review measured the smallest of these at **149 B** — one
   * byte *under* the headroom — one commit earlier, and at **154 B** one
   * commit before that. **No budget and no graph assertion moves for any of
   * it**, and the doctrine paragraph above now says why: a figure that swings
   * across the headroom on two message-text passes is not a figure a headroom
   * can be sized against, and the module claim was never the byte half's to
   * make.
   *
   * **Re-based again 2026-08-24, Phase 23 (D-118).** `arm()`'s `command.types`
   * loop loses its two array-shape checks — an empty array and an empty-string
   * entry — and keeps the `pointerdown` collision, which is the one of the
   * three that protects the kernel's own operation state rather than the
   * author's feature. Two `if` blocks and two identity strings leave one
   * module, so the minified delta is **flat at −128 B** on every row that
   * carries `kernel/kernel.js`, and **−9 B** more from collapsing the
   * `const { types } = next.command` destructure that existed only because
   * `types.length` was a second reader: **−137 B** landed, and the split is
   * recorded because the review projected the −128 and the remainder is this
   * pass's own.
   *
   * | Row | before | landed | D-118 | new budget |
   * | --- | --- | --- | --- | --- |
   * | minimal | 10,710 | 10,684 | **−26** | 10,834 |
   * | minimal (xy) | 10,369 | 10,344 | **−25** | 10,494 |
   * | + layoutAnimation | 11,150 | 11,126 | **−24** | 11,276 |
   * | + landing | 10,993 | 10,954 | **−39** | 11,104 |
   * | complete | 11,408 | 11,383 | **−25** | 11,533 |
   * | free drag minimal | 8,463 | 8,440 | **−23** | 8,590 |
   * | free drag + bounds | 8,620 | 8,595 | **−25** | 8,745 |
   * | free drag + landing | 8,749 | 8,726 | **−23** | 8,876 |
   * | free drag complete | 8,903 | 8,878 | **−25** | 9,028 |
   * | both behaviors | 12,932 | 12,906 | **−26** | 13,056 |
   * | vocabulary root | 121 | 121 | **0** | 150 (unchanged) |
   * | kernel root | 6,336 | 6,303 | **−33** | 6,453 |
   * | baseline A | 11,143 | 11,118 | **−25** | 11,268 |
   * | baseline B | 6,889 | 6,889 | **0** | 7,040 (unchanged) |
   *
   * **This is not a size case and the re-base is not the point** — twenty-odd
   * Brotli bytes is inside the noise band this phase has demonstrated three
   * times, and D-118 would read the same at 3 B or at 300 B. The budgets move
   * for the one reason the rule above gives — they follow the landed figure in
   * both directions — and that rule sets the target at landed + ~150 B
   * whatever the size of the slice. Left alone the slack would have stood at
   * **162–179 B**, which is not the margin this file keeps; no threshold read
   * off a marginal module cost is needed to say so, and the paragraph above
   * declines to reason from one.
   *
   * **`drag.js` and baseline B do not move, correctly** — neither reaches
   * `kernel/kernel.js`, and the control row is byte-identical at **121 B** for
   * the third consecutive slice.
   *
   * **Measured and *not* re-based, 2026-08-24, Phase 23 (D-119).** The
   * `Insertion` construction owner (F-91) collapses seven object literals to
   * one rule in `sortable/domain.js`, called from `keyboard.js`, `y.js`,
   * `xy.js` and `collection.js`. **Minified it is flat at −114 to −119 B** on
   * every row that carries the sortable behavior, and **0 B** on every row that
   * does not — the four free-drag rows, the kernel root, `drag.js` and baseline
   * B are byte-identical in both figures.
   *
   * | Row | before | landed | Δ brotli | Δ minified | slack |
   * | --- | --- | --- | --- | --- | --- |
   * | minimal | 10,684 | 10,667 | **−17** | −115 | 167 |
   * | minimal (xy) | 10,344 | 10,329 | **−15** | −119 | 165 |
   * | + layoutAnimation | 11,126 | 11,102 | **−24** | −117 | 174 |
   * | + landing | 10,954 | 10,960 | **+6** | −115 | 144 |
   * | complete | 11,383 | 11,384 | **+1** | −115 | 149 |
   * | free drag ×4 | — | unmoved | **0** | 0 | 150 |
   * | both behaviors | 12,906 | 12,885 | **−21** | −116 | 171 |
   * | vocabulary root | 121 | 121 | **0** | 0 | 29 |
   * | kernel root | 6,303 | 6,303 | **0** | 0 | 150 |
   * | baseline A | 11,118 | 11,096 | **−22** | −114 | 172 |
   * | baseline B | 6,889 | 6,889 | **0** | 0 | 151 |
   *
   * **Two rows went up, and that is the useful part of this measurement.** One
   * edit, one direction in the minified figure — a flat ~116 B removed
   * everywhere the code is reached — and a compressed figure that ranges from
   * −24 B to **+6 B** across the same rows. This phase has asserted three times
   * that twenty-odd Brotli bytes is noise; here the same slice demonstrates it
   * on one tree rather than by comparing two, and the direction disagreement is
   * the evidence. **Nothing follows from the +6 except that it is not a
   * regression to chase.**
   *
   * **The budgets therefore do not move, and that is the rule rather than an
   * exception to it.** They already sit at their measurement plus **144–174 B**
   * — the ~150 B target, in both directions — so following the landed figure
   * means leaving them where they are. Re-basing would raise two budgets on
   * +6 B and +1 B of compression noise, which is the one thing a budget sized
   * to notice a module must not learn to do.
   */
  budget: number;
  /**
   * Modules that must **not** appear in the bundled graph. Absence is the whole
   * tree-shaking claim (03 §Tree-shaking) and a byte count cannot express it: a
   * module can be pulled in, shaken down to almost nothing, and show up as a
   * small delta that reads like success.
   */
  absent?: readonly string[];
  /**
   * Whole **subtrees** that must not appear, by package-relative prefix.
   *
   * Added for M-3′'s cross-behavior claim, which `absent` cannot express: the
   * assertion is that a free-drag composition pulls **no** `sortable/` module
   * and vice versa, and enumerating today's module list would pass vacuously
   * the moment either behavior gains a file. A prefix keeps the claim total
   * over a growing tree.
   */
  absentPrefixes?: readonly string[];
  /** Modules that must appear — so the absence checks cannot pass vacuously. */
  present?: readonly string[];
  /**
   * The bundled graph, **exactly** — every module that may appear, and no
   * other. Passing it also satisfies the `present` half, so a composition
   * declaring `only` declares nothing else.
   *
   * Added for F-77, whose invariant is _`drag.js` reaches `kernel/errors.js`
   * and nothing else_ — a claim `absent` cannot make and `absentPrefixes`
   * cannot make either, because the one module that must appear lives inside
   * the one subtree that must not. Enumerating today's absences would answer a
   * total claim with a list that grows stale the moment `kernel/` gains a file,
   * which is the same vacuity `absentPrefixes` was added to prevent.
   *
   * **Reserved for roots whose whole point is what they do not reach.** A
   * feature composition should not use it: pinning fifteen module names would
   * turn every legitimate refactor into a harness failure, and the claim there
   * is about specific machinery rather than about the size of the graph.
   */
  only?: readonly string[];
}>;

/**
 * **Two, not four** (D-56). `sortable/placeholder.js` and `sortable/handle.js`
 * are gone, along with `sortable/callbacks.js`, because a fragment factory that
 * installs nothing measures nothing: under D-45 all three had become identity
 * wrappers around a config slot the consumer can write directly.
 *
 * That is the falsifiable half of D-56 — the deletions should move **zero
 * bytes**, since the modules never carried runtime machinery to begin with —
 * and the budgets below are what would catch it if they did.
 */
const OPTIONAL = [
  'sortable/landing.js',
  'sortable/layout-animation.js',
] as const;

/**
 * Free drag's optional features, and the same rule: a composition that does not
 * install one must not pull it.
 *
 * `free-drag/landing.js` shares `shared/landing-runner.js` with the sortable's,
 * which is the one non-kernel module both behaviors reach — and therefore the
 * most interesting single entry in M-3′'s union identity, since a shared module
 * outside `kernel/` is exactly where a second resolution would be least
 * expected.
 */
const FREE_DRAG_OPTIONAL = [
  'free-drag/bounds.js',
  'free-drag/landing.js',
] as const;

const withoutFreeDrag = (...kept: readonly string[]): readonly string[] =>
  FREE_DRAG_OPTIONAL.filter((module) => !kept.includes(module));

/** The names the union identity is asserted over — see {@link unionViolations}. */
export const COMBINED = 'both behaviors';
export const SORTABLE_PART = 'complete';
export const FREE_DRAG_PART = 'free drag complete';

/**
 * The **unselected axis**, which is not optional in the same sense: exactly one
 * axis feature is installed, so the other is always absent. It is listed
 * separately because "the composition did not reach the sibling rule" is the
 * claim that decided the 2-D shape (Phase 17) — a parameterized single feature
 * would have made every list consumer carry the grid metric.
 */
const withoutAxis = (kept: 'sortable/y.js' | 'sortable/xy.js'): string =>
  kept === 'sortable/y.js' ? 'sortable/xy.js' : 'sortable/y.js';

/**
 * **P-06's machinery, and it is `y()`'s alone** (D-102). The verified
 * incremental refresh is `y()`-only *by contract* — D-100 condition 1 refuses
 * it under `xy()`, whose wrapping flow makes `δ` neither scalar nor uniform —
 * so an `xy()` composition reaching this module would be carrying an
 * optimization it can never execute.
 *
 * It lived in `createRectIndex`'s shared closure when P-06 first landed and
 * cost the minimal `xy()` composition **288 B**. Listed here as a peer of
 * {@link withoutAxis} rather than folded into it because it is a different
 * claim: the unselected axis is absent because exactly one installs, and this
 * is absent because a feature's private optimization may not travel in the
 * shared cache the two axes are deliberately built to share.
 */
const P06 = 'sortable/verified-refresh.js';

const without = (...kept: readonly string[]): readonly string[] =>
  OPTIONAL.filter((module) => !kept.includes(module));

export const COMPOSITIONS: readonly Composition[] = [
  {
    name: 'minimal',
    imports: {
      'sortable.js': '{ sortable }',
      'sortable/y.js': '{ y }',
    },
    budget: 10_834,
    absent: [...without(), withoutAxis('sortable/y.js')],
    absentPrefixes: ['free-drag/'],
    present: [P06],
  },
  {
    // The same composition on the other axis. It reopens what "minimal" means,
    // which 05 §Measurements — landed 2026-08-02 names as an M-3 trigger, so it is
    // measured as a peer rather than assumed to equal the y one.
    name: 'minimal (xy)',
    imports: {
      'sortable.js': '{ sortable }',
      'sortable/xy.js': '{ xy }',
    },
    budget: 10_494,
    absent: [...without(), withoutAxis('sortable/xy.js'), P06],
    absentPrefixes: ['free-drag/'],
    // **Both halves of D-102 in one row.** The dimension-neutral cache is
    // reached — that is the shared-by-design part, and it is why `xy()` is
    // measured as a peer rather than assumed to equal the `y()` one — and the
    // `y()`-only optimization on top of it is not.
    present: ['sortable/rect-index.js'],
  },
  {
    name: 'minimal + layoutAnimation',
    imports: {
      'sortable.js': '{ sortable }',
      'sortable/y.js': '{ y }',
      'sortable/layout-animation.js': '{ layoutAnimation }',
    },
    budget: 11_276,
    absent: [
      ...without('sortable/layout-animation.js'),
      withoutAxis('sortable/y.js'),
    ],
    absentPrefixes: ['free-drag/'],
    present: ['sortable/layout-animation.js', P06],
  },
  {
    name: 'minimal + landing',
    imports: {
      'sortable.js': '{ sortable }',
      'sortable/y.js': '{ y }',
      'sortable/landing.js': '{ landing }',
    },
    budget: 11_104,
    absent: [...without('sortable/landing.js'), withoutAxis('sortable/y.js')],
    absentPrefixes: ['free-drag/'],
    present: ['sortable/landing.js', P06],
  },
  {
    name: SORTABLE_PART,
    imports: {
      'sortable.js': '{ sortable }',
      'sortable/y.js': '{ y }',
      'sortable/landing.js': '{ landing }',
      'sortable/layout-animation.js': '{ layoutAnimation }',
    },
    budget: 11_533,
    absent: [withoutAxis('sortable/y.js')],
    absentPrefixes: ['free-drag/'],
    present: [...OPTIONAL, P06],
  },
  {
    // **The free-drag half of the surface** (M-3′). Declared as peers of the
    // sortable rows rather than as a variant of them: the two behaviors share
    // the kernel and nothing else, which is a claim about both graphs.
    name: 'free drag minimal',
    imports: {
      'free-drag.js': '{ freeDrag }',
    },
    budget: 8590,
    absent: [...withoutFreeDrag()],
    absentPrefixes: ['sortable/'],
    present: ['free-drag.js', 'kernel/kernel.js'],
  },
  {
    name: 'free drag + bounds',
    imports: {
      'free-drag.js': '{ freeDrag }',
      'free-drag/bounds.js': '{ bounds }',
    },
    budget: 8745,
    absent: [...withoutFreeDrag('free-drag/bounds.js')],
    absentPrefixes: ['sortable/'],
    present: ['free-drag/bounds.js'],
  },
  {
    name: 'free drag + landing',
    imports: {
      'free-drag.js': '{ freeDrag }',
      'free-drag/landing.js': '{ landing }',
    },
    budget: 8876,
    absent: [...withoutFreeDrag('free-drag/landing.js')],
    absentPrefixes: ['sortable/'],
    present: ['free-drag/landing.js', 'shared/landing-runner.js'],
  },
  {
    name: FREE_DRAG_PART,
    imports: {
      'free-drag.js': '{ freeDrag }',
      'free-drag/bounds.js': '{ bounds }',
      'free-drag/landing.js': '{ landing }',
    },
    budget: 9028,
    absentPrefixes: ['sortable/'],
    present: FREE_DRAG_OPTIONAL,
  },
  {
    // **The row M-3′ was added for.** One page, both behaviors, every optional
    // feature — the largest surface a consumer can compose, and the only
    // configuration in which the kernel is reached by two behaviors at once.
    //
    // The two `landing` exports are aliased because their names collide, which
    // is what a consumer importing both writes too. Aliasing costs a few bytes
    // in the re-export and changes no module in the graph, which is the half
    // this row is measured for.
    name: COMBINED,
    imports: {
      'sortable.js': '{ sortable }',
      'sortable/y.js': '{ y }',
      'sortable/landing.js': '{ landing as sortableLanding }',
      'sortable/layout-animation.js': '{ layoutAnimation }',
      'free-drag.js': '{ freeDrag }',
      'free-drag/bounds.js': '{ bounds }',
      'free-drag/landing.js': '{ landing as freeDragLanding }',
    },
    budget: 13_056,
    absent: [withoutAxis('sortable/y.js')],
    present: [
      ...OPTIONAL,
      ...FREE_DRAG_OPTIONAL,
      'shared/landing-runner.js',
      P06,
    ],
  },
  {
    /**
     * **F-77's close, and the graph half is the point of the row.**
     *
     * The contract says a consumer imports `free-drag.js` and `drag.js` and
     * _reaches no other tier_, and 03 §The export topology asks for that to be
     * checked against something other than the table it was derived from. This
     * is that check: a consumer who wants `err instanceof DraggableError` and
     * nothing else pays one module.
     *
     * **The isolation is real but not structural, which is why it needs a
     * standing row rather than a reading.** `src/kernel/errors.ts` imports
     * thirteen runtime `FAILURE_*` constants from `./failures.ts` and uses them
     * as computed keys in `STAGE_TO_CODE`. This root bundles to one module only
     * because Rolldown shakes that map and `toDraggableError` away from the
     * `DraggableError` class in the same file. **One runtime reference from the
     * class to the stage map, or one side effect in `failures.ts`, and the root
     * silently grows** — which is precisely the failure the doctrine at the top
     * of this file names: a module pulled in, mostly shaken, showing up as a
     * small delta that reads like success.
     *
     * **`tests/packaging.node.test.ts` is not this assertion.** It walks the
     * unshaken *source* graph, deliberately independent of any bundler's
     * heuristics, and on that graph `drag.js` **does** reach
     * `kernel/failures.js`. Only a bundled-graph instrument can hold the 121 B.
     *
     * **This row's budget is 29 B of headroom, not the standing ~150 B, and
     * that is the row working rather than an oversight.** The convention is
     * sized to _roughly one module_ against 8–13 kB compositions; on a 121 B
     * root, one module's worth of slack is larger than the artifact, and the
     * row would report success while the thing it exists to prevent happened.
     * The graph half cannot cover the gap either: the packed `kernel/errors.js`
     * carries a **bare** `import "./failures.js"`, because `tsdown` inlines the
     * thirteen `FAILURE_*` constants as literals — so machinery arriving from
     * `failures.ts` lands **inside this module** and moves no module count at
     * all. Verified by injecting F-77's own predicted regression, one runtime
     * reference from `DraggableError` to `STAGE_TO_CODE`: the graph stays at
     * one module and the artifact grows **121 → 190 B**. Only a budget this
     * row can breach observes that, which is why it is set where it is.
     *
     * A legitimate change to the class re-bases this number, deliberately and
     * visibly, under the standing rule that a budget re-bases rather than a fix
     * shrinking. That is the intended behaviour and not a cost.
     */
    name: 'vocabulary root - drag.js',
    imports: { 'drag.js': '{ DraggableError }' },
    budget: 150,
    only: ['kernel/errors.js'],
  },
  {
    /**
     * The kernel tier's own root, the second half of F-77.
     *
     * **It is what makes the row above a measurement rather than a tautology.**
     * A one-module vocabulary root is only evidence for D-48's split if the
     * tier it declines to import is substantial, and this weighs that tier at
     * twelve modules against the vocabulary root's one.
     *
     * **The two graphs turn out to be disjoint, which is stronger than the
     * split needed.** `kernel.js` does not pull `kernel/errors.js` either —
     * `draggable` alone never names the class — so neither root subsumes the
     * other and D-48's _neither tier should have to import the other to name a
     * symbol both hand out_ holds in both directions rather than one. That was
     * not known before this row: `bundle-structure.md` recorded the 12-module
     * floor without listing it.
     *
     * Declared with `present`/`absentPrefixes` rather than `only`: the claim
     * here is that the kernel floor reaches no behavior, not that its own
     * twelve modules are frozen.
     */
    name: 'kernel root - kernel.js',
    imports: { 'kernel.js': '{ draggable }' },
    budget: 6453,
    present: ['kernel.js', 'kernel/kernel.js'],
    absentPrefixes: ['sortable/', 'free-drag/'],
  },
  {
    // Answers *what does composition cost*, and nothing else.
    name: 'baseline A - feature-matched, non-composed',
    entry: 'bench/size/noncomposed.js',
    budget: 11_268,
  },
  {
    // Answers *what does migrating cost*, and nothing else. Never substituted
    // for baseline A: it is not feature-equivalent to anything here.
    name: 'baseline B - shipped @ydinjs/drag sortable.js',
    entry: 'bench/size/shipped.js',
    budget: 7040,
  },
];

export type Measurement = Readonly<{
  composition: Composition;
  /** Minified bytes. */
  minified: number;
  /** Minified then Brotli-compressed bytes — the reported figure. */
  brotli: number;
  /** Every module id in the bundled graph, package-relative. */
  modules: readonly string[];
  /**
   * The synthetic entry an `imports` composition bundles, or `null` for an
   * `entry` one. It is a temp path that differs on every run, so the graph
   * identities below exclude it — it is the harness's own module and never a
   * consumer's.
   */
  entryId: string | null;
  /**
   * Module ids emitted into **more than one** chunk. Empty is the expected
   * state; a non-empty list is duplication in the literal sense, which is what
   * M-3′'s union identity is watching for from the other side.
   */
  duplicated: readonly string[];
}>;

/**
 * The virtual entry an import-map composition bundles. A re-export rather than
 * an import plus a use: it retains every named export for the graph without
 * adding a statement of its own to the measured bytes.
 */
function importEntry(imports: Readonly<Record<string, string>>): string {
  return Object.entries(imports)
    .map(
      ([path, names]) =>
        `export ${names} from ${JSON.stringify(join(ROOT, path))};`,
    )
    .join('\n');
}

/**
 * Where a run writes what it measured, and whether it also writes a readable
 * twin. Absent for an ordinary run, which writes nothing.
 */
export type Dump = Readonly<{
  /** The directory each composition gets a sub-directory of. */
  directory: string;
  /** Also emit an unminified generate, for reading rather than counting. */
  unminified: boolean;
}>;

/** A composition name as a directory name. */
const slug = (name: string): string =>
  name
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/gu, '-')
    .replace(/^-|-$/gu, '');

/**
 * Writes one generate's chunks under `<composition>/<kind>/`.
 *
 * Per chunk rather than concatenated, because the chunks are what the bundler
 * produced; the measured figure is their concatenation, which matters only
 * where a composition emits more than one, and none currently does.
 */
async function writeChunks(
  target: string,
  kind: string,
  chunks: ReadonlyArray<Readonly<{ fileName: string; code: string }>>,
): Promise<void> {
  const directory = join(target, kind);

  await mkdir(directory, { recursive: true });
  await Promise.all(
    chunks.map((chunk) =>
      writeFile(join(directory, chunk.fileName), chunk.code, 'utf8'),
    ),
  );
}

export async function measure(
  composition: Composition,
  dump?: Dump,
): Promise<Measurement> {
  const directory = await mkdtemp(join(tmpdir(), 'drag2-m3-'));

  try {
    let input: string;

    if (composition.imports) {
      input = join(directory, 'entry.js');
      await writeFile(input, importEntry(composition.imports), 'utf8');
    } else {
      input = join(ROOT, composition.entry!);
    }

    const bundle = await rolldown({ input: [input], platform: 'neutral' });

    try {
      // **The measured generate, and the only one whose bytes are read.**
      const { output } = await bundle.generate({ format: 'es', minify: true });
      const chunks = output.filter((chunk) => chunk.type === 'chunk');
      const code = chunks.map((chunk) => chunk.code).join('');
      const counts = new Map<string, number>();

      for (const chunk of chunks) {
        for (const id of Object.keys(chunk.modules) as readonly string[]) {
          const relative = id.startsWith(ROOT) ? id.slice(ROOT.length + 1) : id;

          counts.set(relative, (counts.get(relative) ?? 0) + 1);
        }
      }

      const bytes = new TextEncoder().encode(code);

      if (dump !== undefined) {
        const target = join(dump.directory, slug(composition.name));

        // The synthetic entry is written too: it is the fixture the figure is
        // a measurement *of*, and it exists nowhere else once the run ends.
        if (composition.imports) {
          await mkdir(target, { recursive: true });
          await writeFile(
            join(target, 'entry.js'),
            importEntry(composition.imports),
            'utf8',
          );
        }

        await writeChunks(target, 'measured', chunks);

        if (dump.unminified) {
          const plain = await bundle.generate({ format: 'es', minify: false });

          await writeChunks(
            target,
            'unminified',
            plain.output.filter((chunk) => chunk.type === 'chunk'),
          );
        }
      }

      return {
        composition,
        minified: bytes.byteLength,
        brotli: brotliCompressSync(bytes).byteLength,
        modules: [...counts.keys()].sort(),
        entryId: composition.imports ? input : null,
        duplicated: [...counts]
          .filter(([, count]) => count > 1)
          .map(([id]) => id)
          .sort(),
      };
    } finally {
      await bundle.close();
    }
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
}

export async function measureAll(dump?: Dump): Promise<Measurement[]> {
  const measured: Measurement[] = [];

  // Sequential rather than `Promise.all`: the numbers are deterministic either
  // way, but a serial run keeps peak memory flat and the log readable.
  for (const composition of COMPOSITIONS) {
    // oxlint-disable-next-line no-await-in-loop
    measured.push(await measure(composition, dump));
  }

  return measured;
}

/**
 * The **byte** half of what a composition declares.
 *
 * Separate from {@link graphViolations} because the two halves have different
 * lifetimes. A budget is a moving number while the runtime is still being
 * written — every correctness fix moves it, and the standing rule is that a
 * budget re-bases rather than a fix shrinking (see `budget` above) — so an
 * enforced budget mid-revision reports the same thing every time and stops
 * being read. The graph half is an **invariant**: `landing` is either absent
 * from a composition that does not install it or the tree-shaking claim is
 * false, and that is as true at revision 2 as at 1.0.
 *
 * Fusing them meant muting one muted the other, which is the only reason this
 * is two functions.
 */
export function budgetViolations(measurement: Measurement): readonly string[] {
  const { composition, brotli } = measurement;

  return brotli > composition.budget
    ? [
        `over budget by ${brotli - composition.budget} B ` +
          `(${brotli} > ${composition.budget})`,
      ]
    : [];
}

/**
 * A measurement's graph **as a consumer sees it**: the synthetic entry the
 * harness writes for an `imports` composition is dropped, because its id is a
 * temp path that differs on every run and it is not a module anyone ships.
 */
export function packageModules(measurement: Measurement): readonly string[] {
  return measurement.modules.filter((id) => id !== measurement.entryId);
}

/**
 * The **module graph** half: what a composition must and must not pull.
 *
 * This is the half a byte count cannot express (03 §Tree-shaking) and the half
 * that stays enforced while budgets are muted.
 */
export function graphViolations(measurement: Measurement): readonly string[] {
  const { composition, modules } = measurement;
  const found: string[] = [];

  for (const module of composition.absent ?? []) {
    if (modules.includes(module)) {
      found.push(`pulls ${module}, which it does not install`);
    }
  }

  for (const prefix of composition.absentPrefixes ?? []) {
    for (const module of modules) {
      if (module.startsWith(prefix)) {
        found.push(`pulls ${module}, from a subtree it must not reach`);
      }
    }
  }

  for (const module of composition.present ?? []) {
    if (!modules.includes(module)) {
      found.push(`does not pull ${module}, which it installs`);
    }
  }

  if (composition.only) {
    // Against the consumer-visible graph: the synthetic entry an `imports`
    // composition bundles is the harness's own module and is never shipped.
    const shipped = packageModules(measurement);

    for (const module of shipped) {
      if (!composition.only.includes(module)) {
        found.push(`pulls ${module}, and its graph is declared exactly`);
      }
    }

    for (const module of composition.only) {
      if (!shipped.includes(module)) {
        found.push(`does not pull ${module}, which its graph declares`);
      }
    }
  }

  for (const module of measurement.duplicated) {
    found.push(`emits ${module} into more than one chunk`);
  }

  return found;
}

/**
 * **M-3′'s topology test, and it is an identity rather than a threshold**
 * (D-95 (b), D-96 (5)).
 *
 * The question is whether D-48's `kernel.js` split still holds when one page
 * runs both behaviors. _Near the sum_ and _near the difference_ are not
 * conditions a byte count can be scored against, and a tolerance invented after
 * the run is exactly the post-hoc rule the phase refuses. The observable is the
 * graph: **the combined composition must pull the union of the two
 * single-behavior graphs and nothing else**, so every module both behaviors
 * need resolves once.
 *
 * A module in the combined graph and in neither single graph is a module the
 * pairing introduced; a module in a single graph and missing from the combined
 * one means one behavior stopped reaching it. Both are topology changes, and
 * either reopens the export topology under 05 §Measurements — landed 2026-08-02. The byte
 * delta against the sum is then the **size** of a duplication rather than the
 * evidence for one, which is why it is telemetry.
 */
export function unionViolations(
  combined: Measurement,
  parts: readonly Measurement[],
): readonly string[] {
  const union = new Set(parts.flatMap((part) => packageModules(part)));
  const found: string[] = [];

  for (const module of packageModules(combined)) {
    if (!union.has(module)) {
      found.push(`pulls ${module}, which neither behavior pulls alone`);
    }
  }

  for (const module of union) {
    if (!packageModules(combined).includes(module)) {
      found.push(`does not pull ${module}, which a behavior pulls alone`);
    }
  }

  return found;
}

/**
 * Both halves, for the CLI. `just size` reports and enforces everything — it is
 * run deliberately, by someone who wants the numbers — which is where the
 * budgets keep living while the suite has them muted.
 */
export function violations(measurement: Measurement): readonly string[] {
  return [...budgetViolations(measurement), ...graphViolations(measurement)];
}

const flag = (name: string): boolean =>
  process.argv.slice(2).includes(`--${name}`);

if (import.meta.main) {
  const kb = (bytes: number): string => `${(bytes / 1000).toFixed(2)} kB`;
  const unminified = flag('unminified');
  // `--unminified` is about *what is written*, so it implies writing.
  const writing = unminified || flag('files');
  const OUT = join(ROOT, '.measured');

  if (writing) {
    // Cleared first: a stale composition directory from an earlier tree reads
    // as this run's output and there is nothing in the file to say otherwise.
    await rm(OUT, { force: true, recursive: true });
  }

  let failed = false;
  const all = await measureAll(
    writing ? { directory: OUT, unminified } : undefined,
  );
  const byName = new Map(all.map((one) => [one.composition.name, one]));

  for (const measurement of all) {
    const { composition, brotli, modules } = measurement;
    const found = violations(measurement);
    const slack = composition.budget - brotli;

    // oxlint-disable-next-line no-console
    console.log(
      `${composition.name.padEnd(44)} ${kb(brotli).padStart(9)} brotli` +
        `  (${String(modules.length).padStart(2)} modules,` +
        ` ${kb(slack)} under budget)`,
    );

    for (const violation of found) {
      failed = true;
      // oxlint-disable-next-line no-console
      console.error(`  ✗ ${composition.name} ${violation}`);
    }
  }

  const combined = byName.get(COMBINED);
  const parts = [byName.get(SORTABLE_PART), byName.get(FREE_DRAG_PART)];

  if (combined && parts.every((part) => part !== undefined)) {
    const found = unionViolations(combined, parts);
    const sum = parts.reduce((total, part) => total + part.brotli, 0);

    // oxlint-disable-next-line no-console
    console.log(
      `\n${COMBINED} graph: ${packageModules(combined).length} modules` +
        ` against a ${SORTABLE_PART} + ${FREE_DRAG_PART} union of` +
        ` ${new Set(parts.flatMap(packageModules)).size}` +
        `  (telemetry: ${kb(combined.brotli)} against a ${kb(sum)} sum)`,
    );

    for (const violation of found) {
      failed = true;
      // oxlint-disable-next-line no-console
      console.error(`  ✗ ${COMBINED} ${violation}`);
    }
  }

  if (writing) {
    // oxlint-disable-next-line no-console
    console.log(
      `\nwrote ${all.length} compositions to ${relative(process.cwd(), OUT)}/` +
        `  (\`measured/\` is the bytes above` +
        `${unminified ? ', `unminified/` is the same bundle for reading' : ''})`,
    );
  }

  if (failed) {
    process.exitCode = 1;
  }
}
