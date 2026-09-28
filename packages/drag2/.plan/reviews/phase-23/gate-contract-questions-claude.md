# The three contract questions the reachability gate left open

Owner decisions, 2026-08-25, on the three rows the gate audit ([`reachability-gate-audit-claude.md`](reachability-gate-audit-claude.md)) returned unresolved. Files read at `642a18f9`, with one unrelated uncommitted edit in [`layout-animation.ts`](../../../src/sortable/layout-animation.ts) ignored. **No production code changed.**

These are contract and API-ownership questions. Cost appears nowhere below except where a packaging consequence had to be named.

| # | Question | Decision |
| --- | --- | --- |
| §1 | Sortable collection uniqueness | **Publish the term at `items`. Duplicates are admitted today; they must not be.** The check then fails the gate and the refusal goes; the copy stays |
| §2 | Frame-part symbol keys | **Publish string-keyed parts, and the check goes on clause (b) as well as the gate** — no library-owned state breaks |
| §3 | Insertion neighbour coherence | **The defect is the construction surface.** Publish `insertionAt` at the middle tier; both tests then go |

---

## 1. Collection uniqueness — the surface admits it, and that is the answer

### 1.1 What the published contract says today

Nothing, and I re-derived this rather than taking it from the audit. [`sortable/config.d.ts`](../../../sortable/config.d.ts) declares `items: ItemSource;` **with no TSDoc of any kind**, where `ItemSource = () => readonly HTMLElement[]`. No published `.d.ts` contains _unique_, _distinct_ or _duplicate_ applied to the collection. [`README.md`](../../../README.md) mentions `items` nine times and documents **array identity** as the structural signal (D-44) without ever mentioning element identity — which is the near miss worth noting, since a reader of that line learns that the array's identity is load-bearing and is told nothing about its contents.

So: **duplicates are valid input today.** Not by intent, but the gate does not ask about intent.

### 1.2 Why "obvious semantics" does not close it, and the reason is specific

The obviousness argument is real: an `HTMLElement` occupies exactly one position in the DOM, a sortable maps array order onto DOM order, so an array naming one node twice describes a list that cannot be rendered. I think that argument is sound. **I still decline to rest the gate on it, for one reason that is about this API rather than about obviousness in general.**

The realistic way a consumer produces a duplicate is by composing `items()` from overlapping sources — `() => [...pinned, ...all]`, a query that matches a row twice, a virtualized window that overlaps its buffer. In every one of those the consumer believes they are conforming, and the belief is reasonable, because nothing in the operation's semantics tells them that concatenation is where the precondition lives. **A term is obvious when violating it requires meaning something strange; this one can be violated by an ordinary refactor of a `items()` body.** §1.1's own paradigm — _a duration is finite_ — is a property legible in the value itself. _The elements of this array are distinct_ is a property of a container, and the container type is the canonical duplicate-permitting one.

### 1.3 Decision

**Publish the precondition at `items`, in the shipped TSDoc, and state it as what it is: the condition under which `{ from, to }` has a meaning.**

That last clause is the part I want on the record, because it changes the term from a restriction into a definition. The API's published product is a pair of indices the consumer applies to their own array: `from` indexes the snapshot, `to` indexes the destination view, and the two spaces differ by exactly one **only while the dragged element occurs once**. Uniqueness is not a rule layered onto the collection API; it is the condition under which the API's own output type is well-formed. Publishing it states what the surface already is.

**Consequence: the gate closes and `copyUniqueItems`'s refusal becomes a deletion candidate.** I accept that outcome rather than looking for a way around it. §1.1 is explicit that a check on input the contract excludes is not rescued by what the library would go on to compute, and this is the case the policy names as its own worked example.

**Three things the deletion must not sweep up.**

- **The copy stays**, on §9 ownership grounds that are independent of the gate: a consumer that keeps mutating its own array must not be able to change a snapshot already queued. `copyUniqueItems` loses its `Set` and its `throw`, not its reason to exist. It should lose its name too — it copies.
- **D-80 (b)'s normative statement ordering stays, and its motive changes** (F-98). The pull-then-assemble ordering was made normative because `copyUniqueItems` threw outside the unwind bracket (F-68). With no throw there is no such window — but F-69's reason is untouched: `merged.items()` is consumer code and can throw on its own, and it must still not do so with installer hooks recorded and unrun. An implementer removing the refusal must re-anchor that comment to F-69 rather than delete it with F-68.
- **D-120 §4 (b) is not reopened.** The `ReadonlySet` representation was rejected on grounds the gate does not touch — a `Set` absorbs duplicates rather than refusing them, so it would silently destroy the very precondition §1.3 now publishes, and it would end D-44's array-identity fast path. Under this decision that rejection gets _stronger_, not weaker: once uniqueness is a published term, a representation that quietly enforces it by deletion is the worst available way to state it.

### 1.4 What this does to D-120

**The verdict is reversed; the evidence is not.** D-120 §4 (c) rejected an unchecked precondition on its downstream failure mode, which the decisive gate makes unavailable as a route. The audit already recorded that supersession; this decision completes it by answering the contract question D-120 never asked.

D-120's §1 traces stay correct and stay valuable — they are now the documentation of **what a consumer who ignores the published term will experience**, which is exactly what an owner should be able to read before choosing to publish rather than check. Its §3 cost table is untouched.

---

## 2. Frame-part symbol keys — the check fails twice over

The audit rated this the weakest of the three frame checks and left it open on (a). I agree that **(a) passes**: `{ [MY_SYMBOL]: node }` is type-legal — `Extract<keyof Part, keyof KernelFrame>` is `never` for a symbol key, so `FramePartOf` admits it — it is ordinary JavaScript, it is a natural way to spell "private to my behavior", and nothing in the published `Frame` / `FramePartOf` TSDoc says parts are string-keyed.

**But the check fails (b), and that is the finding the audit did not reach.**

### 2.1 Who actually resets a frame part

[`kernel/frames.ts:227-233`](../../../src/kernel/frames.ts):

```ts
export function scrubFrame<Part extends object>(
  frame: Frame<Part>,
  resetFramePart: (part: Part) => void,
): void {
  resetKernelFields(frame);
  resetFramePart(frame);
}
```

`resetFramePart` is **behavior-author code**. The library resets its own kernel fields and delegates the part to the author who declared it. So a symbol-keyed field is:

- declared by the author,
- reset by the author's own function,
- and invisible only to `assertFrameScrubbed` and `assertFrameShapesMatch`, which walk `Object.keys` ([`frames.ts:261, 274, 310`](../../../src/kernel/frames.ts)).

**Nothing the library owns goes wrong.** The library keeps operating correctly; what it loses is the ability to _tell the author_ that the author's own reset missed the author's own field. That is a diagnostic becoming partial, not state becoming corrupt — and §1.1 names this exact shape as the thing that does **not** promote a check: _"nothing outside that author's own inert feature is left holding anything wrong."_

The counter-argument deserves stating, because it is the strongest one: the frame **object** is library-allocated and lives for the controller's lifetime, so a node retained on it is a leak in the library's own object. I do not think that carries. The obligation to clear the field is published and is the author's; `assertFrameScrubbed` exists precisely to verify their discharge of it. A library-allocated container does not make the author's field the library's state, any more than a `Map` the library hands out makes its values library-owned.

### 2.2 Decision

**Publish "frame part keys must be strings" in `FramePartOf`'s TSDoc, and the check goes.** The gate closes on the publication; clause (b) fails independently, which is what makes this decision robust rather than contingent on a doc edit landing first.

**The publication must say what it is protecting**, not merely state the rule: symbol-keyed fields are copied between frames by `Object.assign` and are not seen by the scrub assertions, so an author who uses one is outside the reach of the checks that would otherwise catch a retained node. That sentence is worth more to an author than the `TypeError` it replaces, because it arrives while they are writing the part rather than when they run it.

### 2.3 Two consequences the implementer must not miss

- **The published surface currently promises this validator** ([`kernel/frames.d.ts:52`](../../../kernel/frames.d.ts): _"`validateFramePart` is the authoritative check; this layer makes the common mistake unwriteable, not every mistake"_). §1.1's own exception applies — a documented outcome is a promise, and the check that implements it is contract. **Deleting any arm of `validateFramePart` is therefore a contract edit that must revise that sentence in the same change**, and the sentence's claim that the runtime check is _authoritative over_ the type is backwards under the gate. Recorded as F-97, and it governs §3.2 and §3.3 of the audit as much as this row.
- **The scrub instrument's blind spot outlives the check** (F-96). `assertFrameScrubbed` is `Object.keys`-based and will stay so; it already cannot see a stale non-null scalar (F-11, I-28). Symbols become a second known blind spot. That is acceptable — an instrument may be partial — but it must be **documented as partial** where authors read it, or it reads as a guarantee.

---

## 3. Insertion neighbour coherence — the defect is the construction surface

### 3.1 The precondition is meetable; the audit understated that and overstated the remedy's cost

[`sortable/domain.d.ts`](../../../sortable/domain.d.ts) publishes the relation precisely: _"A proposed insertion gap in the **destination view** — the snapshot minus the dragged item. `before` and `after` are **real identity neighbours**, not just an index."_ From that, a third-party axis author writes four obvious lines: filter the dragged item out of `snapshot.items`, then read `view[i - 1]` and `view[i]` with `?? null`.

**So (a) fails and both tests are deletion candidates whether or not anything is published.** §1.1's meetability test asks whether an integrator can satisfy the term, not whether the library hands them a helper — _coordinates must be finite_ is meetable without an exported `assertFinite`. The audit put this "on the boundary" of meetability; I do not think it is on the boundary, and saying so matters, because it means **"keep the constructor private and keep the guard" is not an available position.** The two coherent options are publish-and-delete or withhold-and-delete.

### 3.2 Which makes the real question the one the owner asked

**The defect is the public construction surface, and it is an ownership inconsistency rather than an ergonomics complaint.**

D-119 established that `Insertion` has exactly one construction owner and proved the five spellings are one rule. D-61 then opened `InsertionGeometry.resolve` to third-party authors at the middle tier. The package therefore publishes, at that tier, **the type, the obligation, and none of the implementation** — while holding an exhaustively tested constructor (`tests/sortable/insertion.browser.test.ts`) that it does not hand over. D-119's "one construction owner" is true inside the package and void at the boundary the package itself opened.

And `buildReorderProposal`'s neighbour test is the receipt for that, one level up from where F-91 found the same shape. Its own doc says so: _"What it still reads is the one insertion nothing here built."_

### 3.3 Decision

**Publish `insertionAt` from `sortable/feature`** — the middle tier, where axis authors already live — **and both the neighbour and the range tests become deletion candidates.**

**Not from `sortable.js`.** That root is the consumer surface, and consumers never construct an `Insertion`. §4's permanence rule makes an exported value a promise that cannot be withdrawn, so the tier it is exported from is the decision, not a detail.

**The packaging consequence must be stated, because the audit called this "cheap" and it is not free.** [`files.json`](../../../files.json) lists `sortable/feature` under **`typeOnly`**. Publishing a function there converts a type-only entry into a **runtime** entry: a new emitted module, a `files.json` change, and a new runtime import edge at the middle tier. Under §7 that does not leak — an ordinary consumer never imports `sortable/feature`, and the function already ships inside the sortable graph — but it is a structural change to the package's published shape and belongs in the slice's description rather than as a side effect of it.

**Two required properties of the publication:**

- **`insertionAt` derives; it does not validate.** `insertionAt(view, 999, v)` returns an out-of-range index with `null` at both ends. Its published TSDoc must therefore state its own precondition — `index` is a gap position in `destination`, `0 .. destination.length` — or publishing it will be read as making the range test unnecessary, which it does not do. The range test is deletable on the gate, for the separate reason that a _gap in the destination view_ has an obvious domain; it is not deletable because the constructor now exists.
- **The signature is frozen from that day.** `(destination, index, version)` is a pure derivation from a rule D-119 proved, which is the best permanence risk available here — but the `version` parameter is the one to look at twice, since it threads a value the author reads off `runtime.snapshot` and could instead be taken from the snapshot itself. Deciding that is part of the slice.

---

## 4. Consequences for the existing findings

| Record | Effect |
| --- | --- |
| **D-120** | Verdict on the check **reversed** by §1.3 once the term is published; §4 (b)'s rejection of `ReadonlySet` **stands and is strengthened**; §1 traces and §3 costs untouched and now document consumer-visible undefined behaviour |
| **F-95** | Stays closed. The derivation it supplied was correct under the pre-gate rule and is superseded as a _route_, exactly as it superseded D-77's |
| **F-68** | Its window closes for a second time and for a different reason: with no throw there is nothing to strand |
| **F-69** | **Load-bearing and now the sole motive** for D-80 (b)'s normative ordering — see F-98 |
| **D-119 / F-91** | Extended by §3.3 from an internal ownership rule to a published one |
| **F-93** | Untouched; still open on its own terms |
| **F-11 / I-28** | Joined by a second known blind spot in the same instrument — F-96 |

## 5. What would falsify these

- **§1** falls if the published surface turns out to state the term somewhere I did not read. I read the shipped `.d.ts` set and `README.md`. I also checked the one place a consumer meets `items()` by example — [`src/sortable.stories.tsx:109`](../../../src/sortable.stories.tsx) — since a library example that taught the violation would change how loudly §1.3 has to publish. **It does not fire, and what it shows is worth keeping**: the example is `orderRef.current.map((label) => elements.current.get(label))`, so its duplicate-freedom is inherited from the consumer's own `order` array being duplicate-free. The precondition is satisfied there **one indirection away from where it is stated**, which is a good argument for publishing it at `items` rather than trusting the shape of the call.
- **§2** falls if any library code — present or planned — reads a frame part's fields generically rather than through the author's own reset. I found none; the kernel touches its own fields and delegates the rest.
- **§3** falls if a third-party axis author has a legitimate reason to construct an `Insertion` **without** a destination view in hand. `homeInsertion` is precisely that case inside the package (D-119 exempts it to avoid allocating one), so the shape exists; if it is reachable from the middle tier, the published constructor is the wrong shape for at least one real author.