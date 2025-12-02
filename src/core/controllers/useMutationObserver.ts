import { use, type ReactiveElement } from '../elements/reactive-element.ts';

export function useMutationObserver(
  host: ReactiveElement,
  options: MutationObserverInit,
  callback: MutationCallback,
): void {
  const observer = new MutationObserver(callback);

  use(host, {
    connected() {
      observer.observe(host, options);
    },
    disconnected() {
      observer.disconnect();
    },
  });
}
