import type { ReactiveController } from './reactive-controller.ts';

export default class HrefController implements ReactiveController {
  readonly #element: HTMLElement;
  readonly #anchor: HTMLAnchorElement;
  constructor(element: HTMLElement) {
    this.#element = element;
    this.#anchor = this.#element.shadowRoot!.querySelector('a')!;
  }

  attrChanged(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (name === 'href' && oldValue !== newValue) {
      this.anchor = newValue;
    }
  }

  connected(): void {
    this.anchor = this.#element.getAttribute('href');
  }

  set anchor(value: string | null) {
    if (value) {
      this.#anchor.setAttribute('href', value);
    } else {
      this.#anchor.removeAttribute('href');
    }
  }
}
