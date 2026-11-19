export type Converter<T> = Readonly<{
  from(value: string | null): T;
  to(value: T): string | null;
}>;
export const Bool: Converter<boolean> = {
  from: (value) => value !== null,
  to: (value) => (value ? '' : null),
};
export default {
  get<T>(host: HTMLElement, name: string, c: Converter<T>): T {
    return c.from(host.getAttribute(name));
  },
  set<T>(host: HTMLElement, name: string, value: T, c: Converter<T>): void {
    const raw = c.to(value);
    if (raw === null) host.removeAttribute(name);
    else host.setAttribute(name, raw);
  },
};
export function attr<T>(
  _converter: Converter<T>,
): <This extends HTMLElement>(
  target: ClassAccessorDecoratorTarget<This, T>,
  context: ClassAccessorDecoratorContext<This, T>,
) => void {
  throw new Error('removed by the flattener');
}
