export type Unsubscribe = () => void;

export class EventEmitter<T> extends EventTarget {
  on(callback: (data: T) => void | Promise<void>): Unsubscribe {
    const ctrl = new AbortController();
    this.addEventListener(
      '',
      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
      (({ detail }: CustomEvent<T>) => void callback(detail)) as EventListener,
      { signal: ctrl.signal },
    );
    return () => ctrl.abort();
  }

  emit(data: T): void {
    this.dispatchEvent(new CustomEvent<T>('', { detail: data }));
  }
}
