import type { ReactiveElement } from '../elements/reactive-element.ts';
import { $$ } from '../utils/DOM.ts';
import { useSlot } from './useSlot.ts';

export function useHasSlottedPolyfill(host: ReactiveElement): void {
  for (const element of $$<HTMLSlotElement>(host, 'slot')!) {
    useSlot(host, element, (slot, elements) => {
      if (elements.length > 0) {
        slot.classList.add('has-slotted');
      } else {
        slot.classList.remove('has-slotted');
      }
    });
  }
}
