# The re-entry identity withdrawal, reviewed at `529c0098`

Review, 2026-08-28. Read, compiled, driven, falsified and measured at `529c0098`. The owner decision is taken as settled: the invariant, the guard, the latch, the panic route and the consumer-facing outcome are not reopened. **No production code changed** — six temporary edits were made as falsifiers and each was reverted in the same command; the working tree is clean apart from the pre-existing untracked `analysis.json`, `graph.txt` and `tst.md`.

**Verdict: the four constraints hold, and the machinery is untouched in the way the record claims.** Refusal still lands before any mutation; the latch and not the raised value is the whole of the decision, so swallowing the sentinel cannot suppress the unwind; classification is still bypassed; the consumer still meets `stage === null` / `drag: controller destroyed`; and the identity is gone from message, description, docs, tests and every wrapper on the path. Three findings, **all tier C**, none of them a correctness defect in the transport.

---

## 0. What was checked, and how

| Ask | Result |
| --- | --- |
| Refusal precedes `begin()` and every phase mutation | **Clean** — §1 |
| Catching the sentinel cannot suppress the panic | **Clean, falsified** — §2 |
| Sentinel cannot collapse into `FAILED` | **Correct today; unpinned** — **F-164** — §3 |
| An ordinary behavior throw cannot be mistaken for it | **Clean, proved empirically** — §4 |
| Re-entry bypasses `context.fail` / stage classification | **Clean, falsified** — §5 |
| Panic gets the sentinel as cause; generic `stage === null` message | **Clean, and the composition is covered** — §6 |
| No `re-entered` / `drag: seam/…` survives anywhere | **Clean**; one consequence on `cause` — **F-166** — §7 |
| Non-`Error` throw confined; lint suppressions narrow | **Clean, both load-bearing** — §8 |
| F-85 / D-152 records distinguish mechanism from decision | **Clean, and precisely** — §9 |
| Tests discriminating, incl. the swallow and panic rows | **Clean, 14/14 under falsifier** — §10 |
| Size attribution | **F-165** on two rows; the rest reproduces to the byte — §11 |
| Suite | 65 files, **1195 passed**, 116 skipped, **no type errors**; typecheck exit 0 |
| Lint | the same 3 errors in `tests/kernel/lifetimes.node.test.ts`, **pre-existing** at `25084a9c` |

---

## 1. Refusal still lands before anything moves

Unchanged and still first in both openers.

- [`runCore`](../../../src/kernel/seams.ts#L432-L448) calls `refuseReentry()` as its **first statement** — ahead of the `staged`-unconsumed notify, ahead of `staged = null`, ahead of `context.begin()`. The comment naming why is intact.
- [`runPhase`](../../../src/kernel/seams.ts#L368-L372) calls it ahead of `failureRequested = false` and `openStage = stage`, so a refused nested phase does not clear the outer phase's latch flag or reassign the open stage.

`refuseReentry` itself is two statements — set the boolean, throw — with no allocation between them. The pre-`begin()` position is pinned by _should refuse the nested transaction before it rebuilds the draft_, which asserts the outer draft survives; it fails under the §2 falsifier.

## 2. Swallowing the sentinel cannot suppress the unwind

The mechanism is that the driver never consults what was raised. [`runPhase`](../../../src/kernel/seams.ts#L386-L395) reads `reentry`, a boolean the nested `refuseReentry` set, and rethrows on it **before** the `value === FAILED` arm — so a `prepare` that catches the throw and returns a perfectly good `{ staged: 1 }` unwinds identically to one that lets it pass. That is exactly what _should panic even when the callback swallows the refusal_ drives.

**Falsified.** Deleting the seven-line `if (reentry)` block leaves the suite at **14 failed / 72 passed** in `seams.node.test.ts` — every re-entry row, the swallow row included. The latch is load-bearing and the tests hold it.

The ordering the module's own doc calls the contract — _refuse, then close, then panic, then classify_ — is intact: `openStage = NO_STAGE` precedes the `reentry` check, which precedes the classification arms.

## 3. The sentinel and `FAILED` — correct, and **unpinned** (F-164)

`FAILED` and `REENTERED` are distinct `Symbol()` values, so no comparison can confuse them, and `REENTERED` is never returned into a value position — the only site that produces it is a `throw`, and every path that carries it rethrows before `value === FAILED` is evaluated.

**But nothing holds them apart.** Replacing the declaration with `const REENTERED = FAILED;` — one token — leaves `seams.node.test.ts` at **86 passed / 0 failed**. The property the neighbouring JSDoc states for `FAILED` (_"distinguishable from every legal `Prepared`, `null` and leaf value"_) is asserted for neither symbol now that there are two.

**I could not turn the collapse into a live defect, and say so plainly.** The consequence class is real — a collapsed sentinel returned from a `void` leaf would make `runLeaf` report a failure that never happened, and returned from a `prepare` would produce `SEAM_PREPARE_FAILED` with **no** `context.fail` at all — but the value is only obtainable by re-entering, which unwinds the capturing phase and panics the controller, and `spec.retire` runs through `unwind` rather than through the driver. So a captured sentinel has no later phase to be returned into. This is a pinning gap, not a bug.

## 4. An ordinary throw cannot be mistaken for the sentinel

Proved rather than argued. Driving the real driver with a behavior that throws a **description-less `Symbol()`** — indistinguishable from `REENTERED` to any observer outside the module:

```
outcome 2          // SEAM_PREPARE_FAILED
escaped: NONE      // nothing left runCore
failures: [ [ 9, 'Symbol()', true ] ]   // context.fail(stage, thatVerySymbol)
notes: 0
```

Classified normally, at the seam's own stage, with the raised value carried by identity. The driver's decision is the latch and only the latch, which is what makes the sentinel's _value_ uninteresting in both directions.

## 5. Classification is still bypassed

`if (reentry) { … throw }` sits above all three classification arms, so `context.fail`, the `UNCLASSIFIED` warning and the `failed-then-threw` warning are all unreachable on the re-entry path. Four rows assert `harness.failures).toHaveLength(0)` alongside the escape, and all four fail under the §2 falsifier.

Nothing between the driver and `drain` launders it either. I checked every `catch` in `kernel/kernel.ts` that could sit on the path: `arm()`'s rethrows; the landing-runner-destroy catch and both thenable catches wrap consumer calls with no `driver.` call inside; `acquireActivation`'s catch — the one that _would_ launder it into `failOperation(FAILURE_ACTIVATION, …)` — makes no driver call at all, so no phase can be open within it. `handleBehaviorAction`, `openSettlement` and `reportFailure` use `try`/`finally` with no `catch`. And **no** `catch` body in `src/` reads `.message`, interpolates the caught value or tests `instanceof`, so changing the raised value from an `Error` to a symbol cannot alter any handler's behavior.

## 6. Panic, cause and the generic message

[`panic`](../../../src/kernel/kernel.ts#L699-L702) is `void destroy(); notify(new DraggableError(null, error), true);` — the `true` being `notify`'s single named `afterClose` exception, which is what lets the report survive the destroy that precedes it. The constructor's fallthrough at [errors.ts:50-55](../../../src/kernel/errors.ts#L50-L55) is `cause instanceof Error ? cause.message : stage === null ? 'drag: controller destroyed' : …`, so a symbol cause takes the `null`-stage arm.

**The composed test is a reproduction, and I checked whether that leaves a gap. It does not**, because the composition is covered by a conjunction of three driven assertions:

| Half | Where it is actually driven |
| --- | --- |
| the driver throws a description-less symbol | `seams.node.test.ts` — the thirteen escape rows |
| `panic` hands the raised value to `DraggableError(null, …)` **unchanged** | `kernel.browser.test.ts` — _should close, report and only then tear down on a panic_ asserts `cause).toBe(broken)` by identity and `stage).toBeNull()` |
| `DraggableError(null, non-Error)` mints `drag: controller destroyed` | `errors.node.test.ts` — _should say the controller is destroyed when there is no stage_ |

`panic` does not inspect the value, so no fourth assertion is missing. The row's own justification for composing rather than driving — that an SPI-reachable re-entry test would assert a reachability F-85 disproved — is sound and worth keeping.

## 7. The identity is gone — and one consequence lands on `cause` (F-166)

`'drag: seam/re-entered'` appears in **no** `.ts` under `src/`, in no emitted `.d.ts`, and in no test assertion. The only surviving occurrences of the phrase are the English word in a comment (_"Set when a seam is re-entered"_), the test helper's own history note, and the forbidding regex at [seams.node.test.ts:1162](../../../tests/kernel/seams.node.test.ts#L1162). The symbol has no description, so nothing leaks through `String()`, and no wrapper on the path adds one (§5).

**What did change and is not recorded**: `cause` now carries a `symbol` on this path. It is the one primitive value that refuses string conversion —

```
`${err.cause}`   → TypeError: Cannot convert a Symbol value to a string
'c: ' + err.cause → TypeError
String(err.cause) → 'Symbol()'
JSON.stringify    → dropped
```

A consumer's `onError` doing ``console.error(`${e.message} — ${e.cause}`)`` therefore throws, and `notify`'s terminus swallows that throw — so the report vanishes silently, on the one fault whose whole content is _the controller is gone_. This is P2-gated by F-85 and the record already says nothing may branch on `cause`, which is why it is tier C and not more; it is recorded because the plan entry calls the consumer-facing fault _"unchanged and slightly truer"_ and it is not quite unchanged. **No remedy is proposed** — the ask was not to redesign the sentinel, and the trade is the owner's.

## 8. The non-`Error` throw is confined, and both suppressions earn their place

`throw REENTERED` is the **only** non-`Error` throw in `src/`: every other `throw` is a fresh `Error`/`TypeError` with an identity, a bare rethrow of a caught value, or `throw input.error` re-raising a consumer's own rejection.

Both suppressions are `oxlint-disable-next-line typescript/only-throw-error` — one rule, one line, no file- or block-scoped form, each sitting directly above its `throw` with a one-sentence reason. **Both are load-bearing**: deleting them yields exactly two errors and nothing else —

```
src/kernel/seams.ts:350:13: error typescript(only-throw-error): Expected an error object to be thrown.
src/kernel/seams.ts:393:13: error typescript(only-throw-error): Expected an error object to be thrown.
```

They are also the only `only-throw-error` suppressions in the package; the five other `oxlint-disable` comments in `src/` are unrelated rules.

## 9. The records separate the defeated mechanism from the standing decisions

This is the half most likely to have been fudged, and it was not.

- **D-152's row** now carries `~~And mechanically you cannot throw nothing~~` struck, with the reason stated — _the premise was `Error`-shaped_ — and, crucially, the scope preserved: _"The decline stands for the eight sites it was taken over, none of which is a controller panic and each of which must still say which condition fired; what is corrected is the claim that the mechanism made blanking impossible."_ That is exactly right: the eight sites are operation-scoped, so `stage !== null` and the constructor's fallthrough would give them `drag: failure at stage N` — a number, not an identity. The semantic decision is untouched and only the impossibility claim falls.
- **F-85's row** records the withdrawal _on its own finding_, and notes what the thirteen assertions were over-asserting — _"matching the message additionally asserted that the refusal announced itself, and that was the half being withdrawn."_
- **Contract 05** places the new paragraph immediately above §_The floor is an identity, not silence_ and argues the floor from the constructor's actual behavior rather than around it, then fences the licence: _"available only where something else already says what happened … not a licence to blank P2 sites generally."_
- **`plan.md`'s** §_The suite conceded the point_ was amended in place rather than rewritten, so the 2026-08-23 statement and its 2026-08-28 supersession are both readable.

I found no claim in these four that the code does not support.

## 10. The tests

`expectReentryPanic` asserts three things — something was thrown, it is a `symbol`, and `String(it) === 'Symbol()'` — and the `NOTHING_THROWN` sentinel separates _nothing thrown_ from _something falsy thrown_. The helper's own doc argues correctly that a bare `.toThrow()` would pass for the very escape the latch exists to prevent.

Falsified three ways, each reverted:

| Regression | Result |
| --- | --- |
| delete the `if (reentry)` unwind | **14 failed** — every re-entry row, swallow row included |
| `refuseReentry` throws a slugged `Error` again | **14 failed** — the identity row on `message`, the rest on `typeof` |
| the description grows back: `Symbol('drag: seam/re-entered')` | **14 failed** — `String()` and the forbidding regex both catch it |
| `const REENTERED = FAILED` | **86 passed** — **F-164** |

The identity row is the strongest of the four: it is the one that fails on `report.message` when the slug returns, because the constructor would adopt it.

## 11. Size

Measured through the instrument's own `measureAll` at `529c0098` against `1697d31a` built in a clean worktree. **The baseline repair from `450b7e68` holds** — a fresh worktree builds and measures with no stale artifact, which closes F-157's witness.

Everything the record states reproduces to the byte except two range endpoints:

| Claim | Measured |
| --- | --- |
| minified falls **27–30 B** on every row | −28 ×5 sortable, −30/−30/−30/−29 free drag, −27 `both behaviors`, −29 baseline A ✓ |
| `kernel.js` 16,869 → **16,839** min, 6,064 → **6,057** brotli | exact ✓ |
| `drag.js` and baseline B byte-identical | 252/142 and 22,573/6,889 ✓ |
| premium **216 B, 2.04 %** | 10,600 − 10,384 = 216; 2.038 % ✓ (prior row's 211 B also reproduces) |
| brotli: `complete` **+10**, `both behaviors` **−1** | +10 and −1 ✓ |
| brotli: the sortable rows **+3 to +10** | +9, **0**, +10, +3 — `minimal (xy)` is outside it |
| brotli: the free-drag rows **0 to −10** | 0, −8, −10, **+2** — `free drag complete` is outside it, and the wrong sign |

**The qualitative attribution is sound and I am not filing the brotli rise.** A −28/−30 B minified fall per row is what removing one `new Error(…)` construction plus a 22-character literal predicts; `kernel.js` falls **both** ways because the string lived there and that bundle carries far fewer sibling identities to feed a dictionary; and the composed rows rise because the withdrawn literal shared `drag: ` and its word fragments with ~40 siblings. The record already frames this as D-117's own measurement effect run backwards, states it _"recorded rather than netted off"_, and explicitly claims no size benefit. That is the right treatment.

---

## 12. Findings

- **F-164** (tier C) — _The two module-private sentinels are held apart by nothing._ `const REENTERED = FAILED;` — a one-token edit — leaves `tests/kernel/seams.node.test.ts` green at 86/86. The separation is what makes `runPhase`'s `value === FAILED` arm mean _this phase failed_ rather than _this phase re-entered_, and it is the property the sibling JSDoc claims for `FAILED`. **Correct today and I could not construct an exploit** — the sentinel is only obtainable by re-entering, which unwinds the capturing phase and destroys the controller, and `spec.retire` runs through `unwind` rather than the driver — so this is an unasserted invariant rather than a defect. Falsifier: the edit above. §3.
- **F-165** (tier C) — _A stated delta range excludes two of its own rows, one commit after the same class was closed._ [bundle-structure.md:222](../../../.plan/bundle-structure.md#L222) gives the sortable rows as **+3 to +10** brotli; `minimal (xy)` moves **0** (9,573 → 9,573). It gives the free-drag rows as **0 to −10**; `free drag complete` moves **+2** (8,150 → 8,152), outside the range and opposite in sign. Every other figure in that paragraph reproduces exactly. This is [F-161](../../../.plan/contract/00-index.md#L742)'s shape, recorded closed on 2026-08-28. §11.
- **F-166** (tier C) — _The withdrawn identity is replaced on a public field by the one value that cannot be interpolated._ `DraggableError.cause` now carries a `symbol` on the panic path, and both ``​`${err.cause}`​`` and `'x' + err.cause` throw `TypeError: Cannot convert a Symbol value to a string`; `notify`'s terminus then swallows that throw, so a consumer whose `onError` logs with a template literal loses the report entirely — on the one fault that means _the controller is gone_. P2-gated by F-85 and covered in principle by _nothing may branch on `cause`_, which is why it is tier C; recorded because [`plan.md`](../../../.plan/plan.md#L2050) calls the consumer-facing fault _"unchanged and slightly truer"_ and the `cause` half is not unchanged. Witness: `node -e "const e=new Error('x',{cause:Symbol()}); \`\${e.cause}\`"`. **No remedy proposed.** §7.

**Not findings, recorded so the reasoning is visible.** The composed panic witness is a reproduction of `panic`'s body, but the composition is covered by three driven assertions and `panic` does not inspect the value (§6). `REENTERED` being one per module rather than one per driver is immaterial: no frame ever compares the raised value, so a per-driver symbol would discriminate no better. The three `oxlint` errors in `tests/kernel/lifetimes.node.test.ts` reproduce at `25084a9c`. An untracked `tst.md` sits at the package root; it is not part of this commit and I left it alone.

---

## 13. What would falsify this

- **§2 and §5** — find a path where `reentry` is `true` and `runPhase` returns normally, or where the re-entry rethrow reaches a `catch` that classifies it. I claim `acquireActivation`'s catch is the only classifying catch that could, and that it opens no phase; a `driver.` call added inside that `try` would make the claim false.
- **§4** — the probe is nine lines against `src/kernel/seams.ts` directly and reruns in a minute; a `context.fail` that did not receive the raised symbol by identity would refute it.
- **F-164** — apply the edit and run the suite. A red row refutes the finding; 86/86 confirms it.
- **F-166** — the one-line `node -e` above.
- **§11** — `git worktree add` at `1697d31a`, `npx just build`, `node bench/size/measure.ts`, and diff the two tables.