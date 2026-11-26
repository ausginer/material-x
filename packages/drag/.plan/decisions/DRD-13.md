#### DRD-13 — Completion means correctness, before/after performance and integration

**Status:** active, its performance rules amended by `DRD-22`. `DRD-40` applies them to optimization against a baseline commit. **Its second sentence, on keeping drag2 as reference evidence and the "before" arm, is superseded on 2026-11-15 by `DRD-64`**

**The handoff's checks are the acceptance. drag2 stays in the tree as reference evidence and is the "before" arm. The deferred integration cleanup is part of completion, and retiring baseline B comes before the new package exports anything. The `prototype/` directory is deleted at completion.**

Earlier cost figures are from other sessions, and two runs of one script differed by about 240 µs on one row, so they can't state a result. Only a same-session comparison with a noise control can. Retirement comes first because a built `@ydinjs/drag` would be measured silently under baseline B's name. Keeping drag2 means the "if drag2 is removed first" exit in `deferred-integration.md` no longer applies.