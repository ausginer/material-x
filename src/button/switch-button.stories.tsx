import { Story } from '@ladle/react';
import './react/switch-button.ts';
import { useState, type PropsWithChildren } from 'react';
import type { SwitchButtonAttributes } from './react/switch-button.ts';

type ControlledSwitchButtonProps = SwitchButtonAttributes;

function ControlledSwitchButton({
  children,
  ...other
}: PropsWithChildren<ControlledSwitchButtonProps>) {
  const [state, setState] = useState(false);

  return (
    <mx-switch-button
      checked={state}
      onChange={() => {
        setState(!state);
      }}
      {...other}
    >
      {children}
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
    <ControlledSwitchButton>Checkbox</ControlledSwitchButton>
  </section>
);
ColorFilled.storyName = 'Color / Default';

export const ColorElevated: Story = () => (
  <section className="story-list">
    <mx-switch-button color="elevated">Check Me!</mx-switch-button>
    <mx-switch-button color="elevated" checked>
      I am checked!
    </mx-switch-button>
    <ControlledSwitchButton color="elevated">Checkbox</ControlledSwitchButton>
  </section>
);
ColorElevated.storyName = 'Color / Elevated';

export const ColorOutlined: Story = () => (
  <section className="story-list">
    <mx-switch-button color="outlined">Check Me!</mx-switch-button>
    <mx-switch-button color="outlined" checked>
      I am checked!
    </mx-switch-button>
    <ControlledSwitchButton color="outlined">Checkbox</ControlledSwitchButton>
  </section>
);
ColorOutlined.storyName = 'Color / Outlined';

export const ColorTonal: Story = () => (
  <section className="story-list">
    <mx-switch-button color="tonal">Check Me!</mx-switch-button>
    <mx-switch-button color="tonal" checked>
      I am checked!
    </mx-switch-button>
    <ControlledSwitchButton color="tonal">Checkbox</ControlledSwitchButton>
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
    <ControlledSwitchButton size="xsmall">Checkbox</ControlledSwitchButton>
  </section>
);
SizeXSmall.storyName = 'Size / XSmall';

export const SizeSmall: Story = () => (
  <section className="story-list">
    <mx-switch-button size="small">Check Me!</mx-switch-button>
    <mx-switch-button size="small" checked>
      I am checked!
    </mx-switch-button>
    <ControlledSwitchButton size="small">Checkbox</ControlledSwitchButton>
  </section>
);
SizeSmall.storyName = 'Size / Small';

export const SizeMedium: Story = () => (
  <section className="story-list">
    <mx-switch-button size="medium">Check Me!</mx-switch-button>
    <mx-switch-button size="medium" checked>
      I am checked!
    </mx-switch-button>
    <ControlledSwitchButton size="medium">Checkbox</ControlledSwitchButton>
  </section>
);
SizeMedium.storyName = 'Size / Medium';

export const SizeLarge: Story = () => (
  <section className="story-list">
    <mx-switch-button size="large">Check Me!</mx-switch-button>
    <mx-switch-button size="large" checked>
      I am checked!
    </mx-switch-button>
    <ControlledSwitchButton size="large">Checkbox</ControlledSwitchButton>
  </section>
);
SizeLarge.storyName = 'Size / Large';

export const SizeXLarge: Story = () => (
  <section className="story-list">
    <mx-switch-button size="xlarge">Check Me!</mx-switch-button>
    <mx-switch-button size="xlarge" checked>
      I am checked!
    </mx-switch-button>
    <ControlledSwitchButton size="xlarge">Checkbox</ControlledSwitchButton>
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
    <ControlledSwitchButton shape="square">Checkbox</ControlledSwitchButton>
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
    <ControlledSwitchButton disabled>Checkbox</ControlledSwitchButton>
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
