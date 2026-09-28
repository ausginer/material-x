# Arc D — decision-elimination review

**Commit files were read at:** `c553ff8da` (tip of `drag2/fin-review`). Range under review: `0c62b02c6..c553ff8da`, four commits, the landing of D-191 and the close of the D-170 arc series.

**Lens.** Does the machinery and the constraint that survives here still have a live justification? Backward — current machinery to the decision it rests on. Forward — retired normative content to what it introduced, in both halves: inactive decisions, and the retired fragments of still-active ones. Both halves were run off `npx just decisions` and `npx just decisions --retired` from `packages/drag2`.

## Scope

**Covered, read in full at `c553ff8da` and diffed against `0c62b02c6`:** `src/sortable/runtime.ts`, `src/sortable/slots.ts`, `src/sortable/linear-shift.ts`, `src/sortable/xy.ts`, `src/sortable/y.ts`; `src/sortable/spec.ts` at every site the range touches plus its whole release path and its `#snapshot` census; `src/sortable/collection.ts`'s `buildReorderProposal`; `bench/size/measure.ts`'s `control?` docblock, its seven `control:` rows and `controlViolations()`; `tests/sortable/feature.declaration.test.ts`, `tests/sortable/sortable.browser.test.ts`, and the diffed regions of `tests/sortable/{y,xy,features}.browser.test.ts`, `tests/packaging.node.test.ts` and `tests/COVERAGE.md`; `tests/ledger.ts`'s `listed`, `surplus`, `malformed` and `ROW_SHAPED`. The `.plan` diff of the range in full — D-191's landed entry, `arc-d.md`, `budget-rebases.md`, `obligations.md`, `plan.md`, `03-feature-composition.md`.

**Forward pass, both halves.** The inactive half was run over the `--retired` projection for every fragment naming `snapshot`, `insertion`, `presentation`, `per-operation` or `control:`. The partial-amendment half was run over the retired fragments of still-**active** decisions — 78 rows — and D-191's five are the ones that bear on this range.

**Instruments actually run** (in a detached worktree at `c553ff8da` with `node_modules` symlinked, never in the shared checkout): `npx just typecheck` at baseline and under four separate mutations of `src/sortable/slots.ts`; `npx just test --project node` (24 files, 363 passed); `npx just fmt-check`; `npx just lint`; the pinned `oxfmt` binary against the pre-image of the disclosed formatter hunk.

**Not covered, and therefore not cleared.** The browser suite was not run — the disclosed flake was not reached and this pass has no evidence about it either way. `bench/size`'s `measureAll()` was not executed, so `arc-d.md`'s fifteen-row table, the −264 B minified figure, the 45–65 B Brotli band and the claimed inertness probe at 6,186 B are unverified here; what was verified is that `controlViolations()` reads the field, so the restored equalities are assertions rather than comments. The kernel and free-drag tiers were not reviewed except where the sortable's release path reaches them. D-191's architecture is not reopened.

**Hygiene.** No production file, test or record document was modified. All mutation was done in a detached worktree at `c553ff8da`, removed at the end; `git status --porcelain` on the shared checkout is empty and HEAD is unmoved. This report is the only file created.

## Findings

### der-1 — tier B — the two owner's rows F-404 landed do not carry the property their docblock and the register claim they carry

**Finding.** `tests/sortable/feature.declaration.test.ts`'s `describe('the two axis views')` block landed three rows. The disjointness row works. The two owner's rows are lower bounds — `X extends View` — and an emptied `View` satisfies a lower bound more easily, not less. They cannot detect the narrowing they were added to detect.

**Current contract.** The block's docblock states: _"Disjointness alone is satisfied by a view that had narrowed to nothing, so each side is paired with its owner's row … and a narrowing that emptied either would fail there."_ The rows' own comments repeat it: _"The lower bound on the frame view. Without it the row above is satisfied by narrowing this type to nothing, and the ceiling the behavior guarantees to supply would stop being a ceiling."_ F-404's amended `Required property` in `00-index.md` says the same: _"so a view narrowed to nothing cannot pass every refusal, and the five fixtures' incidental pinning gets a named home that says it is load-bearing."_

**Why it is a problem.** F-404's retired premise was _"An arc may not narrow one published view and widen the other while nothing pins either membership"_, falsified by execution because the five object-literal fixtures pin membership incidentally. The landed instrument exists to give that incidental pinning a named home and to close the one hole the fixtures leave. It does not close it. The named home holds a property the fixtures already hold better, and the hole the docblock names is still open — which is the shape F-404 was raised against in the first place.

**Evidence — four mutations at `c553ff8da`, each a single edit to `src/sortable/slots.ts` followed by `npx just typecheck`, reverted between runs. Baseline is clean.**

| Mutation | `feature.declaration.test.ts` | What else reddens |
| --- | --- | --- |
| `InsertionRuntimeView` body replaced by `Readonly<{}>` | **green** | `tests/sortable/sortable.browser.test.ts` only, 4 errors at its own harness reads (`:70`, `:211`) |
| `InsertionFrameView` body replaced by `Readonly<{}>` | **green** | `tests/revision/revision-2.ts`, `tests/sortable/sortable.browser.test.ts` |
| `settle` removed from `InsertionRuntimeView` | **green** | `y.browser.test.ts` ×3, `xy.browser.test.ts` ×2 — TS2353, the five fixtures |
| `realm: object;` added to `InsertionRuntimeView` | **red** — TS2741 `Property 'lift' is missing` | `src/sortable/spec.ts`, `y.browser.test.ts`, `xy.browser.test.ts` |

So the owner's rows fire on **widening** and are silent on **narrowing**, including narrowing to nothing. Member-level narrowing is caught by the five fixtures alone; emptying escapes even those, because TypeScript performs no excess-property check against `{}` — which is why the emptied cases redden nothing but `sortable.browser.test.ts`'s own property reads.

For completeness, the falsifier D-191 does name was confirmed: adding `snapshot: CollectionSnapshot | null;` back onto `InsertionRuntimeView` reddens `feature.declaration.test.ts` with TS2554 on the `toEqualTypeOf` call, i.e. the disjointness row. That row is sound. It is the pair beside it that is not.

**Required property.** Either the declaration test asserts what F-404 says it asserts — that neither published axis view can be emptied and still pass — or the register and the docblock stop claiming it does and say what the incidental fixtures actually carry.

### der-2 — tier B — `npx just lint` is red at the tip, because the repository's formatter and its linter's formatting rule disagree on the one hunk this range landed in `packaging.node.test.ts`

**Finding.** The disclosed formatter-only delta is genuinely formatter output, and it turns the package's own lint gate red.

**Current behavior.** At `c553ff8da`, from `packages/drag2`:

- `npx just fmt-check` — the file is clean (nine `.md` files under `.plan/` fail, all pre-existing and none of them written by this range).
- `npx just lint` — exactly one error, and it is this hunk:

  ```
  tests/packaging.node.test.ts:321:10: error prettier(prettier): Replace `⏎··········await·sources(SRC)⏎········` with `await·sources(SRC)`
  ```

**Why it is a problem.** The two mandated gates cannot both be satisfied on this file. The pinned formatter is `oxfmt` **0.58.0** (`node_modules/.bin/oxfmt --version`); run against the `0c62b02c6` pre-image with the repository's own `.oxfmtrc.json`, it rewrites `(await sources(SRC)).map(` into exactly the three-line form that landed. `oxlint`'s `prettier` rule then demands the pre-image form back. Running `just fmt` makes `just lint` fail; running `just lint-fix` would make `just fmt-check` fail. `.agents/docs/handoff.md` requires both before a unit of work is finalized, and the unit landed with the second one red.

**Evidence.** oxfmt 0.58.0 on the pre-image produces the landed form (diff confirmed in the scratchpad, shared checkout untouched). Upstream `oxfmt@0.67.0` on the same input leaves the pre-image unchanged, so this is a pinned-version behaviour later releases do not reproduce — which is what makes it a toolchain pin question rather than a source question.

**Required property.** The package's `fmt` and `lint` recipes agree on every file they both govern, and the branch tip passes both.

### der-3 — tier C — the release proposal is still built from the behavior-private snapshot, and the interval `arc-d.md` books is narrower than the one the arc created

**Finding.** F-326 moved the release resolve onto the frozen `frame.snapshot` and left `buildReorderProposal` on `this.#snapshot`. `arc-d.md` books the resulting divergence as _the one edge this arc creates_ but understates both its interval and its consequence.

**Current behavior.** `src/sortable/spec.ts:1319` destructures `const { snapshot } = draft;` and guards it non-null — which is what makes the axis's `frame.snapshot!` at `y.ts:216` and `xy.ts:205,341` sound — and then `:1405` builds from a different value: `buildReorderProposal(this.#snapshot, item, insertion)`. `#snapshot` is read at seven sites in `spec.ts`; six are at `IDLE` (`admit`, the keyboard path) or are the writer itself. `:1405` is the only read inside a live operation with a committed frame snapshot already in hand.

**Why it is a problem.** Two limbs.

_The consequence is sharper than booked._ `src/sortable/collection.ts:176` refuses a mixed-version pair outright — `if (insertion.version !== snapshot.version) return null;` — and `spec.ts` throws `drag: sortable/release-no-proposal` on a null build, documented there as a broken invariant. So if the edge is reached the release does not merely _part company_ between two reads, as `arc-d.md` §The one edge this arc creates says; it raises a classified release failure at the one instant the user is watching the drop land. Before Arc D the resolve read the live mirror, so the insertion's stamped version and `#snapshot` agreed by construction and this outcome was unreachable.

_The interval proved clean is not the interval that matters._ `arc-d.md` proves that nothing between `#closeOperation`'s `RELEASING` commit and `runReleaseSeam` can commit a collection, the only statement there being `lifetimes.motion.dispose()`. The interval relevant to a resolve/build disagreement extends further — through `#invalidateInSeam()` and the axis rebuild inside `prepareRelease`, both of which call consumer code (`invalidateInsertion`, a `box` resolver and a `getBoundingClientRect` per candidate). That stretch is in fact still clean, because `Kernel.dispatch` at `kernel.ts:2355` routes through `#bracket.dispatch` and a dispatch raised from inside a seam queues behind it — but that is a second argument the booking does not make, about a wider interval it does not name.

_And the live rule points the other way._ `03-feature-composition.md`, amended in this range, now says: _"Committed frame state is read off the frame; what the frame cannot supply travels on the runtime view."_ `:1405` reads behavior-private state where the committed value is in scope, guarded, and already what the resolve beside it used.

**Tier.** C: no reachable consumer-observable difference at this tree, on the dispatch-queues argument above. It is not C because it is small — if the queueing argument ever stops holding the consequence is a thrown release.

**Required property.** The release resolve and the release proposal are built from the same collection; or `arc-d.md` books the interval it actually has and the failure that interval actually produces.

### der-4 — tier C — four comments in the sites this range edited are still justified by `view.insertion` and by the bench view F-325 deleted

**Finding.** The range removed the machinery and left the sentences that existed for it, in the same files it was editing.

**Evidence**, all in `tests/sortable/sortable.browser.test.ts` at `c553ff8da`:

- `:482` — `createSpecBench`'s docblock still lists what the bench adds as _"the install's own `spec`, a `dispatch` decorator over the context the kernel hands the factory, and the per-operation view as a declared slot receives it."_ The third item is the `captured` wrapper and the `view()` accessor, both deleted in this range; `SpecBench` no longer exposes a view.
- `:3333` — _"An end gap, so the placeholder genuinely has to move — an inert move returns **before the field is ever written**."_ The field is `view.insertion`, deleted by F-325. What the early return now precedes is the write and the hook.
- `:2469` — _"Resolve again, so `snapshot()` reads what the runtime actually holds."_ The harness now records `frame.snapshot!` at `:212`, which is committed frame state, not what the runtime holds. The row still discriminates — at `ACTIVE` the two are written from the same `next` — but the sentence names the retired mechanism as its reason.
- `:209` — _"Recorded so a test can prove the per-operation view is published with a non-null placeholder before anything resolves against it"_ now stands over both the surviving `expect(runtime.placeholder)` and a `published = frame.snapshot!` that records the frame.

**Required property.** No comment in the package states its reason in terms of a field the same change deleted.

### der-5 — tier C — the deferred-decision table carries a one-cell row that is not a deferred decision, and no instrument can see it

**Finding.** D-191's row was replaced in place by the twenty-sixth cycle's narrative, keeping the leading pipe, so the narrative is now a row of a four-column table.

**Current behavior.** `.plan/contract/00-index.md:2219` reads `| **The twenty-sixth cycle opened and closed on 2026-09-09**, … |` — one cell, immediately under `| Decision | Lands | What is missing | Witness |` and its separator. Every other cycle narrative in that section, twenty-fifth back to nineteenth, is a plain paragraph below the table. GFM pads the three missing cells, so the section renders a table row with three blanks.

**Why it is a problem, and why it survived.** Two instruments could have caught it and neither can. `listed()` reads only rows matching `ROW_SHAPED = /^\|\s*D-\d+\s*\|/u` (`tests/ledger.ts:199`), so a row whose first cell is prose is neither parsed nor refused — the `should refuse a table row it cannot parse rather than skipping it` row at `decisions.node.test.ts:256` never sees it. `surplus()` (`tests/ledger.ts:922`) returns early on `cells.length <= width`, so F-83's _a row renders every cell it authors_ check catches over-authoring only; this is the mirror case and is uncovered. `npx just test --project node` is 363/363 green with the row present.

**Required property.** The section's narrative entries are paragraphs, and the deferred table holds only deferred-decision rows.

## Null results, stated

**The forward pass over inactive decisions found no surviving machinery in this range.** Every retired fragment naming `snapshot`, `insertion`, `presentation` or `per-operation` was traced to its introduction; nothing it introduced survives in `src/`, `tests/` or `bench/`. `PresentationView`, `activePlaceholder` and `#operation.presentation` have zero references outside `.plan/`, and the three `.plan/` mentions that remain — `maintainability.md:201`, `contract/01-construction-ownership.md:277,292`, `probes/api-4-transaction-bracket.md:343` — are each dated provenance sitting beside its own date, which is the convention the register ratifies. Not reported.

**O-13's discharge is complete in the source.** The suspension paragraph is gone from `measure.ts`'s `control?` docblock and the surviving text carries no retired premise; seven rows carry `control:` (`:353, :365, :377, :390, :494, :524, :540`); `controlViolations()` at `:749` compares the declared figure against the measured Brotli in both directions and `:937` folds it into the report — so the five restored equalities are live assertions. Whether the five figures are the right ones was not measured here (see Scope).

**F-403's required property holds.** Every one of `SortableActivation`'s six members has a reader: `placeholder` at `spec.ts:618, 1191, 1212, 1440`; `lift` at `:1465`; and `box`, `live`, `settle` and `space` through `y.ts`, `xy.ts` and `linear-shift.ts`. No member is written without a reader, and no docblock under `sortable/` states the mirror rule against D-177.

**The disclosed browser flake was not reached**, and this pass makes no claim about it.

**The disclosed formatter delta was judged from evidence and is promoted, on a ground other than the one disclosed.** Its semantics are inert — the parenthesised `await` is the same expression — and it is the pinned formatter's own output. What promotes it is der-2: it is the formatter's output that the linter refuses.