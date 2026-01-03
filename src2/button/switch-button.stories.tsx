import type { Story, StoryDefault } from '@ladle/react';
import './switch-button.ts';
import { useState, type PropsWithChildren } from 'react';
import type { SwitchButtonProperties } from './switch-button.ts';

const storyDefault: StoryDefault = {
  decorators: [
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    (Component) => (
      <div style={{ display: 'flex', gap: 8 }}>
        <Component />
      </div>
    ),
  ],
};

export default storyDefault;

type ControlledSwitchButtonProps = SwitchButtonProperties;

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
  <>
    <mx-switch-button>Check Me!</mx-switch-button>
    <mx-switch-button checked>I am checked!</mx-switch-button>
    <ControlledSwitchButton>Checkbox</ControlledSwitchButton>
  </>
);
ColorFilled.storyName = 'Color / Default';

export const ColorElevated: Story = () => (
  <>
    <mx-switch-button color="elevated">Check Me!</mx-switch-button>
    <mx-switch-button color="elevated" checked>
      I am checked!
    </mx-switch-button>
    <ControlledSwitchButton color="elevated">Checkbox</ControlledSwitchButton>
  </>
);
ColorElevated.storyName = 'Color / Elevated';

export const ColorOutlined: Story = () => (
  <>
    <mx-switch-button color="outlined">Check Me!</mx-switch-button>
    <mx-switch-button color="outlined" checked>
      I am checked!
    </mx-switch-button>
    <ControlledSwitchButton color="outlined">Checkbox</ControlledSwitchButton>
  </>
);
ColorOutlined.storyName = 'Color / Outlined';

export const ColorTonal: Story = () => (
  <>
    <mx-switch-button color="tonal">Check Me!</mx-switch-button>
    <mx-switch-button color="tonal" checked>
      I am checked!
    </mx-switch-button>
    <ControlledSwitchButton color="tonal">Checkbox</ControlledSwitchButton>
  </>
);
ColorTonal.storyName = 'Color / Tonal';

// ================
// Size
// ================

export const SizeXSmall: Story = () => (
  <>
    <mx-switch-button size="xsmall">Check Me!</mx-switch-button>
    <mx-switch-button size="xsmall" checked>
      I am checked!
    </mx-switch-button>
    <ControlledSwitchButton size="xsmall">Checkbox</ControlledSwitchButton>
  </>
);
SizeXSmall.storyName = 'Size / XSmall';

export const SizeMedium: Story = () => (
  <>
    <mx-switch-button size="medium">Check Me!</mx-switch-button>
    <mx-switch-button size="medium" checked>
      I am checked!
    </mx-switch-button>
    <ControlledSwitchButton size="medium">Checkbox</ControlledSwitchButton>
  </>
);
SizeMedium.storyName = 'Size / Medium';

export const SizeLarge: Story = () => (
  <>
    <mx-switch-button size="large">Check Me!</mx-switch-button>
    <mx-switch-button size="large" checked>
      I am checked!
    </mx-switch-button>
    <ControlledSwitchButton size="large">Checkbox</ControlledSwitchButton>
  </>
);
SizeLarge.storyName = 'Size / Large';

export const SizeXLarge: Story = () => (
  <>
    <mx-switch-button size="xlarge">Check Me!</mx-switch-button>
    <mx-switch-button size="xlarge" checked>
      I am checked!
    </mx-switch-button>
    <ControlledSwitchButton size="xlarge">Checkbox</ControlledSwitchButton>
  </>
);
SizeXLarge.storyName = 'Size / XLarge';

// ================
// Shape
// ================

export const ShapeSquare: Story = () => (
  <>
    <mx-switch-button shape="square">Check Me!</mx-switch-button>
    <mx-switch-button shape="square" checked>
      I am checked!
    </mx-switch-button>
    <ControlledSwitchButton shape="square">Checkbox</ControlledSwitchButton>
  </>
);
ShapeSquare.storyName = 'Shape / Square';

// ================
// Disabled
// ================

export const Disabled: Story = () => (
  <>
    <mx-switch-button disabled>Check Me!</mx-switch-button>
    <mx-switch-button disabled checked>
      I am checked!
    </mx-switch-button>
    <ControlledSwitchButton disabled>Checkbox</ControlledSwitchButton>
  </>
);

// ================
// With Icon
// ================

export const WithIcon: Story = () => (
  <>
    <mx-switch-button>
      <mx-icon>check</mx-icon>
      Check Me!
    </mx-switch-button>
    <mx-switch-button checked>
      <mx-icon>check</mx-icon>I am checked!
    </mx-switch-button>
  </>
);
