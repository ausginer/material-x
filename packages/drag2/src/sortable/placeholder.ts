/**
 * Placeholder **customisation**. The behavior always creates a placeholder; this
 * feature only changes what element that is and what classes it carries.
 *
 * The name under-communicates that — an inherited wart from probe 1, kept
 * because `placeholderStyle()` reads worse at the call site.
 *
 * The default mechanics are **not** here and are not configurable away: the
 * element occupies exactly one insertion position, carries
 * `data-drag-placeholder` and `aria-hidden="true"`, mirrors the item's `slot`,
 * and is sized from the visual's offset box. Those live in the behavior, are
 * applied to whatever this feature returns, and were validated in 8a with no
 * `placeholder()` installed at all.
 */
import { brandFeature, type SortableFeature } from './feature.ts';
import type { PlaceholderContext, PlaceholderFactory } from './placement.ts';

export type PlaceholderOptions = Readonly<{
  /**
   * Replaces the default `<div>`. Must return a **detached** element that is
   * neither the dragged item nor its visual — the behavior adopts the result,
   * so it inserts it, moves it, and removes it at teardown. A result that fails
   * that is refused inside `activation.prepare`, before anything is inserted.
   */
  create?: PlaceholderFactory;
  /** Classes added to the placeholder, whatever created it. */
  className?: string;
}>;

export type { PlaceholderContext };

export function placeholder(options: PlaceholderOptions = {}): SortableFeature {
  const { create, className } = options;
  // Split once, at construction, rather than per operation. `classList.add`
  // rejects an empty token and a token containing whitespace, so a multi-class
  // string cannot simply be handed over whole.
  const classes =
    className === undefined ? null : className.split(/\s+/u).filter(Boolean);

  return brandFeature((context) => ({
    createPlaceholder(placeholderContext, live): HTMLElement {
      // `realm.document`, not the global one: the root may live in an iframe,
      // and an element minted from the wrong document cannot be inserted.
      const element =
        create === undefined
          ? context.realm.document.createElement('div')
          : create(placeholderContext);

      // **The terminal barrier on the consumer's factory** (I-36 (2) act 3,
      // C5-03's stretch sweep). `create` is consumer code and the element it
      // returns is the consumer's own, not yet adopted by anything: teardown
      // removes only the placeholder it inserted, so a class written here after
      // `destroy()` returned stays on that element forever. The default `<div>`
      // above is the library's and would leave nothing, but one reading covers
      // both and costs the branch nothing.
      if (classes !== null && classes.length > 0 && live()) {
        // Added, never assigned: a custom element from `create` may arrive with
        // classes of its own, and this feature customises rather than replaces.
        element.classList.add(...classes);
      }

      return element;
    },
  }));
}
