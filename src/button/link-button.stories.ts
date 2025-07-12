import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { fn } from 'storybook/test';
import type { ButtonVariant } from './button.js';
import './link-button.js';

type LinkButtonProps = Readonly<{
  variant?: ButtonVariant;
  onClick?(): void;
  label?: string;
  disabled?: boolean;
  href?: string;
}>;

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories
const meta: Meta<LinkButtonProps> = {
  title: 'Button/Link',
  tags: ['autodocs'],
  render: ({
    variant,
    href = 'https://example.com',
    onClick,
    label,
    disabled = false,
  }) =>
    html`<mx-link-button
      ?disabled=${disabled}
      variant=${ifDefined(variant)}
      href=${ifDefined(href)}
      @click=${onClick}
      >${label}</mx-link-button
    >`,
  argTypes: {
    variant: {
      control: {
        type: 'select',
        options: ['outlined', 'filled-tonal', 'elevated', 'text'],
      },
    },
    href: {
      control: {
        type: 'text',
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

type ButtonStories = StoryObj<LinkButtonProps>;

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
