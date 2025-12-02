import { useEvents } from '../controllers/useEvents.ts';
import type { ReactiveController } from '../elements/reactive-controller.ts';
import {
  html,
  type ReactiveElement,
  use,
} from '../elements/reactive-element.ts';
import { $ } from '../utils/DOM.ts';
import {
  readCSSVariables,
  transformNumericVariable,
} from '../utils/readCSSVariables.ts';
import type { Point } from './Point.ts';
import css from './styles/ripple.css.ts?type=css' with { type: 'css' };

// States of the ripple animation controller
const INACTIVE = 0;
const TOUCH_DELAY = 1;
const HOLDING = 2;
const WAITING_FOR_COMPLETION = 3;

type State =
  | typeof INACTIVE
  | typeof TOUCH_DELAY
  | typeof HOLDING
  | typeof WAITING_FOR_COMPLETION;

const MINIMUM_PRESS_MS = 225;
const INITIAL_ORIGIN_SCALE = 0.2;
const PADDING = 10;
const SOFT_EDGE_MINIMUM_SIZE = 75;
const SOFT_EDGE_CONTAINER_RATIO = 0.35;

const VARS = {
  rippleSize: '--_ripple-size',
} as const;

/**
 * Delay reacting to touch so that we do not show the ripple for a swipe or
 * scroll interaction.
 */
const TOUCH_DELAY_MS = 150;

function isTouch(event: PointerEvent): boolean {
  return event.pointerType === 'touch';
}

function determineRippleSize(
  { currentCSSZoom }: HTMLElement,
  { height, width }: DOMRect,
): readonly [size: number, scale: number] {
  const maxDim = Math.max(height, width);
  const softEdgeSize = Math.max(
    SOFT_EDGE_CONTAINER_RATIO * maxDim,
    SOFT_EDGE_MINIMUM_SIZE,
  );

  // `?? 1` may be removed once `currentCSSZoom` is widely available.
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  const zoom = currentCSSZoom ?? 1;
  const size = Math.floor((maxDim * INITIAL_ORIGIN_SCALE) / zoom);
  const maxRadius = Math.sqrt(width ** 2 + height ** 2) + PADDING;

  // The dimensions may be altered by CSS `zoom`, which needs to be
  // compensated for in the final scale() value.
  const maybeZoomedScale = (maxRadius + softEdgeSize) / size;
  const scale = maybeZoomedScale / zoom;

  return [size, scale];
}

function getNormalizedPointerEventCoords(
  element: HTMLElement,
  rect: DOMRect,
  pointerEvent: PointerEvent,
): Point {
  const { scrollX, scrollY } = window;
  const documentX = scrollX + rect.left;
  const documentY = scrollY + rect.top;
  const { pageX, pageY } = pointerEvent;
  // `?? 1` may be removed once `currentCSSZoom` is widely available.
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  const zoom = element.currentCSSZoom ?? 1;
  return {
    x: (pageX - documentX) / zoom,
    y: (pageY - documentY) / zoom,
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

export type CSSVariables = Readonly<{
  easing: string;
  duration: string;
}>;

const CLS = 'ripple';
const TEMPLATE = html`<div class="${CLS}"></div>`;

class RippleAnimationController implements ReactiveController {
  readonly #host: ReactiveElement;
  readonly #rippleElement: HTMLElement;
  readonly #cssVariables: CSSVariables;
  #animation: Animation | undefined;
  #varValues: CSSVariables | undefined;
  #startEvent: PointerEvent | null = null;

  constructor(host: ReactiveElement, vars: CSSVariables) {
    this.#host = host;
    $(host)!.prepend(TEMPLATE.content.cloneNode(true));
    $(host)!.adoptedStyleSheets.push(css);
    this.#rippleElement = $(host, `.${CLS}`)!;
    this.#cssVariables = vars;

    const self = this;
    let state: State = INACTIVE;
    let checkBoundsAfterContextMenu = false;

    useEvents(host, {
      click() {
        // Click is a MouseEvent in Firefox and Safari, so we cannot use
        // `shouldReactToEvent`
        if (self.#isHostDisabled()) {
          return;
        }

        if (state === WAITING_FOR_COMPLETION) {
          void self.#endAnimation();
          return;
        }

        if (state === INACTIVE) {
          // keyboard synthesized click event
          self.#startAnimation();
          void self.#endAnimation();
        }
      },
      contextmenu() {
        if (self.#isHostDisabled()) {
          return;
        }

        checkBoundsAfterContextMenu = true;
        void self.#endAnimation();
      },
      pointerdown(event: PointerEvent) {
        if (!self.#shouldReactToEvent(event)) {
          return;
        }

        self.#startEvent = event;

        if (!isTouch(event)) {
          state = WAITING_FOR_COMPLETION;
          self.#startAnimation();
          return;
        }

        // after a longpress contextmenu event, an extra `pointerdown` can be
        // dispatched to the pressed element. Check that the down is within
        // bounds of the element in this case.
        if (checkBoundsAfterContextMenu && !self.#inBounds(event)) {
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
          self.#startAnimation();
        }, TOUCH_DELAY_MS);
      },
      pointerleave(event: PointerEvent) {
        if (!self.#shouldReactToEvent(event)) {
          return;
        }

        // release a held mouse or pen press that moves outside the element
        if (state !== INACTIVE) {
          void self.#endAnimation();
        }
      },
      pointerup(event: PointerEvent) {
        if (!self.#shouldReactToEvent(event)) {
          return;
        }

        if (state === HOLDING) {
          state = WAITING_FOR_COMPLETION;
          return;
        }

        if (state === TOUCH_DELAY) {
          state = WAITING_FOR_COMPLETION;
          self.#startAnimation();
          return;
        }
      },
      pointercancel(event: PointerEvent) {
        if (!self.#shouldReactToEvent(event)) {
          return;
        }

        void self.#endAnimation();
      },
    });
  }

  connected(): void {
    const self = this;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    self.#varValues = readCSSVariables(
      self.#host,
      self.#cssVariables,
      (name, value, host) =>
        name === 'duration'
          ? // converting duration to ms
            transformNumericVariable(name, value, host) * 1000
          : value,
    ) as CSSVariables;
  }

  #inBounds({ x, y }: PointerEvent): boolean {
    const { top, left, bottom, right } = this.#host.getBoundingClientRect();
    return x >= left && x <= right && y >= top && y <= bottom;
  }

  #startAnimation(): void {
    const self = this;
    const host = self.#host;
    const rect = host.getBoundingClientRect();

    self.#animation?.cancel();
    const [size, scale] = determineRippleSize(host, rect);
    const { startPoint, endPoint } = getTranslationCoordinates(
      host,
      rect,
      size,
      self.#startEvent,
    );

    const pxSize = `${size}px`;

    self.#animation = self.#rippleElement.animate(
      {
        [VARS.rippleSize]: [pxSize, pxSize],
        transform: [
          `translate(${startPoint.x}px,${startPoint.y}px) scale(1)`,
          `translate(${endPoint.x}px,${endPoint.y}px) scale(${scale})`,
        ],
      },
      {
        pseudoElement: '::after',
        fill: 'forwards',
        ...self.#varValues,
      },
    );
  }

  async #endAnimation(): Promise<void> {
    this.#startEvent = null;
    const animation = this.#animation;
    let pressAnimationPlayState = Infinity;
    if (typeof animation?.currentTime === 'number') {
      pressAnimationPlayState = animation.currentTime;
    } else if (animation?.currentTime) {
      pressAnimationPlayState = animation.currentTime.to('ms').value;
    }

    if (pressAnimationPlayState >= MINIMUM_PRESS_MS) {
      this.#finalizeAnimation();
      return;
    }

    await new Promise((resolve) => {
      setTimeout(resolve, MINIMUM_PRESS_MS - pressAnimationPlayState);
    });

    if (this.#animation !== animation) {
      // A new press animation was started. The old animation was canceled and
      // should not finish the pressed state.
      return;
    }

    this.#finalizeAnimation();
  }

  #finalizeAnimation(): void {
    if (this.#animation) {
      this.#animation.playbackRate = -1;
      this.#animation.play();
    }
  }

  #isHostDisabled(): boolean {
    return this.#host.hasAttribute('disabled');
  }

  #shouldReactToEvent(event: PointerEvent): boolean {
    if (this.#isHostDisabled() || !event.isPrimary) {
      return false;
    }

    if (this.#startEvent && this.#startEvent.pointerId !== event.pointerId) {
      return false;
    }

    if (event.type === 'pointerenter' || event.type === 'pointerleave') {
      return !isTouch(event);
    }

    const isPrimaryButton = event.buttons === 1;
    return isTouch(event) || isPrimaryButton;
  }
}

export function useRipple(host: ReactiveElement, vars: CSSVariables): void {
  use(host, new RippleAnimationController(host, vars));
}
