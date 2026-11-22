# @ydinjs/signals

A prototype of signals with declared inputs, for the owner's evaluation. It isn't released and its API isn't settled. The design is [`.plan/signals-design-1/signals-design-draft.md`](../../.plan/signals-design-1/signals-design-draft.md), and the prototype's report is beside it.

```sh
aube exec just build            # the package root holds the build
aube exec just test             # the properties, in Chromium
aube exec just size             # the size rows
node bench/speed.ts             # the speed comparison with Preact and alien-signals
```