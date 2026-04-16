/**
 * Adapted from Google's Material Web ripple implementation:
 * https://github.com/material-components/material-web/blob/main/ripple/internal/ripple.ts
 *
 * Original source is part of Material Web (Apache-2.0), with slight
 * adaptations for this project's style and needs.
 */
import { useConnected } from 'ydin/controllers/useConnected.js';
import { useEvents } from 'ydin/controllers/useEvents.js';
import type { ControlledElement } from 'ydin/element.js';
import {
  readCSSVariables,
  transformNumericVariable,
} from 'ydin/utils/readCSSVariables.js';
import css from './styles/main.css.ts' with { type: 'css' };

type Point = Readonly<{
  x: number;
  y: number;
}>;

// States of the ripple animation controller
const INACTIVE = 0;
const TOUCH_DELAY = 1;
const HOLDING = 2;
const WAITING_FOR_CLICK = 3;

type State =
  | typeof INACTIVE
  | typeof TOUCH_DELAY
  | typeof HOLDING
  | typeof WAITING_FOR_CLICK;

const MINIMUM_PRESS_MS = 225;
const INITIAL_ORIGIN_SCALE = 0.1;
const PADDING = 10;
const EXIT_OPACITY_DURATION_MS = 150;

/**
 * Delay reacting to touch so that we do not show the ripple for a swipe or
 * scroll interaction.
 */
const TOUCH_DELAY_MS = 150;
const FORCED_COLORS = matchMedia('(forced-colors: active)');

const CSS_VARS = {
  easing: '--_ripple-easing',
  duration: '--_ripple-duration',
  driftEasing: '--_ripple-drift-easing',
  driftDuration: '--_ripple-drift-duration',
  opacity: '--_ripple-opacity',
} as const;

export type CSSVariables = Readonly<{
  easing: string;
  duration: number;
  driftEasing: string;
  driftDuration: number;
  opacity: number;
}>;

function isTouch(event: PointerEvent): boolean {
  return event.pointerType === 'touch';
}

function shouldIgnoreForForcedColors(): boolean {
  return FORCED_COLORS.matches;
}

function determineRippleSize(
  { currentCSSZoom }: HTMLElement,
  { height, width }: DOMRect,
): readonly [size: number, scale: number] {
  const minDim = Math.min(height, width);

  // `?? 1` may be removed once `currentCSSZoom` is widely available.
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  const zoom = currentCSSZoom ?? 1;
  const size = Math.floor((minDim * INITIAL_ORIGIN_SCALE) / zoom);
  const maxRadius = Math.sqrt(width ** 2 + height ** 2) + PADDING;
  const scale = maxRadius / size / zoom;

  return [size, scale];
}

function getNormalizedPointerEventCoords(
  element: HTMLElement,
  rect: DOMRect,
  pointerEvent: PointerEvent,
): Point {
  const { clientX, clientY } = pointerEvent;
  // `?? 1` may be removed once `currentCSSZoom` is widely available.
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  const zoom = element.currentCSSZoom ?? 1;
  return {
    x: (clientX - rect.left) / zoom,
    y: (clientY - rect.top) / zoom,
  };
}

function getTranslationCoordinates(
  element: HTMLElement,
  rect: DOMRect,
  rippleSize: number,
  positionEvent: MouseEvent | null,
) {
  // `?? 1` may be removed once `currentCSSZoom` is widely available.
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  const zoom = element.currentCSSZoom ?? 1;
  // end in the center
  const endPoint = {
    x: (rect.width / zoom - rippleSize) / 2,
    y: (rect.height / zoom - rippleSize) / 2,
  };

  let startPoint;
  if (positionEvent instanceof PointerEvent) {
    startPoint = getNormalizedPointerEventCoords(element, rect, positionEvent);
  } else {
    startPoint = {
      x: rect.width / zoom / 2,
      y: rect.height / zoom / 2,
    };
  }

  // center around start point
  startPoint = {
    x: startPoint.x - rippleSize / 2,
    y: startPoint.y - rippleSize / 2,
  };

  return { startPoint, endPoint };
}

function isHostDisabled(host: ControlledElement): boolean {
  return host.hasAttribute('disabled');
}

function inBounds(
  { clientX, clientY }: PointerEvent,
  rippleHost: HTMLElement,
): boolean {
  const { top, left, bottom, right } = rippleHost.getBoundingClientRect();
  return (
    clientX >= left && clientX <= right && clientY >= top && clientY <= bottom
  );
}

function shouldReactToEvent(
  event: PointerEvent,
  host: ControlledElement,
  startEvent: PointerEvent | null,
): boolean {
  if (isHostDisabled(host) || !event.isPrimary) {
    return false;
  }

  if (startEvent && startEvent.pointerId !== event.pointerId) {
    return false;
  }

  if (event.type === 'pointerenter' || event.type === 'pointerleave') {
    return !isTouch(event);
  }

  const isPrimaryButton = event.buttons === 1;
  return isTouch(event) || isPrimaryButton;
}

export function useRipple(
  host: ControlledElement,
  container: DocumentFragment | HTMLElement = host.shadowRoot!,
  rippleHost: HTMLElement = host,
): void {
  // @ts-expect-error: Import not correctly typed
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  host.shadowRoot!.adoptedStyleSheets.push(css as CSSStyleSheet);

  const rippleElement = document.createElement('div');
  rippleElement.classList.add('ripple');
  container.append(rippleElement);

  let state: State = INACTIVE;
  let scaleAnimation: Animation | undefined;
  let moveAnimation: Animation | undefined;
  let opacityAnimation: Animation | undefined;
  let animationGeneration = 0;
  let varValues: CSSVariables;
  let startEvent: PointerEvent | null = null;
  let checkBoundsAfterContextMenu = false;

  useConnected(host, () => {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    varValues = readCSSVariables(host, CSS_VARS, (name, value, h) => {
      if (name === 'duration' || name === 'driftDuration') {
        // converting duration to ms
        return transformNumericVariable(name, value, h) * 1000;
      }

      if (name === 'opacity') {
        return parseFloat(value);
      }

      return value;
    }) as CSSVariables;
  });

  const startAnimation = () => {
    scaleAnimation?.cancel();
    moveAnimation?.cancel();
    opacityAnimation?.cancel();
    animationGeneration++;

    const rect = rippleHost.getBoundingClientRect();
    const [size, scale] = determineRippleSize(rippleHost, rect);
    const { startPoint, endPoint } = getTranslationCoordinates(
      rippleHost,
      rect,
      size,
      startEvent,
    );

    const pxSize = `${size}px`;

    const { easing, duration, driftEasing, driftDuration } = varValues;
    const startTranslate = `${startPoint.x}px ${startPoint.y}px`;
    const endTranslate = `${endPoint.x}px ${endPoint.y}px`;

    // Keep scale and drift as separate token-driven animations. This preserves
    // the "fast fill + living edge" feel without baking custom motion into
    // handcrafted keyframe ratios that are expensive to maintain.
    scaleAnimation = rippleElement.animate(
      [
        {
          width: pxSize,
          height: pxSize,
          scale: '1',
          offset: 0,
        },
        {
          width: pxSize,
          height: pxSize,
          scale: String(scale),
          offset: 1,
        },
      ],
      {
        pseudoElement: '::after',
        fill: 'forwards' as const,
        easing,
        duration,
      },
    );

    moveAnimation = rippleElement.animate(
      [
        {
          translate: startTranslate,
          offset: 0,
        },
        {
          translate: endTranslate,
          offset: 1,
        },
      ],
      {
        pseudoElement: '::after',
        fill: 'forwards' as const,
        easing: driftEasing,
        duration: driftDuration,
      },
    );
  };

  const endAnimation = async () => {
    startEvent = null;
    state = INACTIVE;

    const generation = ++animationGeneration;
    // Ensure the ripple has been visible long enough before fading out
    const { currentTime } = scaleAnimation ?? {};

    const elapsed =
      typeof currentTime === 'number'
        ? currentTime
        : (currentTime?.to('ms').value ?? Infinity);

    const remaining = MINIMUM_PRESS_MS - elapsed;

    if (remaining > 0) {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, remaining);
      });
    }

    // Bail if a new press started while we were waiting
    if (generation !== animationGeneration) {
      return;
    }

    opacityAnimation?.cancel();
    opacityAnimation = rippleElement.animate(
      { opacity: [varValues.opacity, 0] },
      {
        pseudoElement: '::after',
        duration: EXIT_OPACITY_DURATION_MS,
        easing: 'linear',
        fill: 'forwards',
      },
    );
    await opacityAnimation.finished;

    if (generation !== animationGeneration) {
      return;
    }

    scaleAnimation?.cancel();
    moveAnimation?.cancel();
    opacityAnimation.cancel();
  };

  useEvents(host, {
    click() {
      if (
        shouldIgnoreForForcedColors() ||
        // Click is a MouseEvent in Firefox and Safari, so we cannot use
        // `shouldReactToEvent`
        isHostDisabled(host)
      ) {
        return;
      }

      if (state === WAITING_FOR_CLICK) {
        void endAnimation();
        return;
      }

      if (state === INACTIVE) {
        // keyboard synthesized click event
        startAnimation();
        void endAnimation();
      }
    },
    contextmenu() {
      if (shouldIgnoreForForcedColors() || isHostDisabled(host)) {
        return;
      }

      checkBoundsAfterContextMenu = true;
      void endAnimation();
    },
    pointerdown(event: PointerEvent) {
      if (
        shouldIgnoreForForcedColors() ||
        !shouldReactToEvent(event, host, startEvent)
      ) {
        return;
      }

      startEvent = event;

      if (!isTouch(event)) {
        state = WAITING_FOR_CLICK;
        startAnimation();
        return;
      }

      // after a longpress contextmenu event, an extra `pointerdown` can be
      // dispatched to the pressed element. Check that the down is within
      // bounds of the element in this case.
      if (checkBoundsAfterContextMenu && !inBounds(event, rippleHost)) {
        return;
      }

      checkBoundsAfterContextMenu = false;

      // Wait for a hold after touch delay
      state = TOUCH_DELAY;

      setTimeout(() => {
        // State may have changed while waiting for the timeout.
        if (state !== TOUCH_DELAY) {
          return;
        }

        state = HOLDING;
        startAnimation();
      }, TOUCH_DELAY_MS);
    },
    pointerleave(event: PointerEvent) {
      if (
        shouldIgnoreForForcedColors() ||
        !shouldReactToEvent(event, host, startEvent)
      ) {
        return;
      }

      // release a held mouse or pen press that moves outside the element
      if (state !== INACTIVE) {
        void endAnimation();
      }
    },
    pointerup(event: PointerEvent) {
      if (
        shouldIgnoreForForcedColors() ||
        !shouldReactToEvent(event, host, startEvent)
      ) {
        return;
      }

      if (state === HOLDING) {
        state = WAITING_FOR_CLICK;
        return;
      }

      if (state === TOUCH_DELAY) {
        state = WAITING_FOR_CLICK;
        startAnimation();
        return;
      }
    },
    pointercancel(event: PointerEvent) {
      if (
        shouldIgnoreForForcedColors() ||
        !shouldReactToEvent(event, host, startEvent)
      ) {
        return;
      }

      void endAnimation();
    },
  });
}
