import attribute from "@ydinjs/core/attribute.js";
import { useContext as useContext$1 } from "@ydinjs/core/controllers/useContext.js";
// src/core/utils/useContext.ts
function useContext(host, ctx, attributes, effect) {
	useContext$1(host, ctx, (data) => {
		if (data) {
			for (const [attr, { from }] of Object.entries(attributes)) effect(attr, from(null), from(attribute.getRaw(data.provider, attr)));
			return data.emitter.on((attr, oldValue, newValue) => {
				if (attr in attributes) {
					const { from } = attributes[attr];
					effect(attr, from(oldValue), from(newValue));
				}
			});
		}
	});
}
export { useContext };

//# sourceMappingURL=useContext.js.map