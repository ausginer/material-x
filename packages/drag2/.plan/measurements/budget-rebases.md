# Size-budget re-bases

The dated record of every re-base of the Brotli budgets in `bench/size/measure.ts`, kept here because it is history: each entry states the tree it was measured against, what moved, and why the ceiling did or did not follow. The file itself carries only the rule the budgets are administered under and the numbers that are current.

**Every _landed figures_ list below was current on its own date and none is updated by a later slice.** Only the most recent entry states a baseline that can be subtracted, and it names what it was measured **against** rather than leaving a reader to find the nearest list.

**Set 2026-08-02, from the first measurement**, with ~0.3 kB of headroom — deliberately tight, because the point of a budget here is to notice a module appearing in a graph, and 0.3 kB is roughly one such module.

**Re-based 2026-08-07, Phase 16.** D-33 cost 70 B and D-32 cost ~300 B across _every_ composition, including minimal: keyboard sorting is a `BehaviorSpec` member, not an optional feature, so a consumer cannot tree-shake away the second input mode. That is a deliberate accessibility position rather than an oversight — see [`plan.md`](../plan.md) Phase 16 — and the budgets say so by moving together.

**Re-based again 2026-08-07, Phase 17.** Extracting the packed rect index into a module both axis features share costs the list composition **60 B** — a module boundary under `unbundle`, and one record read where a closure variable used to be. It is recorded rather than absorbed: the alternative was two copies of a geometry cache that must stay in step, where a divergence is a silent correctness bug and not a style one. The 2-D _rule_ itself costs the list consumer nothing, which is the constraint the shape decision was made under.

**Re-based again 2026-08-08, Checkpoint D review 5 (Phase 21, pulled forward).** The rule this re-base establishes is in [`plan.md`](../plan.md) §Phase 21: _a size budget is never a reason to defer a fix for a floor breach; if the fix does not fit, the budget re-bases and the fix lands. What a budget may defer is defence in depth._ The C5 closure pass landed **nine** I-36 floor fixes — C5-01's animation-subscription barrier, C5-02's placeholder mechanics, and seven more the stretch sweep found in `placeholder.ts` and `spec.ts`. Mid-pass they took `complete` **1 B over** its 11,040 budget, and the budget re-based rather than the fix shrinking; brotli then gave some of it back as the repeated `rt.closed` guards started sharing a dictionary, so the landed cost is **+91 B** on `complete` against 106 B of headroom. The re-base stays: 15 B is not a margin the next correctness fix should be planning against, and taking the byte count out of the terminal safety argument is the point of pulling it forward. Landed per-composition cost: minimal **+83 B**, minimal (xy) **+77 B**, + layoutAnimation **+90 B**, + landing **+82 B**, complete **+91 B**, baseline A **+97 B**; baseline B is the shipped package and did not move. Every budget is now its measurement plus ~150 B, the headroom the Phase 17 re-base left, and ~~still under one module's worth~~ — **true when written, and not since 2026-08-24; see the D-117 note below**.

**Re-based again 2026-08-19, Phase 21 (M-3′), and this is the re-base `plan.md` §Phase 21 promised.** Five sortable rows and baseline A had gone over — by 247–407 B — because the Checkpoint E floor fixes landed under the standing rule that a budget re-bases rather than a correctness fix shrinking. Nothing was absorbed silently: the overruns were carried as muted telemetry (K-6) until a measurement phase could re-base against the artifact that will ship, which is here. Baseline B moves for the first time — its measurement has not changed, only its headroom, so that one rule covers every row.

**What the headroom is for, stated rather than left to be inferred.** ~150 B is about one module, and it is sized to notice **a module appearing in a graph** — the failure this file exists to catch. It is deliberately too small to absorb a feature, and anything larger comes back here and is re-based on purpose, with its reason written down. It is not a performance allowance, and it may never be spent to avoid landing a floor fix.

~~A change that fits inside it silently is a change that added no module.~~ **Corrected 2026-08-24 (D-117 implementation review §7.1), and corrected further than that review could see.** The smallest module's cost to enter a graph — `free-drag/bounds.js` into `free drag minimal` — has been measured three times across two **message-text-only** passes: **154 B** at `76176da8`, **149 B** at `b498d69e`, **157 B** here. It crossed the headroom in both directions without a module moving, because a module's marginal cost is what Brotli charges for it _given everything else in the graph_, and that is not a property of the module.

So the struck sentence is not stale, it is **unreliable in principle**: no headroom this instrument could carry makes the byte half a sufficient test, and picking one that happens to clear today's figure would only schedule the next correction. **The claim is carried by the graph declarations** — `absent`, `absentPrefixes`, `present`, `only` — which is why `free drag minimal` names this exact module. The byte budget catches growth; the graph declaration catches a module.

**Quantifier narrowed 2026-08-24 (F-88):** this said _every composition declares them_, and twelve of the fourteen rows do — in some combination of the four, not that one pair. **The two baselines declare no topology at all**, so on those rows the byte budget is the only instrument, which is the arrangement this paragraph has just called insufficient. Baseline A is where that has consequence: it reaches thirty modules through relative paths into the built package, so a module can enter it unobserved. It is tolerated rather than repaired because it is a checked-in fixture whose whole job is to price composition against `complete`, which does declare — and because `tests/bench/size.node.test.ts` pins its slot set against `assemble()`, which is a different drift than this one and not a substitute for it. **The repair is not a wider budget**: 150 B is calibrated against the failure it catches, and loosening an exact instrument to prop up a redundant one is the wrong direction.

Landed figures at that re-base: minimal **10,738**, minimal (xy) **10,787**, + layoutAnimation **11,162**, + landing **11,020**, complete **11,447**, free drag minimal **8,717**, free drag + bounds **8,863**, free drag + landing **9,016**, free drag complete **9,162**, both behaviors **12,995**, baseline A **11,158**, baseline B **6,889**.

**Re-based again 2026-08-21, Phase 22 (P-06, D-102), and the reason the rule above requires is that a module appeared — which is exactly what the headroom is sized to notice, so it did its job and the answer is a re-base rather than a wider margin.** `sortable/verified-refresh.js` is the verified incremental refresh, and it costs **+361 to +388 B** on the six rows that reach it.

**It was not re-based when P-06 first landed, and the delay is the substance rather than bookkeeping.** The fast path was folded into `createRectIndex`'s shared closure, so `xy()` linked 288 B of an optimization D-100 condition 1 makes unreachable for it — one axis feature's private code in the other's bundle, which is the single thing these exclusivity assertions exist to catch. D-102 held the budgets red until it moved, on the grounds that an absorbed number is a number nobody reads again. It moved: `minimal (xy)` is back to **10,787**, byte-identical to before P-06, so **its budget does not move here** and neither does any free-drag row. What is being re-based is the cost of the optimization in the module graph of the only feature that can execute it.

The split is not free on the `y()` side — ~66 B more than the folded form, for the wrapper object and the module boundary — and that is stated rather than netted off against the 288 B it removed. Headroom stays at ~150 B on every re-based row.

~~Landed figures, every row: minimal **11,105**, minimal (xy) **10,787**,

- layoutAnimation **11,550**, + landing **11,388**, complete **11,808**, free drag minimal **8,717**, free drag + bounds **8,863**, free drag + landing **9,016**, free drag complete **9,162**, both behaviors **13,363**, baseline A **11,520**, baseline B **6,889**.~~

**Superseded as a baseline, and this is the list that caused API-01.** The numbers are correct for 2026-08-21 and are kept as the dated record. What is withdrawn is any use of them as a _current_ measurement: D-103 and D-104 moved seven of these rows afterwards without updating the list, and the D-108 re-base below then subtracted it as though it were the pre-change tree — charging D-108 with 14–46 B that were not its own.

**The same withdrawal applies to every _Landed figures_ list above this one**, for the same reason and without re-measuring any of them: each was current on its own date and none is updated by a later decision. Only the most recent re-base states a baseline that can be subtracted, and it states what it was measured **against** rather than leaving the reader to find the nearest list.

**Re-based again 2026-08-22, Phase 22 (D-108), and this one moves the numbers _up_ for a correctness fix rather than for a module.** The kernel's four author-facing checks — `assertFrameShapesMatch`, `assertFrameScrubbed` and the two seam reports — were `__DEV__`-gated on `kernel/dev.ts`'s premise that _behavior authoring is not on the public surface_, which Revision 2.1 voided (F-78): the published build shipped `assertFrameShapesMatch(a, b) {}` as an empty stub, so a third-party behavior author got no frame-shape or reset-exhaustiveness validation in any build they could produce. D-108 un-gates all four, retires `kernel/dev.ts`, and leaves the sortable's own per-frame binding alone.

**This is the case the headroom rule was written for, in the direction it is usually read backwards.** ~150 B is sized to notice a module appearing, and **no module appeared** — the whole cost is the two assert messages, the two report messages, `sameKeys`, `validateFrameDescriptors` and two loops, all previously folded to nothing. It is nonetheless **282–305 B**, roughly twice the headroom, so it comes back here and re-bases visibly rather than being absorbed. The standing rule governs both halves: a budget re-bases rather than a correctness fix shrinking, and headroom may never be spent to avoid landing one.

**Corrected 2026-08-22 against the API review (API-01), and the correction is a lesson about this docblock rather than about D-108.** The first published figures — _283–340 B_ — were computed as `landed` minus the _Landed figures_ list of the **previous** re-base above, which is not the pre-change tree: D-103 and D-104 moved seven of these rows _after_ that list was written and neither updated it. So 14–46 B of P-06 remediation and P-02 shrink cost was attributed to D-108, and the published upper bound of 340 B corresponded to no row at all. The budgets did not change and are not affected — each is the true landed figure plus ~150 B — and the landed figures were right throughout; only the attribution was wrong.

**A re-base measures the tree it is re-basing from.** Subtracting the last list in this docblock is a proxy for that and silently absorbs everything that landed in between. The pre-change measurement is therefore recorded beside the landed one from here on, so the next pass has the subtrahend rather than having to trust that a list stayed current.

| Row                 | pre-slice `e086d058` | landed | D-108    |
| ------------------- | -------------------- | ------ | -------- |
| minimal             | 11,139               | 11,435 | **+296** |
| minimal (xy)        | 10,801               | 11,085 | **+284** |
| + layoutAnimation   | 11,571               | 11,874 | **+303** |
| + landing           | 11,423               | 11,728 | **+305** |
| complete            | 11,849               | 12,139 | **+290** |
| free drag minimal   | 8,717                | 9,007  | **+290** |
| free drag + bounds  | 8,863                | 9,159  | **+296** |
| free drag + landing | 9,016                | 9,307  | **+291** |
| free drag complete  | 9,162                | 9,459  | **+297** |
| both behaviors      | 13,396               | 13,699 | **+303** |
| vocabulary root     | 121                  | 121    | **0**    |
| kernel root         | 6,514                | 6,797  | **+283** |
| baseline A          | 11,566               | 11,848 | **+282** |
| baseline B          | 6,889                | 6,889  | **0**    |

**Two rows do not move**, and both are deliberate: baseline B is the shipped `@ydinjs/drag` package and never reaches this code, and the `drag.js` vocabulary root is byte-identical at **121 B** — the F-77 assertion doing its job, since the error vocabulary still does not pull the kernel.

**The four free-drag rows, `kernel root` and the two unmoved rows are the ones whose first figures were already right**, and that is the tell rather than a coincidence: they are exactly the rows D-103 and D-104 never touched, so for them the stale list and the pre-slice tree were the same numbers.

**Landed figures are the `landed` column above**, and are deliberately not repeated as a prose list here. Every earlier re-base ends in one, and it is that habit rather than any single list that produced API-01: a reader looking for _the last measurement_ finds the nearest list, which was current when written and is not current when read. The table states what it was measured against, so it cannot be mistaken for a baseline it is not.

**Re-based again 2026-08-23, Phase 23 (D-117), and this is the first re-base that moves every measured row _down_.** The diagnostic remediation replaces shipped narrative prose with `drag: <area>/<condition>` identities at the thirty-nine classified sites. **No check, branch, outcome, lifecycle path or `__DEV__` declaration moved** — the edit is message text and nothing else — so the whole delta is payload a consumer downloads and never reads.

**Measured jointly, once, against the pre-slice tree, and not summed from per-class ranks.** D-117's measurement record ranks P1, P2 and P3 in separate ablations and states why they may not be added: the parts understate the whole by 2–9 %, because forty tokens sharing one prefix and one slug vocabulary compress against each other in a way three separate builds cannot see. Its projected **−350…−547 B** is likewise an upper bound — measured with a `__DEV__` gating this closure declines and with one implementer's tokens — and it is not the subtrahend below.

| Row                 | pre-slice `76176da8` | landed | D-117    |
| ------------------- | -------------------- | ------ | -------- |
| minimal             | 11,162               | 10,706 | **−456** |
| minimal (xy)        | 10,807               | 10,364 | **−443** |
| + layoutAnimation   | 11,589               | 11,152 | **−437** |
| + landing           | 11,449               | 10,979 | **−470** |
| complete            | 11,859               | 11,405 | **−454** |
| free drag minimal   | 8,768                | 8,468  | **−300** |
| free drag + bounds  | 8,922                | 8,617  | **−305** |
| free drag + landing | 9,066                | 8,748  | **−318** |
| free drag complete  | 9,217                | 8,902  | **−315** |
| both behaviors      | 13,418               | 12,918 | **−500** |
| vocabulary root     | 121                  | 121    | **0**    |
| kernel root         | 6,598                | 6,332  | **−266** |
| baseline A          | 11,583               | 11,142 | **−441** |
| baseline B          | 6,889                | 6,889  | **0**    |

Minified, the same slice is **−913 to −1,387 B** on the compositions and **−781 B** on the kernel root. Both figures are read because they have disagreed in direction before, and here they do not.

**`drag.js` is the control row, and it did not move.** D-117 rules the `DraggableError` constructor a _formatting_ site rather than a diagnostic one — it detects nothing and its `drag: ${code} failure` is already an identity — so the classification never reaches it and the row stays byte-identical at **121 B**. The measurement predicted **+2 B** for the variant that rewrote it, which its 29 B of headroom would have shown; that variant did not land, and **this row's budget is untouched**. A policy that touches only what it should leaves this row where it was.

**Headroom returns to ~150 B on every measured row.** The landed figures left slack of **618–932 B**, four to six times the margin, and a budget that loose stops noticing the module it exists to notice. The rule is the same one that governs a re-base upward — the fix lands and the budget follows — read in the other direction. Baseline B is the shipped package and never reaches this code, so it keeps its figure and its 151 B.

**What shrinking the prose did to the marginal cost, recorded rather than absorbed** (D-117 implementation review §7.1). A module entering a graph costs, on the tree these budgets are set from: `free-drag/bounds.js` **+157 B**, `free-drag/landing.js` **+286 B**, `sortable/layout-animation.js` **+440 B** on `minimal` and **+415 B** on `+ landing`. The review measured the smallest of these at **149 B** — one byte _under_ the headroom — one commit earlier, and at **154 B** one commit before that. **No budget and no graph assertion moves for any of it**, and the doctrine paragraph above now says why: a figure that swings across the headroom on two message-text passes is not a figure a headroom can be sized against, and the module claim was never the byte half's to make.

**Re-based again 2026-08-24, Phase 23 (D-118).** `arm()`'s `command.types` loop loses its two array-shape checks — an empty array and an empty-string entry — and keeps the `pointerdown` collision, which is the one of the three that protects the kernel's own operation state rather than the author's feature. Two `if` blocks and two identity strings leave one module, so the minified delta is **flat at −128 B** on every row that carries `kernel/kernel.js`, and **−9 B** more from collapsing the `const { types } = next.command` destructure that existed only because `types.length` was a second reader: **−137 B** landed, and the split is recorded because the review projected the −128 and the remainder is this pass's own.

| Row                 | before | landed | D-118   | new budget        |
| ------------------- | ------ | ------ | ------- | ----------------- |
| minimal             | 10,710 | 10,684 | **−26** | 10,834            |
| minimal (xy)        | 10,369 | 10,344 | **−25** | 10,494            |
| + layoutAnimation   | 11,150 | 11,126 | **−24** | 11,276            |
| + landing           | 10,993 | 10,954 | **−39** | 11,104            |
| complete            | 11,408 | 11,383 | **−25** | 11,533            |
| free drag minimal   | 8,463  | 8,440  | **−23** | 8,590             |
| free drag + bounds  | 8,620  | 8,595  | **−25** | 8,745             |
| free drag + landing | 8,749  | 8,726  | **−23** | 8,876             |
| free drag complete  | 8,903  | 8,878  | **−25** | 9,028             |
| both behaviors      | 12,932 | 12,906 | **−26** | 13,056            |
| vocabulary root     | 121    | 121    | **0**   | 150 (unchanged)   |
| kernel root         | 6,336  | 6,303  | **−33** | 6,453             |
| baseline A          | 11,143 | 11,118 | **−25** | 11,268            |
| baseline B          | 6,889  | 6,889  | **0**   | 7,040 (unchanged) |

**This is not a size case and the re-base is not the point** — twenty-odd Brotli bytes is inside the noise band this phase has demonstrated three times, and D-118 would read the same at 3 B or at 300 B. The budgets move for the one reason the rule above gives — they follow the landed figure in both directions — and that rule sets the target at landed + ~150 B whatever the size of the slice. Left alone the slack would have stood at **162–179 B**, which is not the margin this file keeps; no threshold read off a marginal module cost is needed to say so, and the paragraph above declines to reason from one.

**`drag.js` and baseline B do not move, correctly** — neither reaches `kernel/kernel.js`, and the control row is byte-identical at **121 B** for the third consecutive slice.

**Measured and _not_ re-based, 2026-08-24, Phase 23 (D-119).** The `Insertion` construction owner (F-91) collapses seven object literals to one rule in `sortable/domain.js`, called from `keyboard.js`, `y.js`, `xy.js` and `collection.js`. **Minified it is flat at −114 to −119 B** on every row that carries the sortable behavior, and **0 B** on every row that does not — the four free-drag rows, the kernel root, `drag.js` and baseline B are byte-identical in both figures.

| Row               | before | landed  | Δ brotli | Δ minified | slack |
| ----------------- | ------ | ------- | -------- | ---------- | ----- |
| minimal           | 10,684 | 10,667  | **−17**  | −115       | 167   |
| minimal (xy)      | 10,344 | 10,329  | **−15**  | −119       | 165   |
| + layoutAnimation | 11,126 | 11,102  | **−24**  | −117       | 174   |
| + landing         | 10,954 | 10,960  | **+6**   | −115       | 144   |
| complete          | 11,383 | 11,384  | **+1**   | −115       | 149   |
| free drag ×4      | —      | unmoved | **0**    | 0          | 150   |
| both behaviors    | 12,906 | 12,885  | **−21**  | −116       | 171   |
| vocabulary root   | 121    | 121     | **0**    | 0          | 29    |
| kernel root       | 6,303  | 6,303   | **0**    | 0          | 150   |
| baseline A        | 11,118 | 11,096  | **−22**  | −114       | 172   |
| baseline B        | 6,889  | 6,889   | **0**    | 0          | 151   |

**Two rows went up, and that is the useful part of this measurement.** One edit, one direction in the minified figure — a flat ~116 B removed everywhere the code is reached — and a compressed figure that ranges from −24 B to **+6 B** across the same rows. This phase has asserted three times that twenty-odd Brotli bytes is noise; here the same slice demonstrates it on one tree rather than by comparing two, and the direction disagreement is the evidence. **Nothing follows from the +6 except that it is not a regression to chase.**

**The budgets therefore do not move, and that is the rule rather than an exception to it.** They already sit at their measurement plus **144–174 B** — the ~150 B target, in both directions — so following the landed figure means leaving them where they are. Re-basing would raise two budgets on +6 B and +1 B of compression noise, which is the one thing a budget sized to notice a module must not learn to do.

**Re-based again 2026-08-25, Phase 23 (D-124), and this one is not noise.** Five runtime guards go under `CODE_OF_SIZE.md` §1.1's reachability gate — `moveTo`'s finite coordinates, the landing's `Infinity` duration, `placeholder-not-adoptable`, and the frame part's kernel-key and `__proto__` checks — with `home-not-finite`'s throw, keeping its copy. Every row that reaches any of them moves, and **the two control rows do not**.

| Row | before | landed | Δ brotli | Δ minified | new budget |
| --- | --- | --- | --- | --- | --- |
| minimal | 10,667 | 10,550 | **−117** | −397 | 10,700 |
| minimal (xy) | 10,329 | 10,211 | **−118** | −398 | 10,361 |
| + layoutAnimation | 11,102 | 10,985 | **−117** | −398 | 11,135 |
| + landing | 10,960 | 10,825 | **−135** | −463 | 10,975 |
| complete | 11,384 | 11,243 | **−141** | −466 | 11,393 |
| free drag minimal | 8,440 | 8,309 | **−131** | −456 | 8,459 |
| free drag + bounds | 8,595 | 8,459 | **−136** | −456 | 8,609 |
| free drag + landing | 8,726 | 8,564 | **−162** | −522 | 8,714 |
| free drag complete | 8,878 | 8,716 | **−162** | −522 | 8,866 |
| both behaviors | 12,885 | 12,669 | **−216** | −653 | 12,819 |
| vocabulary root | 121 | 121 | **0** | 0 | 150 (unchanged) |
| kernel root | 6,303 | 6,227 | **−76** | −267 | 6,377 |
| baseline A | 11,096 | 10,969 | **−127** | −466 | 11,119 |
| baseline B | 6,889 | 6,889 | **0** | 0 | 7,040 (unchanged) |

**The shape of the table is the evidence that the deletions are where they are claimed to be.** The kernel root moves 76 B on the frame-part checks alone, since it reaches no behavior; the free-drag rows move most where `landing()` is composed, because that is where the duration check lived; and `both behaviors` moves −216 B, more than either behavior alone, because it is the only row carrying every deleted site. Read against the row **D-119** could not move at all, this is a slice the instrument can see.

**`drag.js` is byte-identical at 121 B for the fifth consecutive slice** and baseline B for the fourth. Neither reaches any of this code, and both keep their budgets.

**The re-base is the rule read in the direction it is usually read.** Landed slack reached **226–387 B**, one and a half to two and a half times the ~150 B convention, and the movement is −76 to −216 B — far outside the ±25 B band this phase has demonstrated three times, and outside the ±24 B D-119 declined to re-base for. Twelve rows return to landed + 150 B; `drag.js` keeps its deliberate 29 B and baseline B its 151 B, neither having moved.

**Re-based again 2026-08-25, Phase 23 (D-121 … D-127), same day and same rule.** This slice is not a guard sweep: it publishes three contract terms — collection distinctness on `items`, string keys on `FramePartOf`, `insertionAt` from `sortable/feature.js` — and then deletes what those publications make unowned. Five checks go (`copyUniqueItems`'s `Set` and throw, `validateFramePart`'s last arm **and the function with it**, and `buildReorderProposal`'s neighbour and range tests), one obsolete factory goes, and two allocations go with them: the proposal's destination view, and the placement rollback snapshots the default-placeholder path used to take and discard.

**`copyUniqueItems` is deleted rather than renamed, and the sortable rows carry the last 7–18 B of it.** With the `Set` and the `throw` gone its body was `[...items]`, so the first landing's `copyItems` was a name over one expression — the shape D-127 (a) had just inlined `destinationOf` for. The three call sites spread inline, and `collection.ts` exports one fewer symbol across a module boundary.

| Row | before | landed | Δ brotli | Δ minified | new budget |
| --- | --- | --- | --- | --- | --- |
| minimal | 10,550 | 10,440 | **−110** | −393 | 10,590 |
| minimal (xy) | 10,211 | 10,102 | **−109** | −392 | 10,252 |
| + layoutAnimation | 10,985 | 10,886 | **−99** | −393 | 11,036 |
| + landing | 10,825 | 10,708 | **−117** | −391 | 10,858 |
| complete | 11,243 | 11,129 | **−114** | −391 | 11,279 |
| free drag minimal | 8,309 | 8,275 | **−34** | −119 | 8,425 |
| free drag + bounds | 8,459 | 8,425 | **−34** | −121 | 8,575 |
| free drag + landing | 8,564 | 8,532 | **−32** | −121 | 8,682 |
| free drag complete | 8,716 | 8,683 | **−33** | −121 | 8,833 |
| both behaviors | 12,669 | 12,555 | **−114** | −395 | 12,705 |
| vocabulary root | 121 | 121 | **0** | 0 | 150 (unchanged) |
| kernel root | 6,227 | 6,186 | **−41** | −118 | 6,336 |
| baseline A | 10,969 | 10,852 | **−117** | −394 | 11,002 |
| baseline B | 6,889 | 6,889 | **0** | 0 | 7,040 (unchanged) |

**The split between the two behaviors is the evidence again, and it reads the opposite way to D-124's.** Every free-drag row moves the _same_ −32 to −34 B, and the kernel root moves −41 B: that is `validateFramePart` and nothing else, because free drag reaches nothing else in this slice. The sortable rows move −86 to −110 B — the same kernel deletion plus the collection and proposal work — and `both behaviors` moves −98 B rather than the sum, because the kernel half is shared and counted once. Baseline A moves most (−110 B) precisely because it is the non-composed fixture that inlines the sortable install path.

**Publishing `insertionAt` costs the graphs nothing, and the module counts are the proof**: every row holds its count exactly (32/31/33/34/35 and 27/28/29/30, 48, 2, 13, 30, 26). `sortable/feature.js` is a new **emitted** module in the package, but no composition imports that entry, and the function it re-exports already shipped inside `sortable/domain.js`.

**`drag.js` is byte-identical at 121 B for the sixth consecutive slice** and baseline B for the fifth.

**Re-based again 2026-08-25, Phase 23 (D-128), and this one is the owner's source-shape pass rather than a contract slice.** Eleven runtime declarations go: the frame lifecycle wrappers (`composeFrame`, `beginFrame`, `scrubFrame`) collapse into the `Object.assign` calls they were naming, the `createKernelFrame`/`resetKernelFields` mirror pair becomes one `DEFAULT_FRAME` literal behind `frame()`, the whole frame-assertion family goes (`assertFrameShapesMatch`, `assertFrameScrubbed`, `assert`, `sameKeys`, `captureFrameKeys`, `validateFrameDescriptors`), and `seamFailed`/`seamDiscarded` go as a pair.

| Row | before | landed | Δ brotli | Δ minified | new budget |
| --- | --- | --- | --- | --- | --- |
| minimal | 10,440 | 10,206 | **−234** | −745 | 10,356 |
| minimal (xy) | 10,102 | 9,863 | **−239** | −749 | 10,013 |
| + layoutAnimation | 10,886 | 10,655 | **−231** | −745 | 10,805 |
| + landing | 10,708 | 10,470 | **−238** | −745 | 10,620 |
| complete | 11,129 | 10,895 | **−234** | −747 | 11,045 |
| free drag minimal | 8,275 | 8,023 | **−252** | −747 | 8,173 |
| free drag + bounds | 8,425 | 8,177 | **−248** | −745 | 8,327 |
| free drag + landing | 8,532 | 8,285 | **−247** | −745 | 8,435 |
| free drag complete | 8,683 | 8,436 | **−247** | −745 | 8,586 |
| both behaviors | 12,555 | 12,329 | **−226** | −749 | 12,479 |
| vocabulary root | 121 | 121 | **0** | 0 | 150 (unchanged) |
| kernel root | 6,186 | 5,953 | **−233** | −738 | 6,103 |
| baseline A | 10,852 | 10,613 | **−239** | −745 | 10,763 |
| baseline B | 6,889 | 6,889 | **0** | 0 | 7,040 (unchanged) |

**The table's shape is flat, and that is the evidence.** Every row moves −226 to −252 B and the **kernel root moves −233 B on its own** — this is kernel code, so every composition pays for it and none pays more than the kernel does. It is the exact inverse of D-121 … D-127's table, where the free-drag and sortable rows split because the deletions were behavior code. `drag.js` is byte-identical at **121 B for the seventh consecutive slice** and reaches none of it.

**This is the landed figure for a number that has been carried as a rank since 2026-08-23.** [`obligations.md`](../obligations.md)'s O-12 booked the frame-assertion machinery as an owner's call and recorded D-117's ablation D at **−240…−266 B**, explicitly _as a rank and not as a proposal_. The landed figure for the whole eleven-declaration pass is −226…−252 B, so the ablation was very close and slightly high — which is the expected direction, since an ablation neutralises code in place while a deletion also removes what referenced it, and the two effects partly cancel under Brotli.

**Module counts hold exactly on all fourteen rows.** Nothing entered or left a graph; what changed is the weight of `kernel/frames.js`.

**Re-based again 2026-08-26, Phase 23 (D-130/D-131), and this is the one re-base in the sequence that pays for something rather than banking it.** One error channel replaces two: `globalThis.reportError`/`console.error` and `reporter.ts` are deleted, `DraggableWarning` is published from `drag.js`, and the kernel builds every public error it hands over.

| Row | before | landed | Δ brotli | Δ minified | new budget |
| --- | --- | --- | --- | --- | --- |
| minimal | 10,119 | 10,295 | **+176** | +562 | 10,439 |
| minimal (xy) | 9,768 | 9,958 | **+190** | +561 | 10,097 |
| + layoutAnimation | 10,570 | 10,745 | **+175** | +562 | 10,882 |
| + landing | 10,379 | 10,562 | **+183** | +562 | 10,710 |
| complete | 10,817 | 10,989 | **+172** | +562 | 11,129 |
| free drag minimal | 7,932 | 8,108 | **+176** | +625 | 8,253 |
| free drag + bounds | 8,084 | 8,267 | **+183** | +625 | 8,409 |
| free drag + landing | 8,190 | 8,377 | **+187** | +624 | 8,519 |
| free drag complete | 8,347 | 8,536 | **+189** | +624 | 8,674 |
| both behaviors | 12,218 | 12,415 | **+197** | +699 | 12,557 |
| vocabulary root | 121 | 146 | **+25** | +111 | 300 |
| kernel root | 5,953 | 6,159 | **+206** | +887 | 6,309 |
| baseline A | 10,520 | 10,694 | **+174** | +475 | 10,831 |
| baseline B | 6,889 | 6,889 | **0** | 0 | 7,040 (unchanged) |

**The kernel root gains a module — 13 to 14 — and that is the whole story.** `kernel/errors.js` was outside its graph entirely, which the positional `STAGE_TO_CODE` comment states as a fact about the tree (_`kernel.js` never pulls this module at all_). D-130 §5 moves error construction to the kernel, so it does now, and the table it carries comes with it. That single edge accounts for most of the +887 B minified on the kernel root, and the reason it costs so much less after Brotli — +206 B — is that a fifteen-entry array of four repeated string literals is close to the most compressible thing in the bundle, the same effect D-129 measured in the other direction.

**The composition rows pay less than the kernel root, which is the tell that this is not double-counted.** Every behavior already pulled `errors.js` for `toDraggableError`, so for them the module is not new and what they pay is the channel itself: `notify`, `createUnwind`, `DraggableWarning`, and the message strings that replaced a code. The behaviors' figures separate the same way — free drag pays ~+625 B minified against the sortable's ~+562 B, because free drag's spec gained the local `try`/`catch` at its native scroll listener that the shared helper no longer covers (D-130 §4).

**One shape was measured after the fact and kept anyway.** Collapsing each behavior's two `slots.onError` call sites into a single `deliver` — so there is exactly one statement to find when asking _where does `onError` get called_ — costs **+5 B brotli** per composition while saving 5 B minified, which is inside the ±25 B noise band in one direction and a real readability gain in the other. The figures above are the landed ones, with the collapse in.

**The vocabulary root moves for the first time, and the row changed with it.** It imported `{ DraggableError }` and would have kept reporting 121 B for an entry that had grown a second class — a row that measures half of what it names is worse than no row — so it imports both and re-bases to 146 B. Its budget goes to 300 rather than to landed + 150: this row exists to catch the vocabulary root _pulling the kernel_, which is a kilobyte-scale event, and a tight budget on a 146 B file would fail on ordinary message wording.

**This is a cost the decision took deliberately, not an erosion.** The standing rule is that a budget re-bases rather than a correctness fix shrinking, and the same rule covers a contract change: what was bought is that a fault the library surfaces reaches the consumer at all — sixteen sites that went to `console.error` in a consumer's production build now reach a handler, and F-103's site reached nobody.

**Re-based again 2026-08-26, Phase 23 (D-129), and this row set answers a question the previous three could not.** The input policy narrows to one attribute: `POINTER_OWNERS` (14 selectors), `COMMAND_OWNERS` (5) and the `owns` hop with its `isContentEditable` test are deleted, and `pathOwnsInteraction` reads `[data-drag-ignore]` per hop.

| Row | before | landed | Δ brotli | Δ minified | new budget |
| --- | --- | --- | --- | --- | --- |
| minimal | 10,206 | 10,119 | **−87** | −302 | 10,269 |
| minimal (xy) | 9,863 | 9,768 | **−95** | −300 | 9,918 |
| + layoutAnimation | 10,655 | 10,570 | **−85** | −302 | 10,720 |
| + landing | 10,470 | 10,379 | **−91** | −302 | 10,529 |
| complete | 10,895 | 10,817 | **−78** | −300 | 10,967 |
| free drag minimal | 8,023 | 7,932 | **−91** | −222 | 8,082 |
| free drag + bounds | 8,177 | 8,084 | **−93** | −224 | 8,234 |
| free drag + landing | 8,285 | 8,190 | **−95** | −224 | 8,340 |
| free drag complete | 8,436 | 8,347 | **−89** | −224 | 8,497 |
| both behaviors | 12,329 | 12,218 | **−111** | −444 | 12,368 |
| vocabulary root | 121 | 121 | **0** | 0 | 150 (unchanged) |
| kernel root | 5,953 | 5,953 | **0** | 0 | 6,103 (unchanged) |
| baseline A | 10,613 | 10,520 | **−93** | −302 | 10,670 |
| baseline B | 6,889 | 6,889 | **0** | 0 | 7,040 (unchanged) |

**The kernel root does not move, and that is a structural fact rather than a null result.** `pathOwnsInteraction` is kernel-_tier_ code that no kernel-_entry_ graph reaches: the kernel binds ingress and the behavior answers, so a third-party behavior importing `kernel.js` never receives the policy. That is exactly the gap [02](../contract/02-kernel-behavior-contract.md) §The rule records as _the one honest gap_, and this row is the first measurement to confirm the claim in bytes. **Eleven budgets re-base and two do not**, for the same reason.

**The minified column is the honest one and the brotli column is the reported one, and here they disagree by 3.5×.** A sortable composition loses 302 B of source and 87 B compressed, because a selector table is a long run of lowercase ASCII with repeated `[`/`]`/`,` — close to the most compressible thing in the bundle. Reading the minified figure as the win would have overstated it threefold; reading only the brotli figure would hide that the deletion is large. Both are recorded for that reason.

**The split between the behaviors is a two-table effect, and it reads cleanly at the source level.** Every sortable row loses ~301 B and every free-drag row ~223 B — a difference of ~78 B, which is `COMMAND_OWNERS` and its declaration, the table only the sortable's keyboard ingress imported. `both behaviors` loses 444 B: more than either alone and less than their sum, because `POINTER_OWNERS` and `owns` are shared and counted once. **Module counts hold exactly on all fourteen rows**, and `drag.js` is byte-identical at **121 B for the eighth consecutive slice**.

**One candidate was measured and rejected, which is the other half of what this instrument is for** (D-127). Collapsing `resetSortableFramePart`'s six `= null` statements into one chained assignment saves 25 B minified and costs **+1 to +5 B brotli on every sortable row** — the repeated `part.x = null` lines compress better than the shape that replaces them. The straightforward assignments stay.

**Re-based 2026-08-26, Phase 23 (D-132), except that almost nothing needed re-basing.** `DraggableErrorCode`, `STAGE_TO_CODE` and `toDraggableError` are deleted; `DraggableError` carries a `FailureStage | null`; a ~~a `STAGE_NAMES` tuple renders the stage in words for the constructed message~~ (withdrawn by D-133 the same day — see below); `drag.js` re-exports the twelve stage constants.

| Row | before | landed | Δ brotli | Δ minified | budget | left |
| --- | --- | --- | --- | --- | --- | --- |
| minimal | 10,295 | 10,341 | **+46** | +12 | 10,439 | 98 |
| minimal (xy) | 9,958 | 9,991 | **+33** | +11 | 10,097 | 106 |
| + layoutAnimation | 10,745 | 10,780 | **+35** | +12 | 10,882 | 102 |
| + landing | 10,562 | 10,618 | **+56** | +12 | 10,710 | 92 |
| complete | 10,989 | 11,024 | **+35** | +12 | 11,129 | 105 |
| free drag minimal | 8,108 | 8,143 | **+35** | +11 | 8,253 | 110 |
| free drag + bounds | 8,267 | 8,297 | **+30** | +11 | 8,409 | 112 |
| free drag + landing | 8,377 | 8,418 | **+41** | +11 | 8,519 | 101 |
| free drag complete | 8,536 | 8,566 | **+30** | +11 | 8,674 | 108 |
| both behaviors | 12,415 | 12,461 | **+46** | +12 | 12,557 | 96 |
| vocabulary root | 146 | **261** | **+115** | +252 | 300 | 39 |
| kernel root | 6,159 | 6,200 | **+41** | +13 | 6,309 | 109 |
| baseline A | 10,694 | 10,713 | **+19** | +12 | 10,831 | 118 |
| baseline B | 6,889 | 6,889 | **0** | 0 | 7,040 | 151 |

**Every composition moves by +11 to +13 B minified, and that is the headline.** Twelve stages replacing four codes sounds like a table getting larger and it is not: `STAGE_TO_CODE` held fifteen slots of four repeated strings and `STAGE_NAMES` held fifteen slots of twelve distinct ones, at almost exactly the same source length — and the deleted `toDraggableError` pays for the constructor's extra ternary. **Brotli disagrees, by +19 to +56 B**, which is the D-129 effect in reverse: twelve distinct strings compress worse than four repeated ones even at equal length, so the compressed column moves 3× the source column. Both are recorded because neither alone says what happened.

**Module counts hold exactly on all fourteen rows**, and baseline B — an external control the package does not build — is byte-identical, which is the check that says the harness itself did not shift underneath these numbers.

**The vocabulary root is the whole cost, and it is `STAGE_NAMES` alone.** 146 → 261 B, its second consecutive move after eight slices of not moving. The reason is specific and worth stating precisely: `STAGE_TO_CODE` was **shaken out of this root entirely** — the class never referenced it, which is exactly what the `only` row below used to record — while `STAGE_NAMES` is read by the constructor and therefore cannot be. The table did not grow; it moved from a position where this root paid nothing for it to one where it pays for all of it. **This paragraph is what D-133 acted on**, and the general lesson it states — a table's cost is a function of what references it, not of its length — is the finding that outlived the table (F-105).

**Publishing the twelve constants at `drag.js` costs this root 0 B and 0 modules**, which is a fourth independent confirmation of [`failure-vocabulary-cost-claude.md`](../reviews/phase-23/failure-vocabulary-cost-claude.md)'s three. A consumer importing only the two classes shakes the re-export away, and the `only` assertion below still holds at one shipped module. So the decision's §6 is free and its §5.3 is not, which is the opposite of how the record's own §7 apportioned it.

**No budget re-bases, and that is the deliberate answer rather than an omission.** Every row absorbs the change with ~100 B still in hand — the `left` column above — because D-130's re-base set them at landed + ~150 and this slice spends a third of that. The standing rule is that a budget re-bases rather than a _correctness fix shrinking_; it says nothing about re-basing upward to restore headroom a real growth consumed, and doing so on rows that are not breached would convert every landed byte into permanent licence for the next one. The tighter ceilings stay. The vocabulary root's 300 stays for the stronger version of the same reason: it was never landed + 150, because the row exists to catch this root pulling the _kernel_, a kilobyte-scale event, and 39 B is still more than the 29 B it was documented as carrying when the number was chosen.

**The first slice in this sequence to be measured and then leave the instrument alone.** D-129 re-based eleven, D-130 thirteen; this one re-bases none, which is what a genuinely small change is supposed to look like when the ceilings were set honestly.

**Amended the same day by D-133, and this is the row set that caused the amendment.** The `+115 B` on the vocabulary root above is what a decision record was reading when it withdrew the property that produced it: `STAGE_NAMES` fed a fallback message that fires **only** when a consumer throws a non-`Error`, so the twelve words never reached the logged payload D-132 §5.3 was written to improve (F-105). The table is deleted and the fallback interpolates the number.

| Row                 | D-132 landed | D-133 landed | Δ brotli | Δ minified |
| ------------------- | ------------ | ------------ | -------- | ---------- |
| minimal             | 10,341       | 10,272       | **−69**  | −205       |
| minimal (xy)        | 9,991        | 9,921        | **−70**  | −205       |
| + layoutAnimation   | 10,780       | 10,717       | **−63**  | −205       |
| + landing           | 10,618       | 10,543       | **−75**  | −205       |
| complete            | 11,024       | 10,961       | **−63**  | −205       |
| free drag minimal   | 8,143        | 8,073        | **−70**  | −203       |
| free drag + bounds  | 8,297        | 8,229        | **−68**  | −203       |
| free drag + landing | 8,418        | 8,341        | **−77**  | −204       |
| free drag complete  | 8,566        | 8,506        | **−60**  | −205       |
| both behaviors      | 12,461       | 12,388       | **−73**  | −207       |
| vocabulary root     | 261          | **159**      | **−102** | −203       |
| kernel root         | 6,200        | 6,128        | **−72**  | −203       |
| baseline A          | 10,713       | 10,645       | **−68**  | −205       |
| baseline B          | 6,889        | 6,889        | **0**    | 0          |

**Read the two slices together, because separately each one misleads.** Against the pre-D-132 tree the _whole_ classification change now measures:

| Row | pre-D-132 | D-133 landed | net Δ brotli | net Δ minified |
| --- | --- | --- | --- | --- |
| minimal | 10,295 | 10,272 | **−23** | −193 |
| minimal (xy) | 9,958 | 9,921 | **−37** | −194 |
| + layoutAnimation | 10,745 | 10,717 | **−28** | −193 |
| + landing | 10,562 | 10,543 | **−19** | −193 |
| complete | 10,989 | 10,961 | **−28** | −193 |
| free drag minimal | 8,108 | 8,073 | **−35** | −192 |
| free drag + bounds | 8,267 | 8,229 | **−38** | −192 |
| free drag + landing | 8,377 | 8,341 | **−36** | −193 |
| free drag complete | 8,536 | 8,506 | **−30** | −194 |
| both behaviors | 12,415 | 12,388 | **−27** | −195 |
| vocabulary root | 146 | 159 | **+13** | +49 |
| kernel root | 6,159 | 6,128 | **−31** | −190 |
| baseline A | 10,694 | 10,645 | **−49** | −193 |
| baseline B | 6,889 | 6,889 | **0** | 0 |

**Twelve stages replacing four codes made every composition smaller.** `STAGE_TO_CODE`'s fifteen slots and `toDraggableError` are gone and what replaced them is one template, so the richer vocabulary costs ~193 B _less_ of source on every row. The shared root pays **+13 B** for the whole decision. That is the honest headline and neither slice alone states it: D-132's table showed a cost the amendment removed, and D-133's table shows a saving that is mostly D-132's own overhead being paid back.

**Module counts hold exactly on all fourteen rows across both slices**, and baseline B — an external control this package does not build — is byte-identical throughout, which is what says the harness did not move underneath any of these numbers.

**No budget re-bases, for the third statement of the same reason.** Every artifact moved _down_ inside a ceiling that was never raised for it.

**One ceiling moved afterwards, and for the opposite reason** (D-134). The vocabulary root's 300 was left alone here because nothing breached it — and that turned out to be the wrong test for a row whose budget is a _sole_ detector. It is **205** now, bracketed by a re-run injection rather than inherited from a slice that had no reason to touch it; the derivation is in that row's own comment. Nothing else moved.

**Re-measured 2026-08-26 for the free-drag owner-review cleanup** (D-139…D-142). Four deletions, no additions, and every row falls or holds.

| Row                 | before | landed | Δ brotli | Δ minified |
| ------------------- | ------ | ------ | -------- | ---------- |
| minimal             | 10,237 | 10,225 | **−12**  | −84        |
| minimal (xy)        | 9,886  | 9,876  | **−10**  | −84        |
| + layoutAnimation   | 10,678 | 10,663 | **−15**  | −84        |
| + landing           | 10,506 | 10,484 | **−22**  | −84        |
| complete            | 10,916 | 10,902 | **−14**  | −84        |
| free drag minimal   | 8,052  | 7,983  | **−69**  | −149       |
| free drag + bounds  | 8,210  | 8,134  | **−76**  | −149       |
| free drag + landing | 8,310  | 8,246  | **−64**  | −149       |
| free drag complete  | 8,468  | 8,399  | **−69**  | −149       |
| both behaviors      | 12,349 | 12,300 | **−49**  | −230       |
| vocabulary root     | 159    | 159    | **0**    | 0          |
| kernel root         | 6,106  | 6,106  | **0**    | 0          |
| baseline A          | 10,616 | 10,591 | **−25**  | −84        |
| baseline B          | 6,889  | 6,889  | **0**    | 0          |

**The sortable rows move at all, and that is the interesting half.** No sortable-facing surface changed: the whole of their −84 B minified is D-142, the shared-default frame part. **Measured rather than apportioned** — reverting D-142 alone against the finished tree returns `minimal` to 10,237/30,241, byte-for-byte its baseline — which also fixes free drag's share of it at −18 B brotli / −48 B minified and leaves −51 B brotli / −101 B minified for D-139, D-140 and D-141 together.

**This row set qualifies the D-127 measurement recorded above rather than contradicting it.** That one found collapsing `resetSortableFramePart`'s statements into one _chained assignment_ cost +1…+5 B brotli on every sortable row, because repeated `part.x = null` lines compress well, and concluded the straightforward assignments stay. They did not stay, and the earlier number is still correct: a shared `DEFAULT_PART` literal is not a chained assignment — it deletes the second field list rather than re-spelling it — so what compressed well is gone rather than reshaped. **The rejected candidate and the accepted one differ in what they remove**, which is the distinction a byte count alone does not carry and the reason both are recorded.

**Module counts hold exactly on all fourteen rows**, the `both behaviors` union still closes at 47 against 47, and the three control rows — `vocabulary root`, `kernel root` and `baseline B` — are byte-identical, which is what says nothing moved underneath these numbers.

**No budget re-bases, and here the rule is being applied in the direction it was written for.** Every row shrank; re-basing down would convert a cleanup into a permanently tighter ceiling nobody decided on, which is exactly the _correctness fix shrinking_ case the standing rule refuses. The slack grows instead.

**Extended to the sortable the same day** (D-143), which is the same deletion over the first behavior's resolution.

| Row                 | before | landed | Δ brotli | Δ minified |
| ------------------- | ------ | ------ | -------- | ---------- |
| minimal             | 10,225 | 10,180 | **−45**  | −151       |
| minimal (xy)        | 9,876  | 9,833  | **−43**  | −151       |
| + layoutAnimation   | 10,663 | 10,621 | **−42**  | −151       |
| + landing           | 10,484 | 10,440 | **−44**  | −151       |
| complete            | 10,902 | 10,876 | **−26**  | −151       |
| free drag minimal   | 7,983  | 7,982  | **−1**   | 0          |
| free drag + bounds  | 8,134  | 8,136  | **+2**   | 0          |
| free drag + landing | 8,246  | 8,246  | **0**    | 0          |
| free drag complete  | 8,399  | 8,402  | **+3**   | 0          |
| both behaviors      | 12,300 | 12,253 | **−47**  | −151       |
| vocabulary root     | 159    | 159    | **0**    | 0          |
| kernel root         | 6,106  | 6,106  | **0**    | 0          |
| baseline A          | 10,591 | 10,562 | **−29**  | −145       |
| baseline B          | 6,889  | 6,889  | **0**    | 0          |

**The four free-drag rows are the calibration this table is worth keeping for.** No free-drag composition contains a sortable module, so nothing in this slice reaches them except one statement re-ordering in their own settlement arm — which is **zero** minified bytes on all four. Brotli reports −1, +2, 0 and +3. That is the instrument's noise floor stated in its own units, and it is the number to hold a single-digit brotli movement

## The vocabulary root's ceiling

`drag.js` is administered by a different rule from every other row — a bracketed injection rather than landed + ~150 B — and the reasoning that is still current lives on the row itself in `bench/size/measure.ts`. What follows is how it got there.

**F-77's close, and the graph half is the point of the row.**

The contract says a consumer imports `free-drag.js` and `drag.js` and _reaches no other tier_, and 03 §The export topology asks for that to be checked against something other than the table it was derived from. This is that check: a consumer who wants `err instanceof DraggableError` and nothing else pays one module.

**The isolation was real but not structural, and D-132 made it structural on one side while opening a new gap on the other.** ~~`src/kernel/errors.ts` imports thirteen runtime `FAILURE_*` constants from `./failures.ts` and uses them as computed keys in `STAGE_TO_CODE`, so this root bundles to one module only because Rolldown shakes that map and `toDraggableError` away from the `DraggableError` class in the same file.~~ That map is deleted. `errors.ts` now names `FailureStage` as a **type only** — `STAGE_NAMES` was a plain positional tuple with no computed keys and D-133 deleted even that, so there is no runtime edge from this module to `failures.js` left to shake — F-77's predicted regression, one runtime reference from the class to the stage map, is unwriteable rather than guarded.

**The gap moved up one level.** `drag.js` itself now imports the twelve constants from `./kernel/failures.js` in order to re-export them (D-132 §6), so the module is one shaken re-export away from this graph rather than one shaken table. Measured at 0 B and 0 modules for a consumer importing only the two classes — but it is a _tree-shaking outcome_ again, which is exactly the condition this row exists for: a module pulled in, mostly shaken, showing up as a small delta that reads like success. **The row is more necessary after D-132 than before it**, and its subject changed without its assertion needing to.

**`tests/packaging.node.test.ts` is not this assertion.** It walks the unshaken _source_ graph, deliberately independent of any bundler's heuristics, and on that graph `drag.js` **does** reach `kernel/failures.js`. Only a bundled-graph instrument can hold the 121 B.

## The two halves prove different things (D-134)

They had never been written down as separate claims, and this comment used to move between them inside one paragraph — which is how the row came to carry two incompatible sizing rules at once (F-106).

| Half | Claim | Blind to |
| --- | --- | --- |
| `only` | the root bundles to one module | anything arriving _inside_ that module |
| `budget` | that one module stays the size of two classes | nothing — it is the residual detector |

**The budget is the sole detector for its class.** The packed `kernel/errors.js` carries a **bare** `import "./failures.js"`, because `tsdown` inlines the `FAILURE_*` constants as literals — so machinery arriving from `failures.ts` lands **inside this module** and moves no module count at all. `only` cannot see it by construction, and `packaging.node.test.ts` cannot either, since it walks the unshaken _source_ graph where `drag.js` genuinely does reach `kernel/failures.js`.

~~The budget goes to 300 rather than to landed + 150: this row exists to catch the vocabulary root _pulling the kernel_, which is a kilobyte-scale event, and a tight budget on a 146 B file would fail on ordinary message wording.~~ **Superseded by D-134, and it had two defects.** Pulling the kernel is what `only` catches, so sizing the ceiling for it left the budget guarding nothing it alone could guard; and the wording volatility was real when it was written — D-130 had just added a message string per warning site and D-132 was about to add a twelve-entry name table — but D-133 removed it. The root is two classes and two short library-authored strings, and every `DraggableWarning` message is supplied by its caller and lives in the caller's module.

**The rule is 30-to-50 B of headroom, not the standing ~150 B, and that is the row working rather than an oversight.** The convention is sized to _roughly one module_ against 8–13 kB compositions; on a 159 B root, one module's worth of slack is larger than the artifact, and the row would report success while the thing it exists to prevent happened.

## The calibration, run against this tree (D-134)

A ceiling owes a **reproducible** injection, and when the injection stops being writeable the ceiling stops being calibrated — D-96's rule one level down. ~~Verified by injecting F-77's own predicted regression, one runtime reference from `DraggableError` to `STAGE_TO_CODE`: the graph stays at one module and the artifact grows 121 → 190 B.~~ **That injection names two deleted tables and can no longer be written**, which is why 300 was a number quoted rather than a number derived.

**The regression class today is anything that makes `drag.js`'s `kernel/failures.js` re-export unshakeable, or gives `errors.ts` a runtime need for a stage value.** The injection below is the second shape, written and measured on 2026-08-26 against the landed tree:

```ts
// src/kernel/errors.ts — import the twelve constants as values, then
const KNOWN_STAGES: readonly FailureStage[] = [FAILURE_ADMISSION, …];
// …and reference it from the constructor:
this.stage = stage !== null && KNOWN_STAGES.includes(stage) ? stage : null;
```

|                       | brotli  | minified | shipped modules   |
| --------------------- | ------- | -------- | ----------------- |
| landed                | **159** | 344      | 1                 |
| injected              | **220** | 410      | **1 — unchanged** |
| reworded, same length | 181     | 342      | 1                 |
| rewritten, +48 chars  | 190     | 402      | 1                 |

**The graph half does not move, which is the whole finding.** A plausible stage validation adds **+61 B** and zero modules, so only a ceiling this row can breach observes it.

**The ceiling is bracketed by measurement rather than estimated.** 190 must pass and 220 must fail, so the admissible window is 191–219 and **205** is its midpoint — 46 B of headroom, breaching the injection by 15 B and clearing the most generous rewrite by 15 B.

**The wording band is wider than it looks, and Brotli is why.** A _same-length_ rewording costs **+22 B compressed while saving 2 B minified**: `destroyed` and `failure` are in Brotli's static dictionary and `torn down` and `fault` are not, so on a 344 B input the substitution is a compression loss with no source cost. That is the opposite of the usual direction on this file and the reason the band was measured instead of assumed — D-134 §6 estimated it at single-digit-to-low-tens from source length, which would have put the ceiling at 190 and failed on a rewording.

A legitimate change to the class re-bases this number, deliberately and visibly, under the standing rule that a budget re-bases rather than a fix shrinking. That is the intended behaviour and not a cost. **D-132 was such a change and did not re-base it**: `STAGE_NAMES` took the root from 146 to 261 B and 300 absorbed it, which is the loose ceiling doing the harm — a 79% growth passed unremarked. **D-133 withdrew the table and the root fell to 159 B**; D-134 then returned the ceiling to the artifact it guards. **No other row moves**, and the graph half is unchanged.

**One candidate was measured and rejected, 2026-08-28.** Flattening `VisualLiftSession.rendered` to `renderedX`/`renderedY` — D-139's shape rule applied to the kernel's recorded delta — costs **+23 B minified, flat on all twelve rows that carry the kernel**, and −7 to +12 B brotli, both directions on one edit. It buys one object per drag and one indirection at the landing read, which is not a figure any performance claim can rest on, so the pair stays. The source cost is real and the compressed column says nothing either way, which is the case this file exists to distinguish from a change worth landing.

## SC-1 fires, and nothing re-bases — 2026-08-29 (D-154)

**The trigger was not a byte.** SC-1's third condition is _L-11 lands_, and it is a re-**measurement** trigger: the frozen export map is one of M-3's six reproducibility preconditions, so changing it obliges a run whether or not the artifact moves. D-154 changed it on three entries — `CancelOrigin` and its four constants onto `kernel.js`, `sortable.js` and `free-drag.js`, plus the sortable's two supplied reasons onto `sortable.js` — and this is that run, taken against the landed tree with `bench/size/measure.ts` unchanged.

Absolutes are Brotli bytes; the two delta columns are against the tree immediately before the change, measured by the same harness on the same machine.

| Row | Brotli | Δ brotli | Δ minified | Budget | Slack |
| --- | --: | --: | --: | --: | --: |
| minimal | 9,913 | +11 | +23 | 10,439 | 526 |
| minimal (xy) | 9,580 | +16 | +23 | 10,097 | 517 |
| minimal + layoutAnimation | 10,353 | +6 | +23 | 10,882 | 529 |
| minimal + landing | 10,178 | +16 | +23 | 10,710 | 532 |
| complete | 10,595 | +9 | +23 | 11,129 | 534 |
| free drag minimal | 7,750 | +11 | +22 | 8,253 | 503 |
| free drag + bounds | 7,897 | +8 | +22 | 8,409 | 512 |
| free drag + landing | 8,017 | +9 | +22 | 8,519 | 502 |
| free drag complete | 8,151 | +8 | +22 | 8,674 | 523 |
| both behaviors | 11,927 | +19 | +48 | 12,557 | 630 |
| vocabulary root — `drag.js` | 142 | **0** | **0** | 205 | 63 |
| kernel root — `kernel.js` | 6,063 | +7 | **−4** | 6,309 | 246 |
| baseline A — feature-matched, non-composed | 10,375 | +4 | +23 | 10,831 | 456 |
| baseline B — shipped `@ydinjs/drag` sortable.js | 6,889 | **0** | **0** | 7,040 | 151 |

**The decision's own byte prediction was declined rather than made, and the direction it declined to guess is up.** Three string literals leave and four numeric constants arrive, which reads like a trade; it is not one. A field on a result type is a property write at every site that builds one and a property name in every literal, and that costs +22 to +23 B minified on every row that carries a behavior — twice on `both behaviors`, which carries two. The literals only ever existed at three call sites.

**`kernel.js` is the one row that shrinks in source and grows compressed.** −4 B minified, +7 B Brotli: the entry publishes four short numeric constants and loses three long strings, and Brotli charges more for four new export names than it saved on three literals it was already compressing well. Both figures are inside the noise this file's own doctrine names, and neither is evidence of anything.

**The two rows that carry no behavior do not move at all.** `drag.js` is 0/0 — the vocabulary root does not publish `CancelOrigin`, which is D-154's siting decision showing up as a measurement — and baseline B is 0/0 because it is the shipped package and this change cannot reach it. **Those two zeroes are the control**: a change that moved them would mean the harness, not the library, had moved.

**Slack runs 63–630 B across the fourteen rows.** The eleven that carry a behavior — the ten compositions and baseline A — run **456–630 B**; the three that do not are tighter and are the rows that matter most for it: **`drag.js` at 63 B** against a 205 B budget, **baseline B at 151 B**, **`kernel.js` at 246 B**. ~~456–630 B~~ was quoted over all fourteen and excluded its own tightest rows (**F-175**, corrected 2026-08-29): `drag.js` is the row whose whole job is to notice a module arriving in the vocabulary root, and quoting the behavior range for it overstates that row's margin about sevenfold — in the same paragraph that concludes no re-base is earned.

**Re-checked 2026-08-29 after the F-174…F-179 remediation**, which touched one `src/` file to add JSDoc: **all fourteen rows are byte-identical**, minified and compressed, since comments do not survive minification. Published declarations move 102.08 → 102.38 kB, which is telemetry and not budgeted. No new measurement event: the numbers below are still this run's.

**No row re-bases.** Every one is under budget, the movement is attributable to one named landed change, and nothing goes negative — so SC-1's first two triggers stay unmet and the twelve declared budgets keep the numbers D-106 gave them. A re-measurement is what the condition asks for; a re-base is what evidence has to earn.

## Re-based 2026-08-30, D-158 — the first shrink, and the first control rows

Measured against `63922766`, the tree D-158 remediates. Every figure is Brotli bytes from `bench/size/measure.ts` on this machine; the module count is unchanged on all fourteen rows.

| Row | Brotli | Δ brotli | Δ minified | Budget | Slack |
| --- | --: | --: | --: | --: | --: |
| minimal | 9,844 | **−188** | −616 | 9,994 | 150 |
| minimal (xy) | 9,704 | **−105** | −388 | 9,854 | 150 |
| minimal + layoutAnimation | 10,196 | **−144** | −508 | 10,346 | 150 |
| minimal + landing | 10,106 | **−179** | −614 | 10,256 | 150 |
| complete | 10,439 | **−131** | −512 | 10,589 | 150 |
| free drag minimal | 7,750 | **0** | **0** | 8,253 | 503 |
| free drag + bounds | 7,897 | **0** | **0** | 8,409 | 512 |
| free drag + landing | 8,017 | **0** | **0** | 8,519 | 502 |
| free drag complete | 8,151 | **0** | **0** | 8,674 | 523 |
| both behaviors | 11,812 | **−155** | −513 | 11,962 | 150 |
| vocabulary root — `drag.js` | 142 | **0** | **0** | 205 | 63 |
| kernel root — `kernel.js` | 6,063 | **0** | **0** | 6,309 | 246 |
| baseline A — feature-matched, non-composed | 10,255 | **−144** | −492 | 10,405 | 150 |
| baseline B — shipped `@ydinjs/drag` sortable.js | 6,889 | **0** | **0** | 7,040 | 151 |

**Re-based after the shrink, not during it** (§18). Seven rows moved, all downward, all attributable to one landed change; each is re-based to its landed figure plus the standing ~150 B, which is the headroom this file has carried since Phase 17. The seven that did not move keep the budgets they had.

**The seven zeroes are no longer only a narrative.** Every previous entry here has observed that the rows a change cannot reach report zero, and has had to say so in prose because the instrument could not: a ceiling is satisfied by any number under it, so a transfer _onto_ a control row is green on both sides. That is F-208, and it is what let 119 B and 229 B move onto the two non-animating compositions across a whole pass without a red row anywhere. `Composition.control` is the repair — an exact figure, declared on the seven rows a sortable-side change cannot reach, checked in **both** directions, and enforced whether or not budgets are muted. A control getting cheaper is as much a finding as one getting dearer, because it means a change reached a graph it was declared unable to reach.

**Two rows came in outside their declared band, and the record says so rather than reading the shrink as unqualified success.** `minimal (xy)` was predicted at 200–300 B and delivered **105**: the prediction double-counted the 170 B the same review had just decided to keep in `xy.js` as an accepted residual. The two animating rows were predicted within noise and delivered **144** and **131**, which the review flags as a sign that sink-required machinery was deleted — it was not, and the standing evidence is the equivalence instrument, which runs in the animating compositions and would fail rather than shrink if the settle walk had gone missing. What both rows actually banked is the protocol collapse, which the review's own ablation bounds at ≤156 B and which every row receives, sink or no sink.

## Declared 2026-08-30, D-159 — a fifteenth row, and a stage correction that costs nothing

Two changes with almost nothing to re-base between them. The **`xy + layoutAnimation` composition** joins the matrix permanently (F-210): every displacement decision so far was taken about the cellular axis driving a sink, and no row combined the two, so the instrument reported nothing rather than reporting zero. Its budget is declared from its landed figure under the ordinary rule. And a fault raised inside the post-write hook now reports `FAILURE_ACTION_EFFECT`, which is **one constant token**.

| Row | Brotli | Δ brotli | Δ minified | Budget | Slack |
| --- | --: | --: | --: | --: | --: |
| minimal | 9,844 | **0** | **0** | 9,994 | 150 |
| minimal (xy) | 9,704 | **0** | **0** | 9,854 | 150 |
| minimal + layoutAnimation | 10,195 | **−1** | **0** | 10,346 | 151 |
| **xy + layoutAnimation** | **10,045** | — | — | **10,195** | 150 |
| minimal + landing | 10,105 | **−1** | **0** | 10,256 | 151 |
| complete | 10,439 | **0** | **0** | 10,589 | 150 |
| free drag minimal | 7,750 | **0** | **0** | 8,253 | 503 |
| free drag + bounds | 7,897 | **0** | **0** | 8,409 | 512 |
| free drag + landing | 8,017 | **0** | **0** | 8,519 | 502 |
| free drag complete | 8,151 | **0** | **0** | 8,674 | 523 |
| both behaviors | 11,812 | **0** | **0** | 11,962 | 150 |
| vocabulary root — `drag.js` | 142 | **0** | **0** | 205 | 63 |
| kernel root — `kernel.js` | 6,063 | **0** | **0** | 6,309 | 246 |
| baseline A — feature-matched, non-composed | 10,255 | **0** | **0** | 10,405 | 150 |
| baseline B — shipped `@ydinjs/drag` sortable.js | 6,889 | **0** | **0** | 7,040 | 151 |

**Nothing re-bases.** The new row is a declaration rather than a re-base — 10045 B at 31 modules, plus the standing ~150 B — and it reproduces the ablation's reading in the review byte-exact, which is the check that the harness and the prototype measured the same tree. Every other budget keeps the number D-158 gave it.

**The minified column is the one that settles the stage question.** It is **identical on all fifteen rows**: both stages are one-digit constants, so the swap is byte-for-byte at the only layer that could have charged for it. Brotli moves −1 B on two rows and 0 B on the other thirteen — a dictionary effect an order of magnitude inside the ±25 B band this file documents, recorded because both columns are always recorded and not because either is a result.

**All seven controls reproduced exactly**, which is the second run of `Composition.control` and the first in which it was expected to be the whole story. The new row carries **no** control: it is a sortable composition, so a sortable-side pass is expected to move it, and a control declared on a row a change can reach is a budget wearing an exact number.

## Nothing re-based, five controls re-declared — 2026-08-31, D-165

The first pass in this file that **grows** every row it can reach. `@ydinjs/box-quad` landed BQ-6 (the cache removed) and BQ-9 (`Space` first-class, `Box` narrowed from thirteen slots to eight), and D-165 spent the result: two ancestry readings per activation, two named spaces on `ActivationScope`, and the item carried to the kernel as a third member of the admission subject.

Measured against `55eaaf1b` with box-quad rebuilt in both states — the dependency resolves through its built `index.js`, so a stale build reports a difference of zero and reports it convincingly.

| Row | Brotli | Δ brotli | Δ minified | Budget | Slack |
| --- | --: | --: | --: | --: | --: |
| minimal | 9,912 | **+62** | +149 | 9,994 | 82 |
| minimal (xy) | 9,771 | **+53** | +149 | 9,854 | 83 |
| minimal + layoutAnimation | 10,292 | **+71** | +146 | 10,346 | 54 |
| xy + layoutAnimation | 10,146 | **+64** | +147 | 10,195 | 49 |
| minimal + landing | 10,175 | **+66** | +147 | 10,256 | 81 |
| complete | 10,535 | **+75** | +150 | 10,589 | 54 |
| free drag minimal | 7,813 | **+63** | +108 | 8,253 | 440 |
| free drag + bounds | 7,964 | **+67** | +110 | 8,409 | 445 |
| free drag + landing | 8,077 | **+60** | +112 | 8,519 | 442 |
| free drag complete | 8,225 | **+74** | +112 | 8,674 | 449 |
| both behaviors | 11,918 | **+77** | +149 | 11,962 | 44 |
| vocabulary root — `drag.js` | 142 | **0** | **0** | 205 | 63 |
| kernel root — `kernel.js` | 6,123 | **+60** | +100 | 6,309 | 186 |
| baseline A — feature-matched, non-composed | 10,348 | **+58** | +148 | 10,405 | 57 |
| baseline B — shipped `@ydinjs/drag` sortable.js | 6,889 | **0** | **0** | 7,040 | 151 |

**No budget moves.** §18 gives a re-base to a pass that lands well under and a decision to one that lands over; this pass does neither, so every ceiling keeps the number D-159 gave it and the slack is what the pass reports. `both behaviors` at 44 B is the tightest this matrix has been, and that is the instrument working rather than a problem to absorb — the next pass to touch the kernel meets a row that will say so.

**The upstream figures do not survive the composition, and that is the finding worth keeping.** BQ-6 measured **−46 B** as drag2 consumes box-quad and BQ-9 **+38**, which predicts roughly −8 for the pair. The consumer pays **+62** on `minimal`. Both upstream numbers were taken with a synthetic consumer arm carrying box-quad's own surface; the rows above are taken through the consumer that exists, and they additionally carry D-165's second ancestry call, the second published space, the item slot and the widened admission subject. Where a package-level figure and a composition-level figure disagree, §15 says which one is about consumers — and it is not the one measured against a fixture.

**Five controls moved and are re-declared; two held at exactly zero.** The four free-drag rows and `kernel.js` are +60 to +74. That is not a transfer the control exists to catch: those rows carry the kernel, this change is in the kernel and in a package both behaviors import, and a control that stayed flat here would mean the free-drag graph had somehow stopped reaching `acquireLift`. They are re-declared at their landed figures under the ordinary rule. The two that held — `drag.js`, whose graph is the two error classes, and baseline B, which is a different package entirely — are the rows this change genuinely cannot reach, and their zeroes are the evidence that the instrument was still looking.

**The minified column is not the brotli column, and it says so loudly here.** Minified growth is +146 to +150 on every sortable row and +100 to +112 on the free-drag and kernel rows, against brotli deltas of +53 to +77. The new tokens compress well because they repeat — `SPACE_A`-style slot reads, a second `inheritedSpaceOf` call, `itemSpace` beside `visualSpace`. Recorded because both columns are always recorded, and because a pass reading only the minified figure would price this change at twice what it ships for.

**Re-based again 2026-09-01, D-155, and this is a re-base after a shrink — the direction §18 says ends in one.** Deleting the landing gate takes **226–377 B** off every composition, and the controls move with it because the deletion is in the kernel. Measured against `09f26770`, joint, with the pre-change tree built from a worktree of that commit rather than subtracted from an earlier list.

| Row | pre-slice `09f26770` | landed | D-155 | new budget | slack |
| --- | --- | --- | --- | --- | --- |
| minimal | 9,901 | 9,675 | **−226** | 9,825 | 150 |
| minimal (xy) | 9,781 | 9,520 | **−261** | 9,670 | 150 |
| minimal + layoutAnimation | 10,286 | 10,005 | **−281** | 10,155 | 150 |
| xy + layoutAnimation | 10,136 | 9,853 | **−283** | 10,003 | 150 |
| minimal + landing | 10,161 | 9,814 | **−347** | 9,964 | 150 |
| complete | 10,521 | 10,144 | **−377** | 10,294 | 150 |
| free drag minimal | 7,800 | 7,557 | **−243** | 7,707 | 150 |
| free drag + bounds | 7,951 | 7,705 | **−246** | 7,855 | 150 |
| free drag + landing | 8,061 | 7,711 | **−350** | 7,861 | 150 |
| free drag complete | 8,216 | 7,862 | **−354** | 8,012 | 150 |
| both behaviors | 11,908 | 11,544 | **−364** | 11,694 | 150 |
| vocabulary root — `drag.js` | 142 | 142 | **0** | 205 | 63 |
| kernel root — `kernel.js` | 6,116 | 5,858 | **−258** | 6,008 | 150 |
| baseline A — feature-matched, non-composed | 10,340 | 9,971 | **−369** | 10,121 | 150 |
| baseline B — shipped `@ydinjs/drag` sortable.js | 6,889 | 6,889 | **0** | 7,040 | 151 |

**Two controls held at exactly zero and five are re-declared.** `drag.js` and baseline B are the rows a kernel change cannot reach, and they did not move. The four free-drag controls and `kernel.js` moved by −243 to −354 and are re-declared at their landed figures, because the deletion is in the kernel and in the settlement both behaviors drive — a control that stayed still there would be measuring nothing.

**The pre-slice controls were already 7–16 B red at `09f26770`**, from the box-quad update that commit carries, and that drift is inside these figures rather than attributed to D-155. It is small enough not to change a conclusion and is stated so the next pass does not subtract it twice.

**No module entered or left any graph.** Every module count is identical on both sides — 31/30/32/31/33/34 and 25/26/27/28/45 — with `shared/landing.js` standing exactly where `shared/landing-runner.js` stood. So the whole of this is machinery rather than topology, which is what makes the **minimal** row the interesting one: a composition that installs no landing was carrying **226 B** of gate. A feature's own module tree-shakes; the lifecycle it participates in does not.

**One number in the table is the implementation choosing the settled reading over the cheaper one.** Answering `prefers-reduced-motion` with *no tail* instead of a zero-length one is **5 B smaller** on the two rows that install a landing, and it was rejected: the published contract reads the `duration` thunk once per landing **before** the media query, so refusing early would make a consumer's settle-time side effect observable only for users who have not asked for reduced motion. The 5 B is recorded rather than netted off.

**Re-based again 2026-09-01, D-166 — a shrink again, and the smallest one this file records.** Deleting the join's pin write, its `runLeaf` wrapper and the `failed` deferred-terminal flag takes **14–40 B** off every composition. Measured against `b91ce5c6`, joint, with the pre-change tree built from a worktree of that commit.

| Row | pre-slice `b91ce5c6` | landed | D-166 | new budget | slack |
| --- | --- | --- | --- | --- | --- |
| minimal | 9,675 | 9,644 | **−31** | 9,794 | 150 |
| minimal (xy) | 9,520 | 9,485 | **−35** | 9,635 | 150 |
| minimal + layoutAnimation | 10,005 | 9,973 | **−32** | 10,123 | 150 |
| xy + layoutAnimation | 9,853 | 9,819 | **−34** | 9,969 | 150 |
| minimal + landing | 9,814 | 9,775 | **−39** | 9,925 | 150 |
| complete | 10,144 | 10,130 | **−14** | 10,280 | 150 |
| free drag minimal | 7,557 | 7,522 | **−35** | 7,672 | 150 |
| free drag + bounds | 7,705 | 7,673 | **−32** | 7,823 | 150 |
| free drag + landing | 7,711 | 7,676 | **−35** | 7,826 | 150 |
| free drag complete | 7,862 | 7,826 | **−36** | 7,976 | 150 |
| both behaviors | 11,544 | 11,504 | **−40** | 11,654 | 150 |
| vocabulary root — `drag.js` | 142 | 142 | **0** | 205 | 63 |
| kernel root — `kernel.js` | 5,858 | 5,827 | **−31** | 5,977 | 150 |
| baseline A — feature-matched, non-composed | 9,971 | 9,937 | **−34** | 10,087 | 150 |
| baseline B — shipped `@ydinjs/drag` sortable.js | 6,889 | 6,889 | **0** | 7,040 | 151 |

**The same two controls held at exactly zero and the same five are re-declared.** `drag.js` and baseline B are the rows a kernel change cannot reach; the four free-drag rows and `kernel.js` moved with the kernel and are re-declared at their landed figures.

**`complete` is the row to read twice.** It moves **−14** where `minimal` moves −31 and `minimal + landing` −39, for the same deleted statements. Nothing here is composition-specific — the code is in the kernel every row carries — so the spread is the compressor: the sortable's complete graph already repeats the tokens the deleted statements were made of (`lift`, `write`, `runLeaf`, `FAILURE_RENDERER_WRITE`, every one of which survives on the move path), so removing one instance of a repeated token is worth less than removing one of a rarer one. It is the effect §15 records in the other direction for a padded lookup table, and it is why the parts of a deletion cannot be added up.

**No module entered or left any graph.** Every module count is identical on both sides. The whole of this is one statement, one wrapper and one flag, in a function every composition carries — which is what makes a ~30 B figure the right size for it, and what makes the two zeroes worth as much as the thirteen negatives.

**Not a re-base, 2026-09-02, D-168 — a growth pass that stayed inside every ceiling.** Naming the kernel's per-operation state as an `OperationRecord` and an `ActivationRecord` costs **+13 to +57 B** Brotli on every composition that carries the kernel. **No budget moves.** The tightest row lands 93 B under its ceiling, and the rule reads one way: a pass landing _above_ a ceiling raises it, and slack under one is the instrument's sensitivity rather than an allowance to spend. **Five controls are re-declared**, because a kernel change reaches every row that carries the kernel and a control held still there would be measuring nothing. Measured against `7f6d1851`, joint.

| Row | pre-change `7f6d1851` | landed | D-168 | budget | slack |
| --- | --- | --- | --- | --- | --- |
| minimal | 9,644 | 9,657 | **+13** | 9,794 | 137 |
| minimal (xy) | 9,485 | 9,534 | **+49** | 9,635 | 101 |
| minimal + layoutAnimation | 9,973 | 10,003 | **+30** | 10,123 | 120 |
| xy + layoutAnimation | 9,819 | 9,862 | **+43** | 9,969 | 107 |
| minimal + landing | 9,775 | 9,832 | **+57** | 9,925 | 93 |
| complete | 10,130 | 10,149 | **+19** | 10,280 | 131 |
| free drag minimal | 7,522 | 7,554 | **+32** | 7,672 | 118 |
| free drag + bounds | 7,673 | 7,708 | **+35** | 7,823 | 115 |
| free drag + landing | 7,676 | 7,706 | **+30** | 7,826 | 120 |
| free drag complete | 7,826 | 7,858 | **+32** | 7,976 | 118 |
| both behaviors | 11,504 | 11,539 | **+35** | 11,654 | 115 |
| vocabulary root — `drag.js` | 142 | 142 | **0** | 205 | 63 |
| kernel root — `kernel.js` | 5,827 | 5,861 | **+34** | 5,977 | 116 |
| baseline A — feature-matched, non-composed | 9,937 | 9,968 | **+31** | 10,087 | 119 |
| baseline B — shipped `@ydinjs/drag` sortable.js | 6,889 | 6,889 | **0** | 7,040 | 151 |

**The same two rows a kernel change cannot reach held at exactly zero**, which is what says the change is where it claims to be: `drag.js` reaches `kernel/errors.js` and nothing else, and baseline B is not built here.

**Minified and compressed disagree by an order of magnitude, and that is the whole shape of this change.** Every kernel-carrying row grew **+318 to +323 B** minified against **+13 to +57 B** Brotli. What was written is 64 bare identifiers becoming qualified property reads: a local mangles to one character and a property key does not mangle at all, so the minified figure is close to the literal cost of the qualification — and Brotli then recovers 82–96% of it, because `operation.` and `activation.` are the most repeated strings in the file by the time it is done. The pre-change sketches put this at +212 B and +516 B and were right to be reported as unusable; the answer is under both, and neither bracketed it.

**The gate was tighter than the decision that set it, and it still passed.** D-168 was written against `kernel.js` carrying 246 B of slack, re-measured 2026-08-29. The D-166 re-base of 2026-09-01 lowered every budget after a shrink, so the slack the implementation actually had was **150 B**. It spent 34.

**No module entered or left any graph.** 31/30/32/31/33/34, 25/26/27/28/45, 2/14/29/26 — identical on both sides. Two objects per gesture are allocated where eight closure slots were assigned, and nothing on the sample path allocates at all.