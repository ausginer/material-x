# Step-queue model

**A model for the owner's inspection, not a decision.** Nothing here is adopted. No `D-*` is minted, and the contract and `00-index.md` are unchanged.

**Base:** `25a67d4a9` on `drag/feature-composition`. **Branch:** `drag/step-queue-model`, with two commits:

- `454d7412d`: **inline pairs.** Receiver-aware `requestStep`, with each step and its receiver stored in two adjacent slots of `Gesture`'s own array.
- `72ae8d715`: **the queue model.** It moves that storage into [`src/kernel/step-queue.ts`](../src/kernel/step-queue.ts), a `StepQueue` with `waiting`, `add`, `runFirst` and `clear`. `git diff 454d7412d 72ae8d715` is the queue object alone.

**Governing records:** `DRD-6`, `DRD-32` and `DRD-34` in [`00-index.md`](00-index.md), and DRI-8 and DRI-17 in [`contract.md`](contract.md). `DRD-34` left "receiver support for `requestStep`" out of scope, and this model only explores it.

## 1. What the model does

- **The call.** `drag.requestStep(this.#method, this)` and `controller.requestStep(method, receiver)` work without a binding function. The representative site is `SortableBehavior`. `#invalidateGeometry` was an arrow field and is now a private method. The scroll and resize listener requests it with `this` ([`src/sortable/behavior.ts`](../src/sortable/behavior.ts)).
- **The signature,** on `Drag` and `DraggableController`, has two overloads:
  - `requestStep(step: (this: undefined, operation) => void)`
  - `requestStep<Receiver>(step: (this: Receiver, operation) => void, receiver: Receiver)`

  `this: undefined` replaces `this: void`, because oxlint's `no-invalid-void-type` refuses `void` there.

- **Pair identity.** A request is coalesced only if the same step is already waiting with the same receiver. So one method requested for two objects runs once for each, and a step requested with no receiver is a different pair from the same step requested with one.
- **Requeueing.** A pair is taken off the queue before its step runs, as at the base, so a step that requests itself runs again. It is added at the end.
- **Gesture keeps control.** The queue never runs anything on its own. The reader asks `waiting`, then calls `runFirst` in the base's precedence position: after destruction, before the decision and the next step. Destruction calls `clear`.
- **The immediate path.** A step requested while idle still enters the pass directly as `enter(step, target, receiver)`. It never touches the queue. `enter`'s receiver overload drops `R extends object`, because a receiver-free step passes `undefined`.
- **Operation scope.** The `Drag`'s `requestStep` forwards the receiver behind the same `ENDED` check as before.
- **No change** to `use`, to the built-ins' controllers, to `freeDrag`, or to any other receiver-free call site.

## 2. Checks

At `72ae8d715`, in the worktree:

- **`npx just typecheck` passes.**
- **`npx just lint` passes** on the seven changed or added `.ts` files.
- **`npx just test` in Chromium:** 365 passed and 5 failed. Every failure is a size row in `size.node.test.ts`, as §3 explains. At `454d7412d`: 365 passed and 3 failed, all size rows.
- **The focused checks:**
  - [`tests/step-queue.browser.test.ts`](../tests/step-queue.browser.test.ts) checks pair identity across instances, the receiver-free step kept apart, an idle step's receiver, requeueing and coalescing during a run, precedence over a decision and under destruction, operation scope and faults. Its first two tests check the queue alone.
  - [`tests/step-queue.declaration.test.ts`](../tests/step-queue.declaration.test.ts) checks the typing and the lint in §4.
- **The per-sample allocation test passes** (`hot-path.browser.test.ts`, in the shipped project).

**Mutations** ([`mutations.txt`](probes/step-queue/mutations.txt)). Each was applied alone to `72ae8d715` and then restored. All eight typecheck.

| Mutation | Caught by |
| --- | --- |
| Q1. Coalesce by step only | 3 step-queue tests |
| Q2. No coalescing | 4 step-queue tests and both DRI-8 coalescing tests |
| Q3. `runFirst` drops the receiver | 5 step-queue tests |
| Q4. An idle request drops the receiver | 3 step-queue tests and `sortable` › "should re-measure on scroll during a drag" |
| Q5. `Drag.requestStep` drops the receiver | 5 step-queue tests and the same `sortable` test |
| Q6. The `sortable` site passes no receiver | **Only** the same `sortable` test, at runtime |
| Q7. Teardown does not `clear` | **Nothing.** After teardown nothing reads the queue, so the clear only releases references, which no test can observe |
| Q8. `Drag.requestStep` ignores its operation's end | 2 DRI-8 scope tests and 1 step-queue test |

**Not run:** Firefox and WebKit, the `compare` bench, and a browser heap reading.

## 3. Costs

### Size

Each figure is minified / Brotli bytes from `node bench/size/measure.ts` ([`size.txt`](probes/step-queue/size.txt)). The base figures equal [`gesture-receiver-report.md`](gesture-receiver-report.md)'s figures at `fd7ae3e43`, whose source is the same. `72ae8d715` gave the same figures in two runs. `454d7412d` was measured once.

| Composition | Base `25a67d4a9` | Inline `454d7412d` | Queue `72ae8d715` | Inline − base | Queue − base | Queue − inline |
| --- | --: | --: | --: | --: | --: | --: |
| draggable alone | 6321 / 2066 | 6412 / 2105 | 6538 / 2145 | +91 / +39 | +217 / +79 | +126 / +40 |
| draggable + lift | 11132 / 3838 | 11223 / 3876 | 11349 / 3931 | +91 / +38 | +217 / +93 | +126 / +55 |
| example: resize handle | 8978 / 3181 | 9069 / 3231 | 9195 / 3262 | +91 / +50 | +217 / +81 | +126 / +31 |
| example: drop zone | 12771 / 4462 | 12862 / 4515 | 12988 / 4556 | +91 / +53 | +217 / +94 | +126 / +41 |
| example: canvas group | 9114 / 3179 | 9205 / 3228 | 9331 / 3260 | +91 / +49 | +217 / +81 | +126 / +32 |
| freeDrag | 14770 / 4897 | 14861 / 4940 | 14987 / 4987 | +91 / +43 | +217 / +90 | +126 / +47 |
| freeDrag + bounds + landing | 15935 / 5331 | 16026 / 5388 | 16152 / 5418 | +91 / +57 | +217 / +87 | +126 / +30 |
| sortable + y | 19474 / 6345 | 19566 / 6385 | 19692 / 6429 | +92 / +40 | +218 / +84 | +126 / +44 |
| sortable + xy | 19293 / 6303 | 19385 / 6353 | 19511 / 6391 | +92 / +50 | +218 / +88 | +126 / +38 |
| complete | 21147 / 6968 | 21239 / 7008 | 21367 / 7062 | +92 / +40 | +220 / +94 | +128 / +54 |

- **Every composition pays,** including those that never pass a receiver. Converting the `sortable` site costs about 1 B minified.
- **The queue object costs about 126 B minified and 30 to 55 B Brotli more than the inline pairs.** Most of that is class syntax that does not minify: a private field read five times, a getter and three method names. The queue's module also adds one module to every graph.
- **The size rows:**
  - Rows red at the base get redder.
  - The queue breaches two rows that were not red: `draggable alone`'s ceiling (2139 B) by 6 B, and `freeDrag`'s ceiling (4967 B) by 20 B.
  - It also breaks the `draggable alone` module-graph test, because `step-queue.ts` is a seventh module.
  - The inline pairs breach no row that the base does not already breach.

### Allocation

- **Per sample:** nothing in either variant. Input still enters with a private method and its receiver, and the per-sample test passes.
- **Per idle request:** nothing. The step enters the pass directly with its receiver, as at the base.
- **Per request during a pass:** no pair object. The array takes two slots instead of one. Its growth is amortized and it empties as it drains, as at the base.
- **Per controller:**
  - The queue model adds one object: +32 B in V8 (Node 26.13.0), 64 B for the `StepQueue` and its array against 32 B for the array alone ([`heap.ts`](probes/step-queue/heap.ts), three identical rounds).
  - The inline pairs add nothing.
  - Both variants save one closure per `sortable` controller, because `#invalidateGeometry` is no longer an arrow field.
- **Per operation:** unchanged. `Drag.requestStep` was already a closure per operation.

## 4. What the types and the lint do not check

- **A missing receiver is caught only when the method declares `this`.** A private method without a `this` parameter, such as `#invalidateGeometry()`, matches the receiver-free overload. `drag.requestStep(this.#invalidateGeometry)` then typechecks, lints, and fails at runtime as a fault (Q6). With `#step(this: Holder)`, a missing or wrong receiver is a type error. Nothing requires that annotation.
- **`unbound-method` cannot see private methods,** so it reports neither the correct call nor the wrong one.
- **For a public method, `unbound-method` reports even the correct call,** `requestStep(holder.bump, holder)`, because the rule does not read the second argument. Every such call needs a line-scoped disable. The declaration test carries one, and ESLint reports no unused directive.
- **In the library,** only one more site has a stable step that a receiver could replace: the public arrow field `invalidate`, in `SortableBehavior` and in `FreeDragBehavior`. Converting either one costs a lint disable at its call site. The other sites are closures over per-call or per-operation values: `moveTo`'s point and the drop-target frame's `resolve`. They gain nothing from a receiver.

## 5. Recommendation

**Do not adopt the dedicated queue object.** It achieves what it was meant to: it holds the storage typing and the pair handling, and `Gesture` keeps pass control and precedence. But `Gesture` is its only user (CONTRIBUTING §2.1, §10). The inline pairs give the same behavior with one cast in the reader, and cost 126 B minified less on every composition and one object less per controller.

**If receiver support is wanted, adopt the inline pairs at `454d7412d`, with these caveats:**

- **Its cost is about 91 B minified and 38 to 57 B Brotli on every composition,** and inside the library it saves one closure per `sortable` controller.
- **The callers' saving needs `this:` annotations to be safe.** Without one, a forgotten receiver is a runtime fault, not a type error.

**My recommendation is to keep `requestStep` receiver-free for v1.** The cost reaches every bundle. The benefit is one arrow field per stable step, in authors' classes. That is a per-controller saving, not a per-sample one.

**Next:** the owner inspects the worktree. A decision to adopt either variant is an architect decision under `DRD-34`'s exclusion, with its size cost under `DRO-4`.