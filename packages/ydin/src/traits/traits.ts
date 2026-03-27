// oxlint-disable typescript/no-unsafe-type-assertion, typescript/no-empty-object-type
import type { Constructor } from 'type-fest';
import attr, {
  type AttributePrimitive,
  type Converter,
  type FromConverter,
  type NullablePrimitive,
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
type AttributePrimitiveFromConverter<
  T extends Readonly<Record<string, Converter | null>>,
> = {
  [K in keyof T]: T[K] extends null ? null : FromConverter<NonNullable<T[K]>>;
};

/**
 * Maps converter descriptors to the actual instance field types exposed by
 * generated accessors.
 *
 * A `null` descriptor entry acts as a placeholder for a field that will be
 * defined manually on the final instance, so no default converter-backed
 * accessor is generated for it.
 *
 * @typeParam T - Descriptor shape declared for the DOM trait.
 */
type FieldsFromConverters<
  T extends Readonly<Record<string, Converter | null>>,
> = {
  [K in keyof T]: T[K] extends null
    ? unknown
    : FromConverter<NonNullable<T[K]>>;
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
 * custom element static shape intact while adding descriptor-defined,
 * converter-backed instance fields.
 *
 * @typeParam P - Descriptor shape for the trait fields.
 * @typeParam B - External nominal brand symbol for the trait.
 */
export type Trait<
  P extends Readonly<Record<string, AttributePrimitive | null>>,
  B extends symbol = symbol,
> = AbstractTrait<
  FieldsFromAttributePrimitives<P>,
  {},
  B,
  ControlledElement,
  CustomElementStatics
>;

/**
 * Creates a DOM-aware trait with attribute-backed accessors.
 *
 * The returned trait creates a subclass of the provided base constructor,
 * merges `observedAttributes`, and generates converter-backed accessors for
 * all non-null descriptor entries. The descriptor itself remains the source of
 * truth for the public trait field contract.
 *
 * @remarks A `null` descriptor entry is intentional. It acts as a placeholder
 * for a field that should be typed as part of the trait but defined manually
 * on the final instance, so no default accessor is created for it. Placeholder
 * entries still contribute their key to `observedAttributes`. This layer does
 * not rely on auto-inferred field shapes from `Object.defineProperty(...)`;
 * the returned trait is normalized explicitly from the descriptor shape `P`.
 *
 * @typeParam P - Descriptor shape for the trait fields.
 * @typeParam B - External nominal brand symbol for the trait.
 *
 * @param props - Descriptor mapping from trait fields to converters or
 *   placeholders.
 * @param brand - External symbol used for nominal typing and `instanceof`
 *   checks.
 *
 * @returns DOM-specific trait that can be applied directly or composed through
 *   the re-exported `impl(...)`.
 */
export function trait<
  P extends Readonly<Record<string, Converter | null>>,
  B extends symbol,
>(props: P, brand: B): Trait<AttributePrimitiveFromConverter<P>, B> {
  return abstractTrait(
    (base: Constructor<ControlledElement> & CustomElementStatics) => {
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion
      const attributeNames = Reflect.ownKeys(props).filter(
        (key): key is string => typeof key === 'string',
      );
      const traited = class extends base {
        static override observedAttributes: readonly string[] = [
          ...new Set<string>([
            ...(base.observedAttributes ?? []),
            ...attributeNames,
          ]),
        ];
      };

      type TraitFields = FieldsFromConverters<P>;

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

      return traited;
    },
    brand,
  ) as Trait<AttributePrimitiveFromConverter<P>, B>;
}
