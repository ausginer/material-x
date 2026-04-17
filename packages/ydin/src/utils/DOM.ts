/**
 * Callback invoked with an optional sibling element.
 *
 * When the sibling does not exist, the callback receives `undefined`.
 */
export type SiblingUpdateCallback = (sibling?: HTMLElement) => void;

/**
 * Callback invoked only when a sibling element is known to exist.
 */
export type ExistingSiblingUpdateCallback = (sibling: HTMLElement) => void;

/**
 * Queries a single element from the host shadow root.
 *
 * @remarks This helper searches only inside `host.shadowRoot`. If the host has
 * no shadow root, it returns `undefined`.
 */
export function $<K extends keyof HTMLElementTagNameMap>(
  host: HTMLElement,
  selectors: K,
): HTMLElementTagNameMap[K] | null | undefined;
export function $<K extends keyof SVGElementTagNameMap>(
  host: HTMLElement,
  selectors: K,
): SVGElementTagNameMap[K] | null | undefined;
export function $<K extends keyof MathMLElementTagNameMap>(
  host: HTMLElement,
  selectors: K,
): MathMLElementTagNameMap[K] | null | undefined;
/** @deprecated */
export function $<K extends keyof HTMLElementDeprecatedTagNameMap>(
  host: HTMLElement,
  selectors: K,
): HTMLElementDeprecatedTagNameMap[K] | null | undefined;
// oxlint-disable-next-line typescript/no-unnecessary-type-parameters
export function $<E extends Element = Element>(
  host: HTMLElement,
  selectors: string,
): E | null | undefined;
export function $(
  host: HTMLElement,
  selectors: string,
): Element | null | undefined {
  return host.shadowRoot?.querySelector(selectors);
}

/**
 * Queries multiple elements from the host shadow root.
 *
 * @remarks This helper searches only inside `host.shadowRoot`. If the host has
 * no shadow root, it returns `undefined`.
 */
export function $$<K extends keyof HTMLElementTagNameMap>(
  host: HTMLElement,
  selectors: K,
): NodeListOf<HTMLElementTagNameMap[K]> | undefined;
export function $$<K extends keyof SVGElementTagNameMap>(
  host: HTMLElement,
  selectors: K,
): NodeListOf<SVGElementTagNameMap[K]> | undefined;
export function $$<K extends keyof MathMLElementTagNameMap>(
  host: HTMLElement,
  selectors: K,
): NodeListOf<MathMLElementTagNameMap[K]> | undefined;
/** @deprecated */
export function $$<K extends keyof HTMLElementDeprecatedTagNameMap>(
  host: HTMLElement,
  selectors: K,
): NodeListOf<HTMLElementDeprecatedTagNameMap[K]> | undefined;
export function $$<E extends Element = Element>(
  host: HTMLElement,
  selectors: string,
): NodeListOf<E> | undefined;
export function $$(
  host: HTMLElement,
  selectors: string,
): NodeListOf<Element> | undefined {
  return host.shadowRoot?.querySelectorAll(selectors);
}

/**
 * Default event init used by `notify(...)`.
 */
export const DEFAULT_EVENT_INIT: EventInit = {
  bubbles: true,
  composed: true,
  cancelable: true,
};

/**
 * Dispatches one or more bubbling composed cancelable events on a target.
 *
 * @param target - Target that should receive the dispatched events.
 * @param events - Event names to dispatch in order.
 */
export function notify(
  target: EventTarget,
  ...events: readonly string[]
): void {
  for (const event of events) {
    target.dispatchEvent(new Event(event, DEFAULT_EVENT_INIT));
  }
}

/**
 * Adds or removes a custom state from `ElementInternals.states`.
 *
 * @param internals - Host internals whose state set should be updated.
 * @param state - State token to add or remove.
 * @param condition - Whether the state should be present.
 */
export function toggleState(
  internals: ElementInternals,
  state: string,
  condition: boolean,
): void {
  if (condition) {
    internals.states.add(state);
  } else {
    internals.states.delete(state);
  }
}
