#### DRD-16 — Requests through a `Drag` are scoped to its operation

**Status:** active, implemented at `b91db2818`. Under `DRD-35` the list holds steps with their receivers, untagged by operation

**`drag.requestStep` and `drag.requestCancel` act only while their operation is the controller's current operation. Afterwards both do nothing. The controller's `requestStep` keeps DRI-8 unchanged. A late `use` disposer receives the operation's outcome, and `null` only when destruction released that operation.**

Decides `drag/production:reviewer-1`. The report's choice 4 let a step requested through a retained `Drag` receive a later operation's `Drag`, in three engines. **No tag is needed:** steps drain before the pass that requested them ends, and a new operation opens only as the first step of a new pass, so a step requested while its operation is current can't run under a later one. **`DRD-6`'s stop condition stands:** the list still holds untagged functions.

**Doing nothing was chosen over passing `null`.** A deferred `null` would need a tag per entry. Cleanup after an operation belongs in `use`, which still runs late.

The disposer rule decides the challenge's unprobed hypothesis that a concluded operation's late disposer receives `null` once its controller is destroyed. `Outcome | null` documents `null` as destruction, so any other `null` is a wrong published value.