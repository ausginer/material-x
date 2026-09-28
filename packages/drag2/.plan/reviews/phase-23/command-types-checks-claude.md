# The two surviving `command.types` checks, evaluated

**Owner question carried over from the 2026-08-22 clean set**, which deleted two checks from `arm()`'s `command.types` loop and kept two because that brief did not authorize deciding their semantics. Evaluated here against `CODE_OF_SIZE.md` §1.1, §1.2 and §12.

**No production change is made.** The tree was ablated, measured, and restored byte-identical; the full suite is green on the restored tree.

---

## 0. Answer

|  | check | protects a library invariant? | joint cost | recommendation |
| --- | --- | --- | --- | --- |
| **A** | `types.length === 0` | **No.** The rejected configuration is _observationally identical_ to a supported one |  | **Delete.** §1.1 and §1.2 agree |
| **B** | `type === ''` | **No.** Author's own feature, library state untouched |  | **Delete**, and the residual argument for keeping it is §12, not size |
|  | both, together |  | **−128 B minified, −15…−33 B Brotli** on every kernel-bearing row |  |

**Neither protects a library-owned invariant.** Verified by construction rather than argued: both rejected shapes were built and run against the real kernel with the checks removed, and in both cases the library's own state is untouched and the cost falls entirely on the author's own feature. The third check in the same loop — `spec/command-type-pointerdown` — _is_ the library's, and it is unaffected by either deletion.

---

## 1. Method

`CODE_OF_SIZE.md` §1.1 asks for this in as many words: _"A check's justification is a claim about what happens without it, and that claim is executable: construct the shape the check rejects, let the code take it, and look at what the library actually ends up holding."_ So the checks were removed from [`kernel.ts`](../../src/kernel/kernel.ts) and the rejected shapes were armed against the real kernel in Chromium, rather than reasoned about.

Five experiments: the platform's behaviour for an empty event type (E1); each rejected shape end-to-end (E2, E3); the whole suite under the ablation (E4); and the joint size cost (E5). Temporary probes, deleted afterwards.

---

## 2. E1 — what the platform does with an empty event type

Four assertions, no library code involved:

|  | result |
| --- | --- |
| `addEventListener('', fn)` | **does not throw** |
| `dispatchEvent(new Event(''))` | **fires the listener** |
| `click`, a `CustomEvent`, dispatched at the same node | **does not fire it** |
| `''` beside `'pointerdown'` | **stays distinct**, both fire independently |
| removal through an `AbortSignal` | **works normally** |

So the empty string is an ordinary, distinct, well-behaved event type. It is not a platform error, it is not a wildcard, and it does not collide with anything. **Whatever check B is protecting, it is not the DOM.**

---

## 3. E2 — `command.types: []` with the check removed

Four assertions against a real armed controller:

- the controller **constructs**, no throw;
- **no discrete listener is bound** — neither `Event('')` nor a `CustomEvent` reaches `command.admit`;
- the **pointer ingress is fully intact** — press and threshold crossing produce `admit` then `activation.effect`;
- and the decisive one: the call sequence is **identical to a behavior that declares no `command` member at all**, asserted directly by building both and comparing.

That last assertion is the whole finding. Contract 02 §`CommandAdmission` already blesses the no-command case — _"A behavior that omits it binds no discrete listener at all, and `arm()` binds `pointerdown` and nothing else"_ — so **check A rejects a configuration the library already supports under a different spelling.** Nothing is corrupted, nothing is retained, no listener is bound to an unexpected type. The author declared a member and asked it to bind nothing; they get nothing.

---

## 4. E3 — `command.types: ['']` with the check removed

Five assertions:

- the controller **constructs**;
- a listener for `''` is **bound and works** — `command.admit` fires on `dispatchEvent(new Event(''))`;
- it **intercepts no ordinary event** — a `CustomEvent` and a `click` at the same node reach nothing;
- `types: ['', 'pointerdown']` **still throws `drag: spec/command-type-pointerdown`**, so the surviving check is independent of this one and is not weakened by removing it;
- the **pointer ingress is intact**.

So an empty entry produces a live listener for an event nobody dispatches. The author's discrete ingress is dead; the kernel's is not, its state is not touched, and its own collision rule still holds.

---

## 5. Whose invariant — the §1.1 test applied

§1.1's discriminator is _"Ask whose invariant, not whose mistake… A check that stops a third party from silently overwriting the library's own state is the library's, however plainly the third party caused it — and a check that costs that third party only their own field is theirs, however severe the message makes it sound."_

**Both checks fall on the author's side, and the third check in the same loop does not.** That contrast is the clearest evidence available, because all three sit in one loop over one array and only one of them survives the test:

| check | what goes wrong without it | whose state |
| --- | --- | --- |
| `types.length === 0` | the author's discrete ingress binds nothing — the supported no-command configuration | **author's** |
| `type === ''` | the author's discrete ingress binds a listener nothing dispatches | **author's** |
| `type === POINTER_DOWN` | **two admission members run for one `pointerdown`**, and the second finds the first's operation already committed — the kernel's own operation state, corrupted silently and only sometimes | **library's** |

The third is the model of a justified runtime check, and it explains why the other two read as though they belong: they are neighbours in the same loop, validating the same array, with the same shape. Proximity is not provenance.

**Neither is the `onError` case either.** §1.1 prefers the normal error path to a synchronous `throw`, but these fire inside `arm()`, before any operation exists, so there is nothing to classify — which is why the question is deletion rather than reclassification.

---

## 6. §1.2 — one of the two is a compile error, and this was tested

§1.2: _"If a constraint can be made impossible or visible at compile time, prefer that over a runtime check… Do not pay runtime bytes to enforce a rule the compiler can already enforce."_ Its example list includes _impossible combinations of public configuration_.

**Check A is expressible.** Changing `CommandAdmission.types` in [`spec.ts`](../../src/kernel/spec.ts) from `readonly string[]` to `readonly [string, ...(readonly string[])]` and typechecking:

```
tests/…(4,3): error TS2322: Type '[]' is not assignable to
              type 'readonly [string, ...string[]]'.
```

and **`src/` still compiles unchanged** — `sortable/spec.ts`'s `types: [KEY_DOWN]` satisfies the tuple. So the empty array can be made a compile error at zero runtime cost.

**It is not free, and the cost is real rather than theoretical.** A call site that builds `types` from a `readonly string[]` _variable_ stops compiling, and one exists today: `tests/kernel/kernel.browser.test.ts:783`, which is the table-driven case list that tests these very checks. A third-party author computing event types dynamically would meet the same wall and have to assert or tuple-type at the call site. That is a §12 question — _do not make a common use case more awkward to save a small amount in the implementation_ — and it is the owner's, not this record's.

**Check B is not expressible.** `string` admits `''` and no non-generic type excludes it; a `types` parameter generic over its literal elements could, at a cost in signature complexity that §12 governs. So §1.2 reaches check A and stops.

---

## 7. E4 — what the suite says

With both checks removed, the full suite reports **exactly one real failure**: `tests/kernel/kernel.browser.test.ts:757` › _should reject an invalid command.types at arm_, a three-case table whose third case — the `pointerdown` collision — still passes. Nothing else in 1,268 tests depends on either check.

**One further failure appeared and is not caused by the ablation.** `tests/perf/m5.browser.test.ts:620` › _M-5 arm A — falsifying the instrument_ failed once under the ablated tree. It is a timing instrument with a calibration warm-up and ratio thresholds, and the structural argument is decisive rather than statistical: **free drag declares no `command` member** (07 §What free drag does not have), that test stages `withArm('free', …)`, so `next.command !== undefined` is false and **neither removed branch is evaluated on any path the test reaches**. Corroborated by running it: the whole `m5` file passes on both trees, and the isolated `-t` invocation fails **6 out of 6 on the clean tree**, so that configuration is broken independently of anything here. Recorded rather than waved away, because a perf failure appearing beside an ablation is exactly the coincidence that gets mis-attributed.

---

## 8. E5 — the joint size cost

Measured on the current baseline, both checks removed together, one build:

| composition | minified | Δ | brotli | Δ | slack now → after |
| --- | --: | --: | --: | --: | --: |
| minimal | 32,461 | **−128** | 10,710 | **−30** | 146 → 176 |
| minimal (xy) | 31,266 | −128 | 10,369 | −22 | 145 → 167 |
| minimal + layoutAnimation | 33,863 | −128 | 11,150 | −15 | 152 → 167 |
| minimal + landing | 33,191 | −128 | 10,993 | −33 | 136 → 169 |
| complete | 34,593 | −128 | 11,408 | −16 | 147 → 163 |
| free drag minimal | 24,646 | −128 | 8,463 | −20 | 155 → 175 |
| free drag + bounds | 25,117 | −128 | 8,620 | −23 | 147 → 170 |
| free drag + landing | 25,378 | −128 | 8,749 | −18 | 149 → 167 |
| free drag complete | 25,849 | −128 | 8,903 | −21 | 149 → 170 |
| both behaviors | 41,367 | −128 | 12,932 | −21 | 136 → 157 |
| vocabulary root - drag.js | 184 | **0** | 121 | **0** | 29 → 29 |
| kernel root - kernel.js | 17,758 | −128 | 6,336 | −22 | 146 → 168 |
| baseline A | 33,671 | −128 | 11,143 | −27 | 149 → 176 |
| baseline B - shipped | 22,573 | **0** | 6,889 | **0** | 151 → 151 |

**−128 B minified, flat**, on every composition that carries `kernel/kernel.js` — two `if` blocks and two identity strings in one module, and the figure is the same everywhere because the module is. **−15 to −33 B after Brotli**, which is the honest number and is small: two short identities sharing a prefix with thirty-seven neighbours compress well, which is the same effect that made the D-117 joint measurement beat its parts.

`drag.js` and baseline B do not move, correctly — neither reaches `kernel/kernel.js`.

**This is not a size case.** Twenty to thirty Brotli bytes is inside the noise band this phase has already demonstrated twice, and no budget would move. **The argument for deleting these is §1.1 and §1.2; the measurement is here so the decision is not taken on a guess about what they cost.** If they were worth 300 B the answer would be the same, and if they were worth 3 B it would also be the same.

---

## 9. Recommendation

**Check A — `types.length === 0` — delete.** Three independent reasons agree, which is unusual:

1. **§1.1**: the rejected shape is observationally identical to a configuration the contract explicitly supports. The library's state is not merely uncorrupted, it is the same state.
2. **§1.2**: the compiler can express it, tested, at zero runtime cost and with `src/` unchanged.
3. The failure it prevents is the author's own inert feature.

Whether to _also_ add the non-empty tuple type is a separate and genuinely open call: it costs nothing at runtime and it makes dynamically-built `types` awkward. §12 governs that half, and it should be decided as an API question rather than folded into a deletion.

**Check B — `type === ''` — delete, with the counter-argument stated rather than buried.**

The case against deleting is real and it is not about bytes: without it, an author whose `types` computation yields `''` — `[config.event ?? '']` is the plausible accident — gets a **silent** dead listener rather than a construction-time throw. §1.1's list says _do not add checks for unsupported use that would naturally fail through the library's existing lifecycle/error path_, and this one does **not** naturally fail: it succeeds and does nothing, which is the worst shape a failure can take.

**But that is a nannying benefit, and §1.1 declines nannying benefits by name.** The state that goes wrong is the author's feature; the library's is untouched, its ingress works, and its one real collision rule still fires. The rule as written says delete. What survives is a §12 argument — that an authoring API owes its authors an eager failure on a value that can only be a mistake — and §12 is about not making consumers pay for the _implementation's_ convenience, which is not this. **The owner's call, and the honest framing is that this one is a judgment where check A is not.**

**Do not delete the third.** `spec/command-type-pointerdown` protects the kernel's own operation state and is the reason the loop exists at all. Deleting A and B leaves the loop with one check, which is the right shape: one array-level constraint that the type system could take, and one element-level constraint that the library genuinely owns.

---

## 10. Restoration

`src/` was restored from a pre-experiment copy and verified identical; the package was rebuilt and the full measurement table diffed **byte-identical** against the baseline taken before the first ablation. The full suite passes on the restored tree, twice: **59 files, 1,152 passed, 116 skipped, no type errors.** Every temporary probe and script was deleted.

## 11. Limits

- **One engine.** E1's platform facts are Chromium's. `addEventListener('')` is specified behaviour rather than a quirk — the DOM standard treats the type as an ordinary string — but only one engine was run, which is O-4 again.
- **The tuple experiment was typechecked, not landed.** It compiles against `src/` today; a `types` value assembled at runtime by a third party is not represented in this repository beyond the one test call site.
- **No reachability claim was made about the third check.** It is left alone and its justification is taken from its own comment and from contract 02, not re-derived.
- The Brotli figures are a joint measurement of the two checks together and must not be split between them.

---

LSP plugin - available; not used: the question is behavioural and dimensional — four browser experiments against a temporarily ablated kernel, a typecheck of a proposed tuple type, and two builds of the size harness — and the only symbol lookups needed (`command.types` producers, free drag's absent `command` member) were single-token greps over two files.