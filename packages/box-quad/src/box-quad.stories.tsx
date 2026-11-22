/**
 * Stories for box-quad's four functions. _Live Demo_ reproduces the
 * [live demo](https://jogibear9988.github.io/getBoxQuadsPolyfill#live-demo) of
 * getBoxQuadsPolyfill by Jochen Kühner (MIT): its scenario and readings, written
 * for box-quad's API. None of the demo's markup, CSS or code is copied.
 *
 * Each overlay is drawn imperatively from a layout effect that runs on every
 * arg change, a `ResizeObserver` callback or a `scroll` listener. All three run
 * before the next frame paints, so the polygon never lags the element it
 * outlines.
 *
 * A readout is written by changing its text node's data, which adds and
 * removes no node. Storybook's highlight addon observes the story's subtree for
 * added and removed nodes and starts a `ResizeObserver` on `<body>` for each
 * such change. Started inside our observer's callback, that observation is
 * shallower than the one being delivered, and WebKit reports a
 * `ResizeObserver` loop error.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useLayoutEffect, useRef, type JSX, type RefObject } from 'react';
import {
  ancestry,
  coordinates,
  localDelta,
  projection,
  type Box,
  type Quad,
} from './index.ts';
import css from './stories.module.css';

const meta: Meta = {
  title: 'Box Quad',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Each story reads with `@ydinjs/box-quad` and draws what it reads. box-quad measures the border box only, gives one quad or `false`, and never calls the native `getBoxQuads()`.',
      },
    },
  },
};

export default meta;

/** Storage for one projected read: both measured boxes and the quad. */
type QuadStore = Readonly<{ source: Box; relativeTo: Box; quad: Quad }>;

function createQuadStore(): QuadStore {
  return {
    source: new Float64Array(8),
    relativeTo: new Float64Array(8),
    quad: new Float64Array(8),
  };
}

/** Reads `source`'s border box into `relativeTo`'s local space. */
function readQuad(
  source: HTMLElement,
  relativeTo: HTMLElement,
  store: QuadStore,
): boolean {
  return (
    coordinates(source, store.source) &&
    coordinates(relativeTo, store.relativeTo) &&
    projection(store.source, store.quad, store.relativeTo)
  );
}

/**
 * The overlay's user space is the stage's border-box space: the SVG sits at
 * `inset: 0` of a stage with no border, and has no `viewBox`.
 */
function Overlay({
  ref,
}: Readonly<{ ref: RefObject<SVGSVGElement | null> }>): JSX.Element {
  return (
    <svg ref={ref} className={css['overlay']} aria-hidden="true">
      <g display="none">
        <polygon className={css['outline']} />
        <circle className={css['corner']} r="5" />
        <circle className={css['corner']} r="5" />
        <circle className={css['corner']} r="5" />
        <circle className={css['corner']} r="5" />
      </g>
    </svg>
  );
}

/** Draws `quad` on the overlay, or hides it when the read failed. */
function drawOverlay(overlay: SVGSVGElement, quad: Quad | false): void {
  const group = overlay.firstElementChild as SVGGElement;

  if (!quad) {
    group.setAttribute('display', 'none');
    return;
  }

  group.removeAttribute('display');

  const [polygon, ...corners] = group.children;
  polygon!.setAttribute(
    'points',
    `${quad[0]},${quad[1]} ${quad[2]},${quad[3]} ${quad[4]},${quad[5]} ${quad[6]},${quad[7]}`,
  );

  for (const [index, corner] of corners.entries()) {
    corner.setAttribute('cx', String(quad[index * 2]));
    corner.setAttribute('cy', String(quad[index * 2 + 1]));
  }
}

/** Replaces the text of an element that holds one text node. */
function writeText(element: Element, text: string): void {
  (element.firstChild as Text).data = text;
}

function formatPoint(quad: Quad, index: number, digits: number): string {
  return `(${quad[index * 2]!.toFixed(digits)}, ${quad[index * 2 + 1]!.toFixed(digits)})`;
}

function Readout({
  ref,
}: Readonly<{ ref: RefObject<HTMLDListElement | null> }>): JSX.Element {
  return (
    <dl ref={ref} className={css['readout']}>
      <dt>Read</dt>
      <dd>
        <output data-read>-</output>
      </dd>
      <dt>First point</dt>
      <dd>
        <output data-first>-</output>
      </dd>
      <dt>Quad points</dt>
      <dd>
        <output data-points>-</output>
      </dd>
    </dl>
  );
}

/** Writes the read's result, p1 to one decimal, and p1 to p4 to two. */
function writeReadout(readout: HTMLDListElement, quad: Quad | false): void {
  writeText(readout.querySelector('[data-read]')!, String(!!quad));
  writeText(
    readout.querySelector('[data-first]')!,
    quad ? formatPoint(quad, 0, 1) : '-',
  );
  writeText(
    readout.querySelector('[data-points]')!,
    quad
      ? [0, 1, 2, 3]
          .map((index) => `p${index + 1}: ${formatPoint(quad, index, 2)}`)
          .join(' ')
      : '-',
  );
}

type LiveDemoArgs = Readonly<{ rotation: number; skew: number }>;

function LiveDemoView({ rotation, skew }: LiveDemoArgs): JSX.Element {
  const stageRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<SVGSVGElement>(null);
  const readoutRef = useRef<HTMLDListElement>(null);

  useLayoutEffect(() => {
    const store = createQuadStore();
    const draw = (): void => {
      const quad =
        readQuad(targetRef.current!, stageRef.current!, store) && store.quad;
      drawOverlay(overlayRef.current!, quad);
      writeReadout(readoutRef.current!, quad);
    };
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(stageRef.current!);

    return () => {
      observer.disconnect();
    };
  }, [rotation, skew]);

  return (
    <div className={css['story']}>
      <div className={css['scroller']}>
        <div ref={stageRef} className={`${css['stage']} ${css['demo-stage']}`}>
          <span className={css['badge']}>relativeTo: demo stage</span>
          <div className={css['stack']}>
            <div className={`${css['card']} ${css['ancestor-card']}`}>
              Ancestor
            </div>
            <div
              ref={targetRef}
              className={`${css['card']} ${css['target-card']}`}
              style={{ transform: `rotate(${rotation}deg) skewX(${skew}deg)` }}
            >
              Target node
            </div>
          </div>
          <Overlay ref={overlayRef} />
        </div>
      </div>
      <Readout ref={readoutRef} />
    </div>
  );
}

/**
 * Reproduces the [live demo](https://jogibear9988.github.io/getBoxQuadsPolyfill#live-demo)
 * of getBoxQuadsPolyfill by Jochen Kühner (MIT).
 *
 * The target's border box is read with `coordinates` and projected into the
 * stage with `projection`. The points are CSS pixels in the stage's
 * untransformed border-box space, so the stage's scroll position doesn't change
 * them. box-quad measures the border box only, so the demo's _Box_ select has
 * no counterpart, and it keeps no cache, so neither has the cache toggle.
 * _Read_ is the read's one outcome, `true` or `false`.
 */
export const LiveDemo: StoryObj<LiveDemoArgs> = {
  args: { rotation: -18, skew: 8 },
  argTypes: {
    rotation: { control: { type: 'range', min: -55, max: 55, step: 1 } },
    skew: { control: { type: 'range', min: -20, max: 20, step: 1 } },
  },
  render: (args) => <LiveDemoView {...args} />,
};

type NestedSpacesArgs = Readonly<{
  ancestorRotation: number;
  ancestorZoom: number;
  targetRotation: number;
}>;

function NestedSpacesView({
  ancestorRotation,
  ancestorZoom,
  targetRotation,
}: NestedSpacesArgs): JSX.Element {
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<SVGSVGElement>(null);
  const readoutRef = useRef<HTMLDListElement>(null);

  useLayoutEffect(() => {
    const store = createQuadStore();
    const draw = (): void => {
      const quad =
        readQuad(targetRef.current!, rootRef.current!, store) && store.quad;
      drawOverlay(overlayRef.current!, quad);
      writeReadout(readoutRef.current!, quad);
    };
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(rootRef.current!);
    const controller = new AbortController();
    scrollerRef.current!.addEventListener('scroll', draw, {
      passive: true,
      signal: controller.signal,
    });

    return () => {
      observer.disconnect();
      controller.abort();
    };
  }, [ancestorRotation, ancestorZoom, targetRotation]);

  return (
    <div className={css['story']}>
      <div ref={rootRef} className={`${css['stage']} ${css['nested-stage']}`}>
        <span className={css['badge']}>relativeTo: story root</span>
        <div
          className={css['nested-ancestor']}
          style={{ rotate: `${ancestorRotation}deg`, zoom: ancestorZoom }}
        >
          <div ref={scrollerRef} className={css['nested-scroller']}>
            <div className={css['nested-content']}>
              <div
                ref={targetRef}
                className={css['nested-target']}
                style={{ rotate: `${targetRotation}deg` }}
              >
                Target
              </div>
            </div>
          </div>
        </div>
        <Overlay ref={overlayRef} />
      </div>
      <Readout ref={readoutRef} />
    </div>
  );
}

/**
 * The target sits in a scroll container, inside an ancestor with its own
 * `rotate` and `zoom`, and has a rotation of its own. Its quad is projected
 * into the untransformed story root, so the whole chain lies between the two,
 * and the overlay is redrawn as the container scrolls. box-quad doesn't clip:
 * a target scrolled out of sight still has a quad, and the overlay then draws
 * outside the scroll container.
 */
export const NestedSpaces: StoryObj<NestedSpacesArgs> = {
  args: { ancestorRotation: 12, ancestorZoom: 1.25, targetRotation: -20 },
  argTypes: {
    ancestorRotation: {
      control: { type: 'range', min: -45, max: 45, step: 1 },
    },
    ancestorZoom: {
      control: { type: 'range', min: 0.5, max: 2, step: 0.05 },
    },
    targetRotation: {
      control: { type: 'range', min: -45, max: 45, step: 1 },
    },
  },
  render: (args) => <NestedSpacesView {...args} />,
};

type PointerDeltaArgs = Readonly<{
  ancestorRotation: number;
  ancestorZoom: number;
}>;

function PointerDeltaView({
  ancestorRotation,
  ancestorZoom,
}: PointerDeltaArgs): JSX.Element {
  const boxRef = useRef<HTMLDivElement>(null);
  const translationRef = useRef<HTMLOutputElement>(null);

  useLayoutEffect(() => {
    const box = boxRef.current!;
    const space = new Float64Array(5);
    const delta = new Float64Array(2);
    const controller = new AbortController();
    const { signal } = controller;
    let x = 0;
    let y = 0;
    let lastX = 0;
    let lastY = 0;

    box.addEventListener(
      'pointerdown',
      (event) => {
        box.setPointerCapture(event.pointerId);
        lastX = event.clientX;
        lastY = event.clientY;
      },
      { signal },
    );
    box.addEventListener(
      'pointermove',
      (event) => {
        if (!box.hasPointerCapture(event.pointerId)) {
          return;
        }

        // The viewport delta since the last event, from client coordinates.
        const dx = event.clientX - lastX;
        const dy = event.clientY - lastY;
        lastX = event.clientX;
        lastY = event.clientY;

        if (ancestry(box, space) && localDelta(space, dx, dy, delta)) {
          x += delta[0]!;
          y += delta[1]!;
          box.style.translate = `${x}px ${y}px`;
          writeText(
            translationRef.current!,
            `(${x.toFixed(1)}, ${y.toFixed(1)})`,
          );
        }
      },
      { signal },
    );

    return () => {
      controller.abort();
    };
  }, []);

  return (
    <div className={css['story']}>
      <div className={`${css['stage']} ${css['pointer-stage']}`}>
        <div
          className={css['pointer-ancestor']}
          style={{ rotate: `${ancestorRotation}deg`, zoom: ancestorZoom }}
        >
          <div ref={boxRef} className={css['pointer-box']}>
            Drag me
          </div>
        </div>
      </div>
      <dl className={css['readout']}>
        <dt>translate</dt>
        <dd>
          <output ref={translationRef}>(0.0, 0.0)</output>
        </dd>
      </dl>
    </div>
  );
}

/**
 * README's second example. The box is inside an ancestor with `rotate` and
 * `zoom`. On each move, `ancestry` reads the space the box inherits, and
 * `localDelta` turns the pointer's viewport delta into the change of the box's
 * `translate`, so the box stays under the pointer at any rotation and zoom.
 * `@ydinjs/drag` builds on these functions; this story uses them directly.
 */
export const PointerDelta: StoryObj<PointerDeltaArgs> = {
  args: { ancestorRotation: 30, ancestorZoom: 1.5 },
  argTypes: {
    ancestorRotation: {
      control: { type: 'range', min: -180, max: 180, step: 1 },
    },
    ancestorZoom: {
      control: { type: 'range', min: 0.5, max: 2, step: 0.05 },
    },
  },
  render: (args) => <PointerDeltaView {...args} />,
};

type FailedReadCase = Readonly<{ name: string; target: JSX.Element }>;

const FAILED_READ_CASES: readonly FailedReadCase[] = [
  {
    name: 'A 3D transform',
    target: (
      <div data-target className={`${css['failed-target']} ${css['three-d']}`}>
        rotateX(40deg)
      </div>
    ),
  },
  {
    name: 'An inline element on two lines',
    target: (
      <p className={css['failed-text']}>
        Text with{' '}
        <span data-target className={css['split-inline']}>
          an inline element split across two lines
        </span>
        .
      </p>
    ),
  },
  {
    name: '`display: none`',
    target: (
      <div data-target className={`${css['failed-target']} ${css['hidden']}`}>
        Hidden
      </div>
    ),
  },
  {
    name: 'A 2D transform, for contrast',
    target: (
      <div data-target className={`${css['failed-target']} ${css['two-d']}`}>
        rotate(12deg)
      </div>
    ),
  },
];

function FailedReadPanel({ name, target }: FailedReadCase): JSX.Element {
  const panelRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<SVGSVGElement>(null);
  const readRef = useRef<HTMLOutputElement>(null);

  useLayoutEffect(() => {
    const panel = panelRef.current!;
    const store = createQuadStore();
    const draw = (): void => {
      const element = panel.querySelector<HTMLElement>('[data-target]')!;
      const quad = readQuad(element, panel, store) && store.quad;
      drawOverlay(overlayRef.current!, quad);
      writeText(readRef.current!, String(!!quad));
    };
    const observer = new ResizeObserver(draw);
    observer.observe(panel);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <figure className={css['failed-case']}>
      <div ref={panelRef} className={`${css['stage']} ${css['failed-stage']}`}>
        {target}
        <Overlay ref={overlayRef} />
      </div>
      <figcaption>
        {name}. Read: <output ref={readRef}>-</output>
      </figcaption>
    </figure>
  );
}

/**
 * The boolean contract. A 3D transform, an inline element with more than one
 * client rect, and an element with no box each make the read return `false`,
 * and no overlay is drawn. A `false` read leaves the caller's storage
 * untouched. The fourth target has a 2D transform, and its read succeeds.
 */
export const FailedReads: StoryObj = {
  render: () => (
    <div className={css['failed-grid']}>
      {FAILED_READ_CASES.map((failedCase) => (
        <FailedReadPanel key={failedCase.name} {...failedCase} />
      ))}
    </div>
  ),
};
