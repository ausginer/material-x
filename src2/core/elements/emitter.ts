export type Unsubscribe = () => void;

export class EventEmitter<T> extends EventTarget {
  on(
    callback: (data: T) => void | Promise<void>,
    controller: AbortController = new AbortController(),
  ): AbortController {
    this.addEventListener(
      '',
      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
      (({ detail }: CustomEvent<T>) => void callback(detail)) as EventListener,
      { signal: controller.signal },
    );
    return controller;
  }

  emit(data: T): void {
    this.dispatchEvent(new CustomEvent<T>('', { detail: data }));
  }
}
