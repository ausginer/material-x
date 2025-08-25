import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html, type nothing, type TemplateResult } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { fn } from 'storybook/test';
import '../icon/icon.ts';
import type { ButtonSize } from './core-button.ts';
import type { SwitchButtonColor } from './switch-button.ts';
import './switch-button.ts';

type SwitchButtonProps = Readonly<{
  color?: SwitchButtonColor;
  onClick?(): void;
  label?: string;
  disabled?: boolean;
  size?: ButtonSize;
  icon?: TemplateResult | typeof nothing;
  checked?: boolean;
}>;

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories
const meta: Meta<SwitchButtonProps> = {
  title: 'Switch Button/Switch',
  tags: ['autodocs'],
  render: ({ color: flavor, onClick, label, disabled, checked }) =>
    html`<mx-switch-button
      ?disabled=${disabled}
      ?checked=${checked}
      flavor=${ifDefined(flavor)}
      @click=${onClick}
      >${label}</mx-switch-button
    >`,
  argTypes: {
    color: {
      control: {
        type: 'select',
        options: ['outlined', 'tonal', 'elevated', 'text'],
      },
    },
    checked: {
      control: {
        type: 'boolean',
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
  args: { onClick: fn(), disabled: false, checked: false },
};

export default meta;

type ButtonStories = StoryObj<SwitchButtonProps>;

export const FilledColor: ButtonStories = {
  args: {
    label: 'Filled Switch Button',
  },
};

export const OutlinedColor: ButtonStories = {
  args: {
    color: 'outlined',
    label: 'Outlined Switch Button',
  },
};

export const TonalColor: ButtonStories = {
  args: {
    color: 'tonal',
    label: 'Tonal Switch Button',
  },
};

export const ElevatedColor: ButtonStories = {
  args: {
    color: 'elevated',
    label: 'Elevated Switch Button',
  },
};

export const XSmallSize: ButtonStories = {
  args: {
    label: 'Extra Small Filled Switch Button',
    size: 'xsmall',
  },
};

export const SmallSize: ButtonStories = {
  args: {
    label: 'Small Filled Switch Button',
    size: 'small',
  },
};

export const MediumSize: ButtonStories = {
  args: {
    label: 'Medium Filled Switch Button',
    size: 'medium',
  },
};

export const LargeSize: ButtonStories = {
  args: {
    label: 'Large Filled Switch Button',
    size: 'large',
  },
};

export const XLargeSize: ButtonStories = {
  args: {
    label: 'Extra Large Filled Switch Button',
    size: 'xlarge',
  },
};

export const WithIcon: ButtonStories = {
  args: {
    label: 'Switch Button with Icon',
    icon: html`<mx-icon slot="icon">check</mx-icon>`,
  },
};
