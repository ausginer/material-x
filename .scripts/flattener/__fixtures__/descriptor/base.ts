/**
 * Minimal DOM-free stand-in for `ControlledElement`: attribute storage plus the
 * `observedAttributes` static the descriptor trait merges against.
 */
export class Base {
  static observedAttributes: readonly string[] = ['data-base'];

  readonly #attributes = new Map<string, string>();

  getAttribute(name: string): string | null {
    return this.#attributes.get(name) ?? null;
  }

  setAttribute(name: string, value: string): void {
    this.#attributes.set(name, value);
  }

  removeAttribute(name: string): void {
    this.#attributes.delete(name);
  }
}
