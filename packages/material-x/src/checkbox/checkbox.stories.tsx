import type { Meta } from '@storybook/react-vite';
import { useState, type JSX, type PropsWithChildren } from 'react';
import './checkbox.ts';
import type { CheckboxProperties } from './checkbox.ts';

const meta: Meta = {
  title: 'Checkbox',
};

export default meta;

function ControlledCheckbox({
  children,
  ...other
}: PropsWithChildren<CheckboxProperties>) {
  const [checked, setChecked] = useState(false);

  return (
    <mx-checkbox
      checked={checked}
      onChange={() => {
        setChecked((v) => !v);
      }}
      {...other}
    >
      {children}
    </mx-checkbox>
  );
}

export const States = (): JSX.Element => (
  <>
    <ControlledCheckbox value="foo">Foo</ControlledCheckbox>
  </>
);
