import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { fn } from 'storybook/test';
import '../icon/icon.ts';
import {
  shapeControl,
  sizeControl,
  switchColorControl,
  widthControl,
} from './stories-utils.ts';
import './switch-icon-button.ts';
import type { SwitchIconButtonAttributes } from './switch-icon-button.ts';

type SwitchIconButtonProps = Readonly<
  SwitchIconButtonAttributes & {
    onClick?(event: PointerEvent): void;
    icon?: string;
  }
>;

const meta: Meta<SwitchIconButtonProps> = {
  title: 'Button/IconSwitch',
  tags: ['autodocs'],
  render: ({ color, size, shape, width, onClick, icon, disabled, checked }) =>
    html`<mx-switch-icon-button
      ?disabled=${disabled}
      color=${ifDefined(color)}
      size=${ifDefined(size)}
      shape=${ifDefined(shape)}
      width=${ifDefined(width)}
      ?checked=${checked}
      @click=${onClick}
      >${icon}</mx-switch-icon-button
    >`,
  argTypes: {
    color: switchColorControl,
    size: sizeControl,
    shape: shapeControl,
    width: widthControl,
    checked: {
      control: {
        type: 'boolean',
      },
    },
    icon: {
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

type SwitchIconButtonStories = StoryObj<SwitchIconButtonProps>;

export const FilledColor: SwitchIconButtonStories = {
  args: {
    icon: 'play_arrow',
  },
};

export const OutlinedColor: SwitchIconButtonStories = {
  args: {
    color: 'outlined',
    icon: 'play_arrow',
  },
};

export const TonalColor: SwitchIconButtonStories = {
  args: {
    color: 'tonal',
    icon: 'play_arrow',
  },
};

export const ElevatedColor: SwitchIconButtonStories = {
  args: {
    color: 'elevated',
    icon: 'play_arrow',
  },
};

export const XSmallSize: SwitchIconButtonStories = {
  args: {
    icon: 'play_arrow',
    size: 'xsmall',
  },
};

export const SmallSize: SwitchIconButtonStories = {
  args: {
    icon: 'play_arrow',
    size: 'small',
  },
};

export const MediumSize: SwitchIconButtonStories = {
  args: {
    icon: 'play_arrow',
    size: 'medium',
  },
};

export const LargeSize: SwitchIconButtonStories = {
  args: {
    icon: 'play_arrow',
    size: 'large',
  },
};

export const XLargeSize: SwitchIconButtonStories = {
  args: {
    icon: 'play_arrow',
    size: 'xlarge',
  },
};
