# Token store conversion

- release: 2026-11-19_06-20-01
- database 41.1.12 (version 4ae102170fee99b1, published 2026-11-12T16:31:36.692418Z)
- sets: 180
- covered copies: 2162, of 335 tokens. Each is a table's copy of another table's token, kept from the copy that covers it.
- conflicts: 0. A token, set, context or group conflict keeps the table read first. A value conflict is a child node stored without its value's index.

Against the store it replaces: release 2026-11-19_06-20-01, database 41.1.12.

## Tokens added: 56

### `md.comp.progress-indicator`

- `md.comp.progress-indicator.active-indicator.color`
- `md.comp.progress-indicator.track.color`
- `md.comp.progress-indicator.stop-indicator.color`
- `md.comp.progress-indicator.active-indicator.shape`
- `md.comp.progress-indicator.track.shape`
- `md.comp.progress-indicator.stop-indicator.shape`
- `md.comp.progress-indicator.active-indicator.thickness`
- `md.comp.progress-indicator.track.thickness`
- `md.comp.progress-indicator.stop-indicator.size`
- `md.comp.progress-indicator.active-indicator-track-space`

### `md.comp.progress-indicator.circular`

- `md.comp.progress-indicator.circular.size`
- `md.comp.progress-indicator.circular.active-indicator.thickness`
- `md.comp.progress-indicator.circular.active-indicator.wave.amplitude`
- `md.comp.progress-indicator.circular.active-indicator.wave.wavelength`
- `md.comp.progress-indicator.circular.track-active-indicator-space`
- `md.comp.progress-indicator.circular.track.thickness`
- `md.comp.progress-indicator.circular.with-wave.size`
- `md.comp.progress-indicator.circular.thick.size`
- `md.comp.progress-indicator.circular.thick.active-indicator.thickness`
- `md.comp.progress-indicator.circular.thick.track.thickness`
- `md.comp.progress-indicator.circular.thick.track-active-indicator-space`

### `md.comp.progress-indicator.linear`

- `md.comp.progress-indicator.linear.indeterminate.active-indicator.wave.wavelength`
- `md.comp.progress-indicator.linear.height`
- `md.comp.progress-indicator.linear.with-wave.height`
- `md.comp.progress-indicator.linear.active-indicator.thickness`
- `md.comp.progress-indicator.linear.track.thickness`
- `md.comp.progress-indicator.linear.stop-indicator.size`
- `md.comp.progress-indicator.linear.stop-indicator.trailing-space`
- `md.comp.progress-indicator.linear.active-indicator.wave.amplitude`
- `md.comp.progress-indicator.linear.active-indicator.wave.wavelength`
- `md.comp.progress-indicator.linear.track-active-indicator-space`
- `md.comp.progress-indicator.linear.thick.height`
- `md.comp.progress-indicator.linear.thick.with-wave.height`
- `md.comp.progress-indicator.linear.thick.active-indicator.thickness`
- `md.comp.progress-indicator.linear.thick.track.thickness`
- `md.comp.progress-indicator.linear.thick.stop-indicator.size`
- `md.comp.progress-indicator.linear.thick.track-active-indicator-space`
- `md.comp.progress-indicator.linear.thick.stop-indicator.trailing-space`

### `md.comp.linear-progress-indicator`

- `md.comp.linear-progress-indicator.four-color.active-indicator.four.color`
- `md.comp.linear-progress-indicator.four-color.active-indicator.three.color`
- `md.comp.linear-progress-indicator.four-color.active-indicator.two.color`
- `md.comp.linear-progress-indicator.four-color.active-indicator.one.color`
- `md.comp.linear-progress-indicator.active-indicator.color`
- `md.comp.linear-progress-indicator.active-indicator.shape`
- `md.comp.linear-progress-indicator.active-indicator.height`
- `md.comp.linear-progress-indicator.track.color`
- `md.comp.linear-progress-indicator.track.shape`
- `md.comp.linear-progress-indicator.track.height`

### `md.comp.circular-progress-indicator`

- `md.comp.circular-progress-indicator.four-color.active-indicator.four.color`
- `md.comp.circular-progress-indicator.four-color.active-indicator.three.color`
- `md.comp.circular-progress-indicator.four-color.active-indicator.two.color`
- `md.comp.circular-progress-indicator.four-color.active-indicator.one.color`
- `md.comp.circular-progress-indicator.active-indicator.color`
- `md.comp.circular-progress-indicator.active-indicator.shape`
- `md.comp.circular-progress-indicator.active-indicator.width`
- `md.comp.circular-progress-indicator.size`

## Tokens removed: 0

## Deprecations added: 33

### `md.comp.progress-indicator`

- `md.comp.progress-indicator.active-indicator.thickness`
- `md.comp.progress-indicator.track.thickness`
- `md.comp.progress-indicator.stop-indicator.size`
- `md.comp.progress-indicator.active-indicator-track-space`

### `md.comp.progress-indicator.circular`

- `md.comp.progress-indicator.circular.thick.size`
- `md.comp.progress-indicator.circular.thick.active-indicator.thickness`
- `md.comp.progress-indicator.circular.thick.track.thickness`
- `md.comp.progress-indicator.circular.thick.track-active-indicator-space`

### `md.comp.progress-indicator.linear`

- `md.comp.progress-indicator.linear.thick.height`
- `md.comp.progress-indicator.linear.thick.with-wave.height`
- `md.comp.progress-indicator.linear.thick.active-indicator.thickness`
- `md.comp.progress-indicator.linear.thick.track.thickness`
- `md.comp.progress-indicator.linear.thick.stop-indicator.size`
- `md.comp.progress-indicator.linear.thick.track-active-indicator-space`
- `md.comp.progress-indicator.linear.thick.stop-indicator.trailing-space`

### `md.comp.linear-progress-indicator`

- `md.comp.linear-progress-indicator.four-color.active-indicator.four.color`
- `md.comp.linear-progress-indicator.four-color.active-indicator.three.color`
- `md.comp.linear-progress-indicator.four-color.active-indicator.two.color`
- `md.comp.linear-progress-indicator.four-color.active-indicator.one.color`
- `md.comp.linear-progress-indicator.active-indicator.color`
- `md.comp.linear-progress-indicator.active-indicator.shape`
- `md.comp.linear-progress-indicator.active-indicator.height`
- `md.comp.linear-progress-indicator.track.color`
- `md.comp.linear-progress-indicator.track.shape`
- `md.comp.linear-progress-indicator.track.height`

### `md.comp.circular-progress-indicator`

- `md.comp.circular-progress-indicator.four-color.active-indicator.four.color`
- `md.comp.circular-progress-indicator.four-color.active-indicator.three.color`
- `md.comp.circular-progress-indicator.four-color.active-indicator.two.color`
- `md.comp.circular-progress-indicator.four-color.active-indicator.one.color`
- `md.comp.circular-progress-indicator.active-indicator.color`
- `md.comp.circular-progress-indicator.active-indicator.shape`
- `md.comp.circular-progress-indicator.active-indicator.width`
- `md.comp.circular-progress-indicator.size`

## Selected values changed, in the rendered context: 0