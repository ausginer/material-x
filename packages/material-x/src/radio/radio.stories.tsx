import type { Meta, StoryObj } from '@storybook/react-vite';
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

const PLAYGROUND_ID = 'mx-playground-radio';

type PlaygroundArgs = Readonly<{
  label: string;
  checked: boolean;
  disabled: boolean;
  value: string;
}>;

export const Playground: StoryObj<PlaygroundArgs> = {
  args: {
    label: 'Option',
    checked: false,
    disabled: false,
    value: 'option',
  },
  argTypes: {
    label: {
      control: 'text',
    },
    checked: {
      control: 'boolean',
    },
    disabled: {
      control: 'boolean',
    },
    value: {
      control: 'text',
    },
  },
  render({ label, checked, disabled, value }) {
    return (
      <>
        <mx-radio
          id={PLAYGROUND_ID}
          checked={checked}
          disabled={disabled}
          value={value}
        />
        <label htmlFor={PLAYGROUND_ID}>{label}</label>
      </>
    );
  },
};

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
