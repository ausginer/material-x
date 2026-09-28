import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useRef, useState, type JSX } from 'react';
import { bounds } from './free-drag/bounds.ts';
import {
  FreeDragResolution,
  freeDrag,
  LIFT_FAITHFUL,
  LIFT_FLAT,
  LIFT_IN_PLACE,
  type DragAxis,
  type LiftMode,
} from './free-drag.ts';
import css from './stories.module.css';

/**
 * The three free-drag stories — `Interactive`, `AsyncDropConfirmation` and
 * `TransformedStage`.
 *
 * They are a deliverable rather than documentation: the place where a person
 * looks at the thing. `tests/free-drag/geometry.browser.test.ts` is the other
 * half, comparing the lifted visual's on-screen box to where it should be.
 */
const meta: Meta = {
  title: 'Drag2/Free drag',
};

export default meta;

type PlaygroundArgs = Readonly<{
  axis: DragAxis;
  bounded: boolean;
  tilted: boolean;
}>;

/**
 * A free-drag box inside a bounded area. The area doubles as the drag bounds
 * when `bounded` is on, so the box cannot leave it; with it off the drag is
 * contained by the viewport, which is what the no-argument `bounds()` means.
 * `onDrop` accepts every drop, leaving the box wherever it was released.
 */
function Playground({ axis, bounded, tilted }: PlaygroundArgs): JSX.Element {
  const areaRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = boxRef.current;
    const area = areaRef.current;

    if (!box || !area) {
      return;
    }

    // **One required config, then fragments merged by slot.** `bounds()` is a
    // capability installer rather than a config key: a composition without it
    // carries neither the clamp nor the rect resolver, which
    // `tests/packaging.node.test.ts` asserts over the module graph.
    const controller = freeDrag(
      box,
      {
        axis,
        onDrop: () => FreeDragResolution.accept(),
      },
      bounded ? bounds(area) : bounds(),
    );

    return () => {
      void controller.destroy();
    };
  }, [axis, bounded]);

  return (
    <div className={css['stage']}>
      <p className={css['hint']}>
        Drag the box{bounded ? ' — it stays inside the dashed area' : ''}.
      </p>
      <div ref={areaRef} className={css['area']}>
        <div
          ref={boxRef}
          className={`${css['box']} ${tilted ? css['tilted'] : ''}`}
        >
          Drag me
        </div>
      </div>
    </div>
  );
}

export const Interactive: StoryObj<PlaygroundArgs> = {
  args: {
    axis: 'both',
    bounded: true,
    tilted: false,
  },
  argTypes: {
    axis: {
      control: 'inline-radio',
      options: ['both', 'x', 'y'],
    },
    bounded: {
      control: 'boolean',
    },
    tilted: {
      control: 'boolean',
      description: 'Give the box its own transform, composed with the drag.',
    },
  },
  render: (args) => <Playground {...args} />,
};

/**
 * A drop confirmed asynchronously, holding the visual until it resolves.
 *
 * **The terminal is one callback with three arms**: the story discriminates on
 * `result.type`.
 */
function AsyncDrop(): JSX.Element {
  const boxRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState('idle');

  useEffect(() => {
    const box = boxRef.current;

    if (!box) {
      return;
    }

    const controller = freeDrag(box, {
      onStart: () => setStatus('dragging…'),
      async onDrop() {
        setStatus('saving…');
        await new Promise((resolve) => {
          setTimeout(resolve, 600);
        });
        return FreeDragResolution.accept();
      },
      onEnd: (result) => setStatus(result.type),
    });

    return () => {
      void controller.destroy();
    };
  }, []);

  return (
    <div className={css['stage']}>
      <p className={css['hint']}>
        Drop the box: the drop is confirmed after a short async delay ({status}
        ).
      </p>
      <div className={css['area']}>
        <div ref={boxRef} className={css['box']}>
          Drop me
        </div>
      </div>
    </div>
  );
}

export const AsyncDropConfirmation: StoryObj = {
  render: () => <AsyncDrop />,
};

type TransformedArgs = Readonly<{ lift: LiftMode }>;

/**
 * **The kernel's own constants, and there is no second vocabulary.** The
 * numeric modes name no mechanism — two of the three use the top layer, and the
 * third still lifts, suppresses transitions and projects coordinates — so the
 * prose below is the story's own.
 */
const LIFT_HINT: Readonly<Record<LiftMode, string>> = {
  [LIFT_FAITHFUL]:
    'faithful — floats above and keeps the stage transform, undistorted',
  [LIFT_FLAT]:
    'flat — floats above, dropping the stage transform (drags upright at natural size)',
  [LIFT_IN_PLACE]: 'in place — keeps the transform but is clipped by the stage',
};

/**
 * A drag inside a rotated, scaled stage.
 *
 * **There is no coordinate module behind this.** The local delta is the
 * viewport delta mapped through the inverse of the *inherited* linear part,
 * which falls out of the single box-quad traversal the lift already performs.
 * Every point on the surface is viewport, and the delta is the one quantity a
 * linear part alone can map.
 */
function TransformedContext({ lift }: TransformedArgs): JSX.Element {
  const boxRef = useRef<HTMLDivElement>(null);
  const [local, setLocal] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const box = boxRef.current;

    if (!box) {
      return;
    }

    const controller = freeDrag(box, {
      lift,
      onDrop: () => FreeDragResolution.accept(),
      onMove: (geometry) =>
        setLocal({
          x: Math.round(geometry.localDeltaX),
          y: Math.round(geometry.localDeltaY),
        }),
    });

    return () => {
      void controller.destroy();
    };
  }, [lift]);

  return (
    <div className={css['stage']}>
      <p className={css['hint']}>
        Rotated, scaled stage — {LIFT_HINT[lift]}; local delta = ({local.x},{' '}
        {local.y}).
      </p>
      <div className={`${css['area']} ${css['warped']}`}>
        <div ref={boxRef} className={css['box']}>
          Drag me
        </div>
      </div>
    </div>
  );
}

export const TransformedStage: StoryObj<TransformedArgs> = {
  args: {
    lift: LIFT_FAITHFUL,
  },
  argTypes: {
    lift: {
      control: 'inline-radio',
      options: [LIFT_FAITHFUL, LIFT_FLAT, LIFT_IN_PLACE],
      labels: LIFT_HINT,
      description: 'How the visual is promoted during the drag.',
    },
  },
  render: (args) => <TransformedContext {...args} />,
};
