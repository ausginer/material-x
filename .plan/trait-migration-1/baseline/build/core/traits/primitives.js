// src/traits/primitives.ts
/**
* Creates a strict nominal trait from a constructor transformer.
*
* The transformer is authored against a witness constructor and must return a
* subclass of that constructor. The returned trait then normalizes the witness
* result into the public `Trait<P, S, B, PB, SB>` contract, where `P` and `S`
* represent additive instance and static deltas rather than the full returned
* constructor shape.
*
* @typeParam T - Witness base constructor accepted by the transformer.
* @typeParam U - Witness subclass constructor returned from the transformer.
* @typeParam B - External nominal brand symbol for the trait.
*
* @param transformer - Maps a witness base constructor to a branded subclass
*   constructor.
* @param brand - External symbol used for nominal typing and `instanceof`
*   checks.
* @returns Callable trait object that can be applied directly or composed
*   through `impl(...)`.
*
* @throws {TypeError} Thrown when the transformer returns the same constructor
*   or a constructor that does not extend the input one.
*/
function trait(transformer, brand) {
	return Object.defineProperties((base) => {
		const result = transformer(base);
		if (Object.is(result, base) || !Object.prototype.isPrototypeOf.call(base.prototype, result.prototype)) throw new TypeError("Trait transformer must return a subclass of the input constructor.");
		Object.defineProperty(result.prototype, brand, { value: true });
		return result;
	}, {
		[Symbol.hasInstance]: {
			configurable: true,
			value: (o) => o != null && typeof o === "object" && !!o[brand]
		},
		brand: {
			configurable: true,
			value: brand
		}
	});
}
/**
* Applies a tuple of traits to a base constructor in declaration order and
* returns the composed constructor. Extend it with a real class to add the
* component's own behavior.
*
* @remarks `traits` is intended to be a tuple-like readonly list so TypeScript
* can preserve the precise accumulated instance and static types. Plain arrays
* are allowed, but they weaken inference and are not the primary ergonomic
* target of this API.
*
* @example
* ```ts
* const MyComponentBase = impl(Base, [Trait1, Trait2]);
*
* class MyComponent extends MyComponentBase {
*   // ...arbitrary component code
* }
* ```
*
* @param base - Base constructor that receives the traits.
* @param traits - Tuple-like readonly list of traits to apply.
* @returns The composed constructor with all traits applied.
*
* @typeParam T - Instance side of the base constructor.
* @typeParam U - Static side of the base constructor.
* @typeParam TL - Tuple-like readonly list of traits to apply.
*/
function impl(base, traits) {
	return traits.reduce((acc, trait) => trait(acc), base);
}
export { impl, trait };

//# sourceMappingURL=primitives.js.map