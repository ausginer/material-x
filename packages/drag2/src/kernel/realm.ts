/**
 * One controller's owning DOM environment, derived from an element's
 * `ownerDocument` and its `defaultView`. Document listeners, scroll offsets,
 * animation frames, DOM constructors, and realm-sensitive type checks use this
 * value rather than ambient globals, so a controller created inside an iframe
 * behaves correctly.
 *
 * Construction fails explicitly when `defaultView` is `null`; falling back to
 * the ambient `window` would mix realms.
 *
 * The construction-time context carries it — `BehaviorContext` at the kernel
 * tier, the feature context at the middle tier — so a behavior schedules and
 * measures in the realm the controller was built on rather than in the ambient
 * one.
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
    throw new Error('drag: realm/no-owning-window');
  }

  return {
    document,
    window: view,
    isElement(value): value is HTMLElement {
      // This realm first. `instanceof` is exact where a bare `nodeType === 1`
      // test is not: that test accepts SVG and MathML elements, and any plain
      // object carrying the property, all of which the `HTMLElement` return
      // type claims they are not.
      if (value instanceof view.HTMLElement) {
        return true;
      }

      // Another realm's element is not `instanceof` *this* realm's constructor,
      // so reach that realm's constructor through the node's own document
      // rather than weakening the check to a duck-type.
      const foreign = (value as Node | null | undefined)?.ownerDocument
        ?.defaultView;

      return foreign != null && value instanceof foreign.HTMLElement;
    },
  };
}
