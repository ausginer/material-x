import type { Constructor } from 'type-fest';
import attr, {
  type AttributePrimitive,
  type NullablePrimitive,
  type ToConverter,
} from '../attribute.ts';
import type { ControlledElement, CustomElementStatics } from '../element.js';
import {
  trait as abstractTrait,
  type Trait as AbstractTrait,
} from './piirre.ts';

/**
 * Re-exported generic trait composition helpers from `piirre`.
 *
 * See `piirre.impl(...)` for the tuple-first composition guidance: readonly
 * tuple trait lists are the intended path, while plain arrays weaken type
 * inference.
 */
export { impl, type TraitedConstructor } from './piirre.ts';

/**
 * Maps descriptor primitive fields to the built-in attribute converter tuples
 * expected by `trait(...)`.
 *
 * @typeParam T - Descriptor shape declared for the DOM trait.
 */
type ConvertersFromAttributePrimitives<
  T extends Readonly<Record<string, AttributePrimitive | null>>,
> = {
  [K in keyof T]: T[K] extends null ? null : ToConverter<NonNullable<T[K]>>;
};

/**
 * Maps descriptor primitive fields to the actual instance field types exposed
 * by generated accessors.
 *
 * `boolean` fields stay non-nullable, while `number` and `string` become
 * nullable through `NullablePrimitive`. A `null` descriptor entry acts as a
 * placeholder for a field that will be defined manually on the final
 * instance, so no default converter-backed accessor is generated for it.
 *
 * @typeParam T - Descriptor shape declared for the DOM trait.
 */
type FieldsFromAttributePrimitives<
  T extends Readonly<Record<string, AttributePrimitive | null>>,
> = {
  [K in keyof T]: T[K] extends null
    ? unknown
    : NullablePrimitive<NonNullable<T[K]>>;
};

/**
 * DOM-specific trait contract built on top of the generic `piirre` engine.
 *
 * This variant is intended for `ControlledElement` subclasses and keeps the
 * custom element static shape intact while adding converter-backed instance
 * fields.
 *
 * @typeParam T - Instance side of the base controlled element.
 * @typeParam U - Static custom-element side of the base constructor.
 * @typeParam P - Descriptor shape for the trait fields.
 * @typeParam B - External nominal brand symbol for the trait.
 */
export type Trait<
  T extends ControlledElement,
  U extends CustomElementStatics,
  P extends Readonly<Record<string, AttributePrimitive | null>>,
  B extends symbol = symbol,
> = AbstractTrait<T, U, FieldsFromAttributePrimitives<P>, U, B>;

/**
 * Creates a DOM-aware trait with attribute-backed accessors.
 *
 * The returned trait creates a subclass of the provided base constructor,
 * merges `observedAttributes`, and generates converter-backed accessors for
 * all non-null descriptor entries.
 *
 * @remarks A `null` descriptor entry is intentional. It acts as a placeholder
 * for a field that should be typed as part of the trait but defined manually
 * on the final instance, so no default accessor is created for it. Placeholder
 * entries still contribute their key to `observedAttributes`.
 *
 * @typeParam T - Instance side of the base controlled element.
 * @typeParam U - Static custom-element side of the base constructor.
 * @typeParam P - Descriptor shape for the trait fields.
 * @typeParam B - External nominal brand symbol for the trait.
 *
 * @param props - Descriptor mapping from trait fields to converters or
 *   placeholders.
 * @param brand - External symbol used for nominal typing and `instanceof`
 *   checks.
 * @returns DOM-specific trait that can be applied directly or composed through
 *   the re-exported `impl(...)`.
 */
export function trait<
  T extends ControlledElement,
  U extends CustomElementStatics,
  P extends Readonly<Record<string, AttributePrimitive | null>>,
  B extends symbol,
>(props: ConvertersFromAttributePrimitives<P>, brand: B): Trait<T, U, P, B> {
  return abstractTrait<T, U, FieldsFromAttributePrimitives<P>, U, B>((base) => {
    const traited = class extends base {
      static override observedAttributes = [
        ...new Set([...(base.observedAttributes ?? []), ...Object.keys(props)]),
      ];
    };

    type TraitFields = FieldsFromAttributePrimitives<P>;

    for (const [attribute, converter] of Object.entries(props)) {
      if (converter != null) {
        Object.defineProperty(traited.prototype, attribute, {
          get(this: HTMLElement): TraitFields[typeof attribute] {
            // @ts-expect-error: generic attribute/converter pairing
            return attr.get(this, attribute, converter);
          },
          set(this: HTMLElement, value: TraitFields[typeof attribute]) {
            // @ts-expect-error: generic attribute/converter pairing
            attr.set(this, attribute, value, converter);
          },
        });
      }
    }

    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    return traited as Constructor<T & TraitFields> & U;
  }, brand);
}
