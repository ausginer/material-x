// oxlint-disable typescript/no-unsafe-call max-params
/**
 * M-3 baseline A — **feature-matched, non-composed**. Answers *what does
 * composition cost*, and nothing else.
 *
 * Same capabilities as `complete.js`, same feature logic, reached without
 * `mergeFragments()` or `assemble()`: the installers are invoked directly and
 * their contributions are flattened into the slot record by hand, so the delta
 * against `complete.js` is the merge, the assembler, the single-writer claims,
 * the unwind and the validation — the composition layer itself, with the
 * features held constant.
 *
 * This is the one file here that imports through **relative paths into the
 * built package**. That is not an oversight and not a consumer path: the
 * behavior seam and the feature contract are internal by construction (contract
 * 03 §The public/internal boundary), so a non-composed baseline is only expressible from
 * inside. Keeping it out of the export map is the point — nothing a consumer
 * can write reaches this shape.
 *
 * The hand-flattening below mirrors `assemble()`'s tail, and `mount()` mirrors
 * `createSortableBehavior`'s body. If either changes, this baseline is stale —
 * and **the two halves are guarded differently, which is why they are named
 * separately** (F-157). `tests/bench/size.node.test.ts` pins the slot key sets
 * against `assemble()`, so the flattening cannot drift silently. `mount()` is
 * held by nothing here: it is not called by any test, and a call that no longer
 * matches its target still bundles. What keeps it honest is that the modules it
 * reaches must exist — the same suite refuses a generated file older than its
 * own build, so a deleted module cannot leave behind a `.js` for this file to
 * keep importing.
 */
import { draggable } from '../../kernel.js';
import { createSortableController } from '../../sortable/controller.js';
import { createSortableSpec } from '../../sortable/spec.js';
import { landing } from '../../sortable/landing.js';
import { layoutAnimation } from '../../sortable/layout-animation.js';
import { y } from '../../sortable/y.js';

const NOOP_START = () => {};

const report = (error) => {
  queueMicrotask(() => {
    throw error;
  });
};

export function buildSlots(context, config) {
  const { items, onReorder, grip, box } = config;
  // Three of the six factories this used to call are gone (D-56): `handle`,
  // `visual` and `placeholder` installed nothing, so under D-45 their slots are
  // plain config values and the baseline writes them straight into the record —
  // which is exactly what makes the deletions free.
  // `y()` **is** the installer since D-77; it was `y().axis` while a required
  // slot still needed a fragment position to be written from.
  const { insertion } = y()(context);
  const land = landing().landing(context);
  const displace = layoutAnimation().displacement(context);

  return {
    resolveInsertion: insertion.resolve,
    invalidateInsertion: insertion.invalidate,
    movedInsertion: insertion.moved,

    items,
    onReorder,
    onStart: NOOP_START,
    onEnd: null,
    onError: null,
    threshold: 8,

    // `null` is the default element, which is what the composed side now gets
    // when no `placeholder` slot is written. The key is still filled, which is
    // what `size.node.test.ts` compares.
    placeholder: null,
    handle: grip,
    visual: box,
    // D-43's default, applied by hand exactly as `assemble()` applies it: with
    // no `box` slot written, the box resolver *is* the visual resolver.
    box,
    landingTiming: land.landingTiming,

    report: displace.report,
    settle: displace.settle,
    retireHooks: [displace.retire, insertion.retire],
  };
}

export function mount(root, items, onReorder, grip, box) {
  // D-44: the collection is a pull source. The baseline holds a fixed array, so
  // the source is a closure over it — the composed side reads `config.items`.
  const source = () => items;
  // Branded here rather than reusing the branded `createSortableBehavior`
  // directly, because the feature context needs the host's realm and root and
  // neither exists until the kernel installs. `assemble()` solves the same
  // ordering problem inside the composed entry; this is that problem without
  // the assembler.
  return draggable(
    root,
    // **Unbranded** (D-55): `brandBehavior` is withdrawn, so a behavior is the
    // plain install function it always was underneath.
    (host) => {
      const context = { realm: host.realm, root: host.root, report };
      const slots = buildSlots(context, {
        items: source,
        onReorder,
        grip,
        box,
      });
      // `createSortableBehavior`'s body, inlined: the built package
      // tree-shakes that seam away, because only the composed entry reaches
      // it. That is itself a small M-3 result — the internal seam the tests
      // drive costs a consumer nothing.
      // **The pull and the copy are the caller's** (D-80 (b)): `items` is the
      // identity baseline a later pull is compared against, the copy is what
      // the behavior publishes, and both are supplied rather than derived
      // inside. **No runtime object stands between them and the spec**
      // (D-149): what the spec is handed is the host and the four facts.
      return {
        spec: createSortableSpec(host, items, [...items], slots),
        controller: createSortableController(host),
      };
    },
  );
}
