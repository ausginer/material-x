import type { ReactiveElement } from '../elements/reactive-element.ts';
import { useConnected } from './useConnected.ts';
import { useEvents } from './useEvents.ts';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const $ctx: unique symbol;

export type Context = string & { brand: typeof $ctx };

class ContextEvent extends Event {
  value?: unknown;
}

export function createContext(): Context {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
  return crypto.randomUUID() as Context;
}

export function useProvider(
  host: ReactiveElement,
  ctx: Context,
  value: unknown,
): void {
  useEvents(host, {
    [ctx](event: ContextEvent) {
      event.stopPropagation();
      event.value = value;
    },
  });
}

export async function useContext<T>(
  host: ReactiveElement,
  ctx: Context,
): Promise<T | undefined> {
  const { promise, resolve } = Promise.withResolvers<T | undefined>();

  useConnected(host, () => {
    const event = new ContextEvent(ctx);
    host.dispatchEvent(event);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    resolve(event.value as T | undefined);
  });

  return await promise;
}
