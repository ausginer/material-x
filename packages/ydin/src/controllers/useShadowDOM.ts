import type { ControlledElement } from '../element.ts';

/**
 * Attaches an open shadow root, adopts stylesheets, and clones template
 * content into the host.
 *
 * @remarks This helper is intended for constructor-time, single use on a host.
 * It accepts only `CSSStyleSheet` instances; packages that import styles in a
 * different shape should normalize them outside `ydin`.
 *
 * @param host - Host element that should receive a shadow root.
 * @param templates - Templates whose contents should be cloned into the root.
 * @param styles - Stylesheets to adopt into the shadow root.
 * @param init - Additional shadow root init options.
 */
export function useShadowDOM(
  host: ControlledElement,
  templates: readonly HTMLTemplateElement[],
  styles: readonly CSSStyleSheet[],
  init?: Partial<ShadowRootInit>,
): void {
  const root = host.attachShadow({ mode: 'open', ...init });
  root.adoptedStyleSheets = [...styles];

  for (const template of templates) {
    root.append(template.content.cloneNode(true));
  }
}
