import type { Constructor } from 'type-fest';

export function createTemplate(str: string): HTMLTemplateElement {
  const template = document.createElement('template');
  template.innerHTML = str;
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

export function attachInternals(
  element: HTMLElement,
  overrides: Partial<ElementInternals> = {},
): ElementInternals {
  return Object.assign(element.attachInternals(), overrides);
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
