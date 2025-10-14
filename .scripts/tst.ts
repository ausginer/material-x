import { basename } from 'node:path';
import { transform } from 'lightningcss';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const code = `
:host {
  --_focus-indicator-thickness: 3px;
  --_focus-indicator-color: var(--md-sys-color-secondary, #4b662a);
  --_trailing-space: var(--md-button-default-trailing-space, 24px);
  --_icon-label-space: 8px;
  --_container-color: var(
    --md-button-default-container-color,
    var(--md-sys-color-primary, #3e6700)
  );
  --_container-shadow-color: var(--md-sys-color-shadow, #000000);
  --_label-text-color: var(
    --md-button-default-label-text-color,
    var(--md-sys-color-on-primary, #ffffff)
  );
  --_icon-color: var(
    --md-button-default-icon-color,
    var(--md-sys-color-on-primary, #ffffff)
  );
  --_container-elevation: var(--md-button-default-container-elevation, 0);
  --_container-shape-square: 12px;
  --_container-shape-round: calc(var(--_container-height) / 2);
  --_icon-size: var(--md-button-default-icon-size, 20px);
  --_label-text-font-name: var(
    --md-button-default-label-text-font-name,
    "Google Sans Text"
  );
  --_label-text-font-weight: var(
    --md-button-default-label-text-font-weight,
    700
  );
  --_label-text-font-size: var(--md-button-default-label-text-font-size, 14px);
  --_label-text-line-height: var(
    --md-button-default-label-text-line-height,
    20px
  );
  --_container-height: var(--md-button-default-container-height, 40px);
  --_leading-space: var(--md-button-default-leading-space, 24px);
  --_state-layer-opacity: 0.1;
  --_state-layer-color: var(--md-sys-color-on-primary, #ffffff);
  --_padding-block: calc(
    (
        var(--_container-height) -
          max(var(--_icon-size), var(--_label-text-line-height))
      ) /
      2
  );
  --_press-damping: 0.6;
  --_press-stiffness: 800;
  --_press-duration: 150ms;
  --_press-factor: 0;
  --_ripple-color: var(--_state-layer-color);
  --_ripple-easing: cubic-bezier(0.31, 0.94, 0.34, 1);
  --_ripple-opacity: var(--_state-layer-opacity);

  will-change: border-radius;
  display: inline-flex;
  cursor: default;
  user-select: none;
  background-color: var(--_container-color);
  color: var(--_label-text-color);
  padding-block: var(--_padding-block);
  padding-inline-start: var(--_leading-space);
  padding-inline-end: var(--_trailing-space);
  border-radius: calc(
    var(--_container-shape-default) -
      (var(--_container-shape-default) - var(--_container-shape-pressed)) *
      var(--_press-factor)
  );
  font-weight: var(--_label-text-weight);
  font-size: var(--_label-text-size);
  line-height: var(--_label-text-line-height);
  font-family: var(--_label-text-font);
  place-items: center;
  place-content: center;
  gap: 8px;
}

:host(:hover) {
  --_container-elevation: var(--md-button-hovered-container-elevation, 1);
  --_state-layer-opacity: 0.08;

  background-color: color-mix(
    in srgb,
    var(--_container-color),
    var(--_state-layer-color) calc(var(--_state-layer-opacity) * 100%)
  );
}

:host(:focus-visible) {
  outline: var(--_focus-indicator-thickness) solid var(--_focus-indicator-color);
  outline-offset: var(--_focus-indicator-outline-offset);
}

:host(:active) {
  slot[name="icon"] {
    --md-icon-size: var(--_icon-size);

    color: var(--_icon-color);
    flex: 1 0 var(--_icon-size);
  }
}

slot[name="icon"] {
  --md-icon-size: var(--_icon-size);

  color: var(--_icon-color);
  flex: 1 0 var(--_icon-size);
}
`;

const { code: encodedProcessedCode } = transform({
  filename: basename('/workspaces/material-x/src/button/default/main.css'),
  code: encoder.encode(code),
  // minify: true,
  sourceMap: true,
  // targets: {
  //   chrome: 140,
  // },
});

const processedCode = decoder.decode(encodedProcessedCode);

console.log(processedCode);
