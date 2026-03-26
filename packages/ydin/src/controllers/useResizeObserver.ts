import { use, type ControlledElement } from '../controlled-element.ts';

export function useResizeObserver(
  host: ControlledElement,
  callback: ResizeObserverCallback,
  options: ResizeObserverOptions,
  ...targets: readonly HTMLElement[]
): ResizeObserver {
  const observer = new ResizeObserver(callback);

  use(host, {
    connected() {
      for (const target of targets) {
        observer.observe(target, options);
      }
    },
    disconnected() {
      observer.disconnect();
    },
  });

  return observer;
}
