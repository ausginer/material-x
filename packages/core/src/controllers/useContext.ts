import { use, type ControlledElement } from '../element.ts';
import type { Unsubscribe } from '../emitter.ts';
import { useEvents } from './useEvents.ts';

declare const $ctx: unique symbol;

const CONTEXT_EVENT_INIT: Readonly<EventInit> = {
  bubbles: true,
  cancelable: false,
  composed: true,
};

/**
 * Opaque identifier for a provider/consumer context channel.
 *
 * @typeParam T - The stable value shape exposed by the provider.
 */
export type Context<T> = string & { brand: typeof $ctx; value: T };

class ContextEvent extends Event {
  value?: unknown;
}

/**
 * Creates a unique context identifier that providers and consumers can share.
 *
 * The token is the event type that a consumer dispatches and its provider
 * listens for. It is unique on the page, also across copies of this package,
 * and isn't a secret. Creating one is safe in any context, secure or not, and
 * touches no document.
 *
 * @typeParam T - The stable value shape exposed through this context.
 * @returns A unique opaque context token.
 */
export function createContext<T>(): Context<T> {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return `ydin-context-${Math.random()}` as Context<T>;
}

/**
 * Registers a provider for descendants that resolve the same context.
 *
 * The provided `value` is expected to stay stable by reference for as long as
 * the provider is connected. If the exposed state changes over time, keep the
 * same object and publish updates through a nested `EventEmitter` or another
 * manual observable mechanism instead of replacing the whole value object.
 *
 * @remarks Provider and consumer composition on the same host is unsupported.
 * For same-host coordination, use a local `EventEmitter` directly.
 *
 * @typeParam T - The stable value shape exposed through this context.
 * @param host - The provider host element.
 * @param ctx - The context channel to resolve.
 * @param value - The stable provider value shared with descendants.
 */
export function useProvider<T>(
  host: ControlledElement,
  ctx: Context<T>,
  value: T,
): void {
  useEvents(host, {
    [ctx](event: ContextEvent) {
      event.stopPropagation();
      event.value = value;
    },
  });
}

/**
 * Effect invoked with the currently resolved provider value.
 *
 * It runs at most once for each connection of the consumer. The returned
 * cleanup function is called once, when that connection ends.
 *
 * @typeParam T - The stable value shape exposed through this context.
 * @param value - The currently resolved provider value, if any.
 * @returns Cleanup - for manual subscriptions, if needed.
 */
export type ContextEffect<T> = (
  value: T | undefined,
) => Unsubscribe | undefined;

/**
 * Resolves the nearest provider value each time the host connects.
 *
 * When the host's parent is a custom element, or the host of the shadow root
 * the host is at the top level of, the lookup waits for that element's
 * definition, through the registry that defines it, and then runs. So the
 * provider is found in whatever order the two elements are defined, and the
 * effect runs asynchronously, in a microtask after the connect at the
 * earliest, even when the parent is already defined. While the parent stays
 * undefined, the effect doesn't run. Only the parent is waited for: an
 * undefined custom element further up isn't. With any other parent the lookup
 * runs synchronously on connect.
 *
 * The effect runs at most once for each connection, with the value or with
 * `undefined` when no provider answers. A connection that ends before its
 * lookup runs does nothing. The lookup doesn't react to provider value
 * replacement after it, so consumers should treat the resolved value as a
 * long-lived object and subscribe to updates inside it, for example through a
 * nested `EventEmitter`. The effect may return a cleanup function for manual
 * subscriptions.
 *
 * @typeParam T - The stable value shape exposed through this context.
 * @param host - The consumer host element.
 * @param ctx - The context channel to resolve.
 * @param effect - Callback invoked with the resolved provider value.
 */
export function useContext<T>(
  host: ControlledElement,
  ctx: Context<T>,
  effect: ContextEffect<T>,
): void {
  let disposer: Unsubscribe | undefined;
  // Each connect and each disconnect advances the count, so a lookup that
  // settles after its connection ended does nothing.
  let connection = 0;

  const resolve = (): void => {
    const event = new ContextEvent(ctx, CONTEXT_EVENT_INIT);
    host.dispatchEvent(event);

    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    disposer = effect(event.value as T | undefined);
  };

  use(host, {
    connected() {
      connection += 1;
      const current = connection;
      const node = host.parentNode;
      const parent =
        node instanceof ShadowRoot ? node.host : host.parentElement;

      // Every custom element name has a hyphen, and no built-in name does.
      if (parent?.localName.includes('-')) {
        // A rejection is a reserved hyphenated name, which isn't a custom
        // element, so the lookup runs then too.
        const settle = (): void => {
          if (current === connection) {
            resolve();
          }
        };

        (parent.customElementRegistry ?? customElements)
          .whenDefined(parent.localName)
          .then(settle, settle);
      } else {
        resolve();
      }
    },
    disconnected() {
      connection += 1;
      disposer?.();
      disposer = undefined;
    },
  });
}
