# Token store update to 2026-11-19_06-20-01

Written by `node scripts/update-tokens.ts --release 2026-11-19_06-20-01 --report <file>` on 2026-11-20 (`repo:RD-28` step 2). The CSS section at the end was added by hand from the compiled stylesheets.

## Token store conversion

- release: 2026-11-19_06-20-01
- database 41.1.12 (version 4ae102170fee99b1, published 2026-11-12T16:31:36.692418Z)
- sets: 102
- covered copies: 704, of 217 tokens. Each is a table's copy of another table's token, kept from the copy that covers it.
- conflicts: 0. A token, set, context or group conflict keeps the table read first. A value conflict is a child node stored without its value's index.

Against the store it replaces: release unknown, database 37.0.32 and 35.0.28.

## Tokens added: 30

### `md.ref.typeface`

- `md.ref.typeface.body-small.line-height`
- `md.ref.typeface.body-medium.line-height`
- `md.ref.typeface.body-large.line-height`
- `md.ref.typeface.label-small.line-height`
- `md.ref.typeface.label-medium.line-height`
- `md.ref.typeface.label-large.line-height`
- `md.ref.typeface.title-small.line-height`
- `md.ref.typeface.title-medium.line-height`
- `md.ref.typeface.title-large.line-height`
- `md.ref.typeface.headline-small.line-height`
- `md.ref.typeface.headline-medium.line-height`
- `md.ref.typeface.headline-large.line-height`
- `md.ref.typeface.display-small.line-height`
- `md.ref.typeface.display-medium.line-height`
- `md.ref.typeface.display-large.line-height`

### `md.sys.measurement`

- `md.sys.measurement.space300`
- `md.sys.measurement.space100`
- `md.sys.measurement.space800`
- `md.sys.measurement.space200`
- `md.sys.measurement.space600`
- `md.sys.measurement.space150`
- `md.sys.measurement.space50`
- `md.sys.measurement.space250`
- `md.sys.measurement.space75`
- `md.sys.measurement.space400`
- `md.sys.measurement.space175`
- `md.sys.measurement.space900`
- `md.sys.measurement.space125`
- `md.sys.measurement.space25`
- `md.sys.measurement.space0`

## Tokens removed: 0

## Deprecations added: 0

## Selected values changed, for expressive and web: 104

### `md.sys.typescale.emphasized`

- `md.sys.typescale.emphasized.body-large`: `{"type":{"fontNameTokenName":"md.sys.typescale.emphasized.body-large.font","fontWeightTokenName":"md.sys.typescale.emphasized.body-large.weight","fontSizeTokenName":"md.sys.typescale.emphasized.body-large.size","fontTrackingTokenName":"md.sys.typescale.emphasized.body-large.tracking","lineHeightTokenName":"md.sys.typescale.emphasized.body-large.line-height"}}` → `{"type":{"fontNameTokenName":"md.sys.typescale.emphasized.body-large.font","fontWeightTokenName":"md.sys.typescale.emphasized.body-large.weight","fontSizeTokenName":"md.sys.typescale.emphasized.body-large.size","fontTrackingTokenName":"md.sys.typescale.emphasized.body-large.tracking","lineHeightTokenName":"md.sys.typescale.emphasized.body-large.line-height","variationAxes":{"wdth":{"axisValueTokenName":"md.sys.typescale.emphasized.body-large.wdth"},"wght":{"axisValueTokenName":"md.sys.typescale.emphasized.body-large.wght"},"slnt":{"axisValueTokenName":"md.sys.typescale.emphasized.body-large.slnt"},"opsz":{"axisValueTokenName":"md.sys.typescale.emphasized.body-large.opsz"},"GRAD":{"axisValueTokenName":"md.sys.typescale.emphasized.body-large.grad"},"ROND":{"axisValueTokenName":"md.sys.typescale.emphasized.body-large.rond"},"CRSV":{"axisValueTokenName":"md.sys.typescale.emphasized.body-large.crsv"},"HEXP":{"axisValueTokenName":"md.sys.typescale.emphasized.body-large.hexp"},"FILL":{"axisValueTokenName":"md.sys.typescale.emphasized.body-large.fill"}}}}`
- `md.sys.typescale.emphasized.body-medium`: `{"type":{"fontNameTokenName":"md.sys.typescale.emphasized.body-medium.font","fontWeightTokenName":"md.sys.typescale.emphasized.body-medium.weight","fontSizeTokenName":"md.sys.typescale.emphasized.body-medium.size","fontTrackingTokenName":"md.sys.typescale.emphasized.body-medium.tracking","lineHeightTokenName":"md.sys.typescale.emphasized.body-medium.line-height"}}` → `{"type":{"fontNameTokenName":"md.sys.typescale.emphasized.body-medium.font","fontWeightTokenName":"md.sys.typescale.emphasized.body-medium.weight","fontSizeTokenName":"md.sys.typescale.emphasized.body-medium.size","fontTrackingTokenName":"md.sys.typescale.emphasized.body-medium.tracking","lineHeightTokenName":"md.sys.typescale.emphasized.body-medium.line-height","variationAxes":{"wdth":{"axisValueTokenName":"md.sys.typescale.emphasized.body-medium.wdth"},"wght":{"axisValueTokenName":"md.sys.typescale.emphasized.body-medium.wght"},"slnt":{"axisValueTokenName":"md.sys.typescale.emphasized.body-medium.slnt"},"opsz":{"axisValueTokenName":"md.sys.typescale.emphasized.body-medium.opsz"},"GRAD":{"axisValueTokenName":"md.sys.typescale.emphasized.body-medium.grad"},"ROND":{"axisValueTokenName":"md.sys.typescale.emphasized.body-medium.rond"},"CRSV":{"axisValueTokenName":"md.sys.typescale.emphasized.body-medium.crsv"},"HEXP":{"axisValueTokenName":"md.sys.typescale.emphasized.body-medium.hexp"},"FILL":{"axisValueTokenName":"md.sys.typescale.emphasized.body-medium.fill"}}}}`
- `md.sys.typescale.emphasized.body-small`: `{"type":{"fontNameTokenName":"md.sys.typescale.emphasized.body-small.font","fontWeightTokenName":"md.sys.typescale.emphasized.body-small.weight","fontSizeTokenName":"md.sys.typescale.emphasized.body-small.size","fontTrackingTokenName":"md.sys.typescale.emphasized.body-small.tracking","lineHeightTokenName":"md.sys.typescale.emphasized.body-small.line-height"}}` → `{"type":{"fontNameTokenName":"md.sys.typescale.emphasized.body-small.font","fontWeightTokenName":"md.sys.typescale.emphasized.body-small.weight","fontSizeTokenName":"md.sys.typescale.emphasized.body-small.size","fontTrackingTokenName":"md.sys.typescale.emphasized.body-small.tracking","lineHeightTokenName":"md.sys.typescale.emphasized.body-small.line-height","variationAxes":{"wdth":{"axisValueTokenName":"md.sys.typescale.emphasized.body-small.wdth"},"wght":{"axisValueTokenName":"md.sys.typescale.emphasized.body-small.wght"},"slnt":{"axisValueTokenName":"md.sys.typescale.emphasized.body-small.slnt"},"opsz":{"axisValueTokenName":"md.sys.typescale.emphasized.body-small.opsz"},"GRAD":{"axisValueTokenName":"md.sys.typescale.emphasized.body-small.grad"},"ROND":{"axisValueTokenName":"md.sys.typescale.emphasized.body-small.rond"},"CRSV":{"axisValueTokenName":"md.sys.typescale.emphasized.body-small.crsv"},"HEXP":{"axisValueTokenName":"md.sys.typescale.emphasized.body-small.hexp"},"FILL":{"axisValueTokenName":"md.sys.typescale.emphasized.body-small.fill"}}}}`
- `md.sys.typescale.emphasized.label-medium`: `{"type":{"fontNameTokenName":"md.sys.typescale.emphasized.label-medium.font","fontWeightTokenName":"md.sys.typescale.emphasized.label-medium.weight","fontSizeTokenName":"md.sys.typescale.emphasized.label-medium.size","fontTrackingTokenName":"md.sys.typescale.emphasized.label-medium.tracking","lineHeightTokenName":"md.sys.typescale.emphasized.label-medium.line-height"}}` → `{"type":{"fontNameTokenName":"md.sys.typescale.emphasized.label-medium.font","fontWeightTokenName":"md.sys.typescale.emphasized.label-medium.weight","fontSizeTokenName":"md.sys.typescale.emphasized.label-medium.size","fontTrackingTokenName":"md.sys.typescale.emphasized.label-medium.tracking","lineHeightTokenName":"md.sys.typescale.emphasized.label-medium.line-height","variationAxes":{"wdth":{"axisValueTokenName":"md.sys.typescale.emphasized.label-medium.wdth"},"wght":{"axisValueTokenName":"md.sys.typescale.emphasized.label-medium.wght"},"slnt":{"axisValueTokenName":"md.sys.typescale.emphasized.label-medium.slnt"},"opsz":{"axisValueTokenName":"md.sys.typescale.emphasized.label-medium.opsz"},"GRAD":{"axisValueTokenName":"md.sys.typescale.emphasized.label-medium.grad"},"ROND":{"axisValueTokenName":"md.sys.typescale.emphasized.label-medium.rond"},"CRSV":{"axisValueTokenName":"md.sys.typescale.emphasized.label-medium.crsv"},"HEXP":{"axisValueTokenName":"md.sys.typescale.emphasized.label-medium.hexp"},"FILL":{"axisValueTokenName":"md.sys.typescale.emphasized.label-medium.fill"}}}}`
- `md.sys.typescale.emphasized.label-small`: `{"type":{"fontNameTokenName":"md.sys.typescale.emphasized.label-small.font","fontWeightTokenName":"md.sys.typescale.emphasized.label-small.weight","fontSizeTokenName":"md.sys.typescale.emphasized.label-small.size","fontTrackingTokenName":"md.sys.typescale.emphasized.label-small.tracking","lineHeightTokenName":"md.sys.typescale.emphasized.label-small.line-height"}}` → `{"type":{"fontNameTokenName":"md.sys.typescale.emphasized.label-small.font","fontWeightTokenName":"md.sys.typescale.emphasized.label-small.weight","fontSizeTokenName":"md.sys.typescale.emphasized.label-small.size","fontTrackingTokenName":"md.sys.typescale.emphasized.label-small.tracking","lineHeightTokenName":"md.sys.typescale.emphasized.label-small.line-height","variationAxes":{"wdth":{"axisValueTokenName":"md.sys.typescale.emphasized.label-small.wdth"},"wght":{"axisValueTokenName":"md.sys.typescale.emphasized.label-small.wght"},"slnt":{"axisValueTokenName":"md.sys.typescale.emphasized.label-small.slnt"},"opsz":{"axisValueTokenName":"md.sys.typescale.emphasized.label-small.opsz"},"GRAD":{"axisValueTokenName":"md.sys.typescale.emphasized.label-small.grad"},"ROND":{"axisValueTokenName":"md.sys.typescale.emphasized.label-small.rond"},"CRSV":{"axisValueTokenName":"md.sys.typescale.emphasized.label-small.crsv"},"HEXP":{"axisValueTokenName":"md.sys.typescale.emphasized.label-small.hexp"},"FILL":{"axisValueTokenName":"md.sys.typescale.emphasized.label-small.fill"}}}}`

### `md.sys.typescale`

- `md.sys.typescale.body-large`: `{"type":{"fontNameTokenName":"md.sys.typescale.body-large.font","fontWeightTokenName":"md.sys.typescale.body-large.weight","fontSizeTokenName":"md.sys.typescale.body-large.size","fontTrackingTokenName":"md.sys.typescale.body-large.tracking","lineHeightTokenName":"md.sys.typescale.body-large.line-height"}}` → `{"type":{"fontNameTokenName":"md.sys.typescale.body-large.font","fontWeightTokenName":"md.sys.typescale.body-large.weight","fontSizeTokenName":"md.sys.typescale.body-large.size","fontTrackingTokenName":"md.sys.typescale.body-large.tracking","lineHeightTokenName":"md.sys.typescale.body-large.line-height","variationAxes":{"wdth":{"axisValueTokenName":"md.sys.typescale.body-large.wdth"},"wght":{"axisValueTokenName":"md.sys.typescale.body-large.wght"},"slnt":{"axisValueTokenName":"md.sys.typescale.body-large.slnt"},"opsz":{"axisValueTokenName":"md.sys.typescale.body-large.opsz"},"GRAD":{"axisValueTokenName":"md.sys.typescale.body-large.grad"},"ROND":{"axisValueTokenName":"md.sys.typescale.body-large.rond"},"CRSV":{"axisValueTokenName":"md.sys.typescale.body-large.crsv"},"HEXP":{"axisValueTokenName":"md.sys.typescale.body-large.hexp"},"FILL":{"axisValueTokenName":"md.sys.typescale.body-large.fill"}}}}`
- `md.sys.typescale.body-medium`: `{"type":{"fontNameTokenName":"md.sys.typescale.body-medium.font","fontWeightTokenName":"md.sys.typescale.body-medium.weight","fontSizeTokenName":"md.sys.typescale.body-medium.size","fontTrackingTokenName":"md.sys.typescale.body-medium.tracking","lineHeightTokenName":"md.sys.typescale.body-medium.line-height"}}` → `{"type":{"fontNameTokenName":"md.sys.typescale.body-medium.font","fontWeightTokenName":"md.sys.typescale.body-medium.weight","fontSizeTokenName":"md.sys.typescale.body-medium.size","fontTrackingTokenName":"md.sys.typescale.body-medium.tracking","lineHeightTokenName":"md.sys.typescale.body-medium.line-height","variationAxes":{"wdth":{"axisValueTokenName":"md.sys.typescale.body-medium.wdth"},"wght":{"axisValueTokenName":"md.sys.typescale.body-medium.wght"},"slnt":{"axisValueTokenName":"md.sys.typescale.body-medium.slnt"},"opsz":{"axisValueTokenName":"md.sys.typescale.body-medium.opsz"},"GRAD":{"axisValueTokenName":"md.sys.typescale.body-medium.grad"},"ROND":{"axisValueTokenName":"md.sys.typescale.body-medium.rond"},"CRSV":{"axisValueTokenName":"md.sys.typescale.body-medium.crsv"},"HEXP":{"axisValueTokenName":"md.sys.typescale.body-medium.hexp"},"FILL":{"axisValueTokenName":"md.sys.typescale.body-medium.fill"}}}}`
- `md.sys.typescale.body-small`: `{"type":{"fontNameTokenName":"md.sys.typescale.body-small.font","fontWeightTokenName":"md.sys.typescale.body-small.weight","fontSizeTokenName":"md.sys.typescale.body-small.size","fontTrackingTokenName":"md.sys.typescale.body-small.tracking","lineHeightTokenName":"md.sys.typescale.body-small.line-height"}}` → `{"type":{"fontNameTokenName":"md.sys.typescale.body-small.font","fontWeightTokenName":"md.sys.typescale.body-small.weight","fontSizeTokenName":"md.sys.typescale.body-small.size","fontTrackingTokenName":"md.sys.typescale.body-small.tracking","lineHeightTokenName":"md.sys.typescale.body-small.line-height","variationAxes":{"wdth":{"axisValueTokenName":"md.sys.typescale.body-small.wdth"},"wght":{"axisValueTokenName":"md.sys.typescale.body-small.wght"},"slnt":{"axisValueTokenName":"md.sys.typescale.body-small.slnt"},"opsz":{"axisValueTokenName":"md.sys.typescale.body-small.opsz"},"GRAD":{"axisValueTokenName":"md.sys.typescale.body-small.grad"},"ROND":{"axisValueTokenName":"md.sys.typescale.body-small.rond"},"CRSV":{"axisValueTokenName":"md.sys.typescale.body-small.crsv"},"HEXP":{"axisValueTokenName":"md.sys.typescale.body-small.hexp"},"FILL":{"axisValueTokenName":"md.sys.typescale.body-small.fill"}}}}`
- `md.sys.typescale.label-medium`: `{"type":{"fontNameTokenName":"md.sys.typescale.label-medium.font","fontWeightTokenName":"md.sys.typescale.label-medium.weight","fontSizeTokenName":"md.sys.typescale.label-medium.size","fontTrackingTokenName":"md.sys.typescale.label-medium.tracking","lineHeightTokenName":"md.sys.typescale.label-medium.line-height"}}` → `{"type":{"fontNameTokenName":"md.sys.typescale.label-medium.font","fontWeightTokenName":"md.sys.typescale.label-medium.weight","fontSizeTokenName":"md.sys.typescale.label-medium.size","fontTrackingTokenName":"md.sys.typescale.label-medium.tracking","lineHeightTokenName":"md.sys.typescale.label-medium.line-height","variationAxes":{"wdth":{"axisValueTokenName":"md.sys.typescale.label-medium.wdth"},"wght":{"axisValueTokenName":"md.sys.typescale.label-medium.wght"},"slnt":{"axisValueTokenName":"md.sys.typescale.label-medium.slnt"},"opsz":{"axisValueTokenName":"md.sys.typescale.label-medium.opsz"},"GRAD":{"axisValueTokenName":"md.sys.typescale.label-medium.grad"},"ROND":{"axisValueTokenName":"md.sys.typescale.label-medium.rond"},"CRSV":{"axisValueTokenName":"md.sys.typescale.label-medium.crsv"},"HEXP":{"axisValueTokenName":"md.sys.typescale.label-medium.hexp"},"FILL":{"axisValueTokenName":"md.sys.typescale.label-medium.fill"}}}}`
- `md.sys.typescale.label-small`: `{"type":{"fontNameTokenName":"md.sys.typescale.label-small.font","fontWeightTokenName":"md.sys.typescale.label-small.weight","fontSizeTokenName":"md.sys.typescale.label-small.size","fontTrackingTokenName":"md.sys.typescale.label-small.tracking","lineHeightTokenName":"md.sys.typescale.label-small.line-height"}}` → `{"type":{"fontNameTokenName":"md.sys.typescale.label-small.font","fontWeightTokenName":"md.sys.typescale.label-small.weight","fontSizeTokenName":"md.sys.typescale.label-small.size","fontTrackingTokenName":"md.sys.typescale.label-small.tracking","lineHeightTokenName":"md.sys.typescale.label-small.line-height","variationAxes":{"wdth":{"axisValueTokenName":"md.sys.typescale.label-small.wdth"},"wght":{"axisValueTokenName":"md.sys.typescale.label-small.wght"},"slnt":{"axisValueTokenName":"md.sys.typescale.label-small.slnt"},"opsz":{"axisValueTokenName":"md.sys.typescale.label-small.opsz"},"GRAD":{"axisValueTokenName":"md.sys.typescale.label-small.grad"},"ROND":{"axisValueTokenName":"md.sys.typescale.label-small.rond"},"CRSV":{"axisValueTokenName":"md.sys.typescale.label-small.crsv"},"HEXP":{"axisValueTokenName":"md.sys.typescale.label-small.hexp"},"FILL":{"axisValueTokenName":"md.sys.typescale.label-small.fill"}}}}`

### `md.comp.button`

- `md.comp.button.trailing-space`: `{"length":{"value":24,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space300"}`
- `md.comp.button.icon-label-space`: `{"length":{"value":8,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space100"}`
- `md.comp.button.leading-space`: `{"length":{"value":24,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space300"}`

### `md.comp.button.xsmall`

- `md.comp.button.xsmall.icon-label-space`: `{"length":{"value":8,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space50"}`

### `md.comp.button.small`

- `md.comp.button.small.leading-space`: `{"length":{"value":16,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space200"}`
- `md.comp.button.small.icon-label-space`: `{"length":{"value":8,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space100"}`
- `md.comp.button.small.trailing-space`: `{"length":{"value":16,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space200"}`

### `md.comp.button.medium`

- `md.comp.button.medium.leading-space`: `{"length":{"value":24,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space300"}`
- `md.comp.button.medium.icon-label-space`: `{"length":{"value":8,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space100"}`
- `md.comp.button.medium.trailing-space`: `{"length":{"value":24,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space300"}`

### `md.comp.button.large`

- `md.comp.button.large.leading-space`: `{"length":{"value":48,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space600"}`
- `md.comp.button.large.icon-label-space`: `{"length":{"value":12,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space150"}`
- `md.comp.button.large.trailing-space`: `{"length":{"value":48,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space600"}`

### `md.comp.button.xlarge`

- `md.comp.button.xlarge.leading-space`: `{"length":{"value":64,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space800"}`
- `md.comp.button.xlarge.icon-label-space`: `{"length":{"value":16,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space200"}`
- `md.comp.button.xlarge.trailing-space`: `{"length":{"value":64,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space800"}`

### `md.comp.extended-fab.medium`

- `md.comp.extended-fab.medium.icon-label-space`: `{"length":{"value":12,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space150"}`

### `md.comp.extended-fab.large`

- `md.comp.extended-fab.large.icon-label-space`: `{"length":{"value":16,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space200"}`

### `md.comp.extended-fab`

- `md.comp.extended-fab.leading-space`: `{"length":{"value":16,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space200"}`
- `md.comp.extended-fab.icon-label-space`: `{"length":{"value":12,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space150"}`
- `md.comp.extended-fab.trailing-space`: `{"length":{"value":20,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space250"}`

### `md.comp.extended-fab.small`

- `md.comp.extended-fab.small.leading-space`: `{"length":{"value":16,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space200"}`
- `md.comp.extended-fab.small.icon-label-space`: `{"length":{"value":8,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space100"}`
- `md.comp.extended-fab.small.trailing-space`: `{"length":{"value":16,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space200"}`

### `md.comp.icon-button`

- `md.comp.icon-button.default.trailing-space`: `{"length":{"value":8,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space100"}`
- `md.comp.icon-button.default.leading-space`: `{"length":{"value":8,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space100"}`
- `md.comp.icon-button.narrow.leading-space`: `{"length":{"value":4,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space50"}`
- `md.comp.icon-button.narrow.trailing-space`: `{"length":{"value":4,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space50"}`
- `md.comp.icon-button.wide.leading-space`: `{"length":{"value":14,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space175"}`
- `md.comp.icon-button.wide.trailing-space`: `{"length":{"value":14,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space175"}`

### `md.comp.icon-button.xsmall`

- `md.comp.icon-button.xsmall.default.leading-space`: `{"length":{"value":6,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space75"}`
- `md.comp.icon-button.xsmall.default.trailing-space`: `{"length":{"value":6,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space75"}`
- `md.comp.icon-button.xsmall.wide.trailing-space`: `{"length":{"value":10,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space125"}`
- `md.comp.icon-button.xsmall.wide.leading-space`: `{"length":{"value":10,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space125"}`
- `md.comp.icon-button.xsmall.narrow.trailing-space`: `{"length":{"value":4,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space50"}`
- `md.comp.icon-button.xsmall.narrow.leading-space`: `{"length":{"value":4,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space50"}`

### `md.comp.icon-button.small`

- `md.comp.icon-button.small.default.trailing-space`: `{"length":{"value":8,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space100"}`
- `md.comp.icon-button.small.default.leading-space`: `{"length":{"value":8,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space100"}`
- `md.comp.icon-button.small.narrow.leading-space`: `{"length":{"value":4,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space50"}`
- `md.comp.icon-button.small.narrow.trailing-space`: `{"length":{"value":4,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space50"}`
- `md.comp.icon-button.small.wide.leading-space`: `{"length":{"value":14,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space175"}`
- `md.comp.icon-button.small.wide.trailing-space`: `{"length":{"value":14,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space175"}`

### `md.comp.icon-button.medium`

- `md.comp.icon-button.medium.default.trailing-space`: `{"length":{"value":16,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space200"}`
- `md.comp.icon-button.medium.default.leading-space`: `{"length":{"value":16,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space200"}`
- `md.comp.icon-button.medium.narrow.trailing-space`: `{"length":{"value":12,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space150"}`
- `md.comp.icon-button.medium.narrow.leading-space`: `{"length":{"value":12,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space150"}`
- `md.comp.icon-button.medium.wide.leading-space`: `{"length":{"value":24,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space300"}`
- `md.comp.icon-button.medium.wide.trailing-space`: `{"length":{"value":24,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space300"}`

### `md.comp.icon-button.large`

- `md.comp.icon-button.large.default.trailing-space`: `{"length":{"value":32,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space400"}`
- `md.comp.icon-button.large.default.leading-space`: `{"length":{"value":32,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space400"}`
- `md.comp.icon-button.large.narrow.leading-space`: `{"length":{"value":16,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space200"}`
- `md.comp.icon-button.large.narrow.trailing-space`: `{"length":{"value":16,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space200"}`
- `md.comp.icon-button.large.wide.leading-space`: `{"length":{"value":48,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space600"}`
- `md.comp.icon-button.large.wide.trailing-space`: `{"length":{"value":48,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space600"}`

### `md.comp.icon-button.xlarge`

- `md.comp.icon-button.xlarge.default.trailing-space`: `{"length":{"value":48,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space600"}`
- `md.comp.icon-button.xlarge.default.leading-space`: `{"length":{"value":48,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space600"}`
- `md.comp.icon-button.xlarge.narrow.leading-space`: `{"length":{"value":32,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space400"}`
- `md.comp.icon-button.xlarge.narrow.trailing-space`: `{"length":{"value":32,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space400"}`
- `md.comp.icon-button.xlarge.wide.leading-space`: `{"length":{"value":72,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space900"}`
- `md.comp.icon-button.xlarge.wide.trailing-space`: `{"length":{"value":72,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space900"}`

### `md.comp.button-group.standard.xlarge`

- `md.comp.button-group.standard.xlarge.between-space`: `{"length":{"value":8,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space100"}`

### `md.comp.button-group.standard.large`

- `md.comp.button-group.standard.large.between-space`: `{"length":{"value":8,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space100"}`

### `md.comp.button-group.standard.medium`

- `md.comp.button-group.standard.medium.between-space`: `{"length":{"value":8,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space100"}`

### `md.comp.button-group.standard.small`

- `md.comp.button-group.standard.small.between-space`: `{"length":{"value":12,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space150"}`

### `md.comp.button-group.connected.xlarge`

- `md.comp.button-group.connected.xlarge.between-space`: `{"length":{"value":2,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space25"}`

### `md.comp.button-group.connected.large`

- `md.comp.button-group.connected.large.between-space`: `{"length":{"value":2,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space25"}`

### `md.comp.button-group.connected.medium`

- `md.comp.button-group.connected.medium.between-space`: `{"length":{"value":2,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space25"}`

### `md.comp.button-group.connected.small`

- `md.comp.button-group.connected.small.between-space`: `{"length":{"value":2,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space25"}`

### `md.comp.button-group.connected.xsmall`

- `md.comp.button-group.connected.xsmall.between-space`: `{"length":{"value":2,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space25"}`

### `md.comp.split-button.xsmall`

- `md.comp.split-button.xsmall.leading-button.leading-space`: `{"length":{"value":12,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space150"}`
- `md.comp.split-button.xsmall.leading-button.trailing-space`: `{"length":{"value":10,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space125"}`
- `md.comp.split-button.xsmall.between-space`: `{"length":{"value":2,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space25"}`

### `md.comp.split-button.small`

- `md.comp.split-button.small.between-space`: `{"length":{"value":2,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space25"}`
- `md.comp.split-button.small.leading-button.leading-space`: `{"length":{"value":16,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space200"}`
- `md.comp.split-button.small.leading-button.trailing-space`: `{"length":{"value":12,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space150"}`

### `md.comp.split-button.medium`

- `md.comp.split-button.medium.between-space`: `{"length":{"value":2,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space25"}`
- `md.comp.split-button.medium.leading-button.leading-space`: `{"length":{"value":24,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space300"}`
- `md.comp.split-button.medium.leading-button.trailing-space`: `{"length":{"value":24,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space300"}`

### `md.comp.split-button.large`

- `md.comp.split-button.large.between-space`: `{"length":{"value":2,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space25"}`
- `md.comp.split-button.large.leading-button.leading-space`: `{"length":{"value":48,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space600"}`
- `md.comp.split-button.large.leading-button.trailing-space`: `{"length":{"value":48,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space600"}`

### `md.comp.split-button.xlarge`

- `md.comp.split-button.xlarge.between-space`: `{"length":{"value":2,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space25"}`
- `md.comp.split-button.xlarge.leading-button.leading-space`: `{"length":{"value":64,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space800"}`
- `md.comp.split-button.xlarge.leading-button.trailing-space`: `{"length":{"value":64,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space800"}`

### `md.comp.list`

- `md.comp.list.segmented.gap`: `{"length":{"value":2,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space25"}`
- `md.comp.list.divider.bottom-space`: `{"length":{"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space0"}`
- `md.comp.list.divider.top-space`: `{"length":{"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space0"}`
- `md.comp.list.list-item.between-space`: `{"length":{"value":12,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space150"}`
- `md.comp.list.divider.trailing-space`: `{"length":{"value":16,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space200"}`
- `md.comp.list.divider.leading-space`: `{"length":{"value":16,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space200"}`
- `md.comp.list.list-item.bottom-space`: `{"length":{"value":10,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space125"}`
- `md.comp.list.list-item.top-space`: `{"length":{"value":10,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space125"}`
- `md.comp.list.list-item.trailing-space`: `{"length":{"value":16,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space200"}`
- `md.comp.list.list-item.leading-space`: `{"length":{"value":16,"unit":"DIPS"}}` → `{"tokenName":"md.sys.measurement.space200"}`

## material-x generated CSS

The 34 tracked `src/**/*.css.ts` compiled with `aube exec just debug`, before (origin/main 645410c12) and after: 33 identical, one changed.

### Button, `src/button/styles/size/main.css.ts`

`md.comp.button.xsmall.icon-label-space` changed from `8dp` to `md.sys.measurement.space50` (4px). Before, it equalled the default `--_icon-label-space: 8px`, so the size sheet did not repeat it. xsmall buttons with an icon now space the icon and the label 4px apart.

```diff
 :host(:state(xsmall)) {
   --_container-height: 32px;
   --_leading-space: 12px;
+  --_icon-label-space: 4px;
   --_trailing-space: 12px;
 }
```