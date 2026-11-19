import { ButtonLike } from "../button/ButtonCore.js";
// src/button-group/utils.ts
function getTarget(event) {
	return event.composedPath().find((node) => node instanceof ButtonLike);
}
export { getTarget };

//# sourceMappingURL=utils.js.map