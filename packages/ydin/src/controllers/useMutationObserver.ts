import { use, type ReactiveElement } from '../reactive-element.ts';

export type MutationObserverHookOptions = MutationObserverInit &
  Readonly<{
    callback: MutationCallback;
    connected?(observer: MutationObserver): void;
  }>;

export function useMutationObserver(
  host: ReactiveElement,
  options: MutationObserverHookOptions,
  target: HTMLElement = host,
): void {
  const observer = new MutationObserver(options.callback);

  use(host, {
    connected() {
      options.connected?.(observer);
      observer.observe(target, options);
    },
    disconnected() {
      observer.disconnect();
    },
  });
}
