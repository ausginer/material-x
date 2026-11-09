# Step-key model

**A model for the owner's inspection, not a decision.** Nothing here is adopted. No `D-*` is minted, and the contract and `00-index.md` are unchanged.

**Base:** `25a67d4a9` on `drag/feature-composition`. **Branch:** `drag/step-key-model`, with three commits:

- `b6cc320ac`: **the kernel.** `requestStep(step, key = step)` on `Gesture`, `Drag` and `DraggableController`.
- `ecefbf5e5`: **the call sites.** Three steps that existed as arrow fields only to have a stable identity become closures with a key. `git diff b6cc320ac ecefbf5e5` is the call sites alone.
- The commit that carries this report, the focused tests and the probe.

**Compared with:** production at `25a67d4a9`, and the earlier models on `drag/step-queue-model`: the inline pairs at `454d7412d`, the step-queue model at `72ae8d715` and the callback-list model at `d50e4b67a`. Their reports are `step-queue-model.md` and `callback-list-model.md` in `.plan/` on that branch, which is not changed.

**Governing records:** `DRD-6` and `DRD-34` in [`00-index.md`](00-index.md), and DRI-8 in [`contract.md`](contract.md). The model departs from two statements, which stay as they are:

- DRI-8: "The same function requested again before it runs runs once." In the model, the same **key** runs once.
- `DRD-34` §8: "A step passed by identity stays one stable function", which names the `invalidate` steps of `sortable` and `freeDrag`. The model converts both.

## 1. What the model does

### The kernel

- **The signature** on `Drag` and `DraggableController` is `requestStep(step, key?: object)`. `Gesture` declares `key: object = step`, so an omitted or `undefined` key is the step itself. Every call site that passes no key behaves as in production.
- **The first request for a key wins.** While a key is waiting, a later request with that key is dropped, whatever its step captured. The kernel never calls the dropped step and keeps no reference to it.
- **The step is called with no receiver** on both paths, as in production. The key is never called and never becomes `this`.
- **While idle,** the step runs at once as the first step of its own pass, and its key is not kept. A request for the same key from inside that step is deferred and runs in the same pass.
- **In a pass,** the reader takes a step and its key off together before it calls the step. So a step that requests its own key again runs again, and a step that throws leaves no key behind.
- **Teardown** empties both lists. `Drag.requestStep` forwards the key behind the same `ENDED` check, so operation scope is unchanged.
- **Storage:** two arrays at the same index, `#steps` and `#keys`. `#keys.includes(key)` replaces `#steps.includes(step)`. One array with key and step in adjacent slots was measured as an alternative: 11 B minified larger on every composition, and it needs a cast in the reader. It was not kept.

**Why `object` and not `unknown`.** A function, an instance or a dedicated `{}` is unique by identity, the same domain as the default key. A string such as `'invalidate'` could collide between two capabilities written apart, such as a third party's `DropTargets` and a built-in step in one controller. `object` rejects strings, numbers, symbols and `null`.

### The call sites

| Site | Production | Model |
| --- | --- | --- |
| `freeDrag`'s `invalidate()` | `requestStep(behavior.invalidate)`, an arrow field on `FreeDragBehavior` | `requestStep((operation) => { behavior.invalidate(operation); }, behavior)`. `invalidate` is a method |
| `sortable`'s `invalidate()` | `requestStep(behavior.invalidate)`, an arrow field on `SortableBehavior` | The same form, keyed by `behavior` |
| `sortable`'s scroll and resize listener | `requestStep(this.#invalidateGeometry)`, an arrow field | `requestStep(() => { this.axis.invalidate(); }, this.axis)`. The field is removed |
| `sortable`'s frame | `requestStep(updateInsertion)`, a module function | Unchanged: already stable |
| `dropTargets`' frame | `requestStep(resolve)`, a closure per operation, also called directly by `drop()` | Unchanged: already stable |
| `freeDrag`'s `moveTo()` | `requestStep((operation) => { operation?.moveTo(point); })`, a closure per call | Unchanged. **It must stay unkeyed:** with a key, the first point would win and later points would be dropped (K11) |

- **Each key names one task.** `behavior` is the key for the controller's `invalidate`, and `this.axis` for the geometry step. Those are two different objects. Keying both by the behavior would drop one of the two steps (K8).
- **What the hypothesis needs from a site:** a task that is requested repeatedly, and an object whose identity already stands for that task. All three converted sites have one. The two stable sites gain nothing, and `moveTo` must not be keyed.
- **`SortableBehavior`'s class comment** now says that a step is either one reused function or a per-request closure with a stable key.

## 2. Checks

At the model's last commit, in the worktree:

- **`npx just typecheck` passes.**
- **`npx just lint` passes** on every changed or added `.ts` file.
- **`npx just test` in Chromium:** 372 passed and 3 failed. Every failure is a size row in `size.node.test.ts`, and the same three rows fail at the base (§3).
- **The per-sample allocation test passes** (`hot-path.browser.test.ts`, in the `shipped` project).
- **The focused checks:**
  - [`tests/step-key.browser.test.ts`](../tests/step-key.browser.test.ts) has 14 tests. They check:
    - the first request for a key running with its own captured value, and later requests with that key dropped;
    - the default key, and an explicit key equal to a waiting step;
    - one function under different keys, and closures from two instances keyed by their own instance;
    - unkeyed closures run in request order;
    - no receiver on the idle and the deferred path;
    - an idle request's key not kept, a key requeued by its running step, and a throwing step's key removed;
    - a keyed step behind destruction and one requested from a disposer during teardown, neither of which runs;
    - operation scope through a retained `Drag`;
    - the converted sites: `freeDrag`'s `invalidate` coalesced between two `moveTo` calls that keep their order, and `sortable`'s two keys kept apart and each coalesced.
  - [`tests/step-key.declaration.test.ts`](../tests/step-key.declaration.test.ts) checks the key's type and shows what the types cannot see (§4).

**Mutations** ([`mutations.txt`](probes/step-key/mutations.txt)). Each was applied alone to `ecefbf5e5` and then restored. All eleven typecheck. Each ran against the Chromium suite without `size.node.test.ts`, before the declaration test was added.

| Mutation | Caught by |
| --- | --- |
| K1. Deduplicate by step, ignoring the key | 8 step-key tests and DRI-8's "pull once for two `invalidate` calls" |
| K2. No deduplication | 8 step-key tests and both DRI-8 coalescing tests |
| K3. The last request for a key wins | **Only** 4 step-key tests. In production a duplicate is the same function, so first-wins and last-wins cannot be told apart, and no existing test pins either |
| K4. The key is taken off after its step runs | 2 step-key tests: requeueing and a throwing step |
| K5. `Drag.requestStep` drops the key | 7 step-key tests |
| K6. The default key is a new `{}` | DRI-8's "coalesce one function", 1 step-key test, and the per-sample allocation test, because `updateInsertion` then allocates a key per frame |
| K7. Teardown keeps the keys | **Nothing.** After teardown nothing reads the list, so the clear only releases references |
| K8. `sortable`'s geometry step keyed by the behavior, as its `invalidate` is | **Only** the step-key `sortable` test |
| K9. `sortable`'s `invalidate` unkeyed | DRI-8's "pull once" and the step-key `sortable` test |
| K10. `freeDrag`'s `invalidate` unkeyed | **Only** the step-key `freeDrag` test. One unrelated timing assertion in `activation.browser.test.ts` also failed in this run, and passed 3 of 3 runs unmutated |
| K11. `moveTo` keyed by the behavior | DRI-8's `moveTo` order test and the step-key `freeDrag` test |

**Not run:** Firefox and WebKit, the `compare` bench, and a browser heap reading.

**The probe is outside the package's typecheck and lint scope,** as `.plan/` is. Linted by path, it still reports `max-classes-per-file`, `no-console` twice and `triple-slash-reference`. Those are a probe script's form, and they were left as reported.

## 3. Costs

### Size

Each figure is minified / Brotli bytes from `node bench/size/measure.ts` ([`size.txt`](probes/step-key/size.txt)). The base figures equal the step-queue model's base figures, and the earlier models' figures are from its `size.txt` and `callback-list-size.txt` on that branch.

| Composition | Base | Inline pairs | Queue | List | Key, kernel | Key | Key − base |
| --- | --: | --: | --: | --: | --: | --: | --: |
| draggable alone | 6321 / 2066 | 6412 / 2105 | 6538 / 2145 | 6683 / 2174 | 6388 / 2078 | 6388 / 2078 | +67 / +12 |
| draggable + lift | 11132 / 3838 | 11223 / 3876 | 11349 / 3931 | 11494 / 3951 | 11199 / 3854 | 11199 / 3854 | +67 / +16 |
| example: resize handle | 8978 / 3181 | 9069 / 3231 | 9195 / 3262 | 9340 / 3293 | 9045 / 3194 | 9045 / 3194 | +67 / +13 |
| example: drop zone | 12771 / 4462 | 12862 / 4515 | 12988 / 4556 | 13133 / 4581 | 12838 / 4485 | 12838 / 4485 | +67 / +23 |
| example: canvas group | 9114 / 3179 | 9205 / 3228 | 9331 / 3260 | 9476 / 3286 | 9181 / 3191 | 9181 / 3191 | +67 / +12 |
| freeDrag | 14770 / 4897 | 14861 / 4940 | 14987 / 4987 | 15132 / 5006 | 14837 / 4916 | 14845 / 4915 | +75 / +18 |
| freeDrag + bounds + landing | 15935 / 5331 | 16026 / 5388 | 16152 / 5418 | 16297 / 5446 | 16002 / 5350 | 16010 / 5360 | +75 / +29 |
| sortable + y | 19474 / 6345 | 19566 / 6385 | 19692 / 6429 | 19812 / 6447 | 19541 / 6352 | 19548 / 6357 | +74 / +12 |
| sortable + xy | 19293 / 6303 | 19385 / 6353 | 19511 / 6391 | 19631 / 6415 | 19360 / 6307 | 19367 / 6312 | +74 / +9 |
| complete | 21147 / 6968 | 21239 / 7008 | 21367 / 7062 | 21489 / 7085 | 21214 / 6978 | 21221 / 6983 | +74 / +15 |

- **The kernel costs 67 B minified and 9 to 23 B Brotli on every composition,** about three quarters of the inline pairs' 91 B. It is the smallest kernel change measured so far. It adds no overload and no module, and it leaves `enter` unchanged.
- **The call sites add 7 to 8 B minified.** A closure and a key at the call are longer than a field reference, and a method is shorter than an arrow field.
- **The size rows:** the same three rows fail as at the base, by a little more each:
  - `draggable alone`'s control moved by 54 B (42 B at the base);
  - `example: drop zone` is over its ceiling by 54 B (31 B);
  - `freeDrag + bounds + landing` is over its ceiling by 150 B (121 B).

  No other row is breached. `freeDrag` (4915 B) and `complete` (6983 B) stay under their ceilings, which the queue and list models breached. The `draggable alone` module graph is unchanged.

### Allocation

Measured in V8 (Node 26.13.0) by [`allocation.ts`](probes/step-key/allocation.ts), output in [`allocation.txt`](probes/step-key/allocation.txt). "Allocated" counts every byte a call allocates, including garbage. "Retained" is what an object keeps after a collection.

| Reading (third round) | Bytes |
| --- | --: |
| Allocated per request: a reused function, deferred and dropped, or idle and run | 0 |
| Allocated per request: a closure keyed by its object, deferred and dropped | 56 |
| Allocated per request: the same closure, idle and run at once | 56 |
| Allocated per request: a bound method keyed by its object, deferred and dropped | 48 |
| Retained: an empty array, the added `#keys` | 32 |
| Retained: a class with one arrow-field step, against the same class with a method | 136 against 32 |
| Retained: a class with two arrow-field steps, against one arrow field and one method | 200 against 136 |

**The closure is allocated before the kernel looks at the key,** so a dropped request costs the same as one that runs. A bound method is no cheaper in kind. Only a function created once allocates nothing per request.

| Per | Production | Model |
| --- | --- | --- |
| Pointer sample | nothing | nothing. The per-sample test passes |
| Frame (`updateInsertion`, a drop target's `resolve`) | nothing | nothing: unchanged |
| `moveTo()` | one closure | one closure: unchanged |
| `freeDrag` or `sortable` `invalidate()` | nothing | **one closure, 56 B,** also when dropped |
| Scroll or resize event during a `sortable` drag | nothing | **one closure, 56 B.** Each event is its own pass, so the step runs at once and is never deduplicated |
| Controller, any composition | 2 arrays | **+32 B** (`#keys`) |
| `freeDrag` controller | `invalidate` arrow field | **−104 B** by the probe: its only arrow field becomes a method. Net −72 B |
| `sortable` controller | 3 arrow fields | **about −128 B:** two of them become a method or disappear. The probe's second arrow field costs 64 B, and `#retireAxis` keeps the shared part. Net about −96 B |
| Operation | unchanged | unchanged |

The two controller rows apply the probe's small classes to the real behaviors. They are estimates, not readings of `FreeDragBehavior` or `SortableBehavior`.

## 4. Typing and lint

- **No lint disable at any converted site.** A closure passed with a key is a function value, so `unbound-method` does not apply. The receiver models needed a line-scoped disable at every public-method site, and the disable hid a removed receiver.
- **No `this` typing.** The step is still called with no receiver, so the hazard of the receiver models, a method with no `this` parameter that typechecks without its receiver, does not exist.
- **The types check only that the key is an object.** A string, a number, a symbol or `null` is a type error.
- **Use an object as the key, not a method.** `requestStep(closure, this.bump)` is reported by `unbound-method`, although the key is never called. The declaration test carries one line-scoped disable to show it.
- **The types cannot see three mistakes,** and neither can the lint:
  - **one key shared by two tasks:** the second task is dropped while the first waits (K8);
  - **a forgotten key on a per-request closure:** coalescing is lost and the work runs once per request (K9, K10);
  - **a key on a closure that captures a value:** only the first request's value runs (K11).

  In production, the same three mistakes cannot be made at a site that passes a stable function, because the function is the key.

## 5. Comparison

|  | Production | Inline pairs | Queue | List | Key |
| --- | --- | --- | --- | --- | --- |
| What identifies a step | the function | function and receiver | function and receiver | function and receiver | the key, by default the function |
| Kernel size, minified | — | +91 B | +217 B | +362 B | **+67 B** |
| Lint disables at a public-method site | — | 1 per site | 1 per site | 1 per site | **none** |
| A forgotten receiver or key | — | a type error only if the method declares `this`; otherwise the wrong `this` at runtime | the same | the same | no type error; coalescing is lost |
| Step receiver | none | the receiver | the receiver | the receiver | **none** |
| Allocated per request at a converted site | 0 | 0 | 0 | 0 | **one closure** |
| Retained | the arrow fields | −1 closure per converted site | +32 B per controller, −1 closure per converted site | +64 B per controller and +32 B per operation, −2 or −3 closures per `sortable` | +32 B per controller, −1 arrow field per converted site |

## 6. Recommendation

**Keep production `requestStep` for v1.** Every site in the library already has a stable function where it needs coalescing, and no author's need has been shown. The key moves coalescing from an identity the code already has to a convention the author must keep, and §4's three mistakes become possible.

**If the owner wants authors to coalesce per-request closures, the key model is the preferred form,** over every receiver model:

- It is the smallest kernel change (+67 B minified).
- It needs no lint disable and no `this` typing.
- It keeps steps receiver-free and every unkeyed site unchanged.

**In that case, adopt the kernel commit `b6cc320ac` alone, and leave the built-in sites as they are:**

- **The geometry step should not be converted.** It allocates one closure per scroll or resize event during a `sortable` drag, where production allocates nothing. No test counts that, because DRI-17 counts samples, not scroll events.
- **The two `invalidate` conversions are close to neutral:** each trades one retained arrow field per controller for one closure per call. They lose the checked identity, so they are not worth the change.
- **The adoption would amend DRI-8's coalescing bullet** to the key rule, with first-request-wins stated. DRI-8's "a pass with no deferred step allocates nothing" still holds. The +67 B would be a cost for the owner to accept in its own `DRO-*` entry, as `DRO-9` and `DRO-10` were for earlier decisions.

**Next:** the owner inspects the worktree at `.claude/worktrees/drag-step-key-model`. An adoption is an architect decision under `DRD-34`'s exclusion of "any other change to how callbacks are represented".