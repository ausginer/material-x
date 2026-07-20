/**
 * One controller's owning DOM environment, derived from an element's
 * `ownerDocument` and its `defaultView`. Document listeners, scroll offsets,
 * animation frames, media queries, DOM constructors, and realm-sensitive type
 * checks use this value rather than ambient globals, so a controller created
 * inside an iframe behaves correctly.
 *
 * Construction fails explicitly when `defaultView` is `null`; falling back to
 * the ambient `window` would mix realms.
 */
export type DOMRealm = Readonly<{
  document: Document;
  window: Window & typeof globalThis;
  /** Structural check for an element belonging to this or any realm. */
  isElement(value: unknown): value is HTMLElement;
}>;

export function createRealm(element: Element): DOMRealm {
  const document = element.ownerDocument;
  const view = document.defaultView;

  if (!view) {
    throw new Error('drag: element has no owning window (detached document).');
  }

  return {
    document,
    window: view,
    isElement(value): value is HTMLElement {
      // Structural, cross-realm safe: an element from another realm is not an
      // `instanceof this.window.HTMLElement`, so duck-type on `nodeType`.
      return (
        typeof value === 'object' &&
        value !== null &&
        (value as Node).nodeType === 1
      );
    },
  };
}
