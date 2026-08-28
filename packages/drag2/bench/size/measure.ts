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
import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { parseArgs } from 'node:util';
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
   *
   * **Re-based again 2026-08-25, Phase 23 (D-124), and this one is not noise.**
   * Five runtime guards go under `CODE_OF_SIZE.md` §1.1's reachability gate —
   * `moveTo`'s finite coordinates, the landing's `Infinity` duration,
   * `placeholder-not-adoptable`, and the frame part's kernel-key and
   * `__proto__` checks — with `home-not-finite`'s throw, keeping its copy.
   * Every row that reaches any of them moves, and **the two control rows do
   * not**.
   *
   * | Row | before | landed | Δ brotli | Δ minified | new budget |
   * | --- | --- | --- | --- | --- | --- |
   * | minimal | 10,667 | 10,550 | **−117** | −397 | 10,700 |
   * | minimal (xy) | 10,329 | 10,211 | **−118** | −398 | 10,361 |
   * | + layoutAnimation | 11,102 | 10,985 | **−117** | −398 | 11,135 |
   * | + landing | 10,960 | 10,825 | **−135** | −463 | 10,975 |
   * | complete | 11,384 | 11,243 | **−141** | −466 | 11,393 |
   * | free drag minimal | 8,440 | 8,309 | **−131** | −456 | 8,459 |
   * | free drag + bounds | 8,595 | 8,459 | **−136** | −456 | 8,609 |
   * | free drag + landing | 8,726 | 8,564 | **−162** | −522 | 8,714 |
   * | free drag complete | 8,878 | 8,716 | **−162** | −522 | 8,866 |
   * | both behaviors | 12,885 | 12,669 | **−216** | −653 | 12,819 |
   * | vocabulary root | 121 | 121 | **0** | 0 | 150 (unchanged) |
   * | kernel root | 6,303 | 6,227 | **−76** | −267 | 6,377 |
   * | baseline A | 11,096 | 10,969 | **−127** | −466 | 11,119 |
   * | baseline B | 6,889 | 6,889 | **0** | 0 | 7,040 (unchanged) |
   *
   * **The shape of the table is the evidence that the deletions are where they
   * are claimed to be.** The kernel root moves 76 B on the frame-part checks
   * alone, since it reaches no behavior; the free-drag rows move most where
   * `landing()` is composed, because that is where the duration check lived;
   * and `both behaviors` moves −216 B, more than either behavior alone,
   * because it is the only row carrying every deleted site. Read against the
   * row **D-119** could not move at all, this is a slice the instrument can
   * see.
   *
   * **`drag.js` is byte-identical at 121 B for the fifth consecutive slice**
   * and baseline B for the fourth. Neither reaches any of this code, and both
   * keep their budgets.
   *
   * **The re-base is the rule read in the direction it is usually read.**
   * Landed slack reached **226–387 B**, one and a half to two and a half times
   * the ~150 B convention, and the movement is −76 to −216 B — far outside the
   * ±25 B band this phase has demonstrated three times, and outside the
   * ±24 B D-119 declined to re-base for. Twelve rows return to landed + 150 B;
   * `drag.js` keeps its deliberate 29 B and baseline B its 151 B, neither
   * having moved.
   *
   * **Re-based again 2026-08-25, Phase 23 (D-121 … D-127), same day and same
   * rule.** This slice is not a guard sweep: it publishes three contract terms
   * — collection distinctness on `items`, string keys on `FramePartOf`,
   * `insertionAt` from `sortable/feature.js` — and then deletes what those
   * publications make unowned. Five checks go (`copyUniqueItems`'s `Set` and
   * throw, `validateFramePart`'s last arm **and the function with it**, and
   * `buildReorderProposal`'s neighbour and range tests), one obsolete factory
   * goes, and two allocations go with them: the proposal's destination view,
   * and the placement rollback snapshots the default-placeholder path used to
   * take and discard.
   *
   * **`copyUniqueItems` is deleted rather than renamed, and the sortable rows
   * carry the last 7–18 B of it.** With the `Set` and the `throw` gone its body
   * was `[...items]`, so the first landing's `copyItems` was a name over one
   * expression — the shape D-127 (a) had just inlined `destinationOf` for. The
   * three call sites spread inline, and `collection.ts` exports one fewer
   * symbol across a module boundary.
   *
   * | Row | before | landed | Δ brotli | Δ minified | new budget |
   * | --- | --- | --- | --- | --- | --- |
   * | minimal | 10,550 | 10,440 | **−110** | −393 | 10,590 |
   * | minimal (xy) | 10,211 | 10,102 | **−109** | −392 | 10,252 |
   * | + layoutAnimation | 10,985 | 10,886 | **−99** | −393 | 11,036 |
   * | + landing | 10,825 | 10,708 | **−117** | −391 | 10,858 |
   * | complete | 11,243 | 11,129 | **−114** | −391 | 11,279 |
   * | free drag minimal | 8,309 | 8,275 | **−34** | −119 | 8,425 |
   * | free drag + bounds | 8,459 | 8,425 | **−34** | −121 | 8,575 |
   * | free drag + landing | 8,564 | 8,532 | **−32** | −121 | 8,682 |
   * | free drag complete | 8,716 | 8,683 | **−33** | −121 | 8,833 |
   * | both behaviors | 12,669 | 12,555 | **−114** | −395 | 12,705 |
   * | vocabulary root | 121 | 121 | **0** | 0 | 150 (unchanged) |
   * | kernel root | 6,227 | 6,186 | **−41** | −118 | 6,336 |
   * | baseline A | 10,969 | 10,852 | **−117** | −394 | 11,002 |
   * | baseline B | 6,889 | 6,889 | **0** | 0 | 7,040 (unchanged) |
   *
   * **The split between the two behaviors is the evidence again, and it reads
   * the opposite way to D-124's.** Every free-drag row moves the *same* −32 to
   * −34 B, and the kernel root moves −41 B: that is `validateFramePart` and
   * nothing else, because free drag reaches nothing else in this slice. The
   * sortable rows move −86 to −110 B — the same kernel deletion plus the
   * collection and proposal work — and `both behaviors` moves −98 B rather
   * than the sum, because the kernel half is shared and counted once. Baseline
   * A moves most (−110 B) precisely because it is the non-composed fixture
   * that inlines the sortable install path.
   *
   * **Publishing `insertionAt` costs the graphs nothing, and the module counts
   * are the proof**: every row holds its count exactly (32/31/33/34/35 and
   * 27/28/29/30, 48, 2, 13, 30, 26). `sortable/feature.js` is a new **emitted**
   * module in the package, but no composition imports that entry, and the
   * function it re-exports already shipped inside `sortable/domain.js`.
   *
   * **`drag.js` is byte-identical at 121 B for the sixth consecutive slice**
   * and baseline B for the fifth.
   *
   * **Re-based again 2026-08-25, Phase 23 (D-128), and this one is the
   * owner's source-shape pass rather than a contract slice.** Eleven runtime
   * declarations go: the frame lifecycle wrappers (`composeFrame`,
   * `beginFrame`, `scrubFrame`) collapse into the `Object.assign` calls they
   * were naming, the `createKernelFrame`/`resetKernelFields` mirror pair
   * becomes one `DEFAULT_FRAME` literal behind `frame()`, the whole
   * frame-assertion family goes (`assertFrameShapesMatch`,
   * `assertFrameScrubbed`, `assert`, `sameKeys`, `captureFrameKeys`,
   * `validateFrameDescriptors`), and `seamFailed`/`seamDiscarded` go as a
   * pair.
   *
   * | Row | before | landed | Δ brotli | Δ minified | new budget |
   * | --- | --- | --- | --- | --- | --- |
   * | minimal | 10,440 | 10,206 | **−234** | −745 | 10,356 |
   * | minimal (xy) | 10,102 | 9,863 | **−239** | −749 | 10,013 |
   * | + layoutAnimation | 10,886 | 10,655 | **−231** | −745 | 10,805 |
   * | + landing | 10,708 | 10,470 | **−238** | −745 | 10,620 |
   * | complete | 11,129 | 10,895 | **−234** | −747 | 11,045 |
   * | free drag minimal | 8,275 | 8,023 | **−252** | −747 | 8,173 |
   * | free drag + bounds | 8,425 | 8,177 | **−248** | −745 | 8,327 |
   * | free drag + landing | 8,532 | 8,285 | **−247** | −745 | 8,435 |
   * | free drag complete | 8,683 | 8,436 | **−247** | −745 | 8,586 |
   * | both behaviors | 12,555 | 12,329 | **−226** | −749 | 12,479 |
   * | vocabulary root | 121 | 121 | **0** | 0 | 150 (unchanged) |
   * | kernel root | 6,186 | 5,953 | **−233** | −738 | 6,103 |
   * | baseline A | 10,852 | 10,613 | **−239** | −745 | 10,763 |
   * | baseline B | 6,889 | 6,889 | **0** | 0 | 7,040 (unchanged) |
   *
   * **The table's shape is flat, and that is the evidence.** Every row moves
   * −226 to −252 B and the **kernel root moves −233 B on its own** — this is
   * kernel code, so every composition pays for it and none pays more than the
   * kernel does. It is the exact inverse of D-121 … D-127's table, where the
   * free-drag and sortable rows split because the deletions were behavior
   * code. `drag.js` is byte-identical at **121 B for the seventh consecutive
   * slice** and reaches none of it.
   *
   * **This is the landed figure for a number that has been carried as a rank
   * since 2026-08-23.** [`obligations.md`](../../.plan/obligations.md)'s O-12
   * booked the frame-assertion machinery as an owner's call and recorded
   * D-117's ablation D at **−240…−266 B**, explicitly _as a rank and not as a
   * proposal_. The landed figure for the whole eleven-declaration pass is
   * −226…−252 B, so the ablation was very close and slightly high — which is
   * the expected direction, since an ablation neutralises code in place while
   * a deletion also removes what referenced it, and the two effects partly
   * cancel under Brotli.
   *
   * **Module counts hold exactly on all fourteen rows.** Nothing entered or
   * left a graph; what changed is the weight of `kernel/frames.js`.
   *
   * **Re-based again 2026-08-26, Phase 23 (D-130/D-131), and this is the one
   * re-base in the sequence that pays for something rather than banking it.**
   * One error channel replaces two: `globalThis.reportError`/`console.error`
   * and `reporter.ts` are deleted, `DraggableWarning` is published from
   * `drag.js`, and the kernel builds every public error it hands over.
   *
   * | Row | before | landed | Δ brotli | Δ minified | new budget |
   * | --- | --- | --- | --- | --- | --- |
   * | minimal | 10,119 | 10,295 | **+176** | +562 | 10,439 |
   * | minimal (xy) | 9,768 | 9,958 | **+190** | +561 | 10,097 |
   * | + layoutAnimation | 10,570 | 10,745 | **+175** | +562 | 10,882 |
   * | + landing | 10,379 | 10,562 | **+183** | +562 | 10,710 |
   * | complete | 10,817 | 10,989 | **+172** | +562 | 11,129 |
   * | free drag minimal | 7,932 | 8,108 | **+176** | +625 | 8,253 |
   * | free drag + bounds | 8,084 | 8,267 | **+183** | +625 | 8,409 |
   * | free drag + landing | 8,190 | 8,377 | **+187** | +624 | 8,519 |
   * | free drag complete | 8,347 | 8,536 | **+189** | +624 | 8,674 |
   * | both behaviors | 12,218 | 12,415 | **+197** | +699 | 12,557 |
   * | vocabulary root | 121 | 146 | **+25** | +111 | 300 |
   * | kernel root | 5,953 | 6,159 | **+206** | +887 | 6,309 |
   * | baseline A | 10,520 | 10,694 | **+174** | +475 | 10,831 |
   * | baseline B | 6,889 | 6,889 | **0** | 0 | 7,040 (unchanged) |
   *
   * **The kernel root gains a module — 13 to 14 — and that is the whole
   * story.** `kernel/errors.js` was outside its graph entirely, which the
   * positional `STAGE_TO_CODE` comment states as a fact about the tree
   * (*`kernel.js` never pulls this module at all*). D-130 §5 moves error
   * construction to the kernel, so it does now, and the table it carries comes
   * with it. That single edge accounts for most of the +887 B minified on the
   * kernel root, and the reason it costs so much less after Brotli — +206 B —
   * is that a fifteen-entry array of four repeated string literals is close to
   * the most compressible thing in the bundle, the same effect D-129 measured
   * in the other direction.
   *
   * **The composition rows pay less than the kernel root, which is the tell
   * that this is not double-counted.** Every behavior already pulled
   * `errors.js` for `toDraggableError`, so for them the module is not new and
   * what they pay is the channel itself: `notify`, `createUnwind`,
   * `DraggableWarning`, and the message strings that replaced a code. The
   * behaviors' figures separate the same way — free drag pays ~+625 B minified
   * against the sortable's ~+562 B, because free drag's spec gained the local
   * `try`/`catch` at its native scroll listener that the shared helper no
   * longer covers (D-130 §4).
   *
   * **One shape was measured after the fact and kept anyway.** Collapsing each
   * behavior's two `slots.onError` call sites into a single `deliver` — so
   * there is exactly one statement to find when asking *where does `onError`
   * get called* — costs **+5 B brotli** per composition while saving 5 B
   * minified, which is inside the ±25 B noise band in one direction and a real
   * readability gain in the other. The figures above are the landed ones, with
   * the collapse in.
   *
   * **The vocabulary root moves for the first time, and the row changed with
   * it.** It imported `{ DraggableError }` and would have kept reporting 121 B
   * for an entry that had grown a second class — a row that measures half of
   * what it names is worse than no row — so it imports both and re-bases to
   * 146 B. Its budget goes to 300 rather than to landed + 150: this row exists
   * to catch the vocabulary root *pulling the kernel*, which is a
   * kilobyte-scale event, and a tight budget on a 146 B file would fail on
   * ordinary message wording.
   *
   * **This is a cost the decision took deliberately, not an erosion.** The
   * standing rule is that a budget re-bases rather than a correctness fix
   * shrinking, and the same rule covers a contract change: what was bought is
   * that a fault the library surfaces reaches the consumer at all — sixteen
   * sites that went to `console.error` in a consumer's production build now
   * reach a handler, and F-103's site reached nobody.
   *
   * **Re-based again 2026-08-26, Phase 23 (D-129), and this row set answers a
   * question the previous three could not.** The input policy narrows to one
   * attribute: `POINTER_OWNERS` (14 selectors), `COMMAND_OWNERS` (5) and the
   * `owns` hop with its `isContentEditable` test are deleted, and
   * `pathOwnsInteraction` reads `[data-drag-ignore]` per hop.
   *
   * | Row | before | landed | Δ brotli | Δ minified | new budget |
   * | --- | --- | --- | --- | --- | --- |
   * | minimal | 10,206 | 10,119 | **−87** | −302 | 10,269 |
   * | minimal (xy) | 9,863 | 9,768 | **−95** | −300 | 9,918 |
   * | + layoutAnimation | 10,655 | 10,570 | **−85** | −302 | 10,720 |
   * | + landing | 10,470 | 10,379 | **−91** | −302 | 10,529 |
   * | complete | 10,895 | 10,817 | **−78** | −300 | 10,967 |
   * | free drag minimal | 8,023 | 7,932 | **−91** | −222 | 8,082 |
   * | free drag + bounds | 8,177 | 8,084 | **−93** | −224 | 8,234 |
   * | free drag + landing | 8,285 | 8,190 | **−95** | −224 | 8,340 |
   * | free drag complete | 8,436 | 8,347 | **−89** | −224 | 8,497 |
   * | both behaviors | 12,329 | 12,218 | **−111** | −444 | 12,368 |
   * | vocabulary root | 121 | 121 | **0** | 0 | 150 (unchanged) |
   * | kernel root | 5,953 | 5,953 | **0** | 0 | 6,103 (unchanged) |
   * | baseline A | 10,613 | 10,520 | **−93** | −302 | 10,670 |
   * | baseline B | 6,889 | 6,889 | **0** | 0 | 7,040 (unchanged) |
   *
   * **The kernel root does not move, and that is a structural fact rather than
   * a null result.** `pathOwnsInteraction` is kernel-*tier* code that no
   * kernel-*entry* graph reaches: the kernel binds ingress and the behavior
   * answers, so a third-party behavior importing `kernel.js` never receives
   * the policy. That is exactly the gap [02](../../.plan/contract/02-kernel-behavior-contract.md)
   * §The rule records as *the one honest gap*, and this row is the first
   * measurement to confirm the claim in bytes. **Eleven budgets re-base and
   * two do not**, for the same reason.
   *
   * **The minified column is the honest one and the brotli column is the
   * reported one, and here they disagree by 3.5×.** A sortable composition
   * loses 302 B of source and 87 B compressed, because a selector table is a
   * long run of lowercase ASCII with repeated `[`/`]`/`,` — close to the most
   * compressible thing in the bundle. Reading the minified figure as the win
   * would have overstated it threefold; reading only the brotli figure would
   * hide that the deletion is large. Both are recorded for that reason.
   *
   * **The split between the behaviors is a two-table effect, and it reads
   * cleanly at the source level.** Every sortable row loses ~301 B and every
   * free-drag row ~223 B — a difference of ~78 B, which is `COMMAND_OWNERS`
   * and its declaration, the table only the sortable's keyboard ingress
   * imported. `both behaviors` loses 444 B: more than either alone and less
   * than their sum, because `POINTER_OWNERS` and `owns` are shared and counted
   * once. **Module counts hold exactly on all fourteen rows**, and `drag.js`
   * is byte-identical at **121 B for the eighth consecutive slice**.
   *
   * **One candidate was measured and rejected, which is the other half of what
   * this instrument is for** (D-127). Collapsing `resetSortableFramePart`'s
   * six `= null` statements into one chained assignment saves 25 B minified
   * and costs **+1 to +5 B brotli on every sortable row** — the repeated
   * `part.x = null` lines compress better than the shape that replaces them.
   * The straightforward assignments stay.
   *
   * **Re-based 2026-08-26, Phase 23 (D-132), except that almost nothing needed
   * re-basing.** `DraggableErrorCode`, `STAGE_TO_CODE` and `toDraggableError`
   * are deleted; `DraggableError` carries a `FailureStage | null`; a
   * ~~a `STAGE_NAMES` tuple renders the stage in words for the constructed
   * message~~ (withdrawn by D-133 the same day — see below); `drag.js`
   * re-exports the twelve stage constants.
   *
   * | Row | before | landed | Δ brotli | Δ minified | budget | left |
   * | --- | --- | --- | --- | --- | --- | --- |
   * | minimal | 10,295 | 10,341 | **+46** | +12 | 10,439 | 98 |
   * | minimal (xy) | 9,958 | 9,991 | **+33** | +11 | 10,097 | 106 |
   * | + layoutAnimation | 10,745 | 10,780 | **+35** | +12 | 10,882 | 102 |
   * | + landing | 10,562 | 10,618 | **+56** | +12 | 10,710 | 92 |
   * | complete | 10,989 | 11,024 | **+35** | +12 | 11,129 | 105 |
   * | free drag minimal | 8,108 | 8,143 | **+35** | +11 | 8,253 | 110 |
   * | free drag + bounds | 8,267 | 8,297 | **+30** | +11 | 8,409 | 112 |
   * | free drag + landing | 8,377 | 8,418 | **+41** | +11 | 8,519 | 101 |
   * | free drag complete | 8,536 | 8,566 | **+30** | +11 | 8,674 | 108 |
   * | both behaviors | 12,415 | 12,461 | **+46** | +12 | 12,557 | 96 |
   * | vocabulary root | 146 | **261** | **+115** | +252 | 300 | 39 |
   * | kernel root | 6,159 | 6,200 | **+41** | +13 | 6,309 | 109 |
   * | baseline A | 10,694 | 10,713 | **+19** | +12 | 10,831 | 118 |
   * | baseline B | 6,889 | 6,889 | **0** | 0 | 7,040 | 151 |
   *
   * **Every composition moves by +11 to +13 B minified, and that is the
   * headline.** Twelve stages replacing four codes sounds like a table getting
   * larger and it is not: `STAGE_TO_CODE` held fifteen slots of four repeated
   * strings and `STAGE_NAMES` held fifteen slots of twelve distinct ones, at
   * almost exactly the same source length — and the deleted `toDraggableError`
   * pays for the constructor's extra ternary. **Brotli disagrees, by +19 to
   * +56 B**, which is the D-129 effect in reverse: twelve distinct strings
   * compress worse than four repeated ones even at equal length, so the
   * compressed column moves 3× the source column. Both are recorded because
   * neither alone says what happened.
   *
   * **Module counts hold exactly on all fourteen rows**, and baseline B — an
   * external control the package does not build — is byte-identical, which is
   * the check that says the harness itself did not shift underneath these
   * numbers.
   *
   * **The vocabulary root is the whole cost, and it is `STAGE_NAMES` alone.**
   * 146 → 261 B, its second consecutive move after eight slices of not moving.
   * The reason is specific and worth stating precisely: `STAGE_TO_CODE` was
   * **shaken out of this root entirely** — the class never referenced it, which
   * is exactly what the `only` row below used to record — while `STAGE_NAMES`
   * is read by the constructor and therefore cannot be. The table did not grow;
   * it moved from a position where this root paid nothing for it to one where
   * it pays for all of it. **This paragraph is what D-133 acted on**, and the
   * general lesson it states — a table's cost is a function of what references
   * it, not of its length — is the finding that outlived the table (F-105).
   *
   * **Publishing the twelve constants at `drag.js` costs this root 0 B and 0
   * modules**, which is a fourth independent confirmation of
   * [`failure-vocabulary-cost-claude.md`](../../.plan/reviews/phase-23/failure-vocabulary-cost-claude.md)'s
   * three. A consumer importing only the two classes shakes the re-export away,
   * and the `only` assertion below still holds at one shipped module. So the
   * decision's §6 is free and its §5.3 is not, which is the opposite of how the
   * record's own §7 apportioned it.
   *
   * **No budget re-bases, and that is the deliberate answer rather than an
   * omission.** Every row absorbs the change with ~100 B still in hand — the
   * `left` column above — because D-130's re-base set them at landed + ~150 and
   * this slice spends a third of that. The standing rule is that a budget
   * re-bases rather than a *correctness fix shrinking*; it says nothing about
   * re-basing upward to restore headroom a real growth consumed, and doing so
   * on rows that are not breached would convert every landed byte into
   * permanent licence for the next one. The tighter ceilings stay. The
   * vocabulary root's 300 stays for the stronger version of the same reason:
   * it was never landed + 150, because the row exists to catch this root
   * pulling the *kernel*, a kilobyte-scale event, and 39 B is still more than
   * the 29 B it was documented as carrying when the number was chosen.
   *
   * **The first slice in this sequence to be measured and then leave the
   * instrument alone.** D-129 re-based eleven, D-130 thirteen; this one
   * re-bases none, which is what a genuinely small change is supposed to look
   * like when the ceilings were set honestly.
   *
   * **Amended the same day by D-133, and this is the row set that caused the
   * amendment.** The `+115 B` on the vocabulary root above is what a decision
   * record was reading when it withdrew the property that produced it:
   * `STAGE_NAMES` fed a fallback message that fires **only** when a consumer
   * throws a non-`Error`, so the twelve words never reached the logged payload
   * D-132 §5.3 was written to improve (F-105). The table is deleted and the
   * fallback interpolates the number.
   *
   * | Row | D-132 landed | D-133 landed | Δ brotli | Δ minified |
   * | --- | --- | --- | --- | --- |
   * | minimal | 10,341 | 10,272 | **−69** | −205 |
   * | minimal (xy) | 9,991 | 9,921 | **−70** | −205 |
   * | + layoutAnimation | 10,780 | 10,717 | **−63** | −205 |
   * | + landing | 10,618 | 10,543 | **−75** | −205 |
   * | complete | 11,024 | 10,961 | **−63** | −205 |
   * | free drag minimal | 8,143 | 8,073 | **−70** | −203 |
   * | free drag + bounds | 8,297 | 8,229 | **−68** | −203 |
   * | free drag + landing | 8,418 | 8,341 | **−77** | −204 |
   * | free drag complete | 8,566 | 8,506 | **−60** | −205 |
   * | both behaviors | 12,461 | 12,388 | **−73** | −207 |
   * | vocabulary root | 261 | **159** | **−102** | −203 |
   * | kernel root | 6,200 | 6,128 | **−72** | −203 |
   * | baseline A | 10,713 | 10,645 | **−68** | −205 |
   * | baseline B | 6,889 | 6,889 | **0** | 0 |
   *
   * **Read the two slices together, because separately each one misleads.**
   * Against the pre-D-132 tree the *whole* classification change now measures:
   *
   * | Row | pre-D-132 | D-133 landed | net Δ brotli | net Δ minified |
   * | --- | --- | --- | --- | --- |
   * | minimal | 10,295 | 10,272 | **−23** | −193 |
   * | minimal (xy) | 9,958 | 9,921 | **−37** | −194 |
   * | + layoutAnimation | 10,745 | 10,717 | **−28** | −193 |
   * | + landing | 10,562 | 10,543 | **−19** | −193 |
   * | complete | 10,989 | 10,961 | **−28** | −193 |
   * | free drag minimal | 8,108 | 8,073 | **−35** | −192 |
   * | free drag + bounds | 8,267 | 8,229 | **−38** | −192 |
   * | free drag + landing | 8,377 | 8,341 | **−36** | −193 |
   * | free drag complete | 8,536 | 8,506 | **−30** | −194 |
   * | both behaviors | 12,415 | 12,388 | **−27** | −195 |
   * | vocabulary root | 146 | 159 | **+13** | +49 |
   * | kernel root | 6,159 | 6,128 | **−31** | −190 |
   * | baseline A | 10,694 | 10,645 | **−49** | −193 |
   * | baseline B | 6,889 | 6,889 | **0** | 0 |
   *
   * **Twelve stages replacing four codes made every composition smaller.**
   * `STAGE_TO_CODE`'s fifteen slots and `toDraggableError` are gone and what
   * replaced them is one template, so the richer vocabulary costs ~193 B *less*
   * of source on every row. The shared root pays **+13 B** for the whole
   * decision. That is the honest headline and neither slice alone states it:
   * D-132's table showed a cost the amendment removed, and D-133's table shows
   * a saving that is mostly D-132's own overhead being paid back.
   *
   * **Module counts hold exactly on all fourteen rows across both slices**, and
   * baseline B — an external control this package does not build — is
   * byte-identical throughout, which is what says the harness did not move
   * underneath any of these numbers.
   *
   * **No budget re-bases, for the third statement of the same reason.** Every
   * artifact moved *down* inside a ceiling that was never raised for it.
   *
   * **One ceiling moved afterwards, and for the opposite reason** (D-134). The
   * vocabulary root's 300 was left alone here because nothing breached it —
   * and that turned out to be the wrong test for a row whose budget is a
   * *sole* detector. It is **205** now, bracketed by a re-run injection rather
   * than inherited from a slice that had no reason to touch it; the derivation
   * is in that row's own comment. Nothing else moved.
   *
   * **Re-measured 2026-08-26 for the free-drag owner-review cleanup**
   * (D-139…D-142). Four deletions, no additions, and every row falls or holds.
   *
   * | Row | before | landed | Δ brotli | Δ minified |
   * | --- | --- | --- | --- | --- |
   * | minimal | 10,237 | 10,225 | **−12** | −84 |
   * | minimal (xy) | 9,886 | 9,876 | **−10** | −84 |
   * | + layoutAnimation | 10,678 | 10,663 | **−15** | −84 |
   * | + landing | 10,506 | 10,484 | **−22** | −84 |
   * | complete | 10,916 | 10,902 | **−14** | −84 |
   * | free drag minimal | 8,052 | 7,983 | **−69** | −149 |
   * | free drag + bounds | 8,210 | 8,134 | **−76** | −149 |
   * | free drag + landing | 8,310 | 8,246 | **−64** | −149 |
   * | free drag complete | 8,468 | 8,399 | **−69** | −149 |
   * | both behaviors | 12,349 | 12,300 | **−49** | −230 |
   * | vocabulary root | 159 | 159 | **0** | 0 |
   * | kernel root | 6,106 | 6,106 | **0** | 0 |
   * | baseline A | 10,616 | 10,591 | **−25** | −84 |
   * | baseline B | 6,889 | 6,889 | **0** | 0 |
   *
   * **The sortable rows move at all, and that is the interesting half.** No
   * sortable-facing surface changed: the whole of their −84 B minified is
   * D-142, the shared-default frame part. **Measured rather than apportioned**
   * — reverting D-142 alone against the finished tree returns `minimal` to
   * 10,237/30,241, byte-for-byte its baseline — which also fixes free drag's
   * share of it at −18 B brotli / −48 B minified and leaves −51 B brotli /
   * −101 B minified for D-139, D-140 and D-141 together.
   *
   * **This row set qualifies the D-127 measurement recorded above rather than
   * contradicting it.** That one found collapsing `resetSortableFramePart`'s
   * statements into one *chained assignment* cost +1…+5 B brotli on every
   * sortable row, because repeated `part.x = null` lines compress well, and
   * concluded the straightforward assignments stay. They did not stay, and the
   * earlier number is still correct: a shared `DEFAULT_PART` literal is not a
   * chained assignment — it deletes the second field list rather than
   * re-spelling it — so what compressed well is gone rather than reshaped.
   * **The rejected candidate and the accepted one differ in what they remove**,
   * which is the distinction a byte count alone does not carry and the reason
   * both are recorded.
   *
   * **Module counts hold exactly on all fourteen rows**, the `both behaviors`
   * union still closes at 47 against 47, and the three control rows —
   * `vocabulary root`, `kernel root` and `baseline B` — are byte-identical,
   * which is what says nothing moved underneath these numbers.
   *
   * **No budget re-bases, and here the rule is being applied in the direction
   * it was written for.** Every row shrank; re-basing down would convert a
   * cleanup into a permanently tighter ceiling nobody decided on, which is
   * exactly the *correctness fix shrinking* case the standing rule refuses.
   * The slack grows instead.
   *
   * **Extended to the sortable the same day** (D-143), which is the same
   * deletion over the first behavior's resolution.
   *
   * | Row | before | landed | Δ brotli | Δ minified |
   * | --- | --- | --- | --- | --- |
   * | minimal | 10,225 | 10,180 | **−45** | −151 |
   * | minimal (xy) | 9,876 | 9,833 | **−43** | −151 |
   * | + layoutAnimation | 10,663 | 10,621 | **−42** | −151 |
   * | + landing | 10,484 | 10,440 | **−44** | −151 |
   * | complete | 10,902 | 10,876 | **−26** | −151 |
   * | free drag minimal | 7,983 | 7,982 | **−1** | 0 |
   * | free drag + bounds | 8,134 | 8,136 | **+2** | 0 |
   * | free drag + landing | 8,246 | 8,246 | **0** | 0 |
   * | free drag complete | 8,399 | 8,402 | **+3** | 0 |
   * | both behaviors | 12,300 | 12,253 | **−47** | −151 |
   * | vocabulary root | 159 | 159 | **0** | 0 |
   * | kernel root | 6,106 | 6,106 | **0** | 0 |
   * | baseline A | 10,591 | 10,562 | **−29** | −145 |
   * | baseline B | 6,889 | 6,889 | **0** | 0 |
   *
   * **The four free-drag rows are the calibration this table is worth keeping
   * for.** No free-drag composition contains a sortable module, so nothing in
   * this slice reaches them except one statement re-ordering in their own
   * settlement arm — which is **zero** minified bytes on all four. Brotli
   * reports −1, +2, 0 and +3. That is the instrument's noise floor stated in
   * its own units, and it is the number to hold a single-digit brotli movement
   * against anywhere else in this file.
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
    budget: 10_439,
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
    budget: 10_097,
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
    budget: 10_882,
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
    budget: 10_710,
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
    budget: 11_129,
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
    budget: 8253,
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
    budget: 8409,
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
    budget: 8519,
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
    budget: 8674,
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
    budget: 12_557,
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
     * **The isolation was real but not structural, and D-132 made it
     * structural on one side while opening a new gap on the other.**
     * ~~`src/kernel/errors.ts` imports thirteen runtime `FAILURE_*` constants
     * from `./failures.ts` and uses them as computed keys in `STAGE_TO_CODE`,
     * so this root bundles to one module only because Rolldown shakes that map
     * and `toDraggableError` away from the `DraggableError` class in the same
     * file.~~ That map is deleted. `errors.ts` now names `FailureStage` as a
     * **type only** — `STAGE_NAMES` was a plain positional tuple with no
     * computed keys and D-133 deleted even that, so there is no runtime edge
     * from this module to `failures.js` left to shake — F-77's predicted regression, one runtime
     * reference from the class to the stage map, is unwriteable rather than
     * guarded.
     *
     * **The gap moved up one level.** `drag.js` itself now imports the twelve
     * constants from `./kernel/failures.js` in order to re-export them (D-132
     * §6), so the module is one shaken re-export away from this graph rather
     * than one shaken table. Measured at 0 B and 0 modules for a consumer
     * importing only the two classes — but it is a *tree-shaking outcome*
     * again, which is exactly the condition this row exists for: a module
     * pulled in, mostly shaken, showing up as a small delta that reads like
     * success. **The row is more necessary after D-132 than before it**, and
     * its subject changed without its assertion needing to.
     *
     * **`tests/packaging.node.test.ts` is not this assertion.** It walks the
     * unshaken *source* graph, deliberately independent of any bundler's
     * heuristics, and on that graph `drag.js` **does** reach
     * `kernel/failures.js`. Only a bundled-graph instrument can hold the 121 B.
     *
     * ## The two halves prove different things (D-134)
     *
     * They had never been written down as separate claims, and this comment
     * used to move between them inside one paragraph — which is how the row
     * came to carry two incompatible sizing rules at once (F-106).
     *
     * | Half | Claim | Blind to |
     * | --- | --- | --- |
     * | `only` | the root bundles to one module | anything arriving *inside* that module |
     * | `budget` | that one module stays the size of two classes | nothing — it is the residual detector |
     *
     * **The budget is the sole detector for its class.** The packed
     * `kernel/errors.js` carries a **bare** `import "./failures.js"`, because
     * `tsdown` inlines the `FAILURE_*` constants as literals — so machinery
     * arriving from `failures.ts` lands **inside this module** and moves no
     * module count at all. `only` cannot see it by construction, and
     * `packaging.node.test.ts` cannot either, since it walks the unshaken
     * *source* graph where `drag.js` genuinely does reach `kernel/failures.js`.
     *
     * ~~The budget goes to 300 rather than to landed + 150: this row exists to
     * catch the vocabulary root *pulling the kernel*, which is a kilobyte-scale
     * event, and a tight budget on a 146 B file would fail on ordinary message
     * wording.~~ **Superseded by D-134, and it had two defects.** Pulling the
     * kernel is what `only` catches, so sizing the ceiling for it left the
     * budget guarding nothing it alone could guard; and the wording volatility
     * was real when it was written — D-130 had just added a message string per
     * warning site and D-132 was about to add a twelve-entry name table — but
     * D-133 removed it. The root is two classes and two short library-authored
     * strings, and every `DraggableWarning` message is supplied by its caller
     * and lives in the caller's module.
     *
     * **The rule is 30-to-50 B of headroom, not the standing ~150 B, and that
     * is the row working rather than an oversight.** The convention is sized to
     * *roughly one module* against 8–13 kB compositions; on a 159 B root, one
     * module's worth of slack is larger than the artifact, and the row would
     * report success while the thing it exists to prevent happened.
     *
     * ## The calibration, run against this tree (D-134)
     *
     * A ceiling owes a **reproducible** injection, and when the injection stops
     * being writeable the ceiling stops being calibrated — D-96's rule one
     * level down. ~~Verified by injecting F-77's own predicted regression, one
     * runtime reference from `DraggableError` to `STAGE_TO_CODE`: the graph
     * stays at one module and the artifact grows 121 → 190 B.~~ **That
     * injection names two deleted tables and can no longer be written**, which
     * is why 300 was a number quoted rather than a number derived.
     *
     * **The regression class today is anything that makes `drag.js`'s
     * `kernel/failures.js` re-export unshakeable, or gives `errors.ts` a
     * runtime need for a stage value.** The injection below is the second
     * shape, written and measured on 2026-08-26 against the landed tree:
     *
     * ```ts
     * // src/kernel/errors.ts — import the twelve constants as values, then
     * const KNOWN_STAGES: readonly FailureStage[] = [FAILURE_ADMISSION, …];
     * // …and reference it from the constructor:
     * this.stage = stage !== null && KNOWN_STAGES.includes(stage) ? stage : null;
     * ```
     *
     * | | brotli | minified | shipped modules |
     * | --- | --- | --- | --- |
     * | landed | **159** | 344 | 1 |
     * | injected | **220** | 410 | **1 — unchanged** |
     * | reworded, same length | 181 | 342 | 1 |
     * | rewritten, +48 chars | 190 | 402 | 1 |
     *
     * **The graph half does not move, which is the whole finding.** A plausible
     * stage validation adds **+61 B** and zero modules, so only a ceiling this
     * row can breach observes it.
     *
     * **The ceiling is bracketed by measurement rather than estimated.** 190
     * must pass and 220 must fail, so the admissible window is 191–219 and
     * **205** is its midpoint — 46 B of headroom, breaching the injection by
     * 15 B and clearing the most generous rewrite by 15 B.
     *
     * **The wording band is wider than it looks, and Brotli is why.** A
     * *same-length* rewording costs **+22 B compressed while saving 2 B
     * minified**: `destroyed` and `failure` are in Brotli's static dictionary
     * and `torn down` and `fault` are not, so on a 344 B input the substitution
     * is a compression loss with no source cost. That is the opposite of the
     * usual direction on this file and the reason the band was measured instead
     * of assumed — D-134 §6 estimated it at single-digit-to-low-tens from
     * source length, which would have put the ceiling at 190 and failed on a
     * rewording.
     *
     * A legitimate change to the class re-bases this number, deliberately and
     * visibly, under the standing rule that a budget re-bases rather than a fix
     * shrinking. That is the intended behaviour and not a cost. **D-132 was
     * such a change and did not re-base it**: `STAGE_NAMES` took the root from
     * 146 to 261 B and 300 absorbed it, which is the loose ceiling doing the
     * harm — a 79% growth passed unremarked. **D-133 withdrew the table and the
     * root fell to 159 B**; D-134 then returned the ceiling to the artifact it
     * guards. **No other row moves**, and the graph half is unchanged.
     */
    name: 'vocabulary root - drag.js',
    // **Both classes, since D-130 published a second one.** Naming one would
    // let the other shake out and quietly stop measuring half the entry — the
    // row would keep reporting 121 B for a vocabulary root that had grown.
    //
    // **Deliberately *not* the twelve stage constants D-132 added.** Importing
    // them would fold their cost into this figure and destroy the row's one
    // claim: that a consumer who wants `err instanceof DraggableError` and
    // nothing else reaches one module. Their cost is a separate question, and
    // the answer — 0 B, 0 modules, because the re-export shakes — is only
    // observable while this row declines to import them.
    imports: { 'drag.js': '{ DraggableError, DraggableWarning }' },
    budget: 205,
    only: ['kernel/errors.js'],
  },
  {
    /**
     * The kernel tier's own root, the second half of F-77.
     *
     * **It is what makes the row above a measurement rather than a tautology.**
     * A one-module vocabulary root is only evidence for D-48's split if the
     * tier it declines to import is substantial, and this weighs that tier at
     * thirteen non-entry modules against the vocabulary root's one.
     *
     * **The containment runs one way, and one way is what D-48 asks for.**
     * This graph contains `kernel/errors.js`, because the kernel constructs
     * every public error and names both classes to do it (D-130), so the
     * vocabulary root's single module is a strict subset of this row's. The
     * property being measured is the direction that is not subsumption: an
     * ordinary consumer who wants `err instanceof DraggableError` reaches one
     * module and never this tier. A future edit that removed the class from
     * the kernel's graph would widen the gap and falsify nothing here; an edit
     * that put a behavior in it is what `absentPrefixes` catches.
     *
     * Declared with `present`/`absentPrefixes` rather than `only`: the claim
     * here is that the kernel floor reaches no behavior, not that its own
     * module list is frozen.
     */
    name: 'kernel root - kernel.js',
    imports: { 'kernel.js': '{ draggable }' },
    budget: 6309,
    present: ['kernel.js', 'kernel/kernel.js'],
    absentPrefixes: ['sortable/', 'free-drag/'],
  },
  {
    // Answers *what does composition cost*, and nothing else.
    name: 'baseline A - feature-matched, non-composed',
    entry: 'bench/size/noncomposed.js',
    budget: 10_831,
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

export type DeclarationWeight = Readonly<{
  files: number;
  bytes: number;
  comment: number;
}>;

/**
 * The published type surface, weighed the way a tarball carries it (D-135).
 *
 * Every other figure here is a *runtime* bundle, and a comment does not survive
 * minification — so the largest single class of published bytes this package
 * has is invisible to all of them. `prune-declarations.ts` cannot see it
 * either: it removes declaration files no entry can reach and never looks
 * inside the ones it keeps (F-107).
 *
 * **Reported and not budgeted.** A ceiling whose calibrating injection cannot
 * be re-run is not calibrated (D-134), and this figure has no measured
 * regression behind it. It is the number a later pass would need before it
 * could set one.
 */
export async function declarationWeight(): Promise<DeclarationWeight> {
  const SKIP = new Set(['node_modules', 'src', 'tests', 'bench']);
  const walk = async (directory: string): Promise<readonly string[]> => {
    const entries = await readdir(directory, { withFileTypes: true });
    const nested = await Promise.all(
      entries.map(async (entry) => {
        const path = join(directory, entry.name);

        if (entry.isDirectory()) {
          return SKIP.has(entry.name) || entry.name.startsWith('.')
            ? []
            : await walk(path);
        }

        return entry.name.endsWith('.d.ts') ? [path] : [];
      }),
    );

    return nested.flat();
  };

  const files = await walk(ROOT);
  const sources = await Promise.all(
    files.map((file) => readFile(file, 'utf8')),
  );
  let bytes = 0;
  let comment = 0;

  for (const source of sources) {
    bytes += source.length;

    // Declarations are emitted, so the two comment forms are the only ones
    // present and neither can appear inside a string literal.
    for (const match of source.matchAll(/\/\*[\s\S]*?\*\//gu)) {
      comment += match[0].length;
    }

    for (const match of source.matchAll(/^[^\S\n]*\/\/[^\n]*$/gmu)) {
      comment += match[0].length;
    }
  }

  return { files: files.length, bytes, comment };
}

/**
 * Both halves, for the CLI. `just size` reports and enforces everything — it is
 * run deliberately, by someone who wants the numbers — which is where the
 * budgets keep living while the suite has them muted.
 */
export function violations(measurement: Measurement): readonly string[] {
  return [...budgetViolations(measurement), ...graphViolations(measurement)];
}

if (import.meta.main) {
  const kb = (bytes: number): string => `${(bytes / 1000).toFixed(2)} kB`;
  // Strict, so a misspelt flag stops the run rather than silently measuring
  // with the flag off — the two flags decide only what is *written*, but a run
  // that quietly wrote nothing is indistinguishable from one that had nothing
  // to write.
  const { values } = parseArgs({
    options: {
      files: { type: 'boolean', default: false },
      unminified: { type: 'boolean', default: false },
    },
  });
  const { unminified } = values;
  // `--unminified` is about *what is written*, so it implies writing.
  const writing = unminified || values.files;
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

  const declarations = await declarationWeight();

  // oxlint-disable-next-line no-console
  console.log(
    `\npublished declarations: ${declarations.files} files,` +
      ` ${kb(declarations.bytes)}, of which ${kb(declarations.comment)} is` +
      ` comment (${Math.round(
        (declarations.comment / declarations.bytes) * 100,
      )} %)  (telemetry: not budgeted)`,
  );

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
