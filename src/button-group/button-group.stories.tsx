import type { Story } from '@ladle/react';
import './react/button-group.ts';
import '../button/react/button.ts';
import '../icon/react/icon.ts';
import '../button/react/switch-icon-button.ts';
import { useState } from 'react';

// ================
// Size
// ================

export const SizeDefault: Story = () => (
  <mx-button-group>
    <mx-button>Button 1</mx-button>
    <mx-button>Button 2</mx-button>
    <mx-button>Button 3</mx-button>
    <mx-button>Button 4</mx-button>
    <mx-button>Button 5</mx-button>
  </mx-button-group>
);
SizeDefault.storyName = 'Size / Default';

export const SizeXSmall: Story = () => (
  <mx-button-group size="xsmall">
    <mx-button>Button 1</mx-button>
    <mx-button>Button 2</mx-button>
    <mx-button>Button 3</mx-button>
    <mx-button>Button 4</mx-button>
    <mx-button>Button 5</mx-button>
  </mx-button-group>
);
SizeXSmall.storyName = 'Size / XSmall';

export const SizeMedium: Story = () => (
  <mx-button-group size="medium">
    <mx-button>Button 1</mx-button>
    <mx-button>Button 2</mx-button>
    <mx-button>Button 3</mx-button>
    <mx-button>Button 4</mx-button>
    <mx-button>Button 5</mx-button>
  </mx-button-group>
);
SizeMedium.storyName = 'Size / Medium';

export const SizeLarge: Story = () => (
  <mx-button-group size="large">
    <mx-button>Button 1</mx-button>
    <mx-button>Button 2</mx-button>
    <mx-button>Button 3</mx-button>
    <mx-button>Button 4</mx-button>
    <mx-button>Button 5</mx-button>
  </mx-button-group>
);
SizeLarge.storyName = 'Size / Large';

export const SizeXLarge: Story = () => (
  <mx-button-group size="xlarge">
    <mx-button>Button 1</mx-button>
    <mx-button>Button 2</mx-button>
    <mx-button>Button 3</mx-button>
    <mx-button>Button 4</mx-button>
    <mx-button>Button 5</mx-button>
  </mx-button-group>
);
SizeXLarge.storyName = 'Size / XLarge';

// ================
// Switch
// ================

export const Switch: Story = () => {
  const [selected, setSelected] = useState<string | undefined>();

  return (
    <mx-button-group size="xlarge">
      <mx-switch-icon-button
        width="narrow"
        checked={selected === 'bluetooth'}
        onChange={() => setSelected('bluetooth')}
      >
        <mx-icon>bluetooth</mx-icon>
      </mx-switch-icon-button>
      <mx-switch-icon-button
        checked={selected === 'alarm'}
        onChange={() => setSelected('alarm')}
      >
        <mx-icon>alarm</mx-icon>
      </mx-switch-icon-button>
      <mx-switch-icon-button
        width="narrow"
        checked={selected === 'link'}
        onChange={() => setSelected('link')}
      >
        <mx-icon>link</mx-icon>
      </mx-switch-icon-button>
      <mx-switch-icon-button
        width="wide"
        checked={selected === 'wifi'}
        onChange={() => setSelected('wifi')}
      >
        <mx-icon>wifi</mx-icon>
      </mx-switch-icon-button>
    </mx-button-group>
  );
};

Switch.storyName = 'Switch Example';
