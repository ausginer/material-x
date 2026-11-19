import { Bool } from "../attribute.js";
import { useEvents } from "../controllers/useEvents.js";
import { useSlot } from "../controllers/useSlot.js";
import { ControlledElement, internals, use } from "../element.js";
import { toggleState } from "../utils/DOM.js";
import { trait } from "./attributes.js";
// src/traits/reorderable.ts
const REORDER_EVENT_INIT = {
	bubbles: true,
	cancelable: true,
	composed: true
};
/**
* Fired by a reorderable container when the user drops a dragged item, proposing
* a move from `from` to `to`. It is an *intent*, dispatched before anything is
* committed: the consumer owns the collection and decides whether and how to
* apply the move, then updates its own state so the item lands at `to`.
*
* @remarks Bubbles and crosses shadow DOM boundaries. Call `preventDefault()` to
* reject the move — the item animates back to where it started and nothing is
* committed. The event is dispatched as the landing animation begins, so the
* consumer's (possibly asynchronous) re-render runs *concurrently* with the
* animation; the container watches its slot and only settles once the item has
* actually reached `to`, so no synchronous `flushSync` is required.
*/
var ReorderEvent = class extends Event {
	item;
	from;
	to;
	constructor(item, from, to) {
		super("reorder", REORDER_EVENT_INIT);
		this.item = item;
		this.from = from;
		this.to = to;
	}
};
const $reorderable = Symbol("Reorderable");
/**
* Element trait that exposes a presence-based `reorderable` boolean field,
* indicating that the element's children can be dragged to reorder.
*/
const Reorderable = /*@__PURE__*/ trait({ reorderable: Bool }, $reorderable);
const ORIGIN = {
	x: 0,
	y: 0
};
const DRAGGED_STATE = "drag";
/**
* Pointer travel, in pixels, before the footprint starts tracking the pointer.
* `pointermove` can fire immediately after `pointerdown` with a minimal delta,
* which would jump the footprint away from its initial position.
*/
const DRAG_THRESHOLD = 8;
/**
* How long, after the landing animation, to keep waiting for the consumer to
* commit the reorder before settling anyway. With the intent dispatched up
* front, a normal consumer commits *during* the animation, so this grace is only
* spent when a render lands late (or the consumer ignores the event); it bounds
* how long the session stays busy rather than hanging forever.
*/
const COMMIT_TIMEOUT = 500;
/**
* Inline properties written onto the dragged visual while it is lifted. On
* teardown each is restored to its pre-drag inline value, or removed if it had
* none. No `z-index`: the lift renders in the top layer, above everything.
*/
const DRAGGING_PROPS = [
	"position",
	"inset",
	"top",
	"left",
	"width",
	"height",
	"margin",
	"border",
	"transform"
];
/**
* Maps each reorderable item to the inner visual element used as the drag
* ghost. Set by {@link useReorderableItem}, read by {@link useReorderable}.
*/
const itemTargets = /* @__PURE__ */ new WeakMap();
function getItemTarget(item) {
	return itemTargets.get(item) ?? item;
}
/** Viewport rects of every item except `dragged`, keyed by visual element. */
function measure(items, dragged) {
	const rects = /* @__PURE__ */ new Map();
	for (const item of items) if (item !== dragged) {
		const visual = getItemTarget(item);
		rects.set(visual, visual.getBoundingClientRect());
	}
	return rects;
}
/** Centre point of a rect. */
function center(rect) {
	return {
		x: rect.left + rect.width / 2,
		y: rect.top + rect.height / 2
	};
}
/** Squared distance between two points — order-preserving without the sqrt. */
function distanceSquared(a, b) {
	const dx = a.x - b.x;
	const dy = a.y - b.y;
	return dx * dx + dy * dy;
}
/**
* The item whose centre is nearest the pointer, or `null` when the footprint's
* own slot is nearest — meaning the footprint should stay put.
*
* The reorder area is treated as a plain field of rectangles, with no notion of
* rows, columns, or a flow axis: a vertical list, a horizontal row, and a grid
* are all just centres to measure against. Including the footprint as a
* candidate is what lets the dragged item rest in its own slot, and gives the
* gesture its hysteresis — the footprint only moves once another item's centre
* is genuinely closer than its own.
*/
function nearestItem(items, dragged, rects, footprintCentre, pointer) {
	let best = distanceSquared(pointer, footprintCentre);
	let nearest = null;
	for (const item of items) {
		if (item === dragged) continue;
		const rect = rects.get(getItemTarget(item));
		if (rect) {
			const d = distanceSquared(pointer, center(rect));
			if (d < best) {
				best = d;
				nearest = item;
			}
		}
	}
	return nearest;
}
/** Landing index of the dragged item: non-dragged items before the footprint. */
function footprintIndex(items, dragged, footprint) {
	let index = 0;
	for (const item of items) {
		const precedes = (footprint.compareDocumentPosition(item) & Node.DOCUMENT_POSITION_PRECEDING) !== 0;
		if (item !== dragged && precedes) index += 1;
	}
	return index;
}
/**
* The non-dragged item immediately after (`following`) or before the footprint
* in DOM order, or `null` at that edge. Used to step the footprint one slot for
* keyboard moves and to capture the landing anchor.
*/
function neighbor(items, dragged, footprint, following) {
	const bit = following ? Node.DOCUMENT_POSITION_FOLLOWING : Node.DOCUMENT_POSITION_PRECEDING;
	let result = null;
	for (const item of items) {
		if (item === dragged) continue;
		if ((footprint.compareDocumentPosition(item) & bit) !== 0) {
			if (following) return item;
			result = item;
		}
	}
	return result;
}
/** Builds the placeholder that fills the lifted item's slot. */
function createFootprint(item, width, height) {
	const footprint = document.createElement("div");
	footprint.dataset["footprint"] = "";
	footprint.style.width = `${width}px`;
	footprint.style.height = `${height}px`;
	footprint.setAttribute("aria-hidden", "true");
	if (item.slot) footprint.slot = item.slot;
	return footprint;
}
/** Snapshots the inline {@link DRAGGING_PROPS} so teardown can restore them. */
function snapshotStyles(visual) {
	const saved = /* @__PURE__ */ new Map();
	for (const prop of DRAGGING_PROPS) {
		const value = visual.style.getPropertyValue(prop);
		if (value) saved.set(prop, [value, visual.style.getPropertyPriority(prop)]);
	}
	return saved;
}
/** Restores the snapshot from {@link snapshotStyles}, clearing what it lacks. */
function restoreStyles(visual, saved) {
	for (const prop of DRAGGING_PROPS) {
		const value = saved.get(prop);
		if (value) visual.style.setProperty(prop, value[0], value[1]);
		else visual.style.removeProperty(prop);
	}
}
/** Pins the visual as a fixed-position box exactly over `rect`. */
function pinVisual(visual, rect) {
	visual.style.position = "fixed";
	visual.style.inset = "auto";
	visual.style.top = `${rect.top}px`;
	visual.style.left = `${rect.left}px`;
	visual.style.width = `${rect.width}px`;
	visual.style.height = `${rect.height}px`;
	visual.style.margin = "0";
	visual.style.border = "0";
}
/**
* Lifts the visual into the top layer via a manual popover. The top layer
* escapes any transformed / filtered / contained ancestor, so `position: fixed`
* with the item's viewport rect lands correctly — a plain fixed shadow
* descendant would be offset by such an ancestor's containing block. It also
* paints above everything (no z-index needed), and the element keeps its own
* styles and inherited tokens because it stays put in the DOM; only its
* rendering moves.
*/
function enterTopLayer(visual, rect) {
	pinVisual(visual, rect);
	visual.popover = "manual";
	visual.showPopover();
}
/** Returns the visual from the top layer and clears the popover attribute. */
function exitTopLayer(visual) {
	if (visual.matches(":popover-open")) visual.hidePopover();
	visual.removeAttribute("popover");
}
function createCommitTracker(items, item) {
	let anchor = null;
	let resolve = null;
	const committed = () => {
		const list = items();
		const index = list.indexOf(item);
		if (index === -1) return true;
		return anchor ? list[index + 1] === anchor : index === list.length - 1;
	};
	return {
		capture(footprint) {
			anchor = neighbor(items(), item, footprint, true);
		},
		wait() {
			if (committed()) return Promise.resolve();
			return new Promise((res) => {
				let timer;
				const done = () => {
					clearTimeout(timer);
					resolve = null;
					res();
				};
				resolve = done;
				timer = setTimeout(done, COMMIT_TIMEOUT);
			});
		},
		notify() {
			if (resolve && committed()) resolve();
		},
		release() {
			resolve?.();
		}
	};
}
/**
* Starts tracking a potential drag. Creating the session *is* the `pointerdown`
* transition, but nothing is lifted yet: the session watches the pointer and
* only activates — inserting the footprint, lifting the visual, taking capture —
* once the pointer has travelled past {@link DRAG_THRESHOLD}. A press that never
* crosses the threshold stays a plain click: no footprint, no lift, no event.
*
* @param host - Container the drag belongs to, and the pointer capture target.
* @param timing - Called at drop time for the landing animation's timing.
* @param items - Current item children, re-read because slotting can change
*   them mid-drag.
* @param item - The item being dragged.
* @param event - The `pointerdown` that started the gesture.
*/
function createDragSession(host, timing, items, item, event) {
	const visual = getItemTarget(item);
	const start = {
		x: event.clientX,
		y: event.clientY
	};
	const { pointerId } = event;
	const fromIndex = items().indexOf(item);
	const tracking = new AbortController();
	let footprint;
	let origin = ORIGIN;
	let rects = /* @__PURE__ */ new Map();
	let rectsDirty = false;
	let delta = ORIGIN;
	let toIndex = fromIndex;
	let frame = -1;
	let activated = false;
	let settling = null;
	let canceled = false;
	let animation;
	const tracker = createCommitTracker(items, item);
	let savedStyles = /* @__PURE__ */ new Map();
	/** Undoes the lift: footprint gone, styles cleared, dragged state removed. */
	const teardown = () => {
		footprint.remove();
		exitTopLayer(visual);
		restoreStyles(visual, savedStyles);
		toggleState(internals(item), DRAGGED_STATE, false);
	};
	/**
	* Promotes a pending press into a live drag: the visual is lifted to a fixed
	* position, the footprint fills the gap, and the host takes pointer capture.
	* Runs once, the first time the pointer crosses the threshold.
	*/
	const activate = () => {
		activated = true;
		const draggedRect = visual.getBoundingClientRect();
		origin = {
			x: draggedRect.left,
			y: draggedRect.top
		};
		footprint = createFootprint(item, draggedRect.width, draggedRect.height);
		item.before(footprint);
		savedStyles = snapshotStyles(visual);
		enterTopLayer(visual, draggedRect);
		host.setPointerCapture(pointerId);
		toggleState(internals(item), DRAGGED_STATE, true);
		rects = measure(items(), item);
	};
	/** Current pointer position in viewport coordinates. */
	const currentPointer = () => ({
		x: start.x + delta.x,
		y: start.y + delta.y
	});
	/** Moves the footprint to the item slot nearest the pointer. */
	const reposition = (pointer) => {
		frame = -1;
		if (rectsDirty) {
			rects = measure(items(), item);
			rectsDirty = false;
		}
		const footprintCentre = center(footprint.getBoundingClientRect());
		const nearest = nearestItem(items(), item, rects, footprintCentre, pointer);
		if (!nearest) return;
		if ((footprint.compareDocumentPosition(nearest) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0) nearest.after(footprint);
		else nearest.before(footprint);
		toIndex = footprintIndex(items(), item, footprint);
		rects = measure(items(), item);
	};
	/**
	* Runs a reposition still owed to a frame. `pointerup` can arrive in the same
	* frame as the last `pointermove`, and the drop has to land where the pointer
	* finished — not where it was a frame ago.
	*/
	const flush = () => {
		if (frame !== -1) {
			cancelAnimationFrame(frame);
			reposition(currentPointer());
		}
	};
	/** Animates the ghost to `endTransform` and pins it there once it lands. */
	const animateTo = async (endTransform) => {
		animation = visual.animate([{ transform: `translate(${delta.x}px, ${delta.y}px)` }, { transform: endTransform }], timing());
		toggleState(internals(item), DRAGGED_STATE, false);
		try {
			await animation.finished;
		} catch {}
		if (!canceled) visual.style.transform = endTransform;
	};
	const land = async () => {
		flush();
		tracking.abort();
		tracker.capture(footprint);
		const accepted = toIndex !== fromIndex && host.dispatchEvent(new ReorderEvent(item, fromIndex, toIndex));
		try {
			if (accepted) {
				const fp = footprint.getBoundingClientRect();
				await animateTo(`translate(${fp.left - origin.x}px, ${fp.top - origin.y}px)`);
				if (!canceled) await tracker.wait();
			} else await animateTo("translate(0px, 0px)");
		} finally {
			teardown();
		}
	};
	host.addEventListener("pointermove", (moveEvent) => {
		if (moveEvent.pointerId !== pointerId) return;
		delta = {
			x: moveEvent.clientX - start.x,
			y: moveEvent.clientY - start.y
		};
		if (!activated) {
			if (Math.abs(delta.x) < DRAG_THRESHOLD && Math.abs(delta.y) < DRAG_THRESHOLD) return;
			activate();
			moveEvent.preventDefault();
		}
		visual.style.transform = `translate(${delta.x}px, ${delta.y}px)`;
		const pointer = currentPointer();
		cancelAnimationFrame(frame);
		frame = requestAnimationFrame(() => {
			reposition(pointer);
		});
	}, { signal: tracking.signal });
	const invalidate = () => {
		if (!activated) return;
		rectsDirty = true;
		cancelAnimationFrame(frame);
		frame = requestAnimationFrame(() => {
			reposition(currentPointer());
		});
	};
	addEventListener("scroll", invalidate, {
		capture: true,
		passive: true,
		signal: tracking.signal
	});
	addEventListener("resize", invalidate, {
		passive: true,
		signal: tracking.signal
	});
	return {
		pointerId,
		itemsChanged() {
			tracker.notify();
		},
		commit() {
			if (!settling) {
				if (activated) settling = land();
				else {
					tracking.abort();
					settling = Promise.resolve();
				}
			}
			return settling;
		},
		cancel() {
			if (!settling) {
				tracking.abort();
				cancelAnimationFrame(frame);
				if (activated) teardown();
				settling = Promise.resolve();
			}
			return settling;
		},
		abandon() {
			canceled = true;
			if (settling) {
				animation?.cancel();
				tracker.release();
			} else {
				tracking.abort();
				cancelAnimationFrame(frame);
				if (activated) teardown();
				settling = Promise.resolve();
			}
			return settling;
		}
	};
}
/**
* Starts a keyboard reorder: lifts `item` immediately (there is no travel
* threshold to arm — the grab key is the intent) and returns handles the caller
* drives from subsequent key presses.
*
* @param host - Container the reorder belongs to, and the event target.
* @param items - Current item children, re-read because slotting can change them.
* @param item - The grabbed item.
* @param announce - Sink for the position feedback announced at each step.
*/
function createKeyboardSession(host, items, item, announce) {
	const visual = getItemTarget(item);
	const fromIndex = items().indexOf(item);
	const tracker = createCommitTracker(items, item);
	let toIndex = fromIndex;
	let settling = null;
	let canceled = false;
	const total = () => items().length;
	const draggedRect = visual.getBoundingClientRect();
	const footprint = createFootprint(item, draggedRect.width, draggedRect.height);
	item.before(footprint);
	const savedStyles = snapshotStyles(visual);
	enterTopLayer(visual, draggedRect);
	toggleState(internals(item), DRAGGED_STATE, true);
	announce(`Grabbed. Item ${fromIndex + 1} of ${total()}. Use the arrow keys to move, space or enter to drop, escape to cancel.`);
	const teardown = () => {
		footprint.remove();
		exitTopLayer(visual);
		restoreStyles(visual, savedStyles);
		toggleState(internals(item), DRAGGED_STATE, false);
	};
	return {
		move(step) {
			if (settling) return;
			const target = neighbor(items(), item, footprint, step > 0);
			if (!target) return;
			if (step > 0) target.after(footprint);
			else target.before(footprint);
			toIndex = footprintIndex(items(), item, footprint);
			pinVisual(visual, footprint.getBoundingClientRect());
			announce(`Item ${toIndex + 1} of ${total()}.`);
		},
		itemsChanged() {
			tracker.notify();
		},
		commit() {
			if (settling) return settling;
			settling = (async () => {
				const move = toIndex !== fromIndex;
				const accepted = move && host.dispatchEvent(new ReorderEvent(item, fromIndex, toIndex));
				try {
					if (accepted) {
						tracker.capture(footprint);
						announce(`Dropped. Item ${toIndex + 1} of ${total()}.`);
						if (!canceled) await tracker.wait();
					} else announce(move ? "Reorder cancelled." : `Item ${fromIndex + 1} of ${total()}.`);
				} finally {
					teardown();
				}
			})();
			return settling;
		},
		cancel() {
			if (!settling) {
				announce("Reorder cancelled.");
				teardown();
				settling = Promise.resolve();
			}
			return settling;
		},
		abandon() {
			canceled = true;
			if (settling) tracker.release();
			else {
				teardown();
				settling = Promise.resolve();
			}
			return settling;
		}
	};
}
/**
* Registers pointer-based drag-and-drop reorder coordination on a container
* host.
*
* The host must implement {@link Reorderable}. Drag behaviour is gated by
* `host.reorderable` — `pointerdown` is a no-op when false.
*
* A drag begins only on a primary press (left button / first touch) over a
* tracked item. If the item contains a `[data-handle]` element the press must
* land on that handle; items without one are draggable by their whole surface.
*
* The press does not lift anything until the pointer has travelled past the
* activation threshold — a click, or a press with no meaningful movement, leaves
* the DOM untouched and dispatches nothing. Once the threshold is crossed the
* item's visual element lifts into the top layer (as a manual popover) and
* follows the pointer — escaping any transformed or contained ancestor while
* keeping its own styles — and a footprint placeholder — a `<div>` carrying a
* `data-footprint` attribute, sized
* inline to match the lifted item — is inserted to show the insertion point. The
* footprint moves to whichever item slot is nearest the pointer, treating the
* reorder area as a plain field of rectangles — so vertical lists, horizontal
* rows, and grids are all handled without configuration. Style the footprint
* from the caller's shadow styles via `::slotted([data-footprint])`.
*
* On `pointerup`, if the item would actually move, a {@link ReorderEvent} intent
* is dispatched and the lifted visual animates to the footprint's position. The
* hook never reorders siblings itself — the consumer applies the move in
* response to the event; because the intent is dispatched as the animation
* begins, the consumer's (async) re-render overlaps it, and the hook watches its
* slot to settle only once the item has reached the proposed slot, so no
* `flushSync` is needed. A no-op drop (or a `preventDefault()`'d intent) just
* animates the item home and announces nothing. On `pointercancel` or lost
* capture the item is restored to its original position. A `pointerdown`
* arriving while a previous item is still settling is ignored.
*
* The same reorder is available from the keyboard: pressing space or enter on an
* item's `[data-handle]` grabs it (a handle is required — the whole-surface
* affordance is pointer-only), the arrow keys step it through the siblings, and
* space/enter drops it while escape cancels. A keyboard drop dispatches the same
* {@link ReorderEvent} intent and awaits the same consumer commit as a pointer
* drop; each step is announced by position through a visually hidden live region
* the hook owns in the host's shadow root, and focus returns to the handle once
* the reorder settles.
*
* @param host - Container host implementing {@link Reorderable}.
* @param timing - Called at drop time for the landing animation's timing, so
*   the values can track live CSS custom properties.
* @param slotSelector - Selector for the slot that provides item children.
*/
function useReorderable(host, timing, slotSelector = "slot") {
	let items = [];
	let itemSet = /* @__PURE__ */ new Set();
	let session = null;
	let keyboard = null;
	let keyboardItem = null;
	let liveRegion = null;
	const getItems = () => items;
	/** Announces `message` to assistive tech via a visually hidden live region. */
	const announce = (message) => {
		if (!liveRegion) {
			liveRegion = document.createElement("div");
			liveRegion.setAttribute("aria-live", "assertive");
			liveRegion.setAttribute("aria-atomic", "true");
			liveRegion.style.cssText = "position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0";
			(host.shadowRoot ?? host).append(liveRegion);
		}
		liveRegion.textContent = message;
	};
	useSlot(host, slotSelector, (_, nodes) => {
		items = nodes.filter((n) => n instanceof ControlledElement);
		itemSet = new Set(items);
		session?.itemsChanged();
		keyboard?.itemsChanged();
	});
	/**
	* Ends the active gesture, if any: `commit` lands the item and dispatches,
	* otherwise the gesture is cancelled and the item restored. Fire-and-forget by
	* design — the pointer handlers cannot wait on the landing animation.
	*/
	const settle = (commit) => {
		const current = session;
		if (!current) return;
		(commit ? current.commit() : current.cancel()).finally(() => {
			if (session === current) session = null;
		}).catch(reportError);
	};
	/**
	* Ends the active keyboard reorder, then returns focus to the drag handle so
	* the user keeps their place — the item may have been re-rendered by the
	* consumer's commit, so the handle is re-resolved from its current subtree.
	*/
	const settleKeyboard = (commit) => {
		const current = keyboard;
		const grabbed = keyboardItem;
		if (!current) return;
		(commit ? current.commit() : current.cancel()).finally(() => {
			if (keyboard === current) {
				keyboard = null;
				keyboardItem = null;
			}
			grabbed?.querySelector("[data-handle]")?.focus();
		}).catch(reportError);
	};
	use(host, { disconnected() {
		session?.abandon().catch(reportError);
		session = null;
		keyboard?.abandon().catch(reportError);
		keyboard = null;
		keyboardItem = null;
	} });
	useEvents(host, {
		keydown(event) {
			if (keyboard) {
				switch (event.key) {
					case "ArrowUp":
					case "ArrowLeft":
						event.preventDefault();
						keyboard.move(-1);
						break;
					case "ArrowDown":
					case "ArrowRight":
						event.preventDefault();
						keyboard.move(1);
						break;
					case " ":
					case "Enter":
						event.preventDefault();
						settleKeyboard(true);
						break;
					case "Escape":
						event.preventDefault();
						settleKeyboard(false);
						break;
					case "Tab": settleKeyboard(false);
				}
				return;
			}
			if (session || !host.reorderable || event.key !== " " && event.key !== "Enter") return;
			const path = event.composedPath();
			const itemIndex = path.findIndex((n) => n instanceof ControlledElement && itemSet.has(n));
			if (itemIndex === -1) return;
			if (!path.slice(0, itemIndex).find((n) => n instanceof Element && n.hasAttribute("data-handle"))) return;
			event.preventDefault();
			keyboardItem = path[itemIndex];
			keyboard = createKeyboardSession(host, getItems, keyboardItem, announce);
		},
		pointerdown(event) {
			if (session || keyboard || !host.reorderable || event.button !== 0 || !event.isPrimary) return;
			const path = event.composedPath();
			const itemIndex = path.findIndex((n) => n instanceof ControlledElement && itemSet.has(n));
			if (itemIndex === -1) return;
			const item = path[itemIndex];
			if (item.querySelector("[data-handle]")) {
				if (!path.slice(0, itemIndex).some((n) => n instanceof Element && n.hasAttribute("data-handle"))) return;
			}
			session = createDragSession(host, timing, getItems, item, event);
		},
		pointerup(event) {
			if (session?.pointerId === event.pointerId) settle(true);
		},
		pointercancel(event) {
			if (session?.pointerId === event.pointerId) settle(false);
		},
		lostpointercapture(event) {
			if (session?.pointerId === event.pointerId) settle(false);
		}
	});
}
/**
* Registers the inner visual element of a reorderable item so that
* {@link useReorderable} can lift it during a drag.
*
* @param host - The item host element.
* @param target - Inner visual element used as the drag ghost. Defaults to
*   `host`.
*/
function useReorderableItem(host, target = host) {
	itemTargets.set(host, target);
}
export { $reorderable, $reorderable as __mxflat_$reorderable_a1c7da0f, ReorderEvent, Reorderable, useReorderable, useReorderableItem };

//# sourceMappingURL=reorderable.js.map