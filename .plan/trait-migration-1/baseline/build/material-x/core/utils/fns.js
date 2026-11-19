import { CSSVariableError } from "@ydinjs/core/controllers/useCSSProps.js";
// src/core/utils/fns.ts
const identity = (v) => v;
function createNumberParser(callback) {
	return (v, target, prop) => {
		const result = callback(v);
		if (isNaN(result)) throw new CSSVariableError(prop, target);
		return result;
	};
}
const parseMs = createNumberParser((v) => parseFloat(v) * 1e3);
const parseNum = createNumberParser((v) => parseFloat(v));
export { identity, parseMs, parseNum };

//# sourceMappingURL=fns.js.map