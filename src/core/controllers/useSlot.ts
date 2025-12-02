import type { ReactiveController } from '../elements/reactive-controller.ts';
import { use, type ReactiveElement } from '../elements/reactive-element.ts';
import { $ } from '../utils/DOM.ts';
import { useEvents } from './useEvents.ts';

export type SlotControllerUpdateCallback = (
  elements: readonly Element[],
) => void;

class SlotController implements ReactiveController {
  readonly #callback: SlotControllerUpdateCallback;
  readonly #slot: HTMLSlotElement;

  constructor(
    host: ReactiveElement,
    slotSelector: string,
    callback: SlotControllerUpdateCallback,
  ) {
    this.#slot = $(host, slotSelector)!;
    this.#callback = callback;

    useEvents(host, {
      slotchange: () => this.#callback(this.#slot.assignedElements()),
    });
  }

  connected(): void {
    this.#callback(this.#slot.assignedElements());
  }
}

export function useSlot(
  host: ReactiveElement,
  slotSelector: string,
  callback: SlotControllerUpdateCallback,
): void {
  use(host, new SlotController(host, slotSelector, callback));
}
