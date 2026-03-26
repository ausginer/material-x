// oxlint-disable typescript/promise-function-async
// oxlint-disable import/no-mutable-exports
import type { Constructor } from 'type-fest';
import {
  forEachMaybePromise,
  type ForEachMaybePromiseCallback,
} from './utils/runtime.ts';

/**
 * Controls a `ControlledElement` through optional lifecycle and attribute
 * hooks.
 */
export interface ElementController {
  /**
   * Invoked when the host receives `attributeChangedCallback`.
   *
   * @param name - The changed attribute name.
   * @param oldValue - The previous serialized value.
   * @param newValue - The next serialized value.
   */
  attrChanged?(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void | Promise<void>;

  /**
   * Invoked when the host connects to the document.
   */
  connected?(): void | Promise<void>;

  /**
   * Invoked when the host disconnects from the document.
   */
  disconnected?(): void | Promise<void>;
}

/**
 * Defines a custom element.
 *
 * @param name - The custom element tag name.
 * @param component - The element constructor to register.
 */
export function define(
  name: string,
  component: Constructor<HTMLElement>,
): void {
  customElements.define(name, component);
}

/**
 * Registers a controller on a host element.
 *
 * @remarks This helper is supported only during host construction, before the
 * first connection. Controllers added after the element has already connected
 * are not backfilled with prior lifecycle callbacks.
 *
 * @param element - The host element controlled by the given controller.
 * @param controller - The controller to register on the host.
 */
export let use: (
  element: ControlledElement,
  controller: ElementController,
) => void;

/**
 * Returns the `ElementInternals` associated with a host element.
 *
 * @param element - The host element whose internals should be returned.
 * @returns The host `ElementInternals` instance.
 */
export let getInternals: (element: ControlledElement) => ElementInternals;

/**
 * Optional static shape supported by custom elements built on this base class.
 */
export interface CustomElementStatics {
  /**
   * Enables form association for the custom element.
   */
  formAssociated?: boolean;

  /**
   * Attributes that should trigger `attributeChangedCallback`.
   */
  observedAttributes?: readonly string[];
}

/**
 * Base element that forwards DOM lifecycle and attribute callbacks to
 * registered `ElementController`s.
 *
 * @remarks `ControlledElement` does not implement its own reactivity model.
 * It acts as a lifecycle host that dispatches `connected`, `disconnected`, and
 * `attrChanged` hooks to controllers registered via `use(...)`.
 */
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
