#### DRD-11 — Pull at admission and activation

**Status:** active. `DRD-18` applies the activation pull to commands. Under `DRD-30`, `activate` declines with `null`

**`sortable` pulls `items()` at each admission and each activation. `activate` may return `false` to decline quietly.**

The activation pull closes the window between the press and the threshold without a pending flag, since a step before activation now receives `null`. A removed item isn't a fault, so the operation ends with no report. The press cost remains, and `drag:DRO-1` asks the owner to review it with a clean measurement.