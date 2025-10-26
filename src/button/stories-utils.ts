import type { InputType } from 'storybook/internal/types';

const switchColorOptions = ['outlined', 'tonal', 'elevated', 'tonal'];
const colorOptions = [...switchColorOptions, 'text'];

export const colorControl: InputType = {
  control: {
    type: 'select',
    options: colorOptions,
  },
};

export const switchColorControl: InputType = {
  color: {
    type: 'select',
    options: switchColorOptions,
  },
};

export const sizeControl: InputType = {
  control: {
    type: 'select',
    options: ['xsmall', 'small', 'medium', 'large', 'xlarge'],
  },
};

export const shapeControl: InputType = {
  control: {
    type: 'select',
    options: ['round', 'square'],
  },
};

export const widthControl: InputType = {
  control: {
    type: 'select',
    options: ['wide', 'narrow'],
  },
};
