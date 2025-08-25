import type { ReactiveController } from './reactive-controller.ts';

export default class AttributeTransmitter implements ReactiveController {
  readonly #target: HTMLElement;
  readonly #name: string;
  constructor(target: HTMLElement, name: string) {
    this.#target = target;
    this.#name = name;
  }

  attrChanged(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (name === this.#name && oldValue !== newValue) {
      if (newValue != null) {
        this.#target.setAttribute(this.#name, newValue);
      } else {
        this.#target.removeAttribute(this.#name);
      }
    }
  }
}
