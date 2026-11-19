import { useEvents } from "./useEvents.js";
// src/controllers/useKeyboard.ts
/**
* Registers key-specific keyboard listeners on a host or custom target.
*
* @remarks This is a thin key-phase adapter built on top of `useEvents`.
*
* @param host - Host element controlling the listener lifecycle.
* @param listeners - Mapping from `KeyboardEvent.key` to phase listeners.
* @param target - Element that should receive keyboard events. Defaults to the
*   host itself.
*/
function useKeyboard(host, listeners, target = host) {
	useEvents(host, {
		keydown(e) {
			listeners[e.key]?.down?.(e);
		},
		keyup(e) {
			listeners[e.key]?.up?.(e);
		}
	}, target);
}
export { useKeyboard };

//# sourceMappingURL=useKeyboard.js.map