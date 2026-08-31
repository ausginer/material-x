# F-239 and F-240 — the guard's cross-package dependency, and D-85's stale projection

The remediation consolidation routed two findings here because it stopped at a decision/provenance boundary. **Neither needs a new `D-*`, and the reasons are different in kind.** F-240 turns on what D-85 actually requires of the code, which D-165 left untouched. F-239 turns on a redundancy in the guard that the reporting passes did not have the evidence to see — once it is seen, nothing needs sanctioning, because the coupled clause is the one that is not load-bearing.

A third defect was found while establishing the first two and is minted here as **F-243**.

The two questions were kept independent, as asked; §1 and §2 share no premise.

---

## 1. F-240 — non-substantive. D-85's row is corrected in place, and D-85 stays active

**The projection and the ledger row are the same text.** `npx just decisions` runs `.scripts/decision-status.ts`, which reads `00-index.md` and projects the ledger against the status register. There is no second store to reconcile: this is one correction, not two.

**What D-85 requires of the code, clause by clause**, and what D-165 did to each:

| D-85 requires | After D-165 |
| --- | --- |
| the scope carries the inverse inherited linear part, or `null`, derived from what `acquireLift` read before it mutated anything | **holds** — under two names rather than one |
| the behavior multiplies; it never measures | **verbatim** |
| `BehaviorLiftSession` unchanged, no `Box` crosses the seam | **verbatim** |
| `captureLocalSpace` and its four private index constants deleted with the second traversal | **verbatim** |
| `InheritedSpace` publishes at `kernel.js` as part of the scope's closure | **verbatim** |

Only the first moved, and it moved in name and cardinality, not in kind.

**Apply the atomicity rule by its stated purpose, not by its surface.** `documentation.md` gives the rule a reason: a status must be readable _per decision_, because "a decision amended in place is partly in force and partly not, and no instrument can tell a reader which half a given mechanism rests on." Correct the names in place and that failure mode does not arise — every clause of D-85 is then in force, with no half to distinguish. Mint a supersession instead and four clauses that are fully in force go inactive with the row, including **the behavior multiplies; it never measures** — which is the rule `packaging.node.test.ts` exists to enforce and the rule F-239 is about. Retiring D-85 would orphan its own instrument and leave the anti-second-traversal invariant with no active decision behind it. That consequence is decisive and it points one way.

**D-165 also did not do the act D-85 forbade, and says so itself.** D-85's defect was a _post-acquisition_ second traversal _in a behavior_, taken after acquisition had already changed positioning, dimensions, top-layer state and transforms. D-165 adds a _pre-mutation_ second ancestry read _in the kernel_, and its own row records "no additional layout-facing read, no second `getClientRects`" and cites **D-85's acceptance ground satisfied rather than violated** — the same phrase D-164 used before it. D-165 was written as compatible with D-85, and it is.

So this is a stale citation inside an active decision, which is exactly what the rule's second half covers: a wording correction made in place, with no new id.

**One constraint on how the correction is written.** `documentation.md` §6 governs the record, and its obligation runs opposite to a current-state document: "a record that quietly drops what it used to say has destroyed the only copy." So the row states today's shape **and keeps the wording it carried**, naming D-165 and the date as what split it. Overwriting `inheritedSpace` out of the row would be the same defect one level up.

### Required properties for the correction

1. D-85's row states the shape the code carries today: `visualSpace` and `itemSpace`, each an `InheritedSpace`, both derived from readings `acquireLift` took before it mutated anything.
2. The single-`inheritedSpace` wording the row landed with is preserved in the row, with D-165 named as what split it and the date it happened.
3. D-85's status stays `active`. Nothing supersedes it, and D-165's `Supersedes` cell is not widened.
4. No other clause of the row is touched — the four verbatim clauses are not restated, re-argued or re-dated.

**Applied in this pass.** The correction is a record edit, so it is made here rather than handed on.

---

## 2. F-239 — the dependency is removed, not named

### 2.1 The guard has two clauses, and only one of them is load-bearing

The offender test is a disjunction: a behavior file offends if it contains `from '@ydinjs/box-quad'` **or** matches a name derived from box-quad's source. Established directly, at `8afe4cf9`:

- **`@ydinjs/box-quad` is imported at exactly one site in `src/`** — `src/kernel/presentation.ts`. One `box()`, two `space()`, all inside `acquireLift`.
- **Nothing indexable crosses the seam.** `src/kernel/spec.ts` names no `Box`, no `Space` and no `Float64Array` anywhere. What a behavior receives is `InheritedSpace = Readonly<{ a; b; c; d }> | null` — four named fields.

A slot index is only _usable_ in a module that also holds a box-quad buffer, and a behavior can obtain one only by importing the package. **The import clause forbids that exactly**, in one bare specifier that no rename, relocation or declaration-form change upstream can move. The derived-name clause is a second net under the first: it catches residue — names left behind after an import is deleted, or added ahead of one — and **it is the entire source of the coupling F-239 reports.**

### 2.2 What naming the dependency would actually buy

A decision fixing box-quad's private declaration form and file, minted to serve the redundant clause, **in the same week that form changed twice**: BQ-6 deleted the cache constants, BQ-9 narrowed `BOX_LENGTH` from thirteen to eight and added the `SPACE_*` group. box-quad's own record leaves the layout open on purpose — BQ-9 settles seven required properties with _encoding left open_. Constraining another package's private constants from a consumer's test is a commitment that package has not made, should not be asked to make from here, and would be the second-cheapest thing on offer even if it had.

It is also the only place in the repository where one package's tests read another package's `src/`. Sanctioning a pattern with exactly one instance is what `CONTRIBUTING.md` §2.2 warns against, and §16 prefers deleting machinery to rebasing syntax around it.

### 2.3 The advertised resilience is false, and that is what decides it

The doc block claims that reading the real declarations "makes a rename carry the guard with it." That holds only for a rename that keeps `^const NAME = <integer>;$` in that one file. `export const`, `as const`, a non-integer initializer, a line-continued declaration, or the `SPACE_*` group moving into its own module each drop the affected names while `expect(forbidden.length).toBeGreaterThan(0)` stays satisfied on the rest.

**That is fail-open — the same class F-233 was, one layer down.** And it is worse than the guard it replaced in one specific respect: F-233's hardcoded spelling failed _visibly_ on the day the names changed, once someone looked; this one reports a pass. A soundness argument that is wrong is a heavier liability than a narrow guard that admits its narrowness.

### 2.4 There is no spelling-independent restatement, and the obvious one is wrong on the merits

- It false-positives immediately. `src/free-drag/spec.ts` and `src/sortable/spec.ts` each declare `MINTED = 0`, `STARTED = 1`, `RESOLVING = 2` — module-level integer constants in exactly the matched form.
- More importantly it would assert something D-85 does not say. `src/sortable/rect-index.ts` owns a complete packed-slot vocabulary — `STRIDE = 6`, `LEFT`, `TOP`, `RIGHT`, `BOTTOM`, `CENTRE_X`, `CENTRE_Y` — over its own `Float64Array`, filled from `getBoundingClientRect`. **D-85 forbids a behavior re-declaring box-quad's vocabulary to index box-quad's buffers. It does not forbid a behavior owning an indexed buffer**, and the sortable's geometry cache is exactly that, deliberately.

So the clause cannot be made both sound and correct without the cross-package read. It goes.

### 2.5 What replaces it is stronger than what it removes

The vocabulary was a proxy for a better question. Instead of _does a behavior name box-quad's private constants_, ask **where may box-quad enter this package at all** — and assert the answer positively. Today it is one module.

That form reads only drag2's own files; is exact, because a bare specifier is one string nothing upstream can move; **covers `src/shared/` and every future directory** rather than the two the current loop walks; and fails closed, because the expected site is its own vacuity floor.

### Required properties, encoding left open

1. D-85's source-level half is asserted **without reading any file outside `packages/drag2`**.
2. The claim is **positive and exhaustive** — box-quad's specifier appears in exactly the declared set of `src/` modules — rather than a blacklist of two directories. The set is one module today, and adding to it is a visible edit to the assertion.
3. Non-vacuity fails closed in the sense the file's other rows already use: an expected site that stops existing fails rather than passing.
4. The derived-name clause and its cross-package read are **deleted, not broadened**. Widening the regex or globbing `box-quad/src` keeps the coupling and keeps the fail-open shape.
5. The anti-pattern the clause named — a behavior privately re-declaring box-quad's slot indices — survives as prose on the assertion. It is what a reader needs, it is what makes the import claim meaningful, and prose cannot silently narrow.
6. The resilience claim goes with the clause. The doc block stops saying a rename carries the guard, and the sentence tying the derived names to the file's `import-x/no-relative-packages` exemption goes with it — that exemption is held by the `.scripts/` import and is unaffected.
7. **No `D-*` is minted, amended or superseded.** D-85's requirement is unchanged; this is how one instrument encodes a decision already in force, and the encoding is the implementer's.

**Owner: implementer.** This is a test-file change with no production effect and no contract movement.

---

## 3. F-243 — D-165's row claims a saving in a module that holds no box-quad box

Found while establishing §2.1, and it is a defect in a decision record, so it is minted and corrected here.

D-165's row reads: **"`rect-index`'s per-item boxes fall from thirteen slots to eight."** There are none.

- `src/sortable/rect-index.ts` packs its own `[left, top, right, bottom, centreX, centreY]`, `STRIDE = 6`, one `Float64Array` per axis feature, filled from `getBoundingClientRect`.
- It imports no box-quad, and cannot: the D-85 guard forbids it and the specifier appears once in `src/`, in the kernel.
- box-quad's own record already states the reason — record [`11-D-first-class-space-claude.md`](../../../../box-quad/.plan/reviews/11-D-first-class-space-claude.md) §6.4 declines to count a 9.9× sibling-batch win precisely because "`rect-index` measures candidates with `getBoundingClientRect()`, not `coordinates()`."
- The only `Box` in this package is the single scratch buffer in `acquireLift`, so the narrowing saves eight `Float64Array` slots once per lift and nothing per item.

**Non-substantive.** The clause is an anticipated _consequence_, not a required property; property 7's actual obligation — measure the change against D-163's always-on budgets — is discharged in the same row, and its measured figures (**+62 B on `minimal`, +71 and +64 on the animating rows, +75 on `complete`**) already contradict the anticipation three sentences above them. Corrected in place with the withdrawn wording preserved, per the record rule §1 applied for F-240.

**The general shape**: a decision's consequence clauses are written before the measurement and are not re-read when it lands. The falsifying number arrived _into the same row_ and the anticipation above it was left standing — so the check worth running at landing is not "is the figure recorded" but "does anything else in this row still predict a different one."

---

## 4. What is decided, and what is not

- **No `D-*` minted, amended or superseded.** D-85 stays `active` and D-165's `Supersedes` cell is unchanged.
- **F-240 closed** by a record correction, made in this pass.
- **F-243 minted and closed** the same way.
- **F-239 closed as a decision question and left open as implementation**, with §2.5's seven required properties and no sanctioned cross-package pattern. Owner: implementer.
- **Not touched, and not mine**: F-236, F-237, F-238, F-241, F-242. None was routed here and none needs a decision. **None of the five has a ledger row yet**, which is a real gap the remediation pass owns — F-237 in particular states two pre-D-165 type shapes as normative on a page whose own convention makes unstruck text normative.

## 5. Method

Read-only inspection at `8afe4cf9`. Every mechanical claim above was verified in this agent rather than taken from the review: the single box-quad import site, the absence of `Box`, `Space` and `Float64Array` from the kernel seam, `InheritedSpace`'s field shape, the six matched integer constants in the two behavior spec files, and `rect-index`'s own slot vocabulary. No probe was built, no production or test file was modified, and the only edits in this unit are to `.plan/` records.