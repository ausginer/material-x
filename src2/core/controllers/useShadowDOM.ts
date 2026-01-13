import type { ReactiveElement } from '../elements/reactive-element';

export function useShadowDOM(
  host: ReactiveElement,
  template: HTMLTemplateElement,
  styles: CSSStyleSheet[],
  init?: Partial<ShadowRootInit>,
): void {
  const root = host.attachShadow({ mode: 'open', ...init });
  root.adoptedStyleSheets = styles;
  root.append(template.content.cloneNode(true));
}
