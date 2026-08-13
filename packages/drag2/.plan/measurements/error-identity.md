# Does `DraggableError` require `drag.js`? — measured, 2026-08-13

**Question.** D-64 keeps `drag.js` as a third entry root on the argument that `DraggableError` is a **class**, therefore a runtime value both tiers must name, therefore it needs a home neither tier owns — otherwise `err instanceof DraggableError` could compare against two different classes.

**Answer: no. The identity argument is false, in both build modes.** A module reachable from two entries is emitted once and shared, so the class has one identity however many entries re-export it. `drag.js` may still be wanted; it is not **required**, and nothing about `instanceof` depends on it.

This is the second justification for the third root to fail. See §What survives.

---

## The check

Smallest fixture that can answer it: one internal module declaring the class, three entries re-exporting it, two of them also throwing it. Built with the same tsdown/rolldown configuration shape the package uses (`platform: 'neutral'`, `format: 'esm'`, `target: 'esnext'`, `fixedExtension: false`), then executed under Node.

```
src/error.ts      export class DraggableError extends Error { readonly code: string }
src/drag.ts       export { DraggableError } from './error.ts';
src/sortable.ts   export { DraggableError } from './error.ts';  + raise()
src/kernel.ts     export { DraggableError } from './error.ts';  + raiseFromKernel()
```

Six assertions, all of which must hold for identity to be safe:

```
one emitted error module
DraggableError from drag.js  ===  from sortable.js
DraggableError from drag.js  ===  from kernel.js
a throw raised inside sortable.js  instanceof  drag.js's export
a throw raised inside kernel.js    instanceof  sortable.js's export
a throw raised inside sortable.js  instanceof  kernel.js's export
```

The last three are the ones that matter: they cross an entry boundary in the direction a real consumer would — the error is **constructed** by one tier's code and **tested** against another tier's export.

## Result

| Build mode | Emitted for the class | Cross-entry `===` | Cross-entry `instanceof` |
| --- | --- | --- | --- |
| `unbundle: true` — **the package's actual setting** | one module, `out/error.js`, imported by all three entries | ✅ | ✅ |
| `unbundle: false` — the counterfactual | one **shared chunk**, `error-CYKFdpIB.js`, imported by all three entries | ✅ | ✅ |

**All six assertions pass in both modes.** Environment: Node v26.4.0, tsdown 0.22.7.

The counterfactual is the important half. `unbundle: true` makes the result unsurprising — module structure is preserved, so of course there is one module. The question worth asking was whether the guarantee is an artifact of that setting, and it is not: with bundling on, rolldown **hoists a multiply-reachable module into a shared chunk** rather than inlining a copy per entry. Duplication would require the module to be reachable from exactly one entry, which is the case where identity cannot be at stake anyway.

**This is also observable in the package's own build**, without any fixture: `drag.js` and `sortable.js` both contain `import … from "./kernel/failures.js"`. One file, two importers, no copy. The fixture exists because constants prove nothing about reference identity and a class does.

## What survives, and what does not

**Does not survive:** _"`DraggableError` needs an entry that neither tier owns, or `instanceof` breaks."_ It does not break. An ordinary consumer could import the class from `sortable.js`, a kernel author from `kernel.js`, and the two are the same class object.

**Does survive**, and is now the entire warrant for `drag.js`:

1. **One declaration site.** Without it, every behavior entry re-exports the shared vocabulary — `sortable.js` today, `freeDrag`'s entry later, a third-party behavior's never. Four names × N entries, kept in sync by hand. A maintenance argument, and a real one, but not a correctness one.
2. **A specifier that implies no tier.** `import { DraggableError } from '@ydinjs/drag/drag.js'` says _shared_; importing it from `sortable.js` says _the sortable owns this_, which it does not.

**And there is a cost on the other side that the identity argument was hiding.** As the table stands, an ordinary consumer who wants `err instanceof DraggableError` must import from **two** entries — `sortable.js` for everything, `drag.js` for the error class. README's promise is _"an ordinary sortable consumer imports from `sortable.js` and `drag.js` only"_, which is true and is also two specifiers where the redesign's stated goal was one call and one import. Re-exporting the shared vocabulary from `sortable.js` **as well** would cost nothing measurable — the module is a leaf, and this measurement shows the class stays one class — and would let the ordinary tier be one specifier.

## Recommendation, not applied

**Keep `drag.js` as the declaration site; additionally re-export the shared vocabulary from each behavior entry.** The consumer never needs to know `drag.js` exists; the maintainer keeps one declaration; identity is proven safe. The synchronisation risk in (1) becomes a one-line export-equality assertion in `tests/exports.node.test.ts` rather than a convention.

**Not applied, deliberately.** This is the third time the entry topology would have been re-derived in one week, twice by the same author from the same table, and the first two derivations were each stated as settled and each turned out to rest on an argument that later evaporated. The difference now is that there is a measurement instead of an argument — which is a reason to trust the **finding**, not a reason to let the finding's author also take the decision. Owner's call; handoff §6.