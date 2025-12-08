import type { Constructor } from 'type-fest';
import { attr, type Converter } from '../elements/attribute.ts';
import type { ReactiveElement } from '../elements/reactive-element.ts';

export function useAccessors(
  ctr: Constructor<ReactiveElement> & { observedAttributes?: string[] },
  attributes: Record<string, Converter>,
): void {
  const attributeEntries = Object.entries(attributes);
  ctr.observedAttributes ??= [];
  ctr.observedAttributes.push(...attributeEntries.map(([name]) => name));

  attributeEntries.forEach(([attribute, converter]) =>
    Reflect.defineProperty(ctr.prototype, attribute, {
      get(this: ReactiveElement) {
        return attr.get(this, attribute, converter);
      },
      set(this: ReactiveElement, value: string | boolean | number) {
        attr.set(this, attribute, value, converter);
      },
    }),
  );
}
