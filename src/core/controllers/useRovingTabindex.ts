import type { ReactiveElement } from '../elements/reactive-element.ts';
import { useEvents } from './useEvents.ts';

export type RovingTabindexAction = 'prev' | 'next' | 'first' | 'last';

export type RovingTabindexOptions<T extends HTMLElement> = Readonly<{
  isItem(node: unknown): node is T;
  getAction(event: KeyboardEvent): RovingTabindexAction | null;
  isItemDisabled?(item: T): boolean;
}>;

const isNeverDisabled = () => false;

export class RovingTabindexController<T extends HTMLElement> {
  readonly #isItem: (node: unknown) => node is T;
  readonly #getAction: (event: KeyboardEvent) => RovingTabindexAction | null;
  readonly #isItemDisabled: (item: T) => boolean;
  #items: readonly T[] = [];
  #activeIndex = -1;

  constructor(
    host: ReactiveElement,
    {
      isItem,
      getAction,
      isItemDisabled = isNeverDisabled,
    }: RovingTabindexOptions<T>,
  ) {
    this.#isItem = isItem;
    this.#getAction = getAction;
    this.#isItemDisabled = isItemDisabled;

    useEvents(host, {
      focusin: (event: FocusEvent) => {
        const targetIndex = this.#getTargetIndex(event);
        if (targetIndex !== -1 && targetIndex !== this.#activeIndex) {
          this.syncTabIndex(targetIndex);
        }
      },
      keydown: (event: KeyboardEvent) => {
        const action = this.#getAction(event);
        if (!action) {
          return;
        }

        event.preventDefault();

        const enabled = this.#getEnabledIndices();
        if (!enabled.length) {
          return;
        }

        if (action === 'first') {
          this.#focusIndex(enabled[0]!);
          return;
        }

        if (action === 'last') {
          this.#focusIndex(enabled.at(-1)!);
          return;
        }

        const currentIndex =
          this.#activeIndex !== -1 && this.#isEnabledAtIndex(this.#activeIndex)
            ? this.#activeIndex
            : enabled[0]!;
        const currentEnabledIndex = enabled.indexOf(currentIndex);
        const delta = action === 'next' ? 1 : -1;
        const nextEnabledIndex =
          enabled[
            (currentEnabledIndex + delta + enabled.length) % enabled.length
          ]!;

        this.#focusIndex(nextEnabledIndex);
      },
    });
  }

  set items(items: readonly T[]) {
    this.#items = items;
    for (const item of this.#items) {
      item.tabIndex = -1;
    }
    this.syncTabIndex();
  }

  syncTabIndex(preferredIndex?: number): void {
    if (!this.#items.length) {
      this.#activeIndex = -1;
      return;
    }

    const firstEnabled = this.#getFirstEnabledIndex();
    if (firstEnabled === -1) {
      for (const item of this.#items) {
        item.tabIndex = -1;
      }
      this.#activeIndex = -1;
      return;
    }

    const nextIndex =
      preferredIndex != null &&
      preferredIndex >= 0 &&
      this.#isEnabledAtIndex(preferredIndex)
        ? preferredIndex
        : this.#activeIndex >= 0 && this.#isEnabledAtIndex(this.#activeIndex)
          ? this.#activeIndex
          : firstEnabled;

    this.#setTabIndex(nextIndex);
  }

  #isEnabledAtIndex(index: number) {
    const item = this.#items[index];
    return item != null && !this.#isItemDisabled(item);
  }

  #setTabIndex(nextIndex: number) {
    const shouldActivate = this.#isEnabledAtIndex(nextIndex);
    for (let index = 0; index < this.#items.length; index++) {
      const item = this.#items[index]!;
      item.tabIndex = index === nextIndex && shouldActivate ? 0 : -1;
    }
    this.#activeIndex = nextIndex;
  }

  #getFirstEnabledIndex() {
    for (let index = 0; index < this.#items.length; index++) {
      if (this.#isEnabledAtIndex(index)) {
        return index;
      }
    }
    return -1;
  }

  #getTargetIndex(event: Event) {
    const target = event
      .composedPath()
      .find((node): node is T => this.#isItem(node));

    if (!target) {
      return -1;
    }

    return this.#items.indexOf(target);
  }

  #focusIndex(nextIndex: number) {
    if (!this.#isEnabledAtIndex(nextIndex)) {
      return;
    }

    this.#setTabIndex(nextIndex);
    this.#items[nextIndex]?.focus();
  }

  #getEnabledIndices() {
    const enabled: number[] = [];
    for (let index = 0; index < this.#items.length; index++) {
      if (this.#isEnabledAtIndex(index)) {
        enabled.push(index);
      }
    }
    return enabled;
  }
}

export function useRovingTabindex<T extends HTMLElement>(
  host: ReactiveElement,
  options: RovingTabindexOptions<T>,
): RovingTabindexController<T> {
  return new RovingTabindexController(host, options);
}
