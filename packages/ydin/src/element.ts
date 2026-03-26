// oxlint-disable typescript/promise-function-async
// oxlint-disable import/no-mutable-exports
import type { Constructor } from 'type-fest';
import type { ElementController } from './controller.ts';
import {
  forEachMaybePromise,
  type ForEachMaybePromiseCallback,
} from './utils/runtime.ts';

export function define(
  name: string,
  component: Constructor<HTMLElement>,
): void {
  customElements.define(name, component);
}

export let use: (
  element: ControlledElement,
  controller: ElementController,
) => void;

export let getInternals: (element: ControlledElement) => ElementInternals;

export type CustomElementStatics = {
  observedAttributes?: readonly string[];
};

export class ControlledElement extends HTMLElement {
  static {
    use = (element: ControlledElement, controller: ElementController): void => {
      element.#controllers.push(controller);
    };
    getInternals = (element: ControlledElement): ElementInternals =>
      element.#internals;
  }

  readonly #internals = this.attachInternals();
  readonly #controllers: ElementController[] = [];

  attributeChangedCallback(
    ...args: readonly [
      name: string,
      oldValue: string | null,
      newValue: string | null,
    ]
  ): void {
    this.#exec((controller) => controller.attrChanged?.(...args));
  }

  connectedCallback(): void {
    this.#exec((controller) => controller.connected?.());
  }

  disconnectedCallback(): void {
    this.#exec((controller) => controller.disconnected?.());
  }

  #exec(callback: ForEachMaybePromiseCallback<ElementController>) {
    forEachMaybePromise(this.#controllers, callback);
  }
}
