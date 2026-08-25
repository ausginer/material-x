# Auditing drag2's runtime guards against the reachability gate

Review, 2026-08-25. Files read at `85d1d1a2`, with one unrelated uncommitted edit in [`layout-animation.ts`](../../../src/sortable/layout-animation.ts) ignored. No production code changed.

The commissioning question: now that [`CODE_OF_SIZE.md`](../../../../../CODE_OF_SIZE.md) §1.1 makes reachability a **gate** rather than the first of two questions, which shipped runtime guards are still protecting the integrating developer from violating the published contract?

The gate, restated as it was applied here:

> Is this state reachable through correct use of the public contract? If it is **not — stop.** Nothing considered later reopens the question.

Only for states that survive does _whose invariant_ get asked.

---

## 0. Method, and the one methodological point that shaped every answer

**"Published" was read strictly, and that decided most of the findings.** §1.1 says a contract term counts when an integrator can **meet** it and **find** it — "expressed by the type, written where the integrator reads, or genuinely obvious from the operation's own semantics." For this package that means:

- the shipped `.d.ts` files and their TSDoc, which is what an integrator sees in an editor;
- `README.md`;
- genuinely obvious operation semantics.

It explicitly does **not** include `.plan/`. The contract documents under `.plan/contract/` are this team's internal reasoning, not a surface any consumer reads. Several checks audited below are justified in `.plan/` by a precondition that appears **nowhere** the integrator can find it, and that gap is the single most common finding in this review.

**The counterfactual was run rather than argued** where it was load-bearing (§1.1's "verify the failure before you argue about it"). §2 below reports one such trace that changes how three separate checks relate to each other, and that no prior record contains.

**Cost is reported for prioritization only.** Per §1.1 it classifies nothing; a cheap check that fails the gate still fails it.

### Verdict summary

| # | Check | Gate (a) | Disposition |
| --- | --- | --- | --- |
| §1.1 | `copyUniqueItems` duplicate refusal | **unresolved — contract is silent** | **clarify contract** (owner) |
| §1.2 | `moveTo` finite coordinates | **closed** — precondition published in the shipped type | delete |
| §1.3 | landing `duration === Infinity` | **closed** — doctrine's own named example | delete, but read §2 first |
| §3.1 | `placeholder-not-adoptable` | **closed** — all four arms published | delete |
| §3.2 | frame part: kernel-key collision | **closed** — expressed in the type | delete |
| §3.3 | frame part: `__proto__` | **closed** — unreachable without `defineProperty` | delete |
| §3.4 | frame part: symbol key | **unresolved** | owner decision |
| §3.5 | `dispatch` tag range | **closed** — precondition published | delete (doc change required) |
| §3.6 | `spec/action-tags-invalid` | **closed** — obvious semantics | delete |
| §3.7 | `spec/command-type-pointerdown` | **closed** — refusal published | delete (doc change required) |
| §3.8 | `home-not-finite` throw | **closed** — but see the copy | delete throw, **keep copy** |
| §3.9 | insertion neighbour/range tests | **unresolved — meetability** | owner decision |
| §4 | `claim` duplicate-contribution | **passes** | **keep — strengthened** |

---

## 1. The three named stress cases

### 1.1 D-120 / `copyUniqueItems` — the contract is silent, and that is the finding

[`collection.ts:42-52`](../../../src/sortable/collection.ts). The empirical consequences are established in [`collection-uniqueness-ownership-claude.md`](collection-uniqueness-ownership-claude.md) §1 and are not repeated here. The gate asks one question instead: **does the published contract say the array's elements are distinct?**

**It does not. Searched exhaustively, and the silence is structured rather than accidental.**

- [`sortable/config.d.ts:47`](../../../sortable/config.d.ts) declares `items: ItemSource`, where `ItemSource = () => readonly HTMLElement[]`. **The slot carries no TSDoc at all.**
- No `.d.ts` in the published surface contains the words _unique_, _distinct_, _duplicate_, or any paraphrase applied to the collection.
- `README.md`'s only mention of `copyUniqueItems` is a byte-cost note about statement ordering — not addressed to an integrator as a precondition.

**The silence is structured because the neighbouring slot is not silent.** Three properties down, [`config.d.ts`](../../../sortable/config.d.ts) documents `box`'s limits explicitly — _"visual order must follow DOM order, rule-placed layouts are unsupported… Nothing detects a violation — the shipped package fails these layouts too, silently — so this is a documented boundary, not a guard."_ And `placeholder` publishes its own precondition in one sentence (§3.1). **This surface documents boundaries when it means them.** An absent statement at `items`, between two slots that carry one, is weak evidence that no boundary was intended there — not merely evidence that nobody got around to writing it.

**The case for "genuinely obvious semantics" is real but does not close the gate on its own.** It runs: an `HTMLElement` occupies exactly one position in the DOM, a sortable maps array positions to DOM positions, so an array naming one node twice describes a list that cannot be rendered. That argument is sound, and [`collection.ts`](../../../src/sortable/collection.ts) itself makes it — _"a node cannot occupy two positions."_ Against it: `ItemSource` returns an **array**, the canonical duplicate-permitting structure, and the value is produced by consumer code that may compose it from sources that overlap. "Elements of a collection are distinct" is a property of a _container_, and is meaningfully weaker than §1.1's own examples — _a duration is finite_ is a property of the value itself, legible from the word.

**Disposition: clarify contract — an owner decision, not a size finding.** §1.1 is explicit that "deciding what the contract says is the expensive half… and it is a contract decision with a contract's consequences," and it declines to choose between the two readings for exactly this case. This review declines to choose _for_ the owner, but reports the evidence as tilted: the published surface admits the input today.

The cheapest correct resolution is asymmetric and worth stating plainly. **Publishing the precondition costs one TSDoc sentence at `items` and zero runtime bytes**, after which the gate closes and D-120's check becomes a clean deletion candidate — recovering the 105 ns – 13.4 µs per structural pull that [`collection-uniqueness-ownership-claude.md`](collection-uniqueness-ownership-claude.md) §3 measured. Leaving the surface as it is keeps duplicates valid input, in which case D-120's clause-(b) argument remains live and the check stays.

**What is deliberately superseded.** D-120 §4(c) rejected "an unchecked public precondition" on the grounds that _"Its failure mode is §1: no throw, no `onError`, no cancellation, and the consumer's element in the wrong position."_ Under the decisive gate **that reasoning is unavailable as stated** — it is a claim about what happens downstream of an input, offered before establishing that the contract admits the input. D-120's verdict is not reversed here; its **route to the verdict is superseded**, and the verdict now depends entirely on a contract question §4(c) did not ask. The empirical work in §1, the cost table in §3, and the rejection of the `ReadonlySet` representation in §4(b) are untouched and remain correct — §4(b) in particular is a genuine finding about representation that the gate does not touch.

### 1.2 `moveTo` finite coordinates — gate closed, on the strongest evidence in this audit

[`free-drag/spec.ts:528-532`](../../../src/free-drag/spec.ts).

**The precondition is published, in the shipped type, in the same paragraph an integrator reads to learn what `moveTo` does.** [`free-drag/controller.d.ts:30`](../../../free-drag/controller.d.ts): _"`point` is **viewport** space (D-72), like every other point on this surface, and its coordinates must both be **finite** (D-91)."_

That is a term an integrator can find (it is on the member's own doc comment) and meet (pass finite numbers). A non-finite coordinate is therefore outside the published contract, the gate closes at (1), and **the entire keep-argument is unavailable** — _"a single non-finite coordinate poisons every later `deriveMotion`, every geometry object handed to the consumer, and the accepted `anchorTarget`"_ is a description of what the library goes on to compute, which §1.1 now names as precisely the story that is always available and never sufficient.

**Disposition: delete** — with a documentation consequence. The same TSDoc publishes the _behaviour on violation_ two sentences later: _"**A non-finite coordinate discards the call.** Nothing is written, no failure is classified…"_ Deleting the check therefore changes documented behaviour and requires that paragraph to be revised in the same change. This is not an obstacle to deletion; it is a reminder that the deletion is a contract edit, not a byte edit.

**Read §2 before scheduling this one.**

### 1.3 Landing `duration === Infinity` — gate closed on the doctrine's own worked example

[`shared/landing-runner.ts:167-169`](../../../src/shared/landing-runner.ts).

**The published type is silent**, and this is worth stating precisely because it cuts the other way from §1.1. [`shared/landing-runner.d.ts`](../../../shared/landing-runner.d.ts) declares `duration?: number | LandingDuration`, and its TSDoc — which is long, and covers call timing, the context object, and source compatibility — never states a domain. Its closest approach is oblique: _"the value cannot be range-checked before it exists,"_ which presupposes a range without publishing one.

**The gate nonetheless closes, on the third limb.** §1.1 names _a duration is finite_ **twice** as its canonical example of a term that counts as an obvious semantic precondition — once in the general statement, once in the list of terms an integrator can meet and find. The doctrine's authors chose this exact value as the paradigm case. An audit that read the same doctrine and concluded `Infinity` is an admitted duration would be reading it against its plainest text.

`Infinity` as an animation duration is not a long animation; it is the absence of one. The gate closes, and the keep-argument — _"the landing **holds the settlement gate**, so an animation that never finishes is an operation with no terminal — the single failure this architecture cannot classify"_ — is again downstream-consequence reasoning that never reaches clause (b).

**Disposition: delete — but this is the one case where §2's coupling genuinely bears on the decision**, and it should not be scheduled independently of §1.2.

**Note in passing**, because it is a good outcome rather than a finding: the _rest_ of the duration domain is already correctly delegated. [`landing-runner.ts:118-124`](../../../src/shared/landing-runner.ts) records that `animate()` rejects `NaN`, negatives, `-Infinity`, strings and objects itself, measured in [`animate-duration-domain.md`](../../measurements/animate-duration-domain.md), and `easing` is deliberately unvalidated because _"the platform is the only correct parser for one."_ That is §1.1 applied well.

---

## 2. The coupling none of the three records contains

§1.1 requires the counterfactual be executed rather than argued. Running it produced the one structural fact in this audit that no existing document states, and it links all three named cases.

**The landing's `duration` thunk is handed a library-minted `distance`.** [`shared/landing-runner.d.ts`](../../../shared/landing-runner.d.ts) publishes `LandingTimingContext` as `{ from, to, distance }`, and [`landing-runner.ts:155-160`](../../../src/shared/landing-runner.ts) computes `distance: Math.hypot(target.x - from.x, target.y - from.y)`. A **conforming** author writing `({ distance }) => distance / SPEED` — exactly the use D-67 added the context for — returns whatever that arithmetic yields.

**Tracing where `from` and `target` come from:**

- [`kernel.ts:1514-1520`](../../../src/kernel/kernel.ts) builds `from: { x: rendered.x, y: rendered.y }` from the kernel's own recorded lift session.
- For free drag, `rendered` is written from the committed `offsetX`/`offsetY` — **the very state `moveTo`'s finiteness check currently protects** ([`free-drag/spec.ts:534-535`](../../../src/free-drag/spec.ts)).
- `target` for a rejected or canceled free drag is `home(subject)` — **the state `home-not-finite` currently protects** ([`free-drag/spec.ts:873`](../../../src/free-drag/spec.ts), §3.8).

**So the three checks are not independent, and the record treats them as though they were.** Today, the `moveTo` and `home` guards are what make `distance` finite; the landing guard is the backstop for a value the other two keep clean.

**What this does and does not change.**

It does **not** reopen either gate. An integrator who passes `Infinity` to `moveTo` has left the contract, and a hung settlement gate is part of the undefined behaviour they bought — §1.1 is unambiguous that "the library subsequently computing or publishing nonsense is **part of that undefined behaviour**, not a separate harm."

What it changes is **sequencing and severity, which the owner should see before deleting anything.** Delete `moveTo`'s check alone and the landing guard still catches the resulting `Infinity`; the failure classifies. Delete both and the outcome for that same input is the **hung settlement gate with no terminal** — by this architecture's own account the one failure it cannot classify at all. Two individually-correct gate closures compose into the worst available failure mode.

Worth distinguishing from the `NaN` path, which is benign either way: `NaN !== Infinity`, so the landing guard never fired for it, and `animate()` throws on `NaN` and classifies — measured, [`animate-duration-domain.md`](../../measurements/animate-duration-domain.md). **Only `+Infinity` produces the compounding case.**

**Recommendation: delete these as one decision with one recorded rationale, not as three independent size wins.** If the owner wants the `Infinity` backstop retained on cost-of-failure grounds despite a closed gate, that is a legitimate call — but §1.1 requires it be made as an explicit exception to the gate rather than dressed as an invariant argument.

---

## 3. Findings beyond the named cases

### 3.1 `placeholder-not-adoptable` — the cleanest gate closure in the package

[`sortable/placement.ts:266-272`](../../../src/sortable/placement.ts):

```ts
if (
  !realm.isElement(placeholder) ||
  placeholder === item ||
  placeholder === visual ||
  placeholder.isConnected
) {
  throw new TypeError('drag: sortable/placeholder-not-adoptable');
}
```

**Every one of the four arms tests something already published**, in one sentence on the slot the integrator reads — [`sortable/config.d.ts`](../../../sortable/config.d.ts): _"Must return a **detached** element that is neither the dragged item nor its visual."_

| arm | published as |
| --- | --- |
| `placeholder.isConnected` | "must return a **detached** element" |
| `placeholder === item` | "neither the dragged item" |
| `placeholder === visual` | "nor its visual" |
| `!realm.isElement(placeholder)` | the **type**: `PlaceholderFactory` returns `HTMLElement` |

The fourth is independently disqualified by §1.1's bullet _"do not validate values already constrained by the type system."_ The other three are a runtime restatement of a documented sentence.

**Disposition: delete.** This is the strongest finding in the audit after §1.2: the precondition is published, findable, trivially meetable, and the check adds nothing a conforming author can reach. No doc change is even needed — the sentence stays true as a documented boundary, in exactly the form `box` already uses two slots away.

### 3.2–3.4 The three frame-part checks — the doctrine names these itself

[`kernel/frames.ts:163-185`](../../../src/kernel/frames.ts), reached from a third-party behavior's `createFramePart()`. §1.1 discusses this validator by name and states that its three surviving keeps are **"re-put rather than confirmed"** and owe (a) an answer. Supplying that answer:

**§3.2 — kernel-key collision: gate closed, and the type already says so.** [`kernel/frames.d.ts:63-65`](../../../kernel/frames.d.ts) publishes:

```ts
type FramePartOf<Part> = [Extract<keyof Part, keyof KernelFrame>] extends [
  never,
]
  ? Part
  : Part &
      Readonly<{
        __kernelFrameKeyCollision: Extract<keyof Part, keyof KernelFrame>;
      }>;
```

A part declaring a kernel frame key is made **uninhabitable at compile time**. A conforming TypeScript author cannot produce this state; reaching it requires a cast or plain JavaScript, which §1.1 says is _leaving_ the contract, not finding a hole in it. This is §1.1's "do not validate values already constrained by the type system" with the constraint visible in the published surface. **Delete.**

Note the file's own doc comment asserts the reverse ordering — _"`validateFramePart` is the authoritative check; this layer…"_ ([`frames.d.ts:52`](../../../kernel/frames.d.ts)). Under the gate that sentence has it backwards: the type is the contract, and the runtime check is the redundancy.

**§3.3 — own data `__proto__`: gate closed on reachability.** The check's own comment establishes it: _"An own enumerable writable `__proto__` **data** property — **creatable only through `defineProperty`**."_ An author cannot reach this with an object literal, a class, or a spread; it takes a deliberate `Object.defineProperty(part, '__proto__', …)`. That is not a state a conforming author produces by accident, and §1.1's gate does not care that the consequence (prototype mutation) is severe. **Delete.**

**§3.4 — symbol key: genuinely unresolved, and the weakest of the three.** Unlike the other two, a conforming author **can** plausibly reach this: writing `{ [MY_SYMBOL]: node }` in a frame part is ordinary JavaScript, type-legal, and a natural way to express "a field private to my behavior." Nothing in the published `Frame`/`FramePartOf` surface says frame parts are string-keyed. The consequence is a genuine library-owned leak — the symbol survives the `Object.keys`-based scrub, retaining a DOM node for the controller's life.

**Disposition: owner decision.** This is the one frame check where (a) may genuinely pass, and if it does, (b) is squarely satisfied. Publishing "frame part keys must be strings" in the `FramePartOf` TSDoc would close the gate for 0 runtime bytes; absent that, the check has a live case. It costs 6 B.

### 3.5 `dispatch` tag range — closed, and the doc publishes the guard as behaviour

[`kernel/kernel.ts:2326-2337`](../../../src/kernel/kernel.ts). [`kernel/spec.d.ts:22-28`](../../../kernel/spec.d.ts) publishes: _"`tag` is behavior-local and **must be in `0 .. config.actionTags - 1`**; the kernel offsets it internally **and bounds-checks it here**. An out-of-range tag is reported and dropped."_

The precondition is published and meetable — the tags are the author's own constants, bounded by a count they themselves declared. Gate closes. The stated rationale (_"a negative or fractional tag would alias a kernel action"_) is downstream reasoning that never gets asked.

**Disposition: delete, with the doc revised in the same change.** This is the clearest instance of the cross-cutting pattern in §5: the sentence publishes the precondition _and_ promises the guard, so the guard cannot be removed silently.

### 3.6 `spec/action-tags-invalid` — closed on obvious semantics

[`kernel/kernel.ts:2364-2370`](../../../src/kernel/kernel.ts) rejects a non-integer or negative `config.actionTags`. [`kernel/spec.d.ts:337`](../../../kernel/spec.d.ts) documents it as _"How many behavior action tags exist."_ A count of things that exist is a non-negative integer by the same obviousness that makes a duration finite — and this one is arguably more obvious, since the word _how many_ carries it.

Notably, the adjacent comment claims ownership for the `pointerdown` check only — _"One check, and it is the only one here the library owns (D-118)"_ — leaving this check with **no stated justification at all** in the source. **Delete.**

### 3.7 `spec/command-type-pointerdown` — closed, refusal already published

[`kernel/kernel.ts:2398-2404`](../../../src/kernel/kernel.ts). [`kernel/spec.d.ts:94-97`](../../../kernel/spec.d.ts) publishes: _"`arm()` validates it once… and **refuses one shape** — an entry colliding with the kernel's own pointer ingress (D-118)."_

A conforming author reading their own slot's documentation is told that `pointerdown` is refused. Findable and trivially meetable. The keep-argument is explicitly clause-(b) — _"That corrupted operation is the kernel's own state, which is what puts this check on the library's side of §1.1's whose invariant line"_ — and under the decisive form it never reaches that clause.

**Disposition: delete, doc revised in the same change.** D-118's ownership analysis was correct under the rule it was decided under and is preserved as history; it is superseded only in that (a) is now asked first and answers before it.

The same passage records four checks that already left this loop for correct reasons, including two on 2026-08-24 verified by construction. Those deletions are untouched — they fail (a) and (b) alike.

### 3.8 `home-not-finite` — delete the throw, keep the copy

[`free-drag/spec.ts:865-875`](../../../src/free-drag/spec.ts). Two distinct pieces of machinery sit in six lines and should not share a fate.

**The finiteness throw fails the gate.** `home` is a consumer slot returning a `Point`; the finiteness of a landing target is the same obvious semantic class as a finite coordinate, and nothing in the published free-drag surface admits a non-finite one. Unlike `moveTo` (§1.2) the precondition is _not_ published here — [`free-drag/config.d.ts`](../../../free-drag/config.d.ts) contains no finiteness statement — so this rests on obvious semantics alone. **Delete**, and see §2 for sequencing.

**The copy survives, on entirely separate grounds, and must not be deleted with it.**

```ts
const { x } = home;
const { y } = home;
```

The comment states the reason: _"the returned object is consumer-owned and its accessors may be live, so composing against it twice could read two different points."_ That is §1.1's explicit carve-out — _"do not normalize consumer data defensively **unless the library must take ownership of it**"_ — and the library must: it reads the point across a seam boundary and pins geometry with it. A live accessor is not consumer misuse at all; a getter-backed `Point` is a legitimate shape. **Keep.**

This is worth flagging because a mechanical sweep for `Number.isFinite` would take the copy out with the throw.

### 3.9 The insertion neighbour and range tests — unresolved on _meetability_

[`sortable/collection.ts:220-228`](../../../src/sortable/collection.ts). These read an `Insertion` that may have come from third-party axis code, since `InsertionGeometry.resolve` is published at the middle tier (D-61).

**The precondition is findable.** [`sortable/domain.d.ts:8-15`](../../../sortable/domain.d.ts) publishes: _"A proposed insertion gap in the **destination view** — the snapshot minus the dragged item. `before` and `after` are **real identity neighbours**, not just an index."_

**But it may not be meetable, and that is the finding.** `insertionAt` — the helper the library itself uses at every internal construction site, and which D-119 made the single construction owner — is exported from [`src/sortable/domain.ts:65`](../../../src/sortable/domain.ts) but is **absent from the published `.d.ts` surface** and from `sortable.d.ts`'s export list. A third-party axis author must therefore derive the destination view themselves, hand-build `{ version, index, before, after }`, and get the neighbour relation right unaided — while the library holds a tested constructor that does exactly this and does not hand it over.

§1.1 requires that a term be one an integrator can **meet**, not merely one they can read. A precondition whose only reliable satisfier is unexported is on the boundary of that requirement.

**Disposition: owner decision, with an obvious resolution.** Publishing `insertionAt` makes the precondition cheaply meetable, closes the gate, and lets both tests go. Keeping it private leaves a live argument for the neighbour test under clause (b) — this is genuinely the multi-party surface §1.1 says clause (b) exists for, since the fault leaves the tier that made it and lands on the _consumer's_ `{ from, to }`.

The two tests should still be considered separately: the range test (`index < 0 || index > destination.length`) guards array arithmetic and is not implied by the neighbour test, as [`collection.ts:197-200`](../../../src/sortable/collection.ts) already records.

---

## 4. What survives the gate

Reporting these matters as much as the deletions — the gate is not _delete every check_, and one of these is strengthened by it.

**`claim` / duplicate-contribution — keep, on better grounds than D-77 gave.** [`sortable/assemble.ts:40-50`](../../../src/sortable/assemble.ts), [`free-drag/assemble.ts:63-72`](../../../src/free-drag/assemble.ts).

This **passes (a) cleanly**, and the reason is structural: the colliding state arises when plugin A and plugin B each contribute the same single-writer slot. **Neither author violated anything.** Plugin A conforms; plugin B conforms; the _consumer_ composed them. No party can satisfy a "don't collide" precondition unilaterally, because no plugin author can know what else the consumer installed. A precondition that cannot be met by the party who would have to meet it is not a contract term at all.

With (a) passed, (b) is satisfied squarely: without the check the library's own slot record is silently overwritten and the second contribution wins by installation order. **Keep** — and this is a genuine (a)-pass, not a re-put.

**Platform-caused states, all passing (a) as "the platform did it":**

- [`realm.ts:25-26`](../../../src/kernel/realm.ts) `no-owning-window` — `document.defaultView` is legitimately `null` for a detached document.
- [`presentation.ts:456`](../../../src/kernel/presentation.ts) singular/non-finite determinant — derived from a real CSS transform; a singular matrix is a valid page state.
- [`presentation.ts:519-524`](../../../src/kernel/presentation.ts) `visual-no-box-space` — disconnected, fragmented or 3D-transformed subtrees are platform facts.
- [`pointer.ts:101-111`](../../../src/kernel/pointer.ts) guarded `releasePointerCapture` — the pointer genuinely may be gone; the platform throws.
- [`landing-runner.ts:174`](../../../src/shared/landing-runner.ts) `matchMedia?.` probing, and the `finished`-subscription rollback at 208-227.

**Library-owned state read back later**, §1.1's fourth correctness domain: the version and membership tests at [`collection.ts:207-214`](../../../src/sortable/collection.ts), the liveness barriers throughout both `spec.ts` files, and the `restored`/`held` idempotence latches.

**Correctly `__DEV__`-gated and therefore not a shipped-bytes question at all:** the whole verification apparatus in [`verified-refresh.ts`](../../../src/sortable/verified-refresh.ts), including the scan-disagreement throw at line 281. `frames.ts`'s `assert` helpers (250-322) are the exception — the comment states they are _"Unconditional, in every build."_ They assert **library-internal** invariants over the library's own frames, so they pass (a) trivially; whether they should be `__DEV__`-gated for size is a §1.3/§18 question this review does not decide, but it is worth putting to the owner, since `verified-refresh.ts` demonstrates the pattern is already available.

---

## 5. The cross-cutting finding: this package publishes its guards as contract

Six of the checks audited here are documented in the shipped `.d.ts` not merely as preconditions but as **promised runtime behaviour** — `moveTo` ("a non-finite coordinate discards the call"), `dispatch` ("bounds-checks it here… reported and dropped"), `command.types` ("refuses one shape"), and others.

This is a genuinely good documentation habit and it has a consequence the size doctrine does not anticipate: **for this package, deleting a guard is frequently a documented-behaviour change rather than an internal one.** §1.1's machinery assumes the contract states preconditions and the runtime silently trusts them; here the contract often states both halves.

Two things follow, and both are recommendations to the owner rather than findings against the code:

1. **No deletion in §1–3 should be scheduled as a pure size change.** Each carries a doc edit, and the doc edit is the part a consumer notices.
2. **The house style is worth making explicit.** `box` and (after §1.1) `items` show the alternative: publish the boundary, state that nothing detects a violation, ship no guard. That form is fully compatible with the gate and preserves the diagnostic value the current sentences carry, at zero runtime cost. Adopting it deliberately would prevent the next audit from re-litigating the same six sentences.

---

## 6. Supersessions recorded

Per §1.1's practice of leaving superseded reasoning standing rather than rewriting it. In every case below the earlier reasoning was sound under the rule it was decided under.

- **D-120 §4(c)** — its rejection of an unchecked precondition is superseded as a _route_; the verdict now turns on the contract question in §1.1 above. §§1, 3, 4(b) stand.
- **D-91** (`moveTo`) — the state-corruption rationale is superseded by a closed gate; the precondition it relies on turns out to be published, which settles it earlier than the argument does.
- **D-77 / D-79** (landing `Infinity`) — the settlement-gate rationale is superseded as a _justification_. The measurement work in [`animate-duration-domain.md`](../../measurements/animate-duration-domain.md) is untouched and remains the reason the surrounding domain test was correctly narrowed.
- **D-118** (`command-type-pointerdown`) — ownership analysis correct, now reached only after a gate that closes first.
- **§1.1's own re-put of the three frame checks** — answered here: two fail (a) (§3.2, §3.3), one is genuinely open (§3.4).
- **[`contract/07-free-drag-contract.md:167`](../../contract/07-free-drag-contract.md)** — which put the `moveTo`/duration contract question and deferred it to "the audit that reads it" — is discharged by §1.2 and §1.3.

---

## 7. What would falsify this

- **§1.1 above turns on a negative search.** If a published statement of item distinctness exists somewhere I did not treat as published — generated API documentation from `docs:api:build`, a consumer-facing guide outside this package — the gate closes and D-120 becomes a deletion candidate rather than a contract question. The search covered every shipped `.d.ts` and `README.md`.
- **§3.4 rests on a judgement that a symbol-keyed frame part is a natural thing for a conforming behavior author to write.** An owner who considers frame parts obviously string-keyed records closes that gate immediately.
- **§3.9 rests on `insertionAt` being unexported.** I read the published `.d.ts` surface and `sortable.d.ts`'s export list; if it reaches axis authors by a route I missed, the meetability objection dissolves and both tests become deletion candidates.
- **§2's coupling was traced by reading, not executed.** The path from `moveTo` → `offsetX` → `rendered` → `LandingContext.from` → `distance` is stated across three files and I did not build a fixture that drives a non-finite coordinate all the way to a hung gate. Before acting on §1.2 and §1.3 together, that fixture is worth writing — §1.1 asks for exactly that, and the compounding case is the one place in this audit where being wrong is expensive.