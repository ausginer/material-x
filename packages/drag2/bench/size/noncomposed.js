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
 * The hand-flattening below mirrors `assemble()`'s tail, and the install body
 * mirrors `behavior.ts`'s. If either changes, this baseline is stale;
 * `tests/bench/size.node.test.ts` asserts the slot key sets still agree so it
 * cannot drift silently.
 */
import { draggable } from '../../kernel.js';
import { copyUniqueItems } from '../../sortable/collection.js';
import { createSortableController } from '../../sortable/controller.js';
import { createSortableRuntime } from '../../sortable/runtime.js';
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
  const displace = layoutAnimation().plugins[0](context);

  return {
    resolveInsertion: insertion.resolve,
    invalidateInsertion: insertion.invalidate,
    measureInsertion: insertion.measure ?? null,

    items,
    onReorder,
    onStart: NOOP_START,
    onEnd: null,
    onError: null,
    threshold: 8,

    // `null` is the default element, which is what the composed side now gets
    // when no `placeholder` slot is written. The key is still filled, which is
    // what `size.node.test.ts` compares.
    createPlaceholder: null,
    getHandle: grip,
    getVisual: box,
    // D-43's default, applied by hand exactly as `assemble()` applies it: with
    // no `box` slot written, the box resolver *is* the visual resolver.
    getBox: box,
    startLanding: land.startLanding,

    beforeMove: [displace.beforeInsertionMove],
    afterMove: [displace.afterInsertionMove],
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
      // `install()` itself, inlined: the built package tree-shakes the
      // non-composed `createSortableBehavior` seam away, because only the
      // composed entry reaches it. That is itself a small M-3 result — the
      // internal seam the tests drive costs a consumer nothing.
      // **The pull, the validation and the copy are the caller's** (D-80 (b)):
      // `source` is the identity baseline, the copy is what the runtime
      // publishes, and both are supplied rather than derived inside.
      const rt = createSortableRuntime(
        host,
        items,
        copyUniqueItems(items),
        slots,
      );

      return {
        spec: createSortableSpec(rt),
        controller: createSortableController(host),
      };
    },
  );
}
