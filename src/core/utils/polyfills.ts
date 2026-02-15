import { useSlot } from '../controllers/useSlot.ts';
import {
  getInternals,
  use,
  type ReactiveElement,
} from '../elements/reactive-element.ts';
import { $$, toggleState } from './DOM.ts';

export function useHasSlottedPolyfill(host: ReactiveElement): void {
  const internals = getInternals(host);

  for (const element of $$<HTMLSlotElement>(host, 'slot')!) {
    useSlot(host, element, (slot, elements) => {
      toggleState(internals, `has-${slot.name}`, elements.length > 0);
    });
  }
}

export function useFieldSizingContentPolyfill(
  host: ReactiveElement,
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
