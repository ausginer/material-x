import { use, type ControlledElement } from '../element.ts';
import type { Unsubscribe } from '../emitter.ts';
import { DEFAULT_EVENT_INIT } from '../utils/DOM.ts';
import { useEvents } from './useEvents.ts';

declare const $ctx: unique symbol;

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
 * @remarks Requires launch over HTTPS because it uses `crypto.randomUUID`
 * internally.
 *
 * @typeParam T - The stable value shape exposed through this context.
 * @returns A - unique opaque context token.
 */
export function createContext<T>(): Context<T> {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return crypto.randomUUID() as Context<T>;
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
 * The returned cleanup function is called when the consumer is disconnected.
 *
 * @typeParam T - The stable value shape exposed through this context.
 * @param value - The currently resolved provider value, if any.
 * @returns Cleanup - for manual subscriptions, if needed.
 */
export type ContextEffect<T> = (
  value: T | undefined,
) => Unsubscribe | undefined;

/**
 * Resolves the nearest provider value when the host connects or reconnects.
 *
 * This controller performs context lookup on connection boundaries only. It
 * does not react to provider value replacement after connection, so consumers
 * should treat the resolved value as a long-lived object and subscribe to
 * updates inside it, for example through a nested `EventEmitter`.
 *
 * The effect may return a cleanup function for manual subscriptions.
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

  use(host, {
    connected() {
      const event = new ContextEvent(ctx, DEFAULT_EVENT_INIT);
      host.dispatchEvent(event);

      // oxlint-disable-next-line typescript/no-unsafe-type-assertion
      disposer = effect(event.value as T | undefined);
    },
    disconnected() {
      disposer?.();
    },
  });
}
