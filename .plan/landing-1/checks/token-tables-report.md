# Token tables for card, app bars, slider and divider

Written by `node scripts/update-tokens.ts --release 2026-11-19_06-20-01 --report <file>` on 2026-11-23 (`repo:RD-47`, unit T). The proofs are in [`token-tables.txt`](token-tables.txt).

## Token store conversion

- release: 2026-11-19_06-20-01
- database 41.1.12 (version 4ae102170fee99b1, published 2026-11-12T16:31:36.692418Z)
- sets: 122
- covered copies: 971, of 272 tokens. Each is a table's copy of another table's token, kept from the copy that covers it.
- conflicts: 0. A token, set, context or group conflict keeps the table read first. A value conflict is a child node stored without its value's index.

Against the store it replaces: release 2026-11-19_06-20-01, database 41.1.12.

## Tokens added: 324

### `md.comp.elevated-card`

- `md.comp.elevated-card.focus.indicator.outline.offset`
- `md.comp.elevated-card.focus.indicator.thickness`
- `md.comp.elevated-card.focus.indicator.color`
- `md.comp.elevated-card.container.surface-tint-layer.color`
- `md.comp.elevated-card.disabled.container.color`
- `md.comp.elevated-card.disabled.container.opacity`
- `md.comp.elevated-card.disabled.container.elevation`
- `md.comp.elevated-card.icon.size`
- `md.comp.elevated-card.icon.color`
- `md.comp.elevated-card.container.shadow-color`
- `md.comp.elevated-card.focus.state-layer.opacity`
- `md.comp.elevated-card.focus.state-layer.color`
- `md.comp.elevated-card.focus.container.elevation`
- `md.comp.elevated-card.hover.state-layer.opacity`
- `md.comp.elevated-card.hover.state-layer.color`
- `md.comp.elevated-card.hover.container.elevation`
- `md.comp.elevated-card.container.shape`
- `md.comp.elevated-card.container.elevation`
- `md.comp.elevated-card.container.color`
- `md.comp.elevated-card.dragged.state-layer.opacity`
- `md.comp.elevated-card.dragged.state-layer.color`
- `md.comp.elevated-card.dragged.container.elevation`
- `md.comp.elevated-card.pressed.state-layer.opacity`
- `md.comp.elevated-card.pressed.state-layer.color`
- `md.comp.elevated-card.pressed.container.elevation`

### `md.comp.filled-card`

- `md.comp.filled-card.focus.indicator.outline.offset`
- `md.comp.filled-card.focus.indicator.thickness`
- `md.comp.filled-card.focus.indicator.color`
- `md.comp.filled-card.disabled.container.color`
- `md.comp.filled-card.disabled.container.opacity`
- `md.comp.filled-card.disabled.container.elevation`
- `md.comp.filled-card.container.surface-tint-layer.color`
- `md.comp.filled-card.container.shadow-color`
- `md.comp.filled-card.container.shape`
- `md.comp.filled-card.icon.size`
- `md.comp.filled-card.icon.color`
- `md.comp.filled-card.focus.state-layer.opacity`
- `md.comp.filled-card.focus.state-layer.color`
- `md.comp.filled-card.focus.container.elevation`
- `md.comp.filled-card.hover.state-layer.opacity`
- `md.comp.filled-card.hover.state-layer.color`
- `md.comp.filled-card.hover.container.elevation`
- `md.comp.filled-card.container.elevation`
- `md.comp.filled-card.container.color`
- `md.comp.filled-card.dragged.state-layer.opacity`
- `md.comp.filled-card.dragged.state-layer.color`
- `md.comp.filled-card.dragged.container.elevation`
- `md.comp.filled-card.pressed.state-layer.opacity`
- `md.comp.filled-card.pressed.state-layer.color`
- `md.comp.filled-card.pressed.container.elevation`

### `md.comp.outlined-card`

- `md.comp.outlined-card.focus.indicator.outline.offset`
- `md.comp.outlined-card.focus.indicator.thickness`
- `md.comp.outlined-card.focus.indicator.color`
- `md.comp.outlined-card.container.surface-tint-layer.color`
- `md.comp.outlined-card.disabled.outline.opacity`
- `md.comp.outlined-card.disabled.outline.color`
- `md.comp.outlined-card.disabled.container.elevation`
- `md.comp.outlined-card.pressed.container.elevation`
- `md.comp.outlined-card.focus.container.elevation`
- `md.comp.outlined-card.hover.container.elevation`
- `md.comp.outlined-card.icon.size`
- `md.comp.outlined-card.icon.color`
- `md.comp.outlined-card.outline.color`
- `md.comp.outlined-card.outline.width`
- `md.comp.outlined-card.container.shadow-color`
- `md.comp.outlined-card.focus.state-layer.opacity`
- `md.comp.outlined-card.focus.state-layer.color`
- `md.comp.outlined-card.focus.outline.color`
- `md.comp.outlined-card.hover.state-layer.opacity`
- `md.comp.outlined-card.hover.state-layer.color`
- `md.comp.outlined-card.hover.outline.color`
- `md.comp.outlined-card.container.shape`
- `md.comp.outlined-card.container.elevation`
- `md.comp.outlined-card.container.color`
- `md.comp.outlined-card.dragged.state-layer.opacity`
- `md.comp.outlined-card.dragged.state-layer.color`
- `md.comp.outlined-card.dragged.outline.color`
- `md.comp.outlined-card.dragged.container.elevation`
- `md.comp.outlined-card.pressed.state-layer.opacity`
- `md.comp.outlined-card.pressed.state-layer.color`
- `md.comp.outlined-card.pressed.outline.color`

### `md.comp.app-bar`

- `md.comp.app-bar.search.trailing-space`
- `md.comp.app-bar.search.leading-space`
- `md.comp.app-bar.search.on-scroll.container.color`
- `md.comp.app-bar.search.label.color`
- `md.comp.app-bar.search.container.color`
- `md.comp.app-bar.subtitle.color`
- `md.comp.app-bar.container.elevation`
- `md.comp.app-bar.title.color`
- `md.comp.app-bar.on-scroll.container.elevation`
- `md.comp.app-bar.leading-icon.color`
- `md.comp.app-bar.trailing-icon.color`
- `md.comp.app-bar.on-scroll.container.color`
- `md.comp.app-bar.container.color`
- `md.comp.app-bar.leading-space`
- `md.comp.app-bar.trailing-space`
- `md.comp.app-bar.icon-button-space`
- `md.comp.app-bar.container.shape`
- `md.comp.app-bar.avatar.size`
- `md.comp.app-bar.icon.size`

### `md.comp.app-bar.medium`

- `md.comp.app-bar.medium.icon.size`
- `md.comp.app-bar.medium.subtitle.font`
- `md.comp.app-bar.medium.container.height`
- `md.comp.app-bar.medium.title.font`

### `md.comp.app-bar.large`

- `md.comp.app-bar.large.icon.size`
- `md.comp.app-bar.large.subtitle.font`
- `md.comp.app-bar.large.container.height`
- `md.comp.app-bar.large.title.font`

### `md.comp.app-bar.small`

- `md.comp.app-bar.small.search.label-text.font`
- `md.comp.app-bar.small.search.container.shape`
- `md.comp.app-bar.small.search.container.height`
- `md.comp.app-bar.small.icon.size`
- `md.comp.app-bar.small.container.height`
- `md.comp.app-bar.small.title.font`
- `md.comp.app-bar.small.subtitle.font`

### `md.comp.app-bar.large-flexible`

- `md.comp.app-bar.large-flexible.with-subtitle.container.height`
- `md.comp.app-bar.large-flexible.container.height`
- `md.comp.app-bar.large-flexible.title.font`
- `md.comp.app-bar.large-flexible.subtitle.font`

### `md.comp.app-bar.medium-flexible`

- `md.comp.app-bar.medium-flexible.with-subtitle.container.height`
- `md.comp.app-bar.medium-flexible.container.height`
- `md.comp.app-bar.medium-flexible.title.font`
- `md.comp.app-bar.medium-flexible.subtitle.font`

### `md.comp.top-app-bar.small.centered`

- `md.comp.top-app-bar.small.centered.on-scroll.container.elevation`
- `md.comp.top-app-bar.small.centered.headline.color`
- `md.comp.top-app-bar.small.centered.headline.type`
- `md.comp.top-app-bar.small.centered.headline.font`
- `md.comp.top-app-bar.small.centered.headline.weight`
- `md.comp.top-app-bar.small.centered.headline.size`
- `md.comp.top-app-bar.small.centered.headline.line-height`
- `md.comp.top-app-bar.small.centered.headline.tracking`
- `md.comp.top-app-bar.small.centered.trailing-icon.color`
- `md.comp.top-app-bar.small.centered.trailing-icon.size`
- `md.comp.top-app-bar.small.centered.leading-icon.color`
- `md.comp.top-app-bar.small.centered.leading-icon.size`
- `md.comp.top-app-bar.small.centered.container.surface-tint-layer.color`
- `md.comp.top-app-bar.small.centered.container.elevation`
- `md.comp.top-app-bar.small.centered.container.height`
- `md.comp.top-app-bar.small.centered.container.shape`
- `md.comp.top-app-bar.small.centered.container.color`
- `md.comp.top-app-bar.small.centered.on-scroll.container.color`
- `md.comp.top-app-bar.small.centered.avatar.shape`
- `md.comp.top-app-bar.small.centered.avatar.size`
- `md.comp.top-app-bar.small.centered.on-scroll.container.shadow-color`

### `md.comp.top-app-bar.small`

- `md.comp.top-app-bar.small.on-scroll.container.elevation`
- `md.comp.top-app-bar.small.headline.color`
- `md.comp.top-app-bar.small.headline.type`
- `md.comp.top-app-bar.small.headline.font`
- `md.comp.top-app-bar.small.headline.weight`
- `md.comp.top-app-bar.small.headline.size`
- `md.comp.top-app-bar.small.headline.line-height`
- `md.comp.top-app-bar.small.headline.tracking`
- `md.comp.top-app-bar.small.trailing-icon.color`
- `md.comp.top-app-bar.small.trailing-icon.size`
- `md.comp.top-app-bar.small.leading-icon.color`
- `md.comp.top-app-bar.small.leading-icon.size`
- `md.comp.top-app-bar.small.container.elevation`
- `md.comp.top-app-bar.small.container.height`
- `md.comp.top-app-bar.small.container.shape`
- `md.comp.top-app-bar.small.on-scroll.container.color`
- `md.comp.top-app-bar.small.container.color`
- `md.comp.top-app-bar.small.on-scroll.container.shadow-color`
- `md.comp.top-app-bar.small.container.surface-tint-layer.color`

### `md.comp.top-app-bar.medium`

- `md.comp.top-app-bar.medium.headline.color`
- `md.comp.top-app-bar.medium.headline.type`
- `md.comp.top-app-bar.medium.headline.font`
- `md.comp.top-app-bar.medium.headline.weight`
- `md.comp.top-app-bar.medium.headline.size`
- `md.comp.top-app-bar.medium.headline.line-height`
- `md.comp.top-app-bar.medium.headline.tracking`
- `md.comp.top-app-bar.medium.trailing-icon.color`
- `md.comp.top-app-bar.medium.trailing-icon.size`
- `md.comp.top-app-bar.medium.leading-icon.color`
- `md.comp.top-app-bar.medium.leading-icon.size`
- `md.comp.top-app-bar.medium.container.elevation`
- `md.comp.top-app-bar.medium.container.height`
- `md.comp.top-app-bar.medium.container.shape`
- `md.comp.top-app-bar.medium.container.color`
- `md.comp.top-app-bar.medium.container.surface-tint-layer.color`

### `md.comp.top-app-bar.large`

- `md.comp.top-app-bar.large.headline.color`
- `md.comp.top-app-bar.large.headline.type`
- `md.comp.top-app-bar.large.headline.font`
- `md.comp.top-app-bar.large.headline.weight`
- `md.comp.top-app-bar.large.headline.size`
- `md.comp.top-app-bar.large.headline.line-height`
- `md.comp.top-app-bar.large.headline.tracking`
- `md.comp.top-app-bar.large.trailing-icon.color`
- `md.comp.top-app-bar.large.trailing-icon.size`
- `md.comp.top-app-bar.large.leading-icon.color`
- `md.comp.top-app-bar.large.leading-icon.size`
- `md.comp.top-app-bar.large.container.elevation`
- `md.comp.top-app-bar.large.container.height`
- `md.comp.top-app-bar.large.container.shape`
- `md.comp.top-app-bar.large.container.color`
- `md.comp.top-app-bar.large.container.surface-tint-layer.color`

### `md.comp.slider`

- `md.comp.slider.active.handle.color`
- `md.comp.slider.active.track.outer-corner.corner-size`
- `md.comp.slider.active.track.inner-corner.corner-size`
- `md.comp.slider.disabled.stop-indicator.container.opacity`
- `md.comp.slider.disabled.stop-indicator.container.color`
- `md.comp.slider.disabled.stop-indicator.color`
- `md.comp.slider.disabled.stop-indicator.color-selected`
- `md.comp.slider.disabled.inactive.stop-indicator.container.color`
- `md.comp.slider.disabled.active.stop-indicator.container.color`
- `md.comp.slider.inactive.stop-indicator.container.opacity`
- `md.comp.slider.inactive.stop-indicator.container.color`
- `md.comp.slider.active.stop-indicator.container.opacity`
- `md.comp.slider.active.stop-indicator.container.color`
- `md.comp.slider.stop-indicator.color-selected`
- `md.comp.slider.with-tick-marks.inactive.container.opacity`
- `md.comp.slider.with-tick-marks.inactive.container.color`
- `md.comp.slider.with-tick-marks.active.container.opacity`
- `md.comp.slider.with-tick-marks.active.container.color`
- `md.comp.slider.label.container.height`
- `md.comp.slider.label.container.color`
- `md.comp.slider.active.container.opacity`
- `md.comp.slider.inactive.container.opacity`
- `md.comp.slider.label.container.elevation`
- `md.comp.slider.with-tick-marks.disabled.container.opacity`
- `md.comp.slider.with-tick-marks.disabled.container.color`
- `md.comp.slider.focus.stop.color`
- `md.comp.slider.label.label-text.color`
- `md.comp.slider.value-indicator.label.label-text.color`
- `md.comp.slider.value-indicator.container.color`
- `md.comp.slider.pressed.stop.color`
- `md.comp.slider.pressed.inactive.track.color`
- `md.comp.slider.pressed.active.track.color`
- `md.comp.slider.focus.inactive.track.color`
- `md.comp.slider.focus.active.track.color`
- `md.comp.slider.hover.stop.color`
- `md.comp.slider.active.handle.shape`
- `md.comp.slider.stop-indicator.color`
- `md.comp.slider.stop-indicator.shape`
- `md.comp.slider.hover.handle.color`
- `md.comp.slider.disabled.handle.opacity`
- `md.comp.slider.disabled.inactive.track.opacity`
- `md.comp.slider.disabled.active.track.opacity`
- `md.comp.slider.value-indicator.label.label-text.size`
- `md.comp.slider.value-indicator.label.label-text.line-height`
- `md.comp.slider.value-indicator.label.label-text.tracking`
- `md.comp.slider.value-indicator.active.bottom-space`
- `md.comp.slider.value-indicator.label.label-text.weight`
- `md.comp.slider.label.label-text.type`
- `md.comp.slider.label.label-text.font`
- `md.comp.slider.label.label-text.weight`
- `md.comp.slider.label.label-text.size`
- `md.comp.slider.label.label-text.line-height`
- `md.comp.slider.label.label-text.tracking`
- `md.comp.slider.pressed.state-layer.opacity`
- `md.comp.slider.pressed.state-layer.color`
- `md.comp.slider.focus.state-layer.opacity`
- `md.comp.slider.focus.state-layer.color`
- `md.comp.slider.focus.handle.color`
- `md.comp.slider.hover.state-layer.opacity`
- `md.comp.slider.hover.state-layer.color`
- `md.comp.slider.disabled.handle.elevation`
- `md.comp.slider.with-tick-marks.container.size`
- `md.comp.slider.with-tick-marks.container.shape`
- `md.comp.slider.with-overlap.handle.outline.width`
- `md.comp.slider.with-overlap.handle.outline.color`
- `md.comp.slider.handle.elevation`
- `md.comp.slider.handle.shadow-color`
- `md.comp.slider.state-layer.size`
- `md.comp.slider.track.elevation`
- `md.comp.slider.stop-indicator.size`
- `md.comp.slider.disabled.handle.width`
- `md.comp.slider.focus.handle.width`
- `md.comp.slider.value-indicator.label.label-text.font`
- `md.comp.slider.pressed.handle.width`
- `md.comp.slider.hover.handle.width`
- `md.comp.slider.stop-indicator.trailing-space`
- `md.comp.slider.label.label-text.font-size`
- `md.comp.slider.inactive.track.color`
- `md.comp.slider.inactive.track.shape`
- `md.comp.slider.active.track.color`
- `md.comp.slider.active.handle.padding`
- `md.comp.slider.active.handle.trailing-space`
- `md.comp.slider.active.handle.leading-space`
- `md.comp.slider.active.handle.width`
- `md.comp.slider.active.handle.height`
- `md.comp.slider.active.track.shape`
- `md.comp.slider.handle.color`
- `md.comp.slider.handle.shape`
- `md.comp.slider.handle.width`
- `md.comp.slider.handle.height`
- `md.comp.slider.inactive.track.height`
- `md.comp.slider.active.track.height`
- `md.comp.slider.disabled.inactive.track.color`
- `md.comp.slider.disabled.active.track.color`
- `md.comp.slider.pressed.handle.color`
- `md.comp.slider.disabled.handle.color`

### `md.comp.slider.xsmall`

- `md.comp.slider.xsmall.inactive.track.shape.trailing`
- `md.comp.slider.xsmall.active.handle.height`
- `md.comp.slider.xsmall.inactive.track.height`
- `md.comp.slider.xsmall.active.track.shape.leading`
- `md.comp.slider.xsmall.active.track.height`

### `md.comp.slider.small`

- `md.comp.slider.small.inactive.track.shape.trailing`
- `md.comp.slider.small.inactive.track.height`
- `md.comp.slider.small.active.handle.height`
- `md.comp.slider.small.active.track.shape.leading`
- `md.comp.slider.small.active.track.height`

### `md.comp.slider.medium`

- `md.comp.slider.medium.icon.padding`
- `md.comp.slider.medium.icon.size`
- `md.comp.slider.medium.active.handle.height`
- `md.comp.slider.medium.inactive.track.shape.trailing`
- `md.comp.slider.medium.inactive.track.height`
- `md.comp.slider.medium.active.track.shape.leading`
- `md.comp.slider.medium.active.track.height`

### `md.comp.slider.large`

- `md.comp.slider.large.icon.padding`
- `md.comp.slider.large.icon.size`
- `md.comp.slider.large.active.handle.height`
- `md.comp.slider.large.inactive.track.shape.trailing`
- `md.comp.slider.large.inactive.track.height`
- `md.comp.slider.large.active.track.shape.leading`
- `md.comp.slider.large.active.track.height`

### `md.comp.slider.xlarge`

- `md.comp.slider.xlarge.icon.padding`
- `md.comp.slider.xlarge.icon.size`
- `md.comp.slider.xlarge.active.handle.height`
- `md.comp.slider.xlarge.inactive.track.shape.trailing`
- `md.comp.slider.xlarge.inactive.track.height`
- `md.comp.slider.xlarge.active.track.shape.leading`
- `md.comp.slider.xlarge.active.track.height`

### `md.comp.divider`

- `md.comp.divider.color`
- `md.comp.divider.thickness`

## Tokens removed: 0

## Deprecations added: 123

### `md.comp.elevated-card`

- `md.comp.elevated-card.container.surface-tint-layer.color`

### `md.comp.filled-card`

- `md.comp.filled-card.container.surface-tint-layer.color`

### `md.comp.outlined-card`

- `md.comp.outlined-card.container.surface-tint-layer.color`

### `md.comp.app-bar.medium`

- `md.comp.app-bar.medium.icon.size`, replaced by `asset.comp.app-bar.icon.size`
- `md.comp.app-bar.medium.subtitle.font`

### `md.comp.app-bar.large`

- `md.comp.app-bar.large.icon.size`, replaced by `asset.comp.app-bar.icon.size`
- `md.comp.app-bar.large.subtitle.font`

### `md.comp.app-bar.small`

- `md.comp.app-bar.small.icon.size`, replaced by `asset.comp.app-bar.icon.size`

### `md.comp.top-app-bar.small.centered`

- `md.comp.top-app-bar.small.centered.on-scroll.container.elevation`
- `md.comp.top-app-bar.small.centered.headline.color`
- `md.comp.top-app-bar.small.centered.headline.type`
- `md.comp.top-app-bar.small.centered.headline.font`
- `md.comp.top-app-bar.small.centered.headline.weight`
- `md.comp.top-app-bar.small.centered.headline.size`
- `md.comp.top-app-bar.small.centered.headline.line-height`
- `md.comp.top-app-bar.small.centered.headline.tracking`
- `md.comp.top-app-bar.small.centered.trailing-icon.color`
- `md.comp.top-app-bar.small.centered.trailing-icon.size`
- `md.comp.top-app-bar.small.centered.leading-icon.color`
- `md.comp.top-app-bar.small.centered.leading-icon.size`
- `md.comp.top-app-bar.small.centered.container.surface-tint-layer.color`
- `md.comp.top-app-bar.small.centered.container.elevation`
- `md.comp.top-app-bar.small.centered.container.height`
- `md.comp.top-app-bar.small.centered.container.shape`
- `md.comp.top-app-bar.small.centered.container.color`
- `md.comp.top-app-bar.small.centered.on-scroll.container.color`
- `md.comp.top-app-bar.small.centered.avatar.shape`
- `md.comp.top-app-bar.small.centered.avatar.size`
- `md.comp.top-app-bar.small.centered.on-scroll.container.shadow-color`

### `md.comp.top-app-bar.small`

- `md.comp.top-app-bar.small.on-scroll.container.elevation`
- `md.comp.top-app-bar.small.headline.color`
- `md.comp.top-app-bar.small.headline.type`
- `md.comp.top-app-bar.small.headline.font`
- `md.comp.top-app-bar.small.headline.weight`
- `md.comp.top-app-bar.small.headline.size`
- `md.comp.top-app-bar.small.headline.line-height`
- `md.comp.top-app-bar.small.headline.tracking`
- `md.comp.top-app-bar.small.trailing-icon.color`
- `md.comp.top-app-bar.small.trailing-icon.size`
- `md.comp.top-app-bar.small.leading-icon.color`
- `md.comp.top-app-bar.small.leading-icon.size`
- `md.comp.top-app-bar.small.container.elevation`
- `md.comp.top-app-bar.small.container.height`
- `md.comp.top-app-bar.small.container.shape`
- `md.comp.top-app-bar.small.on-scroll.container.color`
- `md.comp.top-app-bar.small.container.color`
- `md.comp.top-app-bar.small.on-scroll.container.shadow-color`
- `md.comp.top-app-bar.small.container.surface-tint-layer.color`

### `md.comp.top-app-bar.medium`

- `md.comp.top-app-bar.medium.headline.color`
- `md.comp.top-app-bar.medium.headline.type`
- `md.comp.top-app-bar.medium.headline.font`
- `md.comp.top-app-bar.medium.headline.weight`
- `md.comp.top-app-bar.medium.headline.size`
- `md.comp.top-app-bar.medium.headline.line-height`
- `md.comp.top-app-bar.medium.headline.tracking`
- `md.comp.top-app-bar.medium.trailing-icon.color`
- `md.comp.top-app-bar.medium.trailing-icon.size`
- `md.comp.top-app-bar.medium.leading-icon.color`
- `md.comp.top-app-bar.medium.leading-icon.size`
- `md.comp.top-app-bar.medium.container.elevation`
- `md.comp.top-app-bar.medium.container.height`
- `md.comp.top-app-bar.medium.container.shape`
- `md.comp.top-app-bar.medium.container.color`
- `md.comp.top-app-bar.medium.container.surface-tint-layer.color`

### `md.comp.top-app-bar.large`

- `md.comp.top-app-bar.large.headline.color`
- `md.comp.top-app-bar.large.headline.type`
- `md.comp.top-app-bar.large.headline.font`
- `md.comp.top-app-bar.large.headline.weight`
- `md.comp.top-app-bar.large.headline.size`
- `md.comp.top-app-bar.large.headline.line-height`
- `md.comp.top-app-bar.large.headline.tracking`
- `md.comp.top-app-bar.large.trailing-icon.color`
- `md.comp.top-app-bar.large.trailing-icon.size`
- `md.comp.top-app-bar.large.leading-icon.color`
- `md.comp.top-app-bar.large.leading-icon.size`
- `md.comp.top-app-bar.large.container.elevation`
- `md.comp.top-app-bar.large.container.height`
- `md.comp.top-app-bar.large.container.shape`
- `md.comp.top-app-bar.large.container.color`
- `md.comp.top-app-bar.large.container.surface-tint-layer.color`

### `md.comp.slider`

- `md.comp.slider.disabled.stop-indicator.container.opacity`
- `md.comp.slider.disabled.stop-indicator.container.color`
- `md.comp.slider.disabled.stop-indicator.color`, replaced by `md.comp.slider.disabled.inactive.stop-indicator.container.color`
- `md.comp.slider.disabled.stop-indicator.color-selected`, replaced by `md.comp.slider.disabled.active.stop-indicator.container.color`
- `md.comp.slider.with-tick-marks.inactive.container.opacity`, replaced by `md.comp.slider.inactive.tick-marks.container.opacity`
- `md.comp.slider.with-tick-marks.inactive.container.color`, replaced by `md.comp.slider.inactive.tick-marks.container.color`
- `md.comp.slider.with-tick-marks.active.container.opacity`, replaced by `md.comp.slider.active.tick-marks.container.opacity`
- `md.comp.slider.with-tick-marks.active.container.color`, replaced by `md.comp.slider.active.tick-marks.container.color`
- `md.comp.slider.label.container.height`
- `md.comp.slider.label.container.color`
- `md.comp.slider.active.container.opacity`
- `md.comp.slider.inactive.container.opacity`
- `md.comp.slider.label.container.elevation`
- `md.comp.slider.with-tick-marks.disabled.container.opacity`, replaced by `md.comp.slider.disabled.tick-marks.container.opacity`
- `md.comp.slider.with-tick-marks.disabled.container.color`, replaced by `md.comp.slider.disabled.tick-marks.container.color`
- `md.comp.slider.focus.stop.color`
- `md.comp.slider.label.label-text.color`
- `md.comp.slider.pressed.stop.color`
- `md.comp.slider.hover.stop.color`
- `md.comp.slider.hover.handle.color`
- `md.comp.slider.label.label-text.type`
- `md.comp.slider.label.label-text.font`
- `md.comp.slider.label.label-text.weight`
- `md.comp.slider.label.label-text.size`
- `md.comp.slider.label.label-text.line-height`
- `md.comp.slider.label.label-text.tracking`
- `md.comp.slider.pressed.state-layer.opacity`
- `md.comp.slider.pressed.state-layer.color`
- `md.comp.slider.focus.state-layer.opacity`
- `md.comp.slider.focus.state-layer.color`
- `md.comp.slider.focus.handle.color`
- `md.comp.slider.hover.state-layer.opacity`
- `md.comp.slider.hover.state-layer.color`
- `md.comp.slider.disabled.handle.elevation`
- `md.comp.slider.with-tick-marks.container.size`
- `md.comp.slider.with-tick-marks.container.shape`
- `md.comp.slider.with-overlap.handle.outline.width`
- `md.comp.slider.with-overlap.handle.outline.color`
- `md.comp.slider.handle.elevation`
- `md.comp.slider.handle.shadow-color`
- `md.comp.slider.state-layer.size`
- `md.comp.slider.track.elevation`
- `md.comp.slider.label.label-text.font-size`, replaced by `md.comp.slider.label.label-text.size`

## Selected values changed, for expressive and web: 0