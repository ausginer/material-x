import { Story } from '@ladle/react';
import './react/switch-button.ts';
import { useState } from 'react';
import type { SwitchButtonAttributes } from './react/switch-button.ts';

type ControlledSwitchButtonProps = SwitchButtonAttributes;

function ControlledSwitchButton({
  color,
  size,
  shape,
}: ControlledSwitchButtonProps) {
  const [state, setState] = useState(false);

  return (
    <mx-switch-button
      checked={state}
      color={color}
      size={size}
      shape={shape}
      onClick={() => {
        setState(!state);
      }}
    >
      Checkbox
    </mx-switch-button>
  );
}

// ================
// Color
// ================

export const ColorFilled: Story = () => (
  <section className="story-list">
    <mx-switch-button>Check Me!</mx-switch-button>
    <mx-switch-button checked>I am checked!</mx-switch-button>
    <ControlledSwitchButton />
  </section>
);
ColorFilled.storyName = 'Color / Default';

export const ColorElevated: Story = () => (
  <section className="story-list">
    <mx-switch-button color="elevated">Check Me!</mx-switch-button>
    <mx-switch-button color="elevated" checked>
      I am checked!
    </mx-switch-button>
    <ControlledSwitchButton color="elevated" />
  </section>
);
ColorElevated.storyName = 'Color / Elevated';

export const ColorOutlined: Story = () => (
  <section className="story-list">
    <mx-switch-button color="outlined">Check Me!</mx-switch-button>
    <mx-switch-button color="outlined" checked>
      I am checked!
    </mx-switch-button>
    <ControlledSwitchButton color="outlined" />
  </section>
);
ColorOutlined.storyName = 'Color / Outlined';

export const ColorTonal: Story = () => (
  <section className="story-list">
    <mx-switch-button color="tonal">Check Me!</mx-switch-button>
    <mx-switch-button color="tonal" checked>
      I am checked!
    </mx-switch-button>
    <ControlledSwitchButton color="tonal" />
  </section>
);
ColorTonal.storyName = 'Color / Tonal';

// ================
// Size
// ================

export const SizeXSmall: Story = () => (
  <section className="story-list">
    <mx-switch-button size="xsmall">Check Me!</mx-switch-button>
    <mx-switch-button size="xsmall" checked>
      I am checked!
    </mx-switch-button>
    <ControlledSwitchButton size="xsmall" />
  </section>
);
SizeXSmall.storyName = 'Size / XSmall';

export const SizeSmall: Story = () => (
  <section className="story-list">
    <mx-switch-button size="small">Check Me!</mx-switch-button>
    <mx-switch-button size="small" checked>
      I am checked!
    </mx-switch-button>
    <ControlledSwitchButton size="small" />
  </section>
);
SizeSmall.storyName = 'Size / Small';

export const SizeMedium: Story = () => (
  <section className="story-list">
    <mx-switch-button size="medium">Check Me!</mx-switch-button>
    <mx-switch-button size="medium" checked>
      I am checked!
    </mx-switch-button>
    <ControlledSwitchButton size="medium" />
  </section>
);
SizeMedium.storyName = 'Size / Medium';

export const SizeLarge: Story = () => (
  <section className="story-list">
    <mx-switch-button size="large">Check Me!</mx-switch-button>
    <mx-switch-button size="large" checked>
      I am checked!
    </mx-switch-button>
    <ControlledSwitchButton size="large" />
  </section>
);
SizeLarge.storyName = 'Size / Large';

export const SizeXLarge: Story = () => (
  <section className="story-list">
    <mx-switch-button size="xlarge">Check Me!</mx-switch-button>
    <mx-switch-button size="xlarge" checked>
      I am checked!
    </mx-switch-button>
    <ControlledSwitchButton size="xlarge" />
  </section>
);
SizeXLarge.storyName = 'Size / XLarge';

// ================
// Shape
// ================

export const ShapeSquare: Story = () => (
  <section className="story-list">
    <mx-switch-button shape="square">Check Me!</mx-switch-button>
    <mx-switch-button shape="square" checked>
      I am checked!
    </mx-switch-button>
    <ControlledSwitchButton shape="square" />
  </section>
);
ShapeSquare.storyName = 'Shape / Square';

// ================
// Disabled
// ================

export const Disabled: Story = () => (
  <section className="story-list">
    <mx-switch-button disabled>Check Me!</mx-switch-button>
    <mx-switch-button disabled checked>
      I am checked!
    </mx-switch-button>
    <ControlledSwitchButton disabled />
  </section>
);

// ================
// With Icon
// ================

export const WithIcon: Story = () => (
  <section className="story-list">
    <mx-switch-button>
      <mx-icon>check</mx-icon>
      Check Me!
    </mx-switch-button>
    <mx-switch-button checked>
      <mx-icon>check</mx-icon>I am checked!
    </mx-switch-button>
  </section>
);
