import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html, nothing } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { fn } from 'storybook/test';
import '../icon/icon.ts';
import './button.ts';
import type { CoreButtonAttributes } from './useButtonCore.ts';
import { colorControl, shapeControl, sizeControl } from './stories-utils.ts';

type ButtonProps = Readonly<
  CoreButtonAttributes & {
    onClick?(): void;
    label?: string;
    icon?: string;
  }
>;

const meta: Meta<ButtonProps> = {
  title: 'Button/Button',
  tags: ['autodocs'],
  render: ({ color, onClick, label, disabled, size, shape, icon }) => {
    const iconElement = icon
      ? html`<mx-icon slot="icon">${icon}</mx-icon>`
      : nothing;

    return html`<mx-button
      ?disabled=${disabled}
      color=${ifDefined(color)}
      size=${ifDefined(size)}
      shape=${ifDefined(shape)}
      @click=${onClick}
      >${iconElement}${label}</mx-button
    >`;
  },
  argTypes: {
    color: colorControl,
    size: sizeControl,
    shape: shapeControl,
    disabled: {
      control: {
        type: 'boolean',
      },
    },
    label: {
      control: {
        type: 'text',
      },
    },
    icon: {
      control: {
        type: 'text',
      },
    },
  },
  args: { onClick: fn(), disabled: false },
};

export default meta;

type ButtonStories = StoryObj<ButtonProps>;

export const FilledColor: ButtonStories = {
  args: {
    label: 'Filled Button',
  },
};

export const OutlinedColor: ButtonStories = {
  args: {
    color: 'outlined',
    label: 'Outlined Button',
  },
};

export const TonalColor: ButtonStories = {
  args: {
    color: 'tonal',
    label: 'Tonal Button',
  },
};

export const ElevatedColor: ButtonStories = {
  args: {
    color: 'elevated',
    label: 'Elevated Button',
  },
};

export const TextColor: ButtonStories = {
  args: {
    color: 'text',
    label: 'Text Button',
  },
};

export const SquareShape: ButtonStories = {
  args: {
    label: 'Square Button',
    shape: 'square',
  },
};

export const XSmallSize: ButtonStories = {
  args: {
    label: 'Extra Small Filled Button',
    size: 'xsmall',
  },
};

export const SmallSize: ButtonStories = {
  args: {
    label: 'Small Filled Button',
    size: 'small',
  },
};

export const MediumSize: ButtonStories = {
  args: {
    label: 'Medium Filled Button',
    size: 'medium',
  },
};

export const LargeSize: ButtonStories = {
  args: {
    label: 'Large Filled Button',
    size: 'large',
  },
};

export const XLargeSize: ButtonStories = {
  args: {
    label: 'Extra Large Filled Button',
    size: 'xlarge',
  },
};

export const WithIcon: ButtonStories = {
  args: {
    label: 'Button with Icon',
    icon: 'check',
  },
};
