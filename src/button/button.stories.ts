import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { fn } from 'storybook/test';
import type { ButtonVariant } from './button.ts';
import './button.js';

type ButtonProps = Readonly<{
  variant?: ButtonVariant;
  onClick?(): void;
  label?: string;
  disabled?: boolean;
}>;

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories
const meta: Meta<ButtonProps> = {
  title: 'Button/Button',
  tags: ['autodocs'],
  render: ({ variant, onClick, label, disabled = false }) =>
    html`<mx-button
      ?disabled=${disabled}
      variant=${ifDefined(variant)}
      @click=${onClick}
      >${label}</mx-button
    >`,
  argTypes: {
    variant: {
      control: {
        type: 'select',
        options: ['outlined', 'filled-tonal', 'elevated', 'text'],
      },
    },
    label: {
      control: {
        type: 'text',
      },
    },
    disabled: {
      control: {
        type: 'boolean',
      },
    },
  },
  args: { onClick: fn(), disabled: false },
};

export default meta;

type ButtonStories = StoryObj<ButtonProps>;

export const Filled: ButtonStories = {
  args: {
    label: 'Filled Button',
  },
};

export const Outlined: ButtonStories = {
  args: {
    variant: 'outlined',
    label: 'Outlined Button',
  },
};

export const FilledTonal: ButtonStories = {
  args: {
    variant: 'filled-tonal',
    label: 'Filled Tonal Button',
  },
};

export const Elevated: ButtonStories = {
  args: {
    variant: 'elevated',
    label: 'Elevated Button',
  },
};

export const Text: ButtonStories = {
  args: {
    variant: 'text',
    label: 'Text Button',
  },
};
