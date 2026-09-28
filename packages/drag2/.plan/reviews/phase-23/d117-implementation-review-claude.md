# Review — the D-117 remediation as landed in `b498d69e`

**Independent review against D-117 ([00 §D-117](../../contract/00-index.md), [05 §Diagnostics, by provenance and audience](../../contract/05-lifecycle-invariants.md)) as closed by `76176da8`.** No production change is made here; findings are recorded for the owner.

**The slice is sound.** Every structural claim it makes is true, and I checked each mechanically rather than by reading the diff. **One concrete defect**, one legibility risk and three observations follow.

---

## 0. Verdict

| what was checked | how | result |
| --- | --- | --- |
| the slice is message-text-only | every changed file normalized — literals, comments, trailing commas, whitespace — and diffed against `76176da8` | **holds**, all 13 files identical |
| 39 identities, one prefix, `<area>/<condition>` | census of `src/` | **holds**, 39 conforming, 0 duplicates |
| no verdict tokens | read against each branch | **holds**, incl. the four sortable release faults |
| `drag.js` untouched at 121 B | rebuilt and re-measured | **holds**, budget 150 untouched, 29 B slack |
| the landed size table | reproduced from scratch | **exact on all 14 rows** |
| out-of-scope sites untouched | byte compare | `errors.ts`, `verified-refresh.ts` **byte-identical** |
| no stale quotes of the old text | fragment sweep over the package | **zero** |
| suite, types, format, lint | full run | **green**; 59 files, 1,152 passed, 116 skipped |

**Findings:** F-86 (tier B, concrete defect — an identity that is false for three of its four branches), F-87 (tier C, two identities one character apart), and three observations including a real change in budget sensitivity the landing note does not mention.

---

## 1. The slice is message-text-only — verified, not read

The strongest claim in the landing note is that **no check, branch, outcome, lifecycle path, gate or declared tier moved**. Reading a 500-line diff cannot establish that; a normalizer can.

Each of the thirteen changed `src/` files was taken at `76176da8` and at `b498d69e`, stripped of block and line comments, had **every** string and template literal replaced by a single fixed token, had trailing commas before a closer removed and all whitespace collapsed — then compared.

**All thirteen are identical.** Since every literal collapses to the same token, a _deleted_ or _added_ message would surface as a structural difference; none did, so the sites map one-to-one. The only differences before comma normalization were `X(\n STR,\n)` collapsing to `X(STR)`, which is the formatter reflowing around shorter strings.

That settles the boundary claim as strongly as it can be settled: **the diff is strings, comments, and formatting.**

Corroborating, and independent of the normalizer: `tests/kernel/vocabulary.node.test.ts` is untouched and passes, so no tier acquired a `__DEV__` binding; [`errors.ts`](../../src/kernel/errors.ts) and [`verified-refresh.ts`](../../src/sortable/verified-refresh.ts) are byte-identical to `76176da8`, so the formatting site and the one gated sentence stayed out of scope exactly as the closure ruled.

---

## 2. The identities

**39 conforming, and the arithmetic closes.** The measurement's classified census was 40 sites including `errors.ts`; `76176da8` rules that site a _formatting_ site and out of scope; 40 − 1 = 39. Every one matches `drag: <area>/<condition>` with an optional interpolated value, under **one** prefix — no `free drag: ` or `sortable: ` survives anywhere — and the five protocol identifiers (`drag:escape`, `sortable:item-removed` and their three siblings, no space) are untouched. **No two sites share an identity.**

**No token names a verdict.** This was checked branch by branch, and it matters most where `76176da8` said it would: the four sortable release faults settled as P1 by default rather than by proof are `release-no-presentation`, `release-no-destination`, `release-no-insertion` and `release-no-proposal` — four conditions, no `-invariant`, no `-bug`. The exemplar the closure named is the one that landed.

**`frame/shape-mismatch` is the clearest single improvement.** It replaces _the two frames have different shapes — a part factory is not deterministic_, which asserted a **cause** the branch does not observe: the branch sees unequal key lists, and non-determinism is the inference. The identity names what was seen.

**The explanations did survive.** D-117 (c) rests on `sourcesContent`, which only works if the deleted prose became a comment or was already one. Spot-checked at the six sites that lost the most content: `presentation.ts`, `placement.ts` and `spec.ts`'s landing site gained comments in this commit; `settlement/hold-unavailable`, `activation/root-disconnected` and `spec/command-type-pointerdown` were already explained by the doc blocks immediately above them — the last in full, including the two-listeners-for-one-event reasoning the message only gestured at. The one thin case is [`realm.ts`](../../src/kernel/realm.ts), where _(detached document)_ vanished with no replacement; `document.defaultView` being falsy is that, one line up, so nothing is actually lost.

---

## 3. F-86 — `sortable/placeholder-not-detached` is false for three of its four branches · **tier B**

**The defect.** [`placement.ts`](../../src/sortable/placement.ts) refuses a placeholder on four disjuncts:

```
!realm.isElement(placeholder) || placeholder === item ||
placeholder === visual || placeholder.isConnected
```

The identity names **only the fourth**. For the other three it asserts something that is not true of the value the consumer supplied.

**The package's own suite is the evidence, and it is unusually direct.** The three tests immediately above the accepting case now read:

| test | what the consumer returned | what the identity tells them |
| --- | --- | --- |
| `should refuse the dragged item **even when it is detached**` | a detached element | `placeholder-not-detached` |
| `should refuse the lifted visual **even when it is detached**` | a detached element | `placeholder-not-detached` |
| `should refuse a result that is not an element` | `{}` | `placeholder-not-detached` |
| `should **accept** a detached element` | a detached element | — accepted |

The first test's own comment is the sharpest statement of the problem: _"Kept as its own conjunct rather than leaning on `isConnected`: the refusal should not depend on the item happening to be in the document."_ The check does not lean on `isConnected`. **The identity does**, in the only place a consumer can read — and the test directly below it establishes that "detached" is the _accepted_ state. The diagnostic names the accepted state as the fault.

**Why this is a defect and not a preference.** [05 §The message is an identity](../../contract/05-lifecycle-invariants.md) states the rule this breaks in one sentence: _"A token names the condition, never the verdict. **A condition name is a fact about the branch**."_ `not-detached` is a fact about one branch of four. It is also a **regression against the text it replaced** — _"must return a detached element that is neither the dragged item nor its visual"_ was accurate about all four arms, including `isElement` via _element_.

**What it costs in the field.** This throw is classified `FAILURE_ACTIVATION`, so a consumer whose `placeholder()` returns the dragged item receives an `onError` naming a precondition they did not violate, and the identity is now the _whole_ of what they receive. That is the exact failure mode the identity floor exists to prevent — 05: _"A `DraggableError` whose `message` is empty and whose `code` is one of four is unusable in the field."_ A message that is confidently wrong is worse than an empty one.

**Not a size question.** The four arms share one predicate — the element must be **adoptable**: the library inserts it, moves it and removes it at teardown, so it may be neither of the two elements the drag already owns nor anything the page already has in the tree. An umbrella token for that is the same length class as the one that landed, so no byte argument is available on either side. Whether to fix by re-naming the umbrella or by splitting the branch is a derivation call and is left to the owner; **no production change is made here.**

**Where the derivation went wrong is worth recording**, because it is the same failure mode as the placeholder pair in §5 and the opposite resolution. That pair asked _which branch_ and got two identities. This site asked _which branch_ of four, took the last one, and named the whole site after it.

---

## 4. F-87 — two identities one character apart · **tier C**

`drag: spec/command-types-empty` and `drag: spec/command-type-empty` name genuinely different faults — an empty `types` array, and an empty string inside a non-empty one — and differ by a single `s`.

Not a correctness defect: neither is a substring of the other, so `kernel.browser.test.ts`'s three regexes discriminate, and the suite passes. It is a **legibility** risk on the channel the identity exists for. A bug report quoting one, a log aggregation grouping by message, or a maintainer scanning a list will conflate them, and the two faults have different repairs — remove the `command` block versus fix one entry.

The condition-naming rule does not require them to be this close: the second is an empty _entry_, and naming the position rather than the plural would separate them without adding a byte.

---

## 5. The two placeholder identities — sanity check requested, and they hold

`sortable/insertion-placeholder-lost` and `sortable/landing-placeholder-lost` are **correct and correctly discriminated.**

|  | insertion | landing |
| --- | --- | --- |
| branch | `!isConnected \|\| item.nextElementSibling !== placeholder` | `!isConnected \|\| placeholder.parentElement !== item.parentElement` |
| instant | inside `activation.prepare`, after insertion | inside `anchorTarget`, after the reorder commit |
| classification | `FAILURE_ACTIVATION` — nothing published | quality track — the reorder stands and is unaffected |

Three things check out.

**"Lost" is a true umbrella for both arms of both sites** — detached, or no longer in the expected relationship — so neither commits F-86's error. This is the distinction F-86 fails and this pair passes, in the same file.

**They must not share an identity.** Same subject, same verb, different stage, different consequence, different advice to the consumer: one says the drag never started, the other says the drag succeeded and only the animation was skipped. Collapsing them would erase the only thing a reader needs.

**The implementer's warning is well placed.** The note says a second implementer would most easily diverge here, because the site has to be read as _which branch_ rather than _which subject_. That is right, and the choice they made — discriminate by the **instant**, since subject and verb are identical — is the one that survives. F-86 is the same question answered the other way in the same module, which is the argument for recording the rule rather than the pair.

One cosmetic note: this pair is phase-first while `placeholder-not-detached` is subject-first, so the three placeholder faults do not sort together; and `landing` appears as a **condition** prefix here and as an **area** in `landing/duration-infinite` (from `shared/landing-runner.ts`). Neither is a rule violation — 05 mandates no ordering and the area is the owning module — and neither is worth a change.

---

## 6. `drag.js` — the control row held

Rebuilt and re-measured: **121 B, unchanged, 2 modules, budget still 150, slack still 29 B.**

This is the falsifier the closure set for its own boundary, and it is a real one. `76176da8` ruled `DraggableError`'s constructor a formatting site — it detects nothing, and `drag: ${code} failure` is already an identity — so the classification must not reach it. The measurement had predicted **+2 B** for the variant that slugged it, against 29 B of headroom on a 121 B artifact. **The variant did not land and the row did not move.** A policy that touches only what it should leaves this row where it was, and it did.

Corroborated from the other side: `errors.ts` is byte-identical to `76176da8`.

---

## 7. The budget re-base — sensitivity, not greenness

**Every landed figure reproduces exactly.** I rebuilt and re-measured all fourteen rows; each matches the landing note and each measured row now sits at **exactly 150 B of slack**. `drag.js` keeps 29 B and baseline B keeps 151 B, neither having moved.

**This is a tightening, and it is the stated convention rather than a new one.** [`measure.ts`](../../bench/size/measure.ts) §`budget` has said since Phase 21 that _every budget is now its measurement plus ~150 B_ and that _~150 B is about one module, and it is sized to notice a module appearing in a graph_. Slack of 618–932 B was four to six times that. Moving down restores the instrument; it does not weaken it, and nothing was absorbed — the budgets moved in the direction that makes future breaches **more** likely, which is the opposite of making the harness green.

### 7.1 Observation — the convention is now one byte short of its own smallest instance

Measured on the landed tree, the marginal cost of one module entering a graph:

| module entering                                 |      delta | modules |
| ----------------------------------------------- | ---------: | ------: |
| `free-drag/bounds.js`                           | **+149 B** |      +1 |
| `sortable/layout-animation.js` (on `minimal`)   |     +446 B |      +1 |
| `sortable/layout-animation.js` (on `+ landing`) |     +426 B |      +1 |

**The smallest module in the package now costs 149 B against 150 B of headroom**, so `free-drag/bounds.js` could enter `free drag minimal`'s graph without breaching its byte budget. Pre-slice the same module cost **154 B**, so the convention held then and does not now — shrinking the surrounding prose shrank the marginal cost with it.

**Mitigated, and not by luck.** `free drag minimal` declares `absent: ['free-drag/bounds.js', 'free-drag/landing.js']`, so the **graph** half catches exactly this, and `measure.ts`'s own doctrine is that a composition is a set of imports _and_ a set of modules that must be absent. Recorded because the file states in the present tense that the headroom is _still under one module's worth_, and for the smallest module that sentence is now false by one byte. Whether to trim the convention or re-word it is the owner's; **it changes no landed figure.**

### 7.2 The joint figure was not summed, and lands where it should

The landed deltas (−300…−500 B) sit **inside** the closure's −350…−547 B rather than at it, which is the expected place: the joint ablation gated the two kernel P2 sites this closure declines and used a different implementer's token lengths, and both were named as upper-bound terms before anything landed. Nothing is compared against the audit's retired 851–949 B. Minified moved with Brotli in the same direction on every row, so the disagreement that B1/B2 demonstrated earlier in this phase did not recur here.

---

## 8. Two smaller observations

**Interpolated values with spaces.** `drag: sortable/duplicate-contribution insertion geometry` carries a two-word offending value, so the identity's right boundary is not lexically recoverable — a consumer grouping by identity has to split on the second space rather than the last. Every other interpolation (`${key}`, `${String(tag)}`) is a single token. 05 explicitly permits _any interpolated offending value_, so this conforms; noted only because the identities are meant to be grouped by.

**A bookkeeping slip in the landing note.** It records _"Twenty-seven assertions across eleven files re-pointed"_. **Ten** test files changed, carrying 29 changed matcher lines across nine of them plus one `toMatchObject` in `seams.node.test.ts`. Assertion counts differ by convention — the `command.types` table is one statement and three cases — but the file count is a plain count and is off by one. It changes nothing; corrected here because this record's own §7 relies on the note's figures and they were otherwise exact.

**`consumer.node.test.ts` keeps D-108's meaning and sharpens it.** Its five packed-tarball assertions map onto D-108's four un-gated checks — factory determinism, reset shape, reset retention, unconsumed staged value, out-of-seam `host.fail()`. The old `'is not classified'` fragment matched **both** seam `host.fail` messages; the new `'drag: seam/fail-outside-seam'` pins one. That is narrower and more precise, and it is the site D-108 actually names.

---

## 9. What was not checked

- **Provenance was not re-proved.** `76176da8` settles the four sortable release faults as P1 by default and my earlier measurement left seven of eight P2 assignments provisional. Nothing in this slice depends on that — under either class the check ships and the message becomes an identity — so no reachability claim was re-derived here.
- **Token derivation was checked for truth, not for agreement.** F-86 is a token that is false; I did not attempt to establish that a second implementer would produce the other 38 unchanged, which is D-117 (c)'s stronger claim and is not testable from one implementation.
- **`sourcesContent` was spot-checked in the source, not in a packed tarball.** Six sites were read for a surviving comment; no `.js.map` was opened to confirm the comment ships.
- **One bundler, one browser**, as before.

---

LSP plugin - available; not used: this review is a text-and-measurement audit — the mechanical checks are a literal-normalizing diff, a string census over `src/`, a rebuild of the size harness and a full suite run, none of which is a code-symbol query.