import type { Meta } from '@storybook/react-vite';
import { useState, type JSX } from 'react';
import css from '../story.module.css';
import './radio.ts';

const meta: Meta = {
  title: 'Radio',
  decorators: [
    (Component: () => JSX.Element): JSX.Element => (
      <div className={css['layout']}>
        <Component />
      </div>
    ),
  ],
};

export default meta;

type RadioGroupProps = {
  name: string;
  options: string[];
  defaultValue?: string;
};

function ControlledRadioGroup({
  name,
  options,
  defaultValue,
}: RadioGroupProps) {
  const [selected, setSelected] = useState(defaultValue ?? options[0] ?? '');

  return (
    <>
      {options.map((value) => (
        <mx-radio
          key={value}
          name={name}
          value={value}
          checked={selected === value}
          onChange={() => setSelected(value)}
        />
      ))}
    </>
  );
}

export const States = (): JSX.Element => (
  <>
    <mx-radio />
    <mx-radio data-force="hovered" />
    <mx-radio data-force="focused" />
    <mx-radio data-force="pressed" />
    <mx-radio disabled />
  </>
);

export const Group = (): JSX.Element => (
  <ControlledRadioGroup
    name="group-demo"
    options={['one', 'two', 'three']}
    defaultValue="one"
  />
);

export const WithLabel = (): JSX.Element => {
  const [selected, setSelected] = useState('standard');

  return (
    <>
      {(['standard', 'express', 'overnight'] as const).map((value) => (
        <label
          key={value}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <mx-radio
            name="shipping"
            value={value}
            checked={selected === value}
            onChange={() => setSelected(value)}
          />
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </label>
      ))}
    </>
  );
};
