import type { Converter } from './marker.ts';

export default {
  get<T>(host: HTMLElement, name: string, converter: Converter<T>): T {
    return converter.from(host.getAttribute(name));
  },
  set<T>(
    host: HTMLElement,
    name: string,
    value: T,
    converter: Converter<T>,
  ): void {
    const raw = converter.to(value);
    if (raw === null) host.removeAttribute(name);
    else host.setAttribute(name, raw);
  },
};
