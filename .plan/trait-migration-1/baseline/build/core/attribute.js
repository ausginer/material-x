// src/attribute.ts
/**
* Presence-based attribute converter.
*
* Reads `null` as `false` and any present attribute value as `true`. Writes
* `true` as an empty string and removes the attribute for `false`.
*/
const Bool = {
	from: (value) => value !== null,
	to: (value) => value ? "" : null
};
/**
* Numeric attribute converter.
*
* Missing, empty, and invalid numeric strings are normalized to `null`.
* Writing `null`, `undefined`, or `NaN` removes the attribute.
*/
const Num = {
	from(value) {
		if (!value) return null;
		const num = Number(value);
		return Number.isNaN(num) ? null : num;
	},
	to: (value) => value != null && !isNaN(value) ? String(value) : null
};
/**
* Identity converter for nullable string attributes.
*
* Writing `null` or `undefined` removes the attribute.
*/
const Str = {
	from: (value) => value,
	to: (value) => value ?? null
};
/**
* Default attribute operator for typed DOM attribute access.
*
* This is the main entrypoint for reading and writing attributes with the
* built-in converter tuples. Raw string access remains available through
* `getRaw` and `setRaw`.
*/
const operator = {
	get(host, name, { from }) {
		return from(operator.getRaw(host, name));
	},
	set(host, name, value, { to }) {
		operator.setRaw(host, name, to(value));
	},
	getRaw(host, name) {
		return host.getAttribute(name);
	},
	setRaw(host, name, value) {
		if (value != null) host.setAttribute(name, value);
		else host.removeAttribute(name);
	}
};
export { Bool, Num, Str, operator as default, operator };

//# sourceMappingURL=attribute.js.map