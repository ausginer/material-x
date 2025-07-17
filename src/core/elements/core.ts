import type { Constructor } from 'type-fest';
import AriaController from './aria-controller.ts';
import type { ReactiveController } from './reactive-controller.ts';

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
    this.use(AriaController);
  }

  use(ctr: Constructor<ReactiveController>): void {
    const controller = new ctr(this, this.#internals);
    this.#controllers.push(controller);
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
