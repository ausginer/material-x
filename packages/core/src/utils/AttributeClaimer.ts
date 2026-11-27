/**
 * Writes attributes on an element that someone else owns, such as an element a
 * consumer passes to a component, only while that owner hasn't written them.
 *
 * An attribute's _own value_ is the value this instance wrote and still holds.
 * It stays the instance's own until anyone else writes or removes that
 * attribute. After that, the instance leaves the attribute as it is: a value
 * someone else wrote is never written over or removed. After someone else
 * removes an attribute, the element doesn't have it, so a later {@link set}
 * writes it again.
 *
 * This is the reverse of `setOwnARIA` in `@ydinjs/core/controllers/useARIA.js`,
 * which keeps a component's own value under the value its host has. A claimer
 * writes on a consumer's element only while the consumer hasn't.
 *
 * @remarks Create one instance per element, and call {@link release} when the
 * claims end. Another writer's change made earlier in the same task as a
 * {@link set} or {@link release} is seen before the instance writes.
 */
export class AttributeClaimer {
  readonly #element: Element;
  readonly #owned = new Set<string>();
  readonly #observer: MutationObserver;

  /**
   * @param element - The element whose attributes the instance claims.
   */
  constructor(element: Element) {
    this.#element = element;
    this.#observer = new MutationObserver((records) => {
      this.#disown(records);
    });
    this.#observer.observe(element, { attributes: true });
  }

  /**
   * Claims each attribute that `values` names.
   *
   * - A string is written when the element doesn't have the attribute, or has
   *   this instance's own value. It is then the instance's own value.
   * - `null` removes the instance's own value, and leaves a value that someone
   *   else wrote.
   * - An attribute that `values` doesn't name is left as it is.
   *
   * @param values - Attribute names and their values.
   */
  set(values: Readonly<Record<string, string | null>>): void {
    this.#write(() => {
      for (const [name, value] of Object.entries(values)) {
        if (value === null) {
          this.#remove(name);
        } else if (
          this.#owned.has(name)
            ? this.#element.getAttribute(name) !== value
            : !this.#element.hasAttribute(name)
        ) {
          this.#element.setAttribute(name, value);
          this.#owned.add(name);
        }
      }
    });
  }

  /**
   * Removes every value that is still this instance's own, and stops
   * observing the element. Call it once, and call nothing on the instance
   * after it.
   */
  release(): void {
    this.#write(() => {
      for (const name of this.#owned) {
        this.#remove(name);
      }
    });
    this.#observer.disconnect();
  }

  /**
   * Each record that reaches this method is another writer's, so its attribute
   * stops being the instance's own.
   */
  #disown(records: readonly MutationRecord[]): void {
    for (const { attributeName } of records) {
      this.#owned.delete(attributeName!);
    }
  }

  #remove(name: string): void {
    if (this.#owned.delete(name)) {
      this.#element.removeAttribute(name);
    }
  }

  /**
   * Runs the instance's own writes and removals. The pending records are
   * another writer's, so they are applied first, and the records of the
   * instance's own writes are dropped.
   */
  #write(run: () => void): void {
    this.#disown(this.#observer.takeRecords());
    run();
    this.#observer.takeRecords();
  }
}
