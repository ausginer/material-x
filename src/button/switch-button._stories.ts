import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html, nothing } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { fn } from 'storybook/test';
import '../icon/icon.ts';
import {
  shapeControl,
  sizeControl,
  switchColorControl,
} from './stories-utils.ts';
import './switch-button.ts';
import type { SwitchButtonAttributes } from './switch-button.ts';

type SwitchButtonProps = Readonly<
  SwitchButtonAttributes & {
    onClick?(event: PointerEvent): void;
    label?: string;
    icon?: string;
  }
>;

const meta: Meta<SwitchButtonProps> = {
  title: 'Button/Switch',
  tags: ['autodocs'],
  render: ({ color, onClick, label, disabled, shape, size, checked, icon }) => {
    const iconElement = icon
      ? html`<mx-icon slot="icon">${icon}</mx-icon>`
      : nothing;

    return html`<mx-switch-button
      ?disabled=${disabled}
      color=${ifDefined(color)}
      size=${ifDefined(size)}
      shape=${ifDefined(shape)}
      @click=${onClick}
      ?checked=${checked}
      >${iconElement}${label}</mx-switch-button
    >`;
  },
  argTypes: {
    color: switchColorControl,
    size: sizeControl,
    shape: shapeControl,
    icon: {
      control: {
        type: 'text',
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
  args: {
    onClick: fn(({ target }: PointerEvent) => {
      if (target instanceof HTMLElement) {
        if (target.hasAttribute('checked')) {
          target.removeAttribute('checked');
        } else {
          target.setAttribute('checked', '');
        }
      }
    }),
    disabled: false,
    checked: false,
  },
};

export default meta;

type SwitchButtonStories = StoryObj<SwitchButtonProps>;

export const FilledColor: SwitchButtonStories = {
  args: {
    label: 'Filled Switch Button',
  },
};

export const OutlinedColor: SwitchButtonStories = {
  args: {
    color: 'outlined',
    label: 'Outlined Switch Button',
  },
};

export const TonalColor: SwitchButtonStories = {
  args: {
    color: 'tonal',
    label: 'Tonal Switch Button',
  },
};

export const ElevatedColor: SwitchButtonStories = {
  args: {
    color: 'elevated',
    label: 'Elevated Switch Button',
  },
};

export const XSmallSize: SwitchButtonStories = {
  args: {
    label: 'Extra Small Filled Switch Button',
    size: 'xsmall',
  },
};

export const SmallSize: SwitchButtonStories = {
  args: {
    label: 'Small Filled Switch Button',
    size: 'small',
  },
};

export const MediumSize: SwitchButtonStories = {
  args: {
    label: 'Medium Filled Switch Button',
    size: 'medium',
  },
};

export const LargeSize: SwitchButtonStories = {
  args: {
    label: 'Large Filled Switch Button',
    size: 'large',
  },
};

export const XLargeSize: SwitchButtonStories = {
  args: {
    label: 'Extra Large Filled Switch Button',
    size: 'xlarge',
  },
};

export const WithIcon: SwitchButtonStories = {
  args: {
    label: 'Switch Button with Icon',
    icon: 'check',
  },
};
