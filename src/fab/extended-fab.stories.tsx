import type { Story, StoryDefault } from '@ladle/react';
import './fab.ts';
import '../icon/icon.ts';
import { useState, type PropsWithChildren } from 'react';
import type { FABProperties } from './fab.ts';

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

type ControlledFABExtendedProps = Omit<FABProperties, 'extended'>;

function ControlledFABExtended({
  children,
  ...other
}: PropsWithChildren<ControlledFABExtendedProps>) {
  const [open, setOpen] = useState(false);

  return (
    <mx-fab
      extended={open ? 'open' : 'closed'}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      {...other}
    >
      {children}
    </mx-fab>
  );
}

// ================
// Color
// ================

export const ColorDefault: Story = () => (
  <>
    <mx-fab extended="closed">
      <mx-icon slot="icon">check</mx-icon>
      Submit
    </mx-fab>
    <mx-fab extended="open">
      <mx-icon slot="icon">check</mx-icon>
      Submit
    </mx-fab>
    <ControlledFABExtended>
      <mx-icon slot="icon">check</mx-icon>
      Submit
    </ControlledFABExtended>
  </>
);
ColorDefault.storyName = 'Color / Default';

export const ColorPrimary: Story = () => (
  <>
    <mx-fab color="primary" extended="closed">
      <mx-icon slot="icon">check</mx-icon>
      Submit
    </mx-fab>
    <mx-fab color="primary" extended="open">
      <mx-icon slot="icon">check</mx-icon>
      Submit
    </mx-fab>
    <ControlledFABExtended color="primary">
      <mx-icon slot="icon">check</mx-icon>
      Submit
    </ControlledFABExtended>
  </>
);
ColorPrimary.storyName = 'Color / Primary';

export const ColorSecondary: Story = () => (
  <>
    <mx-fab color="secondary" extended="closed">
      <mx-icon slot="icon">check</mx-icon>
      Submit
    </mx-fab>
    <mx-fab color="secondary" extended="open">
      <mx-icon slot="icon">check</mx-icon>
      Submit
    </mx-fab>
    <ControlledFABExtended color="secondary">
      <mx-icon slot="icon">check</mx-icon>
      Submit
    </ControlledFABExtended>
  </>
);
ColorSecondary.storyName = 'Color / Secondary';

// ================
// Tonal Color
// ================

export const ColorTonalDefault: Story = () => (
  <>
    <mx-fab tonal extended="closed">
      <mx-icon slot="icon">check</mx-icon>
      Submit
    </mx-fab>
    <mx-fab tonal extended="open">
      <mx-icon slot="icon">check</mx-icon>
      Submit
    </mx-fab>
    <ControlledFABExtended tonal>
      <mx-icon slot="icon">check</mx-icon>
      Submit
    </ControlledFABExtended>
  </>
);
ColorTonalDefault.storyName = 'Tonal Color / Default';

export const ColorTonalPrimary: Story = () => (
  <>
    <mx-fab tonal color="primary" extended="closed">
      <mx-icon slot="icon">check</mx-icon>
      Submit
    </mx-fab>
    <mx-fab tonal color="primary" extended="open">
      <mx-icon slot="icon">check</mx-icon>
      Submit
    </mx-fab>
    <ControlledFABExtended tonal color="primary">
      <mx-icon slot="icon">check</mx-icon>
      Submit
    </ControlledFABExtended>
  </>
);
ColorTonalPrimary.storyName = 'Tonal Color / Primary';

export const ColorTonalSecondary: Story = () => (
  <>
    <mx-fab tonal color="secondary" extended="closed">
      <mx-icon slot="icon">check</mx-icon>
      Submit
    </mx-fab>
    <mx-fab tonal color="secondary" extended="open">
      <mx-icon slot="icon">check</mx-icon>
      Submit
    </mx-fab>
    <ControlledFABExtended tonal color="secondary">
      <mx-icon slot="icon">check</mx-icon>
      Submit
    </ControlledFABExtended>
  </>
);
ColorTonalSecondary.storyName = 'Tonal Color / Secondary';

// ================
// Size
// ================

export const SizeMedium: Story = () => (
  <>
    <mx-fab tonal size="medium" extended="closed">
      <mx-icon slot="icon">check</mx-icon>
      Submit
    </mx-fab>
    <mx-fab tonal size="medium" extended="open">
      <mx-icon slot="icon">check</mx-icon>
      Submit
    </mx-fab>
    <ControlledFABExtended tonal size="medium">
      <mx-icon slot="icon">check</mx-icon>
      Submit
    </ControlledFABExtended>
  </>
);
SizeMedium.storyName = 'Size / Medium';

export const SizeLarge: Story = () => (
  <>
    <mx-fab tonal size="large" extended="closed">
      <mx-icon slot="icon">check</mx-icon>
      Submit
    </mx-fab>
    <mx-fab tonal size="large" extended="open">
      <mx-icon slot="icon">check</mx-icon>
      Submit
    </mx-fab>
    <ControlledFABExtended tonal size="large">
      <mx-icon slot="icon">check</mx-icon>
      Submit
    </ControlledFABExtended>
  </>
);
SizeLarge.storyName = 'Size / Large';
