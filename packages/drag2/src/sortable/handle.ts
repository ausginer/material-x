/**
 * The two pure resolvers, in **one module and one subpath**: neither has private
 * state, neither releases anything, and a consumer that wants one usually wants
 * to think about the other.
 *
 * They answer two different questions that are easy to conflate:
 *
 * - `handle()` narrows *admission* — which part of an item starts a drag. It
 *   never changes which item is dragged; returning `null` refuses the press.
 * - `visual()` chooses what is *lifted* — the element the kernel promotes,
 *   measures and animates, when that is not the item itself.
 */
import { brandFeature, type SortableFeature } from './feature.ts';

/**
 * Admission narrows to the resolved handle. The item stays the item the
 * collection knows; `null` means this press is not a drag.
 */
export function handle(
  resolve: (item: HTMLElement) => HTMLElement | null,
): SortableFeature {
  return brandFeature(() => ({ getHandle: resolve }));
}

/**
 * The lifted element. It is what gets promoted, measured for the placeholder's
 * size, transformed on every move and landed — so it must be the item or live
 * inside it.
 */
export function visual(
  resolve: (item: HTMLElement) => HTMLElement,
): SortableFeature {
  return brandFeature(() => ({ getVisual: resolve }));
}
