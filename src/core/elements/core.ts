import type { Constructor } from 'type-fest';
import AriaController from './aria-controller.ts';
import type { ReactiveController } from './reactive-controller.ts';

// eslint-disable-next-line import-x/no-mutable-exports
let use: (element: CoreElement, ctr: Constructor<ReactiveController>) => void;

export default class CoreElement extends HTMLElement {
  static {
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    use = (element, ctr) => {
      const controller = new ctr(element, element.#internals);
      element.#controllers.push(controller);
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
    use(this, AriaController);
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

export { use };
