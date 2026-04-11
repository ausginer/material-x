import type { Meta } from '@storybook/react-vite';
import { useState, type JSX } from 'react';
import css from '../story.module.css';
import './checkbox.ts';

const meta: Meta = {
  title: 'Checkbox',
  decorators: [
    (Component: () => JSX.Element): JSX.Element => (
      <div className={css['layout']}>
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

export const States = (): JSX.Element => (
  <>
    <mx-checkbox />
    <mx-checkbox data-force="hovered" />
    <mx-checkbox data-force="focused" />
    <mx-checkbox data-force="pressed" />
    <mx-checkbox disabled />
  </>
);

export const Checked = (): JSX.Element => (
  <>
    <ControlledCheckbox />
    <ControlledCheckbox checked />
    <mx-checkbox indeterminate />
  </>
);

export const WithLabel = (): JSX.Element => {
  const id = crypto.randomUUID();

  return (
    <>
      <label className={css['checkable-with-label']}>
        <ControlledCheckbox />
        Label wrapper
      </label>
      <div className={css['checkable-with-label']}>
        <ControlledCheckbox id={id} />
        <label htmlFor={id}>Label attached via ID</label>
      </div>
    </>
  );
};
