#### RD-4 — A project's global setup hands a foreseeable failure to that project's files

**Decided 2026-11-05** ([`request-application-claude.md`](../../packages/drag2/.plan/reviews/architecture/request-application-claude.md) §35.6). **Implemented at `c95212956` and verified at `c15042847`** (§36.1). `drag2`'s `build-package.node.ts` is the one setup that does this, and `DRAG2_NODE_BUILD` hands a config it and `require-build.node.ts` as one value.

**A global setup does not throw for a failure it can foresee, such as a build failing. It provides the failure to its project, and a setup file in that project raises it.** That project's files go red with the failure's own message, and every other project's results stand. **A browser project that imports the same broken source fails on its own import.** That is its own result and not this mechanism: in a whole root run with a broken `src/drag.ts`, 7 of `drag2`'s browser files went red beside its 26 node files, and all 85 files of the other six packages matched a clean run.

**Why.** Vitest awaits global setups outside the `try` around the pool, for every project in series, so a throw ends the run for all of them. At 5.0.5 it also reports _No test files found_ and loses its own message to a `TypeError`. `just test` exists to report the repository in one process. TE-D15's refusals end a run because the process's contract is broken, and one package's syntax error does not break it.

**The whole project goes red rather than the files known to read the output,** so that no later reader can forget to check.

**The limit is accepted.** A throw the setup cannot foresee, such as its own import failing, still ends the run with exit 1. A setup cannot catch that, and failing closed is enough.