#### DRD-53 — Callback lists are made by `queue()` and `stack()` in `kernel/callbacks.ts`, and insert through a stored array method

**Status:** active, decided on 2026-11-12 on the owner's direction, from the owner's commit `1d304128b`. Amends `DRD-35` property 5 and `DRD-36` properties 1, 3 and 4, and answers `DRO-14` item 1. [`size-pass-unit-handoff.md`](../size-pass-unit-handoff.md) completes it outside `src`. `example: resize handle` is 8 B over its ceiling from `1d304128b`. **Completed on 2026-11-12** at `15e9d1ef2` and accepted ([assessment](../size-pass-unit-assessment.md))

**`src/kernel/callbacks.ts` exports the factories `queue()` and `stack()`, and its class `List` only as a type. A list holds `Array.prototype.unshift` or `push` and calls it on its array to insert. The owner's commit `1d304128b` is the implementation in `src`, and [`size-pass-unit-handoff.md`](../size-pass-unit-handoff.md) completes what refers to the old module outside `src`.**

Decided on 2026-11-12 on the owner's direction, from `1d304128b`, with the owner's dispatch probe at `c0d6b9205` ([README](../probes/callback-dispatch/README.md)). In Chromium, adding and running an entry through the stored function was 14 to 16% faster for a queue and 24 to 25% faster for a stack than through the method's name.

**The owner's direction:**

- **The original C2 is rejected.** Its single constructor with `'unshift'` or `'push'` at each call site isn't taken.
- **The named module factories stay.**
- **The owner's source edits are committed unchanged.** The unit finishes the browser test's and the allocation probe's imports and the size test's module path, and fixes the stale comments.

**Required properties:**

1. **The factories.** `queue()` and `stack()` are named exports of `src/kernel/callbacks.ts`. `List` is exported as a type only, so no other module can construct a list. Callers import the factories or the module's namespace, as `gesture.ts` and `session.ts` do.
2. **Insertion.** A queue holds `Array.prototype.unshift` and a stack holds `Array.prototype.push`, each read once when the module is evaluated, in a private read-only field. `add` calls it on the list's array with the callback and the receiver in one call.
3. **Everything else in `DRD-36` holds:**
   - one `pop`-based `run` that doesn't branch on the kind;
   - callback and receiver in two adjacent slots, with no object per entry;
   - `empty`, `has`, `add` and `clear`;
   - removal before the call;
   - a list that decides nothing about when its entries run;
   - the three instances.

   A list owns no function: the array method it holds is the one shared builtin.

4. **The comments state this representation.** No comment says that a list holds a method's name, or names `CallbackList.queue()` or `CallbackList.stack()`.

**What this amends:**

- **`DRD-36` property 1:** "the private constructor" and "the method's name, in a private read-only field" now read: the factory, and the method itself in a private read-only field.
- **`DRD-36` property 3's last sentence** no longer holds, because a list holds the shared method and not its name. Its first two sentences hold.
- **`DRD-36` property 4's** "the private constructor and the two factories" now reads: the two module factories, and a class exported only as a type.
- **`DRD-35` property 5's** file and class names now read `src/kernel/callbacks.ts` and `List`.
- **`DRO-14` item 1** is answered.

**Cost.** The owner's commit against `c0d6b9205`, in Brotli-11:

- −1 B on "draggable alone" and −11 B on "draggable + lift";
- **+11 B on "example: resize handle"**;
- −7 B on "example: drop zone" and −4 B on "example: canvas group";
- −12 B on "freeDrag" and −17 B on "freeDrag + bounds + landing";
- −7 B on "sortable + y", −5 B on "sortable + xy" and −7 B on "complete".

Minified: −2 B on the rows without `sortable`, and +6 B on the three with it. **"example: resize handle" is now 3,321 B, 8 B over its 3,313 B ceiling,** and it joins the rows `DRO-4` holds. The budgets stay unchanged.

**Result, 2026-11-12:** completed in `15e9d1ef2` and accepted in [`size-pass-unit-assessment.md`](../size-pass-unit-assessment.md).

- **Properties 1 and 4 hold.** The browser test and the allocation probe import the module's namespace and make every list with `queue()` or `stack()`. The size test expects `src/kernel/callbacks.ts`. `callbacks.ts`'s class comment and `drag.ts`'s `runDisposers` JSDoc no longer name a method's name or `CallbackList.stack()`.
- **The owner's code changed only in those two comments.** The commit reads 0/0/0 against `1d304128b` on every row.
- **The allocation probe,** run once and not gated: `queue()` and `stack()` 72 B each empty and 239 B used, against 32 B and 167 B for a bare array.