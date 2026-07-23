# Experiment 02 — `FreeDragGesture` class → mutable context + module functions

**Plan reference:** Track B, item 1 — "`FreeDragGesture` class → module-level functions
+ mutable named object."

**Status:** ❌ Rejected — small size regression, runtime-neutral. Not worth it.

---

## Hypothesis

`FreeDragGesture` is a ~540-line class: 2 readonly fields (`deps`, `scope`), 5 mutable
resource fields, ~14 private methods. Class syntax carries scaffolding (`class`,
`constructor`, prototype method definitions) that a functional form might shed.

## Two forms measured

The plan's intended form is **an independent mutable object + module-level functions that
take it as the first parameter** — not a closure-based class imitation. Both were tried:

### 2a. Closure factory (first attempt — *not* the planned design)

`createFreeDragGesture(deps)` returns `{ scope, handle, destroy }`; each former method is a
`const … = (…) => {}` closure capturing `deps`, `scope`, and a mutable `s` object.

- Size: draggable **6.59** / combined **12.69 kB** (+0.04 / +0.06 vs class).
- Runtime **worse**: allocates ~14 closures + the `s` object *per gesture start*.

Rejected on both axes and discarded.

### 2b. Mutable context + module functions (the planned design)

`FreeDragGesture` becomes a plain mutable object type (`deps`, `scope`, 5 resource fields).
`createFreeDragGesture(deps)` builds it; every step is a module-level
`function name(ctx: FreeDragGesture, …)`. `this.#field → ctx.field`,
`this.#method(a) → method(ctx, a)`. `handleGesture` / `destroyGesture` are exported and
called from `draggable.ts`; `.scope` stays a property read.

Builds ✓, typechecks ✓, formatted ✓, **97/97 draggable tests pass**. (Only outstanding
nit: eslint `no-use-before-define`, a pure declaration-ordering fix, left undone once the
size verdict was clear.)

| bundle    | baseline (class) | ctx + module fns | delta        |
| --------- | ---------------- | ---------------- | ------------ |
| draggable | 6.55 kB          | 6.59 kB          | **+0.04 kB** |
| combined  | 12.63 kB         | 12.70 kB         | +0.07 kB     |

- Runtime: **on par with the class** — module functions are defined once, so a press
  allocates only the `ctx` object (the class allocated one instance). This removes 2a's
  closure-allocation penalty entirely.
- Size: still a **small regression**, ~40–70 bytes.

## Why even the correct design is (slightly) bigger

- The oxc/Rolldown minifier already **mangles the class's private `#fields`/`#methods`**
  and shares methods on the prototype, so there was no scaffolding tax to reclaim.
- The context form *adds* bytes: `ctx.`-prefixed field names (`presentationWatchDisposer`,
  `renderer`, `resolution`, …) are **object property keys — not manglable** — and now
  appear at every read, and `ctx` is threaded through every call site (`method(ctx, …)`)
  and every signature (`ctx: FreeDragGesture, …`).

## Verdict

The planned design is mechanically clean, behavior-identical, and runtime-neutral versus
the class — but it does not shrink the bundle; it grows it slightly. No reason to prefer
it over the class. Reverted.

A variant with **short property keys** (e.g. single-letter `ctx` fields) could plausibly
erase the property-name cost and edge below the class, since object keys mangle poorly but
short literal keys are cheap. Not pursued here — flagged if size becomes the deciding
factor later.

## Takeaways

- On this toolchain, **classes are already the compact, allocation-cheap form** for
  stateful per-gesture objects; declassing does not pay at default field naming.
- Combined with [experiment 01](01-tuples.md): both "representation" levers Track B leads
  with (tuples, declassing) fail here. The minifier + brotli already capture the wins
  those transforms target. Treat the remaining Track B items (packed protocol word,
  kernel extraction) with the same skepticism — measure a thin slice before investing.
