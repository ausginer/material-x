/* eslint-disable import-x/no-mutable-exports */
import type { Constructor } from 'type-fest';
import AriaController from './aria-controller.ts';
import type { ReactiveController } from './reactive-controller.ts';

export function template(
  str: TemplateStringsArray,
  ...args: readonly unknown[]
): HTMLTemplateElement {
  const template = document.createElement('template');
  template.innerHTML = str.reduce(
    (acc, part, index) =>
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      `${acc}${part}${args[index] ? String(args[index]) : ''}`,
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
  element: CoreElement,
  ...controllers: readonly ReactiveController[]
) => void;

export class CoreElement extends HTMLElement {
  static {
    use = (element, ...controllers) => {
      element.#controllers.push(...controllers);
    };
  }

  readonly #internals = this.attachInternals();
  readonly #controllers: ReactiveController[] = [];

  constructor(
    template: HTMLTemplateElement,
    aria: Partial<ARIAMixin>,
    styles: CSSStyleSheet[],
    init: Partial<ShadowRootInit> = {},
  ) {
    super();
    Object.assign(this.#internals, aria);
    const root = this.attachShadow({ mode: 'open', ...init });
    root.adoptedStyleSheets = styles;
    root.append(template.content.cloneNode(true));
    use(this, new AriaController(this.#internals));
  }

  attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    this.#controllers.forEach((controller) =>
      controller.attrChanged?.(name, oldValue, newValue),
    );
  }

  connectedCallback(): void {
    this.#controllers.forEach((controller) => controller.connected?.());
  }

  disconnectedCallback(): void {
    this.#controllers.forEach((controller) => controller.disconnected?.());
  }
}
