import operator from "../attribute.js";
import { use } from "../element.js";
// src/controllers/useAttributes.ts
/**
* Creates an update callback that mirrors a host attribute to a target
* attribute of the same serialized shape.
*
* @param target - Element that should receive the mirrored attribute value.
* @param attribute - Target attribute name to write.
* @param transform - Optional transformer applied before writing the value.
*
* @returns Update callback that forwards the new serialized value.
*/
function transfer(target, attribute, transform = (value) => value) {
	return (_, value) => operator.setRaw(target, attribute, transform(value));
}
/**
* Wraps an update callback with a converter, passing typed values instead of
* raw serialized strings.
*
* @param converter - Converter used to deserialize old and new attribute values.
* @param callback - Callback that receives the converted typed values.
*
* @returns Update callback that deserializes both values before forwarding.
*/
function via({ from }, callback) {
	return (oldValue, newValue) => callback(from(oldValue), from(newValue));
}
/**
* Registers attribute update handlers on a host element.
*
* @remarks This helper reacts only to the host `attrChanged` lifecycle and
* forwards updates only when `oldValue !== newValue`. The relevant attributes
* still need to be listed in the host `observedAttributes`.
*
* @param host - Host element that emits attribute changes.
* @param attributes - Mapping from observed attribute names to update handlers.
*/
function useAttributes(host, attributes) {
	use(host, { attrChanged(name, oldValue, newValue) {
		if (attributes[name] && oldValue !== newValue) attributes[name](oldValue, newValue);
	} });
}
export { transfer, useAttributes, via };

//# sourceMappingURL=useAttributes.js.map