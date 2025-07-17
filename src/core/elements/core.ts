import type { ReactiveController } from './reactive-controller';

const AriaMapping: Readonly<Record<string, keyof ARIAMixin>> = {
  checked: 'ariaChecked',
  disabled: 'ariaDisabled',
};

export default class CoreElement extends HTMLElement {
  readonly #internals = this.attachInternals();
  readonly #controllers: ReactiveController[] = [];

  constructor(
    template: HTMLTemplateElement,
    aria: Partial<ARIAMixin>,
    styles: CSSStyleSheet[],
  ) {
    super();
    Object.assign(this.#internals, aria);
    const root = this.attachShadow({ mode: 'open' });
    root.adoptedStyleSheets = styles;
    root.append(template.content.cloneNode(true));
  }

  attributeChangedCallback(
    name: string,
    _: string | null,
    newValue: string | null,
  ): void {
    if (name in AriaMapping) {
      this.#internals[AriaMapping[name]] = newValue;
    }
  }

  addController(controller: ReactiveController): void {
    this.#controllers.push(controller);
  }

  connectedCallback(): void {
    this.#controllers.forEach((controller) => controller.connected?.());
  }

  disconnectedCallback(): void {
    this.#controllers.forEach((controller) => controller.disconnected?.());
  }
}
