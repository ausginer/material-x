import type { Constructor } from 'type-fest';

export function template(
  str: TemplateStringsArray,
  ...args: readonly unknown[]
): HTMLTemplateElement {
  const template = document.createElement('template');
  template.innerHTML = str.reduce(
    (acc, part, index) =>
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      `${acc}${part}${args[index] ? String(args[index]) : ''}`,
    '',
  );
  return template;
}

export function define(
  name: string,
  component: Constructor<HTMLElement>,
): void {
  customElements.define(name, component);
}
