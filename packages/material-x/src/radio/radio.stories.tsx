import type { Meta } from '@storybook/react-vite';
import { useState, type JSX, type PropsWithChildren } from 'react';
import './radio.ts';
import type { RadioProperties } from './radio.ts';

const meta: Meta = {
  title: 'Radio',
};

export default meta;

function ControlledRadioGroup({
  children,
  ...other
}: PropsWithChildren<RadioProperties>) {
  const [checked, setChecked] = useState('foo');

  return (
    <>
      <mx-radio
        name="demo"
        value="foo"
        checked={checked === 'foo'}
        onChange={() => setChecked('foo')}
      />
      <mx-radio
        name="demo"
        value="bar"
        checked={checked === 'bar'}
        onChange={() => setChecked('bar')}
      />
    </>
  );
}

export const States = (): JSX.Element => (
  <>
    <ControlledRadioGroup />
  </>
);
