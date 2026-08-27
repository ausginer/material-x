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
 * **The three shipped stories, restored** (Phase 20) — `Interactive`,
 * `AsyncDropConfirmation` and `TransformedStage`.
 *
 * They are a deliverable rather than documentation. Phase 11 found a lift-mode
 * regression that 644 tests passed through, because no test compared the lifted
 * visual's on-screen box to where it should be; **it was caught by driving a
 * demo**. `tests/free-drag/geometry.browser.test.ts` now makes those
 * comparisons executable, and these stories are the other half of that lesson:
 * the place where a person looks at the thing.
 *
 * What the restoration had to migrate, and it is the whole parity ledger for
 * this surface in three files:
 *
 * | shipped | here |
 * | --- | --- |
 * | `draggable(box, options)` | `freeDrag(item, config, ...fragments)` — D-69, D-77 |
 * | `bounds: area` / `bounds: 'viewport'` | `bounds(area)` / `bounds()` — a capability, and the sentinel is closed by deletion |
 * | `lift: 'top-layer' \| 'flatten' \| 'none'` | `LIFT_FAITHFUL \| LIFT_FLAT \| LIFT_IN_PLACE` — D-141, and the constants publish from this entry (~~`'faithful' \| 'flat' \| 'in-place'` — D-73~~) |
 * | `onFinish` / `onCancel` | one `onEnd` with three discriminated arms — D-62 |
 * | `FreeDropResolution` | `FreeDragResolution` — D-69, one vocabulary |
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

    // **One required config, then fragments merged by slot** (D-77, D-45).
    // `bounds()` is a capability installer rather than a config key (D-70): a
    // composition without it carries neither the clamp nor the rect resolver,
    // which `tests/packaging.node.test.ts` asserts over the module graph.
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
 * **The terminal is one callback with three arms now** (D-62): the shipped
 * `onFinish`/`onCancel` pair is gone, and the story discriminates on
 * `result.type` instead — which is the migration a consumer performs, written
 * out rather than described.
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
 * **The kernel's own constants, and there is no second vocabulary** (D-141).
 * The shipped strings named one mode after a mechanism it shares with its
 * sibling — both promoted modes use the top layer — and said *no lift* for a
 * mode that lifts, suppresses transitions and projects coordinates; the numeric
 * modes carry no such claim, and the prose below is the story's own.
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
 * **There is no coordinate module behind this any more** (D-72). The shipped
 * package walked `offsetParent` accumulating transforms and zoom; the reported
 * The local delta here is the viewport delta mapped through the inverse of the
 * *inherited* linear part, which falls out of the single box-quad traversal the
 * lift already performs. Every point on the surface is viewport, and the delta
 * is the one quantity a linear part alone can map.
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
