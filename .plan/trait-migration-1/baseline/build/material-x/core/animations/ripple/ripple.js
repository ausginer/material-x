import { identity, parseMs, parseNum } from "../../utils/fns.js";
import css from "./styles/main.css.js";
import { useCSSProps } from "@ydinjs/core/controllers/useCSSProps.js";
import { useEvents } from "@ydinjs/core/controllers/useEvents.js";
// src/core/animations/ripple/ripple.ts
/**
* Adapted from Google's Material Web ripple implementation:
* https://github.com/material-components/material-web/blob/main/ripple/internal/ripple.ts
*
* Original source is part of Material Web (Apache-2.0), with slight
* adaptations for this project's style and needs.
*/
const INACTIVE = 0;
const TOUCH_DELAY = 1;
const HOLDING = 2;
const WAITING_FOR_CLICK = 3;
const MINIMUM_PRESS_MS = 225;
const INITIAL_ORIGIN_SCALE = .1;
const PADDING = 10;
const EXIT_OPACITY_DURATION_MS = 150;
/**
* Delay reacting to touch so that we do not show the ripple for a swipe or
* scroll interaction.
*/
const TOUCH_DELAY_MS = 150;
const FORCED_COLORS = matchMedia("(forced-colors: active)");
const CSS_PROPS = {
	easing: ["--gn", identity],
	duration: ["--go", parseMs],
	driftEasing: ["--gp", identity],
	driftDuration: ["--gq", parseMs],
	opacity: ["--ch", parseNum]
};
function isTouch(event) {
	return event.pointerType === "touch";
}
function shouldIgnoreForForcedColors() {
	return FORCED_COLORS.matches;
}
function determineRippleSize({ currentCSSZoom }, { height, width }) {
	const minDim = Math.min(height, width);
	const zoom = currentCSSZoom ?? 1;
	const size = Math.floor(minDim * INITIAL_ORIGIN_SCALE / zoom);
	return [size, (Math.sqrt(width ** 2 + height ** 2) + PADDING) / size / zoom];
}
function getNormalizedPointerEventCoords(element, rect, pointerEvent) {
	const { clientX, clientY } = pointerEvent;
	const zoom = element.currentCSSZoom ?? 1;
	return {
		x: (clientX - rect.left) / zoom,
		y: (clientY - rect.top) / zoom
	};
}
function getTranslationCoordinates(element, rect, rippleSize, positionEvent) {
	const zoom = element.currentCSSZoom ?? 1;
	const endPoint = {
		x: (rect.width / zoom - rippleSize) / 2,
		y: (rect.height / zoom - rippleSize) / 2
	};
	let startPoint;
	if (positionEvent instanceof PointerEvent) startPoint = getNormalizedPointerEventCoords(element, rect, positionEvent);
	else startPoint = {
		x: rect.width / zoom / 2,
		y: rect.height / zoom / 2
	};
	startPoint = {
		x: startPoint.x - rippleSize / 2,
		y: startPoint.y - rippleSize / 2
	};
	return {
		startPoint,
		endPoint
	};
}
function isHostDisabled(host) {
	return host.hasAttribute("disabled");
}
function inBounds({ clientX, clientY }, rippleHost) {
	const { top, left, bottom, right } = rippleHost.getBoundingClientRect();
	return clientX >= left && clientX <= right && clientY >= top && clientY <= bottom;
}
function shouldReactToEvent(event, host, startEvent) {
	if (isHostDisabled(host) || !event.isPrimary) return false;
	if (startEvent && startEvent.pointerId !== event.pointerId) return false;
	if (event.type === "pointerenter" || event.type === "pointerleave") return !isTouch(event);
	const isPrimaryButton = event.buttons === 1;
	return isTouch(event) || isPrimaryButton;
}
function useRipple(host, container = host.shadowRoot, rippleHost = host) {
	host.shadowRoot.adoptedStyleSheets.push(css);
	const rippleElement = document.createElement("div");
	rippleElement.classList.add("ripple");
	container.append(rippleElement);
	let state = INACTIVE;
	let scaleAnimation;
	let moveAnimation;
	let opacityAnimation;
	let animationGeneration = 0;
	let startEvent = null;
	let checkBoundsAfterContextMenu = false;
	const cssProps = useCSSProps(host, CSS_PROPS);
	const startAnimation = () => {
		scaleAnimation?.cancel();
		moveAnimation?.cancel();
		opacityAnimation?.cancel();
		animationGeneration += 1;
		const rect = rippleHost.getBoundingClientRect();
		const [size, scale] = determineRippleSize(rippleHost, rect);
		const { startPoint, endPoint } = getTranslationCoordinates(rippleHost, rect, size, startEvent);
		const pxSize = `${size}px`;
		const { easing, duration, driftEasing, driftDuration } = cssProps();
		const startTranslate = `${startPoint.x}px ${startPoint.y}px`;
		const endTranslate = `${endPoint.x}px ${endPoint.y}px`;
		scaleAnimation = rippleElement.animate([{
			width: pxSize,
			height: pxSize,
			scale: "1",
			offset: 0
		}, {
			width: pxSize,
			height: pxSize,
			scale: String(scale),
			offset: 1
		}], {
			pseudoElement: "::after",
			fill: "forwards",
			easing,
			duration
		});
		moveAnimation = rippleElement.animate([{
			translate: startTranslate,
			offset: 0
		}, {
			translate: endTranslate,
			offset: 1
		}], {
			pseudoElement: "::after",
			fill: "forwards",
			easing: driftEasing,
			duration: driftDuration
		});
	};
	const endAnimation = async () => {
		startEvent = null;
		state = INACTIVE;
		animationGeneration += 1;
		const generation = animationGeneration;
		const { currentTime } = scaleAnimation ?? {};
		const elapsed = typeof currentTime === "number" ? currentTime : currentTime?.to("ms").value ?? 1e400;
		const remaining = MINIMUM_PRESS_MS - elapsed;
		if (remaining > 0) await new Promise((resolve) => {
			setTimeout(resolve, remaining);
		});
		if (generation !== animationGeneration) return;
		opacityAnimation?.cancel();
		opacityAnimation = rippleElement.animate({ opacity: [cssProps().opacity, 0] }, {
			pseudoElement: "::after",
			duration: EXIT_OPACITY_DURATION_MS,
			easing: "linear",
			fill: "forwards"
		});
		await opacityAnimation.finished;
		if (generation !== animationGeneration) return;
		scaleAnimation?.cancel();
		moveAnimation?.cancel();
		opacityAnimation.cancel();
	};
	useEvents(host, {
		click() {
			if (shouldIgnoreForForcedColors() || isHostDisabled(host)) return;
			if (state === WAITING_FOR_CLICK) {
				endAnimation();
				return;
			}
			if (state === INACTIVE) {
				startAnimation();
				endAnimation();
			}
		},
		contextmenu() {
			if (shouldIgnoreForForcedColors() || isHostDisabled(host)) return;
			checkBoundsAfterContextMenu = true;
			endAnimation();
		},
		pointerdown(event) {
			if (shouldIgnoreForForcedColors() || !shouldReactToEvent(event, host, startEvent)) return;
			startEvent = event;
			if (!isTouch(event)) {
				state = WAITING_FOR_CLICK;
				startAnimation();
				return;
			}
			if (checkBoundsAfterContextMenu && !inBounds(event, rippleHost)) return;
			checkBoundsAfterContextMenu = false;
			state = TOUCH_DELAY;
			setTimeout(() => {
				if (state !== TOUCH_DELAY) return;
				state = HOLDING;
				startAnimation();
			}, TOUCH_DELAY_MS);
		},
		pointerleave(event) {
			if (shouldIgnoreForForcedColors() || !shouldReactToEvent(event, host, startEvent)) return;
			if (state !== INACTIVE) endAnimation();
		},
		pointerup(event) {
			if (shouldIgnoreForForcedColors() || !shouldReactToEvent(event, host, startEvent)) return;
			if (state === HOLDING) {
				state = WAITING_FOR_CLICK;
				return;
			}
			if (state === TOUCH_DELAY) {
				state = WAITING_FOR_CLICK;
				startAnimation();
			}
		},
		pointercancel(event) {
			if (shouldIgnoreForForcedColors() || !shouldReactToEvent(event, host, startEvent)) return;
			endAnimation();
		}
	});
}
export { useRipple };

//# sourceMappingURL=ripple.js.map