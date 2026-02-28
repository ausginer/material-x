import type { Meta } from '@storybook/react-vite';
import type { JSX } from 'react';
import '../icon/icon.ts';
import './text-field.ts';
import './multiline-text-field.ts';
import css from './text-field.story.module.css';

const meta: Meta = {
  title: 'Multiline Text Field',
  decorators: [
    (Component: () => JSX.Element): JSX.Element => (
      <div
        className={css['layout']}
        onKeyDown={(ev) => {
          ev.stopPropagation();
        }}
      >
        <Component />
      </div>
    ),
  ],
};

export default meta;

const filledMultilineValue =
  'This is a long input in a multi-line text field that wraps overflow text onto a new line';

export const Filled = (): JSX.Element => (
  <>
    <mx-multiline-text-field>
      <div slot="label">Label</div>
    </mx-multiline-text-field>
    <mx-multiline-text-field value={filledMultilineValue}>
      <div slot="label">Label</div>
    </mx-multiline-text-field>
  </>
);

export const Outlined = (): JSX.Element => (
  <>
    <mx-multiline-text-field outlined>
      <div slot="label">Label</div>
    </mx-multiline-text-field>
    <mx-multiline-text-field outlined value={filledMultilineValue}>
      <div slot="label">Label</div>
    </mx-multiline-text-field>
  </>
);
