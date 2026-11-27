import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState, type JSX } from 'react';
import { useArgs } from 'storybook/preview-api';
import css from '../story.module.css';
import './checkbox.ts';

const meta: Meta = {
  title: 'Checkbox',
  decorators: [
    (Component: () => JSX.Element): JSX.Element => (
      <div className={`${css['layout']} ${css['checkable-with-label']}`}>
        <Component />
      </div>
    ),
  ],
};

export default meta;

function ControlledCheckbox(props: JSX.IntrinsicElements['mx-checkbox']) {
  const [checked, setChecked] = useState(props.checked ?? false);

  return (
    <mx-checkbox
      {...props}
      checked={checked}
      onChange={() => {
        setChecked((v) => !v);
      }}
    />
  );
}

const PLAYGROUND_ID = 'mx-playground-checkbox';
const WITH_LABEL_ID = 'mx-with-label-checkbox';

type PlaygroundArgs = Readonly<{
  label: string;
  checked: boolean;
  indeterminate: boolean;
  disabled: boolean;
  error: boolean;
}>;

export const Playground: StoryObj<PlaygroundArgs> = {
  args: {
    label: 'Label',
    checked: false,
    indeterminate: false,
    disabled: false,
    error: false,
  },
  argTypes: {
    label: {
      control: 'text',
    },
    checked: {
      control: 'boolean',
    },
    indeterminate: {
      control: 'boolean',
    },
    disabled: {
      control: 'boolean',
    },
    error: {
      control: 'boolean',
    },
  },
  render({ label, checked, indeterminate, disabled, error }) {
    const [, updateArgs] = useArgs<PlaygroundArgs>();

    return (
      <>
        <mx-checkbox
          id={PLAYGROUND_ID}
          checked={checked}
          indeterminate={indeterminate}
          disabled={disabled}
          error={error}
          onChange={() => {
            updateArgs({ checked: !checked });
          }}
        />
        <label htmlFor={PLAYGROUND_ID}>{label}</label>
      </>
    );
  },
};

export const Checked = (): JSX.Element => (
  <>
    <ControlledCheckbox />
    <ControlledCheckbox checked />
    <mx-checkbox indeterminate />
  </>
);

export const WithLabel = (): JSX.Element => (
  <>
    <label className={css['checkable-with-label']}>
      <ControlledCheckbox />
      Label wrapper
    </label>
    <div className={css['checkable-with-label']}>
      <ControlledCheckbox id={WITH_LABEL_ID} />
      <label htmlFor={WITH_LABEL_ID}>Label attached via ID</label>
    </div>
  </>
);
