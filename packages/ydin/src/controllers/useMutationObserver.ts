import { use, type ControlledElement } from '../element.ts';

export function useMutationObserver(
  host: ControlledElement,
  callback: MutationCallback,
  options?: MutationObserverInit,
  target: HTMLElement = host,
): void {
  const observer = new MutationObserver(callback);

  use(host, {
    connected() {
      observer.observe(target, options);
    },
    disconnected() {
      observer.disconnect();
    },
  });
}
