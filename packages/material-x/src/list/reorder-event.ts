export type ReorderEventInit = Readonly<{
  item: HTMLElement;
  from: number;
  to: number;
  /** The item before the new slot, or `null` at the start. */
  previous: HTMLElement | null;
  /** The item after the new slot, or `null` at the end. */
  next: HTMLElement | null;
}>;

/**
 * A proposed move of one item. `list.insertBefore(event.item, event.next)`
 * applies it, and `preventDefault()` rejects it.
 */
export class ReorderEvent extends Event {
  declare readonly item: HTMLElement;
  declare readonly from: number;
  declare readonly to: number;
  declare readonly previous: HTMLElement | null;
  declare readonly next: HTMLElement | null;

  constructor(init: ReorderEventInit) {
    super('reorder', { bubbles: true, cancelable: true, composed: true });
    Object.assign(this, init);
  }
}
