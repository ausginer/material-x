import { use, type ReactiveElement } from '../elements/reactive-element.ts';

export type ResizeObserverHookOptions = ResizeObserverOptions &
  Readonly<{
    callback: ResizeObserverCallback;
    connected?(): void;
  }>;

export function useResizeObserver(
  host: ReactiveElement,
  options: ResizeObserverHookOptions,
  ...targets: readonly HTMLElement[]
): ResizeObserver {
  const observer = new ResizeObserver(options.callback);

  use(host, {
    connected() {
      options.connected?.();
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
