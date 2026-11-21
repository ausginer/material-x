import { useSlot } from '@ydinjs/core/controllers/useSlot.js';
import { internals, type ControlledElement } from '@ydinjs/core/element.js';
import { $$, toggleState } from '@ydinjs/core/utils/DOM.js';

const DEFAULT_SLOT_STATE_NAME = 'default';

/**
 * Marks which of `host`'s slots have content: each slot gets the class
 * `has-slotted`, and the host the state `has-<slot name>`, or `has-default` for
 * the default slot. The build's `hasSlottedFallbackVisitor`
 * (`@ydinjs/vite-custom-element-assets`) rewrites `:has-slotted` to the class,
 * and writes `:host(:state(has-<class>))` beside each
 * `:host:has(.<class>:has-slotted)`. So a slot's `name` and the class beside
 * `:has-slotted` must agree.
 *
 * The state is set in every engine, because no selector tells reliably whether
 * `:host:has()` matches: Firefox reports it as supported and doesn't match it.
 * Where both selectors match, they set the same declarations. This function and
 * the build's rewrite go together, once every supported engine matches
 * `:has-slotted` and `:host:has()`.
 */
export function useHasSlottedPolyfill(host: ControlledElement): void {
  const innards = internals(host);

  for (const slot of $$<HTMLSlotElement>(host, 'slot')!) {
    useSlot(host, slot, (slot, nodes) => {
      const hasNodes = nodes.length > 0;

      slot.classList.toggle('has-slotted', hasNodes);
      toggleState(
        innards,
        `has-${slot.name || DEFAULT_SLOT_STATE_NAME}`,
        hasNodes,
      );
    });
  }
}
