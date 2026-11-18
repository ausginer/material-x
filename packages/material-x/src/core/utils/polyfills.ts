import { useSlot } from '@ydinjs/core/controllers/useSlot.js';
import {
  internals,
  use,
  type ControlledElement,
} from '@ydinjs/core/element.js';
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

export function useFieldSizingContentPolyfill(
  host: ControlledElement,
  textarea: HTMLTextAreaElement,
): void {
  if (CSS.supports('field-sizing', 'content')) {
    return;
  }

  const mirror = document.createElement('textarea');
  mirror.ariaHidden = 'true';
  mirror.tabIndex = -1;
  mirror.classList.add('input-polyfill');

  let frame = 0;
  const resize = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      frame = 0;

      if (textarea.hidden) {
        return;
      }

      mirror.wrap = textarea.wrap;
      mirror.style.inlineSize = `${textarea.getBoundingClientRect().width}px`;
      mirror.value = textarea.value.length > 0 ? textarea.value : ' ';

      const nextBlockSize = `${mirror.scrollHeight}px`;
      if (textarea.style.blockSize !== nextBlockSize) {
        textarea.style.blockSize = nextBlockSize;
      }
    });
  };

  use(host, {
    connected() {
      textarea.style.overflowY = 'hidden';
      textarea.addEventListener('input', resize);
      window.addEventListener('resize', resize, { passive: true });
      host.shadowRoot?.append(mirror);
      resize();
    },
    disconnected() {
      textarea.removeEventListener('input', resize);
      window.removeEventListener('resize', resize);
      if (frame !== 0) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
      mirror.remove();
    },
  });
}
