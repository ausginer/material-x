const map = new WeakMap<HTMLElement, ElementInternals>();

export function useInternals(host: HTMLElement): ElementInternals {
  let internals = map.get(host);

  if (!internals) {
    internals = host.attachInternals();
    map.set(host, internals);
  }

  return internals;
}
