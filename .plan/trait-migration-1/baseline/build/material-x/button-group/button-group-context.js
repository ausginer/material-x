import { useAttributes } from "@ydinjs/core/controllers/useAttributes.js";
import { createContext, useProvider } from "@ydinjs/core/controllers/useContext.js";
import { EventEmitter } from "@ydinjs/core/emitter.js";
// src/button-group/button-group-context.ts
const BUTTON_GROUP_CTX = createContext();
function useButtonGroupProvider(host, ctx, attributes) {
	const emitter = new EventEmitter();
	useProvider(host, ctx, {
		emitter,
		provider: host
	});
	useAttributes(host, Object.fromEntries(attributes.map((attr) => [attr, ((oldValue, newValue) => emitter.emit(attr, oldValue, newValue))])));
}
export { BUTTON_GROUP_CTX, useButtonGroupProvider };

//# sourceMappingURL=button-group-context.js.map