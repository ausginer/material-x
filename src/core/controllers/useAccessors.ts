import type { Constructor } from 'type-fest';
import { ATTRIBUTE, type Converter } from '../elements/attribute.ts';
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
        return ATTRIBUTE.get(this, attribute, converter);
      },
      set(this: ReactiveElement, value: string | boolean | number) {
        ATTRIBUTE.set(this, attribute, value, converter);
      },
    }),
  );
}
