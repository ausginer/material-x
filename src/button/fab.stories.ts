import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html, nothing, type TemplateResult } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { fn } from 'storybook/test';
import type { ButtonFlavor, ButtonSize } from './core-button.ts';
import './fab.ts';
import '../icon/icon.ts';

type ButtonProps = Readonly<{
  flavor?: ButtonFlavor;
  onClick?(): void;
  label?: string;
  disabled?: boolean;
  size?: ButtonSize;
  icon?: TemplateResult | typeof nothing;
}>;

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories
const meta: Meta<ButtonProps> = {
  title: 'Button/FAB',
  tags: ['autodocs'],
  render: ({
    flavor,
    onClick,
    label,
    disabled = false,
    size,
    icon = nothing,
  }) =>
    html`<mx-fab
      ?disabled=${disabled}
      flavor=${ifDefined(flavor)}
      size=${ifDefined(size)}
      @click=${onClick}
      >${icon}${label}</mx-fab
    >`,
  argTypes: {
    flavor: {
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
    flavor: 'outlined',
    label: 'Outlined Button',
  },
};

export const FilledTonal: ButtonStories = {
  args: {
    flavor: 'filled-tonal',
    label: 'Filled Tonal Button',
  },
};

export const Elevated: ButtonStories = {
  args: {
    flavor: 'elevated',
    label: 'Elevated Button',
  },
};

export const Text: ButtonStories = {
  args: {
    flavor: 'text',
    label: 'Text Button',
  },
};

export const XSmall: ButtonStories = {
  args: {
    label: 'Extra Small Filled Button',
    size: 'xsmall',
  },
};

export const Small: ButtonStories = {
  args: {
    label: 'Small Filled Button',
    size: 'small',
  },
};

export const Medium: ButtonStories = {
  args: {
    label: 'Medium Filled Button',
    size: 'medium',
  },
};

export const Large: ButtonStories = {
  args: {
    label: 'Large Filled Button',
    size: 'large',
  },
};

export const XLarge: ButtonStories = {
  args: {
    label: 'Extra Large Filled Button',
    size: 'xlarge',
  },
};

export const WithIcon: ButtonStories = {
  args: {
    label: 'Button with Icon',
    icon: html`<mx-icon>check</mx-icon>`,
  },
};
