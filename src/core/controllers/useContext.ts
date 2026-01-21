import { use, type ReactiveElement } from '../elements/reactive-element.ts';
import { DEFAULT_EVENT_INIT } from '../utils/DOM.ts';
import { useEvents } from './useEvents.ts';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const $ctx: unique symbol;

export type Context<T> = string & { brand: typeof $ctx; value: T };

class ContextEvent extends Event {
  value?: unknown;
}

export function createContext<T>(): Context<T> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
  return crypto.randomUUID() as Context<T>;
}

export function useProvider<T>(
  host: ReactiveElement,
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

// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
export type ContextEffect<T> = (value: T | undefined) => AbortController | void;

export function useContext<T>(
  host: ReactiveElement,
  ctx: Context<T>,
  effect: ContextEffect<T>,
): void {
  // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
  let disposer: AbortController | void;

  use(host, {
    connected() {
      const event = new ContextEvent(ctx, DEFAULT_EVENT_INIT);
      host.dispatchEvent(event);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
      disposer = effect(event.value as T | undefined);
    },
    disconnected() {
      disposer?.abort();
    },
  });
}
