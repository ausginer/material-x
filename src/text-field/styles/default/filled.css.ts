import { css, prettify } from '../../../core/tokens/css.ts';
import packs, { state } from './tokens.ts';

const { filled } = packs;

const styles: string = await prettify(css`
  ${state.default()} {
    ${filled.default};

    --_padding-inline-start: var(--_padding-default);
    --_padding-inline-end: var(--_padding-default);
    --_padding-block: calc(
      (var(--_container-height) - var(--_input-text-line-height)) / 2
    );
    --_lead-icon-gap: 0;
    --_trail-icon-gap: 0;

    display: grid;
    grid-template-areas:
      '. lead . field . trail .'
      '. support support support support support .';
    grid-template-columns:
      var(--_padding-inline-start) min-content var(--_lead-icon-gap)
      1fr var(--_trail-icon-gap) min-content var(--_padding-inline-end);
    grid-template-rows: auto auto;
    position: relative;

    &::before {
      content: '';
      grid-area: 1 / 1 / 2 / -1;
      background-color: var(--_container-color);
      border-radius: var(--_container-shape-top-left)
        var(--_container-shape-top-right) var(--_container-shape-bottom-right)
        var(--_container-shape-bottom-left);
      border-block-end: var(--_active-indicator-thickness) solid
        var(--_active-indicator-color);
      z-index: -1;
    }
  }

  ${state.hovered()} {
    ${filled.hover};
  }

  ${state.focused()} {
    ${filled.focus};
  }

  :host:has(#lead.has-slotted) {
    --_padding-inline-start: var(--_container-icon-padding-inline);
    --_lead-icon-gap: var(--_container-padding-inline);
  }

  :host:has(#trail.has-slotted) {
    --_padding-inline-end: var(--_container-icon-padding-inline);
    --_trail-icon-gap: var(--_container-padding-inline);
  }

  slot {
    display: block;
    align-self: center;
  }

  #input {
    grid-area: field;
    outline: none;
    align-self: flex-end;
    justify-self: stretch;
    font-family: var(--_input-text-font);
    font-weight: var(--_input-text-weight);
    font-size: var(--_input-text-size);
    line-height: var(--_input-text-line-height);
    color: var(--_input-text-color);
    caret-color: var(--_caret-color);
    padding-block-end: var(--_container-focus-padding-block);
  }

  #label {
    position: absolute;
    font-family: var(--_label-text-font);
    font-weight: var(--_label-text-weight);
    font-size: var(--_label-text-size);
    line-height: var(--_label-text-line-height);
    letter-spacing: var(--_label-text-tracking);
    color: var(--_input-text-placeholder-color);
    grid-area: field;
    transform-origin: center left;
    transition-property: translate, scale, font-size, color;
    transition-duration: var(--_focus-duration);
    transition-timing-function: var(--_focus-easing);
  }

  #lead {
    padding-block: var(--_padding-block);
    grid-area: lead;
    --md-icon-size: var(--_leading-icon-size);
    fill: var(--_leading-icon-color);
  }

  #trail {
    grid-area: trail;
    padding-block: var(--_padding-block);
    --md-icon-size: var(--_trailing-icon-size);
    fill: var(--_trailing-icon-color);
  }

  #support {
    padding-block-start: var(--_support-text-gap);
    grid-area: support;
    font-family: var(--_supporting-text-font);
    font-size: var(--_supporting-text-size);
    font-weight: var(--_supporting-text-weight);
    line-height: var(--_supporting-text-line-height);
  }

  :host(:state(populated)),
  :host(:focus-within) {
    #label {
      line-height: var(--_label-text-populated-line-height);
      color: var(--_label-text-color);
      padding-block-start: var(--_container-focus-padding-block);
      translate: 0 -55%;
      scale: calc(var(--_label-text-populated-size) / var(--_label-text-size));
    }
  }

  :host(:state(error)) {
    ${filled.error?.default};
  }
`);

export default styles;
