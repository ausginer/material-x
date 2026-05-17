import { DEFAULT_EVENT_INIT } from './DOM.ts';

/**
 * Fired by a reorderable container when the user drops a dragged item at a new
 * position. DOM reordering is left to the consumer.
 */
export class ReorderEvent extends Event {
  readonly item: HTMLElement;
  readonly fromIndex: number;
  readonly toIndex: number;

  constructor(item: HTMLElement, fromIndex: number, toIndex: number) {
    super('reorder', DEFAULT_EVENT_INIT);
    this.item = item;
    this.fromIndex = fromIndex;
    this.toIndex = toIndex;
  }
}
