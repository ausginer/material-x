/** The focused element, through open shadow roots. */
export function deepActiveElement(document: Document): Element | null {
  let active = document.activeElement;

  while (active?.shadowRoot?.activeElement) {
    active = active.shadowRoot.activeElement;
  }

  return active;
}
