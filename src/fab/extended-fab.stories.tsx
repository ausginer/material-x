import { Story } from '@ladle/react';
import './react/fab.ts';
import '../icon/react/icon.ts';
import { useState, type PropsWithChildren } from 'react';
import type { FABAttributes } from './react/fab.ts';

type ControlledFABExtendedProps = Omit<FABAttributes, 'extended'>;

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
  <div className="story-list">
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
  </div>
);
ColorDefault.storyName = 'Color / Default';

export const ColorPrimary: Story = () => (
  <div className="story-list">
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
  </div>
);
ColorPrimary.storyName = 'Color / Primary';

export const ColorSecondary: Story = () => (
  <div className="story-list">
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
  </div>
);
ColorSecondary.storyName = 'Color / Secondary';

// ================
// Tonal Color
// ================

export const ColorTonalDefault: Story = () => (
  <div className="story-list">
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
  </div>
);
ColorTonalDefault.storyName = 'Tonal Color / Default';

export const ColorTonalPrimary: Story = () => (
  <div className="story-list">
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
  </div>
);
ColorTonalPrimary.storyName = 'Tonal Color / Primary';

export const ColorTonalSecondary: Story = () => (
  <div className="story-list">
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
  </div>
);
ColorTonalSecondary.storyName = 'Tonal Color / Secondary';

// ================
// Size
// ================

export const SizeMedium: Story = () => (
  <div className="story-list">
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
  </div>
);
SizeMedium.storyName = 'Size / Medium';

export const SizeLarge: Story = () => (
  <div className="story-list">
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
  </div>
);
SizeLarge.storyName = 'Size / Large';
