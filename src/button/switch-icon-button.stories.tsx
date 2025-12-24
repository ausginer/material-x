import type { Story, StoryDefault } from '@ladle/react';
import { useState, type PropsWithChildren } from 'react';
import type { SwitchIconButtonProperties } from './switch-icon-button.ts';
import './switch-icon-button.ts';
import '../icon/icon.ts';

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

type ControlledSwitchIconButtonProps = SwitchIconButtonProperties;

function ControlledSwitchIconButton(
  props: PropsWithChildren<ControlledSwitchIconButtonProps>,
) {
  const [state, setState] = useState(false);

  return (
    <mx-switch-icon-button
      checked={state}
      onChange={() => {
        setState(!state);
      }}
      {...props}
    />
  );
}

// ================
// Color
// ================

export const ColorFilled: Story = () => (
  <>
    <mx-switch-icon-button>
      <mx-icon>wifi</mx-icon>
    </mx-switch-icon-button>
    <mx-switch-icon-button checked>
      <mx-icon>bluetooth</mx-icon>
    </mx-switch-icon-button>
    <ControlledSwitchIconButton>
      <mx-icon>alarm</mx-icon>
    </ControlledSwitchIconButton>
  </>
);
ColorFilled.storyName = 'Color / Default';

export const ColorElevated: Story = () => (
  <>
    <mx-switch-icon-button color="elevated">
      <mx-icon>wifi</mx-icon>
    </mx-switch-icon-button>
    <mx-switch-icon-button color="elevated" checked>
      <mx-icon>bluetooth</mx-icon>
    </mx-switch-icon-button>
    <ControlledSwitchIconButton color="elevated">
      <mx-icon>alarm</mx-icon>
    </ControlledSwitchIconButton>
  </>
);
ColorElevated.storyName = 'Color / Elevated';

export const ColorOutlined: Story = () => (
  <>
    <mx-switch-icon-button color="outlined">
      <mx-icon>wifi</mx-icon>
    </mx-switch-icon-button>
    <mx-switch-icon-button color="outlined" checked>
      <mx-icon>bluetooth</mx-icon>
    </mx-switch-icon-button>
    <ControlledSwitchIconButton color="outlined">
      <mx-icon>alarm</mx-icon>
    </ControlledSwitchIconButton>
  </>
);
ColorOutlined.storyName = 'Color / Outlined';

export const ColorTonal: Story = () => (
  <>
    <mx-switch-icon-button color="tonal">
      <mx-icon>wifi</mx-icon>
    </mx-switch-icon-button>
    <mx-switch-icon-button color="tonal" checked>
      <mx-icon>bluetooth</mx-icon>
    </mx-switch-icon-button>
    <ControlledSwitchIconButton color="tonal">
      <mx-icon>alarm</mx-icon>
    </ControlledSwitchIconButton>
  </>
);
ColorTonal.storyName = 'Color / Tonal';

export const ColorStandard: Story = () => (
  <>
    <mx-switch-icon-button color="standard">
      <mx-icon>wifi</mx-icon>
    </mx-switch-icon-button>
    <mx-switch-icon-button color="standard" checked>
      <mx-icon>bluetooth</mx-icon>
    </mx-switch-icon-button>
    <ControlledSwitchIconButton color="standard">
      <mx-icon>alarm</mx-icon>
    </ControlledSwitchIconButton>
  </>
);
ColorStandard.storyName = 'Color / Standard';

// ================
// Size
// ================
export const SizeXSmall: Story = () => (
  <>
    <mx-switch-icon-button size="xsmall">
      <mx-icon>wifi</mx-icon>
    </mx-switch-icon-button>
    <mx-switch-icon-button size="xsmall" checked>
      <mx-icon>bluetooth</mx-icon>
    </mx-switch-icon-button>
    <ControlledSwitchIconButton size="xsmall">
      <mx-icon>alarm</mx-icon>
    </ControlledSwitchIconButton>
  </>
);
SizeXSmall.storyName = 'Size / XSmall';

export const SizeMedium: Story = () => (
  <>
    <mx-switch-icon-button size="medium">
      <mx-icon>wifi</mx-icon>
    </mx-switch-icon-button>
    <mx-switch-icon-button size="medium" checked>
      <mx-icon>bluetooth</mx-icon>
    </mx-switch-icon-button>
    <ControlledSwitchIconButton size="medium">
      <mx-icon>alarm</mx-icon>
    </ControlledSwitchIconButton>
  </>
);
SizeMedium.storyName = 'Size / Medium';

export const SizeLarge: Story = () => (
  <>
    <mx-switch-icon-button size="large">
      <mx-icon>wifi</mx-icon>
    </mx-switch-icon-button>
    <mx-switch-icon-button size="large" checked>
      <mx-icon>bluetooth</mx-icon>
    </mx-switch-icon-button>
    <ControlledSwitchIconButton size="large">
      <mx-icon>alarm</mx-icon>
    </ControlledSwitchIconButton>
  </>
);
SizeLarge.storyName = 'Size / Large';

export const SizeXLarge: Story = () => (
  <>
    <mx-switch-icon-button size="xlarge">
      <mx-icon>wifi</mx-icon>
    </mx-switch-icon-button>
    <mx-switch-icon-button size="xlarge" checked>
      <mx-icon>bluetooth</mx-icon>
    </mx-switch-icon-button>
    <ControlledSwitchIconButton size="xlarge">
      <mx-icon>alarm</mx-icon>
    </ControlledSwitchIconButton>
  </>
);
SizeXLarge.storyName = 'Size / XLarge';

// ================
// Width
// ================
export const WidthWide: Story = () => (
  <>
    <mx-switch-icon-button width="wide">
      <mx-icon>wifi</mx-icon>
    </mx-switch-icon-button>
    <mx-switch-icon-button width="wide" checked>
      <mx-icon>bluetooth</mx-icon>
    </mx-switch-icon-button>
    <ControlledSwitchIconButton width="wide">
      <mx-icon>alarm</mx-icon>
    </ControlledSwitchIconButton>
  </>
);
WidthWide.storyName = 'Width / Wide';

export const WidthNarrow: Story = () => (
  <>
    <mx-switch-icon-button width="narrow">
      <mx-icon>wifi</mx-icon>
    </mx-switch-icon-button>
    <mx-switch-icon-button width="narrow" checked>
      <mx-icon>bluetooth</mx-icon>
    </mx-switch-icon-button>
    <ControlledSwitchIconButton width="narrow">
      <mx-icon>alarm</mx-icon>
    </ControlledSwitchIconButton>
  </>
);
WidthNarrow.storyName = 'Width / Narrow';

// ================
// Shape
// ================

export const ShapeSquare: Story = () => (
  <>
    <mx-switch-icon-button shape="square">
      <mx-icon>wifi</mx-icon>
    </mx-switch-icon-button>
    <mx-switch-icon-button shape="square" checked>
      <mx-icon>bluetooth</mx-icon>
    </mx-switch-icon-button>
    <ControlledSwitchIconButton shape="square">
      <mx-icon>alarm</mx-icon>
    </ControlledSwitchIconButton>
  </>
);
ShapeSquare.storyName = 'Shape / Square';

// ================
// Disabled
// ================

export const Disabled: Story = () => (
  <>
    <mx-switch-icon-button disabled>
      <mx-icon>wifi</mx-icon>
    </mx-switch-icon-button>
    <mx-switch-icon-button disabled checked>
      <mx-icon>bluetooth</mx-icon>
    </mx-switch-icon-button>
    <ControlledSwitchIconButton disabled>
      <mx-icon>alarm</mx-icon>
    </ControlledSwitchIconButton>
  </>
);
