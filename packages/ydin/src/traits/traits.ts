// oxlint-disable typescript/no-unsafe-type-assertion, typescript/no-empty-object-type
import type { Constructor, Simplify } from 'type-fest';
import attr, {
  type AttributePrimitive,
  type ConverterOf,
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
 * Maps converter descriptors to the actual instance field types exposed by
 * generated accessors.
 *
 * @typeParam T - Descriptor shape declared for the element trait.
 */
type FieldsFromConverters<
  T extends Readonly<Record<string, ConverterOf<any>>>,
> = {
  [K in keyof T]: FromConverter<T[K]>;
};

/**
 * Element trait contract built on top of the generic `piirre` engine.
 *
 * This variant is intended for `ControlledElement` subclasses and keeps the
 * custom element static shape intact while adding descriptor-defined,
 * converter-backed instance fields.
 *
 * @typeParam P - Descriptor shape for the trait fields.
 * @typeParam B - External nominal brand symbol for the trait.
 */
export type Trait<
  P extends Readonly<Record<string, NullablePrimitive<AttributePrimitive>>>,
  B extends symbol = symbol,
> = AbstractTrait<P, {}, B, ControlledElement, CustomElementStatics>;

/**
 * Optional framework-facing props derived from a trait descriptor.
 *
 * This is intended for React and other UI frameworks that pass values as plain
 * props rather than through trait-aware instances. Concrete trait fields
 * become optional props with non-null values.
 *
 * @typeParam T - Descriptor shape declared for the element trait.
 */
type PropsFromTraitFields<
  T extends Readonly<Record<string, NullablePrimitive<AttributePrimitive>>>,
> = {
  [K in keyof T]?: NonNullable<T[K]>;
};

/**
 * Framework-facing props derived from a concrete element trait.
 *
 * This helper projects a trait back to its descriptor-based prop shape, which
 * is useful when exposing framework adapters or component prop types.
 *
 * @typeParam T - Element trait whose props should be extracted.
 */
export type Props<T extends Trait<any, any>> =
  T extends Trait<infer P, any> ? PropsFromTraitFields<P> : never;

/**
 * Branded instance interface exposed by a concrete element trait.
 *
 * This helper is the instance-side counterpart to `Props`: it produces the
 * field interface contributed by the trait together with its nominal brand, so
 * it can be reused in host and component instance types.
 *
 * @typeParam T - Element trait whose branded instance interface should be
 *   extracted.
 */
export type Interface<T extends Trait<any, any>> =
  T extends Trait<infer P, infer B>
    ? Simplify<P & Readonly<Record<B, true>>>
    : never;

/**
 * Creates an element trait with attribute-backed accessors.
 *
 * The returned trait creates a subclass of the provided base constructor,
 * merges `observedAttributes`, and generates converter-backed accessors for
 * every descriptor entry. The descriptor itself remains the source of truth
 * for the public trait field contract.
 *
 * @remarks This layer does not rely on auto-inferred field shapes from
 * `Object.defineProperty(...)`; the returned trait is normalized explicitly
 * from the converter descriptor shape `P`.
 *
 * @remarks TypeScript currently treats trait-generated members as plain
 * properties in some class-override paths, even though this helper installs
 * runtime accessors with `Object.defineProperty(...)`. This means subclass
 * `override get` / `override set` declarations may still hit `TS2611`. See
 * https://github.com/microsoft/TypeScript/issues/54879 for the closest known
 * limitation. At the moment there is no framework-level workaround here; for
 * intentional accessor overrides, prefer a local `@ts-expect-error`.
 *
 * @typeParam P - Descriptor shape for the trait fields.
 * @typeParam B - External nominal brand symbol for the trait.
 *
 * @param props - Descriptor mapping from trait fields to converters.
 * @param brand - External symbol used for nominal typing and `instanceof`
 *   checks.
 *
 * @returns Element trait that can be applied directly or composed through
 *   the re-exported `impl(...)`.
 */
export function trait<
  P extends Readonly<Record<string, ConverterOf<any>>>,
  B extends symbol,
>(props: P, brand: B): Trait<FieldsFromConverters<P>, B> {
  return abstractTrait(
    (base: Constructor<ControlledElement> & CustomElementStatics) => {
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion
      const entries = Object.entries(props);
      const traited = class extends base {
        static override observedAttributes: readonly string[] = [
          ...new Set<string>([
            ...(base.observedAttributes ?? []),
            // we expect attribute to only be string.
            ...entries.map(([attribute]) => attribute as string),
          ]),
        ];
      };

      type TraitFields = FieldsFromConverters<P>;

      for (const [attribute, converter] of entries) {
        Object.defineProperty(traited.prototype, attribute, {
          get(this: HTMLElement): TraitFields[typeof attribute] {
            return attr.get(
              this,
              attribute as string,
              converter,
            ) as TraitFields[typeof attribute];
          },
          set(this: HTMLElement, value: TraitFields[typeof attribute]) {
            attr.set(this, attribute as string, value, converter);
          },
        });
      }

      return traited;
    },
    brand,
  ) as Trait<FieldsFromConverters<P>, B>;
}
