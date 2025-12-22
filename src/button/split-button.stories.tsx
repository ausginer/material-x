import type { Story } from '@ladle/react';
import { useState, type PropsWithChildren } from 'react';
import './split-button.ts';
import type { SplitButtonProperties } from './split-button.ts';

type ControlledSplitButtonProps = SplitButtonProperties;

function ControlledSplitButton(
  props: PropsWithChildren<ControlledSplitButtonProps>,
) {
  const [open, setOpen] = useState(false);

  return (
    <mx-split-button open={open} ontoggle={() => setOpen(!open)} {...props} />
  );
}

// ================
// Color
// ================

export const ColorFilled: Story = () => (
  <ControlledSplitButton>Click Me!</ControlledSplitButton>
);
ColorFilled.storyName = 'Color / Default';

export const ColorElevated: Story = () => (
  <ControlledSplitButton color="elevated">Click Me!</ControlledSplitButton>
);
ColorElevated.storyName = 'Color / Elevated';

export const ColorOutlined: Story = () => (
  <ControlledSplitButton color="outlined">Click Me!</ControlledSplitButton>
);
ColorOutlined.storyName = 'Color / Outlined';

export const ColorTonal: Story = () => (
  <ControlledSplitButton color="tonal">Click Me!</ControlledSplitButton>
);
ColorTonal.storyName = 'Color / Tonal';

export const ColorText: Story = () => (
  <ControlledSplitButton color="text">Click Me!</ControlledSplitButton>
);
ColorText.storyName = 'Color / Text';

// ================
// Size
// ================

export const SizeXSmall: Story = () => (
  <ControlledSplitButton size="xsmall">Click Me!</ControlledSplitButton>
);
SizeXSmall.storyName = 'Size / XSmall';

export const SizeMedium: Story = () => (
  <ControlledSplitButton size="medium">Click Me!</ControlledSplitButton>
);
SizeMedium.storyName = 'Size / Medium';

export const SizeLarge: Story = () => (
  <ControlledSplitButton size="large">Click Me!</ControlledSplitButton>
);
SizeLarge.storyName = 'Size / Large';

export const SizeXLarge: Story = () => (
  <ControlledSplitButton size="xlarge">Click Me!</ControlledSplitButton>
);
SizeXLarge.storyName = 'Size / XLarge';

// ================
// Shape
// ================

export const ShapeSquare: Story = () => (
  <ControlledSplitButton shape="square">Click Me!</ControlledSplitButton>
);
ShapeSquare.storyName = 'Shape / Square';

// ================
// Disabled
// ================

export const Disabled: Story = () => (
  <ControlledSplitButton disabled>Click Me!</ControlledSplitButton>
);

// ================
// With Icon
// ================

export const WithIcon: Story = () => (
  <ControlledSplitButton>
    <mx-icon>check</mx-icon>
    Submit
  </ControlledSplitButton>
);
