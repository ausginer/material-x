#### RD-3 — Every project the shared factory declares sets `extends: false`

**Decided 2026-11-05** ([`request-application-claude.md`](../../packages/drag2/.plan/reviews/architecture/request-application-claude.md) §35.4). **Implemented at `45ccefa4b`, in `assignGroupOrder`, the funnel every config passes through, and verified at `c15042847`** (§36.1).

**Since Vitest 5 an inline project extends the config file that declares it by default.** Each project then re-evaluates that file, and so `.scripts/vitest-one-shot.ts`. In a root run, whose top level carries the plugin, each project gains a reporter of a new class, and TE-D15's `instanceof` guard misses. The result is 17 reporters and 17 concurrent closes of one provider per boundary, which raises the reporter error RF-26 records.

**The factory gives each project its whole configuration,** so a project has nothing to inherit. This restores what these projects do at Vitest 4, and it keeps TE-D15's _installation is idempotent_ and TE-D12's single release true without a second mechanism.

**Refused:** guarding by class name or a global brand, and remembering closed providers, because both leave the re-evaluation and the inheritance in place. Catching the rejection in `release` is refused by TE-D12: a provider that really fails to close stays loud.

**A Vitest upgrade re-reads this.** No row watches it. The reading is `MX_TEST_TEARDOWN_LOG=1` on a root run: one line per browser project at its boundary.

**What _stays loud_ means** (§36.4). A provider rejecting its close at a group boundary gives exit 1 under every reporter read. It prints under Vitest's base reporter family, which every tracked route uses. **A run with no base-family reporter is an accepted limit:** it can give the exit status with no printed explanation, and `json` can read `success: true` beside exit 1. This is Vitest's handling of unhandled errors, which the repository does not repair for one of them. So a tracked route keeps a base-family reporter and reads the exit status (`test-architecture.md` §Run lifecycle).

**Not forced:** a close failure in the final group, which Vitest's pool closes rather than `release`. It is read at 5.0.5 and no more.