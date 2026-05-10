import { useSlot } from 'ydin/controllers/useSlot.js';
import { getInternals, use, type ControlledElement } from 'ydin/element.js';
import { $$, toggleState } from 'ydin/utils/DOM.js';

const DEFAULT_SLOT_STATE_NAME = 'default';
const HOST_HAS_SUPPORTED = (() => {
  const host = document.createElement('div');
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML =
    '<style>:host{--_has:0}:host:has(slot){--_has:1}</style><slot></slot>';
  document.body.append(host);
  const hasSupport = getComputedStyle(host).getPropertyValue('--_has') === '1';
  host.remove();

  return hasSupport;
})();

export function useHasSlottedPolyfill(host: ControlledElement): void {
  const internals = getInternals(host);

  for (const slot of $$<HTMLSlotElement>(host, 'slot')!) {
    useSlot(host, slot, (slot, nodes) => {
      const hasNodes = nodes.length > 0;

      slot.classList.toggle('has-slotted', hasNodes);

      if (!HOST_HAS_SUPPORTED) {
        toggleState(
          internals,
          `has-${slot.name || DEFAULT_SLOT_STATE_NAME}`,
          hasNodes,
        );
      }
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
