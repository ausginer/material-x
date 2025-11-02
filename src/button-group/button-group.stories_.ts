import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html, type nothing, type TemplateResult } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { fn } from 'storybook/test';
import type { ButtonSize } from '../button/core-button.ts';
import '../icon/icon.ts';
import '../button/button.ts';
import './button-group.ts';

type ButtonGroupProps = Readonly<{
  onClick?(): void;
  size?: ButtonSize;
  icon?: TemplateResult | typeof nothing;
}>;

const meta: Meta<ButtonGroupProps> = {
  title: 'Button/ButtonGroup',
  tags: ['autodocs'],
  render: ({ onClick, size }) =>
    html`<mx-button-group size=${ifDefined(size)} @click=${onClick}>
      <mx-button>Button 1</mx-button>
      <mx-button>Button 2</mx-button>
      <mx-button>Button 3</mx-button>
    </mx-button-group>`,
  argTypes: {
    size: {
      control: {
        type: 'select',
        options: ['xsmall', 'small', 'medium', 'large', 'xlarge'],
      },
    },
  },
  args: { onClick: fn() },
};

export default meta;

type ButtonGroupStories = StoryObj<ButtonGroupProps>;

export const LargeSize: ButtonGroupStories = {
  args: {
    size: 'large',
  },
};
