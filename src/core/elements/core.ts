/* eslint-disable import-x/no-mutable-exports */
import AriaController from './aria-controller.ts';
import type { ReactiveController } from './reactive-controller.ts';

export let use: (
  element: CoreElement,
  ...controllers: readonly ReactiveController[]
) => void;

export default class CoreElement extends HTMLElement {
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
