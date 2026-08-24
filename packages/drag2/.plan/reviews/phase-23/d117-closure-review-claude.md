# Closure review — D-117, after `d64c99d5`

**Independent closure review of the narrow remediation against F-86, F-87 and the size-doctrine correction.** No production change is made here.

**Clean. D-117 is closed.** Both identity repairs are true of every arm of their branches, nothing behavioural or classificatory moved, the reported composition movement reproduces exactly, and **no budget and no graph assertion was weakened** — the `COMPOSITIONS` array is byte-identical to `b498d69e` once comments are removed. Two tier-C record precision notes follow, neither blocking.

---

## 1. Both identity fixes are true descriptions of their branches

### 1.1 `sortable/placeholder-not-adoptable` — true for all four arms

The predicate in [`placement.ts`](../../src/sortable/placement.ts) refuses on four disjuncts, and the repaired token holds for each:

| arm | why it is not adoptable |
| --- | --- |
| `!realm.isElement(placeholder)` | cannot be inserted, relocated or removed at all |
| `placeholder === item` | the drag already owns it; adopting it means teardown deletes the consumer's row |
| `placeholder === visual` | the same, for the lifted element |
| `placeholder.isConnected` | the page owns it |

**The accepting case is now consistent rather than contradicted.** `should accept a detached element` accepts a detached, non-item, non-visual element — which _is_ adoptable, so the token and the acceptance agree. That is the precise reversal of F-86: `not-detached` named the accepted state as the fault, and `not-adoptable` names a property the accepted state does not have.

**The token is derived from the site, not invented for it**, which is what D-117 (c) asks. The comment two lines above the predicate already carried the word: _"The factory is consumer code and its result is **adopted**: activation inserts it, every move relocates it, and teardown removes it."_ A second implementer reading the site meets _adopted_ before they meet the branch.

**It is a condition, not a verdict.** 05 §The message is an identity forbids a token that asserts the reachability claim of §Provenance. "Adoptable" is a property of the value the consumer supplied — observable at the call, unchanged if the site were reclassified — so it is a fact about the branch in the sense the rule means.

**And an umbrella is not the thing F-86 objected to.** This vocabulary already umbrellas multi-arm branches: `spec/action-tags-invalid` over two, `settlement/hold-unavailable` over two, `frame/key-redefined` over three descriptor conditions. What made `not-detached` a defect was that it was **false** for three arms, not that it covered four. The repair keeps the umbrella and makes it true.

The added comment records the reasoning at the site, including the counterfactual — _"Naming the last arm — `isConnected` — would tell three callers in four that they returned an attached element when the accepting case is precisely a detached one."_ That is the finding preserved where the next reader meets it.

### 1.2 `spec/command-entry-empty` — true, and now legible against its neighbour

| branch | identity | true? |
| --- | --- | --- |
| `types.length === 0` | `drag: spec/command-types-empty` | the **array** is empty ✓ |
| `type === ''` inside the loop | `drag: spec/command-entry-empty` | an **entry** is empty ✓ |

Both name their own branch. The pair no longer differs by a trailing `s`: the discriminating word moved to the middle, `types` against `entry`, and the two identities are **exactly the same length** (24 characters after the prefix), so neither is a substring of the other and neither is longer for being clearer. The repair names the _position_ rather than the plural, which is what F-87 asked for.

---

## 2. No behavioural or classification boundary moved

**Verified mechanically, not read.** Both changed `src` files were taken at `b498d69e` and at `d64c99d5`, stripped of comments, had every string and template literal replaced by one fixed token, trailing commas and whitespace normalized, and compared. **Both are identical** — the change is two string literals and one comment block. Predicate, arity, order of disjuncts, thrown type (`TypeError` at both sites), classification (`FAILURE_ACTIVATION` for the placeholder, construction-time `arm()` refusal for the command entry) and lifecycle path are untouched.

Corroborating, across the whole slice rather than the two files:

- **39 conforming identities, no duplicates, one prefix.** Unchanged in count; no `free drag: ` or `sortable: ` anywhere.
- [`errors.ts`](../../src/kernel/errors.ts) and [`verified-refresh.ts`](../../src/sortable/verified-refresh.ts) are still **byte-identical to `76176da8`** — the formatting site and the one gated sentence stayed out of scope through both passes.
- **Module counts are unchanged on all fourteen rows** (32, 31, 33, 34, 35, 27, 28, 29, 30, 48, 2, 13, 30, 26).
- Suite green: 59 files, 1,152 passed, 116 skipped, no type errors. Format and lint clean on all five changed files.
- Four test re-points, exactly the four the two renames require — three in `placement.browser.test.ts`, one in `kernel.browser.test.ts`.

---

## 3. The composition movement, reproduced

Rebuilt at `b498d69e` and at `d64c99d5` and measured both.

|                       | reported       | measured                         |
| --------------------- | -------------- | -------------------------------- |
| minified              | +1 … +2 B      | **+1 … +2 B**                    |
| Brotli                | −5 … +14 B     | **−5 … +14 B**                   |
| `drag.js`, baseline B | byte-identical | **byte-identical** (121 / 6,889) |

**The minified column splits in a way that is itself a check.** Free-drag and `kernel root` rows moved **+1 B**; sortable rows and `both behaviors` moved **+2 B**; `drag.js` and baseline B moved **0**. That is exactly what two one-character growths predict when one lives in `kernel/kernel.ts` and the other in `sortable/placement.ts` — the free-drag graph carries the kernel identity only, the sortable graph carries both, and the vocabulary root carries neither. Nothing else moved by accident.

**Brotli is noise at this scale and the note says so correctly.** `free drag minimal` is **5 B smaller** for one added character. Reading that as a saving would be the same error the phase has now demonstrated three times.

**Slack, measured:** the twelve measured rows sit at **136–155 B**; `drag.js` keeps **29 B** and baseline B keeps **151 B**. Every row is green.

---

## 4. No budget and no graph assertion was weakened

**The decisive check.** The `COMPOSITIONS` array was extracted from both commits, stripped of comments and whitespace, and compared: **identical**. Every `budget`, every `absent`, `absentPrefixes`, `present` and `only` is unchanged. The rows absorbed +1…+14 B of Brotli into existing headroom rather than being re-based to fit it, and the tightest row after the change — `minimal + landing` and `both behaviors` at 136 B — is still inside the ~150 B convention rather than having been given room.

That is the answer to the question directly: the movement was accommodated by **spending headroom that already existed**, not by moving a number.

---

## 5. The size-doctrine correction is right, and stronger than the finding it answers

My §7.1 reported that the smallest module's cost to enter a graph had fallen to 149 B against 150 B of headroom, and offered two repairs: trim the convention or re-word it. **The correction takes neither, and is better for it.**

The three figures are confirmed against my own measurements of all three trees:

| tree       | `free-drag/bounds.js` into `free drag minimal` |
| ---------- | ---------------------------------------------: |
| `76176da8` |                                      **154 B** |
| `b498d69e` |                                      **149 B** |
| `d64c99d5` |                                      **157 B** |

**It crossed the headroom in both directions across two message-text-only passes, with no module moving.** The doctrine now draws the general conclusion rather than patching the instance — a module's marginal cost is what Brotli charges for it _given everything else in the graph_, so it is not a property of the module and no headroom can make the byte half a sufficient test. Widening the budget is explicitly refused, on the grounds that loosening an exact instrument to prop up a redundant one is the wrong direction. That is correct, and it is the version that does not schedule the next correction.

The other module-entry figures in the new paragraph also reproduce exactly on this tree: `free-drag/landing.js` **+286 B**, `sortable/layout-animation.js` **+440 B** on `minimal` and **+415 B** on `+ landing`.

**The separation of the two instruments is stated correctly**: the byte budget catches growth, the graph declaration catches a module, and the module claim was never the byte half's to make. One precision defect in how far that coverage is claimed is recorded below.

---

## 6. F-88 — the doctrine claims graph coverage the file does not have · **tier C**

The corrected paragraph says the module claim _"is carried by `absent` and `absentPrefixes`, **which is why every composition declares them**"_. Audited against the array:

| rows | graph declaration |
| --- | --- |
| the eight sortable and free-drag compositions | `absent` + `absentPrefixes` + `present` |
| `free drag complete` | `absentPrefixes` + `present` — no `absent` |
| `both behaviors` | `absent` + `present` — no `absentPrefixes` |
| `vocabulary root - drag.js` | `only` |
| `kernel root - kernel.js` | `absentPrefixes` + `present` |
| **`baseline A`, `baseline B`** | **none** |

Twelve of fourteen declare topology; two declare none, and one of the two matters. **`baseline A` is a real package graph** — `bench/size/noncomposed.js` imports through relative paths into the built package and pulls thirty modules — so a module _can_ enter it, and it carries no `absent` or `present` at all. Its 149 B of budget is therefore the only instrument that would notice, which is precisely the arrangement the corrected paragraph says is unreliable.

**Its separate instrument does not close the gap.** `tests/bench/size.node.test.ts` › _the non-composed baseline should fill exactly the slots the assembler fills_ is a **slot-set** check against `assemble()`, not a module-graph one; it catches the drift `noncomposed.js`'s own doc block warns about and would not see a module arrive.

**Low consequence, and recorded for precision rather than repair.** Baseline A exists to answer _what does composition cost_ against `complete`, which does carry graph assertions, and it is a checked-in fixture the package controls rather than a consumer surface. But the sentence asserts universal coverage, and the file has coverage on twelve rows of fourteen. Either the quantifier narrows to the consumer compositions, or baseline A gains a declaration; **neither is needed to close D-117.**

## 7. F-89 — F-87's ledger row states the finding with the post-fix name · **tier C**

The Finding column reads _"`spec/command-types-empty` and `spec/command-entry-empty` were one character apart"_. Those two are the **repaired** pair and are not one character apart — the finding was about `spec/command-types-empty` and `~~spec/command-type-empty~~`. F-86's row quotes its pre-fix name correctly, so the two rows disagree about which state a Finding column describes.

Recoverable: the disposition column strikes the old name one sentence later and explains the pluralization. Recorded because a reader checking the claim against the names the row itself quotes gets the wrong answer, and because a findings ledger's one job is to hold the finding.

---

## 8. Closure

**D-117 is closed.** Against the decision, its closure at `76176da8`, and the review at `97c8ed3e`:

- the message-text-only boundary held across **both** passes, verified by normalizer on all fifteen files the two commits touched;
- the identity vocabulary is complete and internally sound — 39 sites, one prefix, no duplicates, no verdicts, and now no false condition;
- the two out-of-scope sites are byte-identical to the pre-remediation tree;
- `drag.js` never moved, at any commit in the slice, which is the boundary's own falsifier;
- the budgets were re-based **down** once and not touched since, and the movement this remediation caused was absorbed by existing headroom;
- the one stale claim the review found is corrected, and corrected more generally than the finding required.

F-88 and F-89 are record-precision items against `measure.ts`'s doctrine paragraph and the F-87 ledger row. Neither touches a shipped byte, a check or a budget, and neither is a reason to hold the closure.

---

## 9. What was not checked

- **Provenance was not re-proved**, and does not bear on either repair: both sites ship their check under any class.
- **Token derivation was checked for truth, not for agreement** — F-86's repair is demonstrably true of its four arms, but whether a second implementer produces _adoptable_ from the site is D-117 (c)'s stronger claim and is not testable from one implementation. The site's own comment carrying the word is the best available evidence and it is not proof.
- **`sourcesContent` was read in the source, not in a packed map.**
- One bundler, one browser, as throughout this phase.

---

LSP plugin - available; not used: this closure review is a text-and-measurement audit — a literal-normalizing diff over two source files, a structural comparison of the `COMPOSITIONS` array, an identity census, two builds of the size harness and a full suite run, none of which is a code-symbol query.