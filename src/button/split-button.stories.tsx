import type { Story } from '@ladle/react';
import { useState, type PropsWithChildren } from 'react';
import './split-button.ts';
import type { SplitButtonAttributes } from './split-button.ts';

type ControlledSplitButtonProps = SplitButtonAttributes;

function ControlledSplitButton(
  props: PropsWithChildren<ControlledSplitButtonProps>,
) {
  const [open, setOpen] = useState(false);

  return (
    <mx-split-button open={open} ontoggle={() => setOpen(!open)} {...props} />
  );
}

export const ColorFilled: Story = () => (
  <ControlledSplitButton>Click Me!</ControlledSplitButton>
);
ColorFilled.storyName = 'Color / Default';
