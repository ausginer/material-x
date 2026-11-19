import operator from "../attribute.js";
import { impl, trait as trait$1 } from "./primitives.js";
// src/traits/attributes.ts
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
* @remarks This helper installs each field as an accessor on the prototype
* with `Object.defineProperty(...)`, and the trait types the fields as mapped
* properties. TypeScript does not report `TS2611` for an accessor that
* overrides a mapped property, so a subclass may override a trait field with
* `override get` and `override set`, with no directive, in source and in
* emitted declarations. A local `@ts-expect-error` would not help a consumer:
* it does not reach the emitted declaration
* (https://github.com/microsoft/TypeScript/issues/54879).
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
function trait(props, brand) {
	return trait$1((base) => {
		const entries = Object.entries(props);
		const traited = class extends base {
			static observedAttributes = [.../* @__PURE__ */ new Set([...base.observedAttributes ?? [], ...entries.map(([attribute]) => attribute)])];
		};
		for (const [attribute, converter] of entries) Object.defineProperty(traited.prototype, attribute, {
			configurable: true,
			get() {
				return operator.get(this, attribute, converter);
			},
			set(value) {
				operator.set(this, attribute, value, converter);
			}
		});
		return traited;
	}, brand);
}
export { impl, trait };

//# sourceMappingURL=attributes.js.map