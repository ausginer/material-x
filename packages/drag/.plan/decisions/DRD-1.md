#### DRD-1 — Single-pass control

**Status:** active. `DRD-32`: the reader also applies destruction requested while idle

**One `Session` record, with idle as its absence. `#running` refuses a nested pass, and one reader applies requests between steps, with precedence destroy, deferred steps, decision, next step.**

Foreign code runs synchronously inside DOM writes, and the independent model's commit order failed there (architecture plan §3). The prototype held this through the public API in three engines, in 10 scenarios. One decision slot replaces three because the first of cancel, fault and verdict always wins. FIFO between kinds of request is rejected. The two booleans `concluded` and `released` are accepted: nothing reads them as a phase, and the implementer may remove them.