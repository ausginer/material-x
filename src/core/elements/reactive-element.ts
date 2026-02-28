// oxlint-disable import/no-mutable-exports
import type { Constructor } from 'type-fest';
import type { ReactiveController } from './reactive-controller.ts';

export function html(
  str: TemplateStringsArray,
  ...args: readonly unknown[]
): HTMLTemplateElement {
  const template = document.createElement('template');
  template.innerHTML = str.reduce(
    (acc, part, index) =>
      `${acc}${part}${
        args[index]
          ? args[index] instanceof HTMLTemplateElement
            ? args[index].innerHTML
            : // eslint-disable-next-line @typescript-eslint/no-base-to-string
              String(args[index])
          : ''
      }`,
    '',
  );
  return template;
}

export function define(
  name: string,
  component: Constructor<HTMLElement>,
): void {
  customElements.define(name, component);
}

export let use: (
  element: ReactiveElement,
  ...controllers: readonly ReactiveController[]
) => void;

export let getInternals: (element: ReactiveElement) => ElementInternals;

export type CustomElementStatics = {
  observedAttributes?: readonly string[];
};

export class ReactiveElement extends HTMLElement {
  static {
    use = (
      element: ReactiveElement,
      ...controllers: readonly ReactiveController[]
    ): void => {
      element.#controllers.push(...controllers);
    };
    getInternals = (element: ReactiveElement): ElementInternals =>
      element.#internals;
  }

  readonly #internals = this.attachInternals();
  readonly #controllers: ReactiveController[] = [];

  attributeChangedCallback(
    ...args: readonly [
      name: string,
      oldValue: string | null,
      newValue: string | null,
    ]
  ): void {
    this.#controllers.forEach(
      (controller) => void controller.attrChanged?.(...args),
    );
  }

  connectedCallback(): void {
    this.#controllers.forEach((controller) => void controller.connected?.());
  }

  disconnectedCallback(): void {
    this.#controllers.forEach((controller) => void controller.disconnected?.());
  }
}
