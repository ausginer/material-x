import { useConnected } from "./useConnected.js";
// src/controllers/useCSSProps.ts
/**
* Error thrown when a CSS variable cannot be parsed as the expected shape.
*/
var CSSVariableError = class extends Error {
	name = this.constructor.name;
	/**
	* Creates a parse error for a CSS variable on a specific element.
	*
	* @param cssVar - Variable name or key used for reporting.
	* @param element - Element whose computed variable value was invalid.
	*/
	constructor(cssVar, element) {
		super(`Invalid value for ${cssVar} on element '${element.localName}'`);
	}
};
/**
* Reads computed CSS variable values from a host element.
*
* The requested CSS variables are resolved through `getComputedStyle(...)` and
* parsed according to their per-property descriptions.
*
* @typeParam T - Mapping from consumer-facing keys to CSS prop descriptions.
* @param host - Element whose computed CSS variables should be read.
* @param props - Mapping from output keys to CSS prop descriptions.
* @param target - Element passed to each parse callback.
* @returns Readonly object containing parsed values under the same keys.
*/
function useCSSProps(host, props, target = host) {
	let result;
	useConnected(host, () => {
		const styles = getComputedStyle(host);
		result = Object.fromEntries(Object.entries(props).map(([key, [name, parse]]) => {
			return [key, parse(styles.getPropertyValue(name).trim(), target, name)];
		}));
	});
	return () => result;
}
export { CSSVariableError, useCSSProps };

//# sourceMappingURL=useCSSProps.js.map