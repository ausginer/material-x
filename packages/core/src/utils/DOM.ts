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
 * Default initialization for events dispatched by notifiers created with
 * {@link createEventNotifier}.
 *
 * @remarks Event-specific definitions override these values.
 */
export const DEFAULT_EVENT_INIT: Readonly<EventInit> = {
  bubbles: true,
  composed: true,
  cancelable: true,
};

/**
 * Event initialization overrides keyed by event name.
 *
 * @typeParam T - Event names accepted by the configured notifier.
 */
export type EventDefinitions<T extends string> = Readonly<
  Record<T, Readonly<EventInit>>
>;

/**
 * Dispatches configured events on a target.
 *
 * @remarks Events are created immediately before dispatch and dispatched in
 * the order provided.
 *
 * @typeParam T - Event names accepted by the notifier.
 * @param target - Target on which to dispatch the events.
 * @param types - Event names to create and dispatch in order.
 */
export type EventNotifier<T extends string> = (
  target: EventTarget,
  ...types: readonly T[]
) => void;

/**
 * Creates a type-safe notifier from event initialization definitions.
 *
 * @remarks Each notification creates a fresh {@link Event}. Definitions are
 * merged over {@link DEFAULT_EVENT_INIT}, allowing individual events to
 * override bubbling, composition, or cancellation behavior.
 *
 * @typeParam T - Event names defined by `definitions`.
 * @param definitions - Initialization overrides keyed by event name.
 * @returns A notifier restricted to the configured event names.
 */
export function createEventNotifier<T extends string>(
  definitions: EventDefinitions<T>,
): EventNotifier<T> {
  return (target, ...types) => {
    for (const type of types) {
      target.dispatchEvent(
        new Event(type, {
          ...DEFAULT_EVENT_INIT,
          ...definitions[type],
        }),
      );
    }
  };
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

/**
 * Switches a custom state from one value to another in `ElementInternals.states`.
 *
 * Removes `oldState` if non-null and adds `newState` if non-null. Use for
 * value-based attributes where the attribute value is the state name itself
 * (e.g. `color='elevated'` → state `elevated`). Pass old and new serialized
 * attribute values directly — null is treated as "no state".
 *
 * @param internals - Host internals whose state set should be updated.
 * @param oldState - State token to remove, or null.
 * @param newState - State token to add, or null.
 */
export function switchState(
  internals: ElementInternals,
  oldState: string | null,
  newState: string | null,
): void {
  if (oldState != null) {
    internals.states.delete(oldState);
  }

  if (newState != null) {
    internals.states.add(newState);
  }
}

export class FrameRequestHandler {
  #scheduled = false;
  #handle = -1;

  schedule(callback: FrameRequestCallback): void {
    if (!this.#scheduled) {
      this.#handle = requestAnimationFrame(callback);
      this.#scheduled = true;
    }
  }

  cancel(): void {
    cancelAnimationFrame(this.#handle);
    this.#scheduled = false;
  }
}
