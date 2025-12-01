/* eslint-disable @typescript-eslint/no-unsafe-type-assertion */
import { isSwitchLike } from '../button/useSwitch.ts';
import { useMutationObserver } from '../core/controllers/useMutationObserver.ts';
import { useSlot } from '../core/controllers/useSlot.ts';
import type { ReactiveElement } from '../core/elements/reactive-element.ts';
import { applyToSiblings } from './utils.ts';

function apply(element: HTMLElement, value: boolean): void {
  applyToSiblings(
    element,
    (sibling) => {
      if (!sibling) {
        if (value) {
          element.dataset['leading'] = '';
        } else {
          delete element.dataset['leading'];
        }
      }
    },
    (sibling) => {
      if (!sibling) {
        if (value) {
          element.dataset['trailing'] = '';
        } else {
          delete element.dataset['trailing'];
        }
      }
    },
  );
}

export function useConnectedGroupPress(host: ReactiveElement): void {
  useSlot(host, 'slot', (elements) => {
    (elements as readonly HTMLElement[]).forEach((element) =>
      apply(element, true),
    );
  });

  useMutationObserver(
    host,
    {
      childList: true,
      attributes: true,
      subtree: true,
      attributeFilter: ['checked'],
    },
    (records) => {
      records.forEach((record) => {
        if (record.type === 'attributes' && isSwitchLike(record.target)) {
          apply(record.target, !record.target.checked);
        }
      });
    },
  );
}
