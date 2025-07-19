import type { Constructor } from 'type-fest';

export const ariaAttributes = Object.keys(ElementInternals.prototype)
  .filter((key) => key.startsWith('aria'))
  .map((key) =>
    key.replace('aria', 'aria-').toLowerCase(),
  ) as readonly string[];

export function createTemplate(
  str: string,
  ...tweaks: ReadonlyArray<(template: HTMLTemplateElement) => void>
): HTMLTemplateElement {
  const template = document.createElement('template');
  template.innerHTML = str;
  tweaks.forEach((tweak) => tweak(template));
  return template;
}

export function attachShadow(
  element: HTMLElement,
  template: HTMLTemplateElement,
  styles: readonly CSSStyleSheet[],
): ShadowRoot {
  const root = element.attachShadow({ mode: 'open' });
  root.append(template.content.cloneNode(true));
  root.adoptedStyleSheets.push(...styles);
  return root;
}

export function setDefaultAttributes(
  element: HTMLElement,
  attributes: Readonly<Record<string, string>>,
): void {
  for (const [key, value] of Object.entries(attributes)) {
    if (!element.hasAttribute(key)) {
      element.setAttribute(key, value);
    }
  }
}

export function define(
  name: string,
  component: Constructor<HTMLElement>,
): void {
  customElements.define(name, component);
}
