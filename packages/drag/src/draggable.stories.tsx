import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useRef, useState, type JSX } from 'react';
import { draggable, type DragAxis } from './draggable.ts';
import css from './stories.module.css';

const meta: Meta = {
  title: 'Drag/Draggable',
};

export default meta;

type PlaygroundArgs = Readonly<{
  axis: DragAxis;
  bounded: boolean;
  tilted: boolean;
}>;

/**
 * A free-drag box inside a bounded area. The area doubles as the drag bounds
 * when `bounded` is on, so the box cannot leave it.
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

    const controller = draggable(box, {
      axis,
      bounds: bounded ? area : 'viewport',
      touchAction: 'none',
    });

    return () => {
      controller.destroy();
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

/** A drop that is confirmed asynchronously, holding the visual until it resolves. */
function AsyncDrop(): JSX.Element {
  const boxRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState('idle');

  useEffect(() => {
    const box = boxRef.current;

    if (!box) {
      return;
    }

    const controller = draggable(box, {
      touchAction: 'none',
      onStart: () => setStatus('dragging…'),
      async onDrop() {
        setStatus('saving…');
        await new Promise((resolve) => {
          setTimeout(resolve, 600);
        });
        return { accepted: true };
      },
      onFinish: () => setStatus('saved'),
    });

    return () => {
      controller.destroy();
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

type LiftMode = 'top-layer' | 'top-layer-transformed' | 'none';
type TransformedArgs = Readonly<{ lift: LiftMode }>;

const LIFT_HINT: Record<LiftMode, string> = {
  'top-layer':
    'top-layer lift — floats above, but flattens the stage transform',
  'top-layer-transformed':
    'top-layer, transform preserved — floats above and keeps the stage transform',
  none: 'in place — keeps the transform but is clipped by the stage',
};

/**
 * A drag inside a rotated, scaled stage. Geometry runs through the coordinate
 * compositor in every mode, so the pointer stays anchored and the reported local
 * delta is in the stage's own space. The `lift` control switches between the
 * default top-layer lift (the box straightens out and floats above everything),
 * the transform-preserving lift (floats above yet keeps the stage's rotation and
 * scale), and an in-place drag (keeps the transform but is clipped by the stage).
 */
function TransformedContext({ lift }: TransformedArgs): JSX.Element {
  const boxRef = useRef<HTMLDivElement>(null);
  const [local, setLocal] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const box = boxRef.current;

    if (!box) {
      return;
    }

    const controller = draggable(box, {
      touchAction: 'none',
      lift,
      onMove: (geometry) =>
        setLocal({
          x: Math.round(geometry.localDelta.x),
          y: Math.round(geometry.localDelta.y),
        }),
    });

    return () => {
      controller.destroy();
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
    lift: 'top-layer',
  },
  argTypes: {
    lift: {
      control: 'inline-radio',
      options: ['top-layer', 'top-layer-transformed', 'none'],
      description: 'How the visual is promoted during the drag.',
    },
  },
  render: (args) => <TransformedContext {...args} />,
};
