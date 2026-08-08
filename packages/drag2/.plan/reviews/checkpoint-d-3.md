# Checkpoint D third review — not ready to close

I reviewed the C2-01 architect decision, its implementation record, the current source and regression tests, the parity ledger, the normative 00–05 contract, and the full Checkpoint D verification evidence.

The second-review work closes most of C2-02 through C2-05 and materially improves C2-01: admission now stops between `handle()` and `visual()`, candidate resolver traversal stops at the destroying candidate, and an interrupted cache rebuild remains retired. One required continuation still crosses the terminal barrier, however, and the normative-document sweep remains incomplete. Checkpoint D cannot close yet.

## Verdict

| Second-review item | Third-review result |
| --- | --- |
| C2-01 — terminal-aware resolver sequences | **Keep open.** Resolver calls stop, but both axes still read placeholder geometry after the destroying resolver returns (C3-01). |
| C2-02 — landing thunk contract | **Substantively closed.** The implementation, contract 03, README timing explanation and ledger now agree; small validation-comment errors remain in C3-04. |
| C2-03 — D5 loss accounting | **Closed.** The two real migration losses are stated and absence from `sortable.js` is executable evidence. One coverage sentence overstates what that fixture proves (C3-04). |
| C2-04 — normative `vertical()` residue | **Keep open.** Several current statements in normatively ranked contracts 00 and 02 were missed (C3-02). |
| C2-05 — evidence residues | **Mostly closed.** The public callback listing, entrypoint count, live size table, axis headers and test attribution are fixed; one M-3 claim is still factually wrong (C3-04). |
| L-11 | Owner-deferred to Phase 23, with work assigned there; not reopened by this pass. |
| Checkpoint D | **Keep open.** |

## C3-01 — major: an aborted candidate rebuild still reads placeholder geometry after `destroy()`

`RectIndex.refresh()` now calls no later `visual()` resolver and restores its retired state when `live()` becomes false (`src/sortable/rect-index.ts:115-140`). It still returns `void`. Both axis resolvers therefore continue immediately after the aborted rebuild and read the placeholder:

- `y()` calls `centreOf(placeholder)` after `refresh()` (`src/sortable/y.ts:101-105`), which calls `placeholder.getBoundingClientRect()`;
- `xy()` calls `placeholder.getBoundingClientRect()` after `refresh()` (`src/sortable/xy.ts:92-98`).

This contradicts the accepted C2-01 behavior: after the first closed reading, “call no further resolver **and read no further geometry**” (`checkpoint-d-2-resolution-c2-01.md:104-111`). On the real path, the resolver has already called `controller.destroy()`, teardown has returned, and the local placeholder reference has been removed and retired; the geometry read happens afterwards. A consumer-owned placeholder can override `getBoundingClientRect()`, making the read an observable post-destroy callback rather than merely wasted layout work.

I reproduced the gap with a temporary direct `y()` regression, then removed it. The second candidate flipped `live` to false and the placeholder's `getBoundingClientRect` recorded calls. Expected reads after the close: `0`; received: `1`. The permanent tests claim “no geometry is read after it” but assert only the resolver list (`tests/sortable/y.browser.test.ts:333-348`; `tests/sortable/xy.browser.test.ts:540-554`), so they pass without testing that half of the acceptance condition.

Have `refresh()` communicate completion/abortion, or recheck `runtime.live()` in each axis before measuring the incumbent placeholder, and return `null` on an aborted rebuild. Add mirrored `y()` and `xy()` regressions that instrument placeholder geometry, not only candidate resolver calls. Until then I-6 and I-36 are observably false and C2-01 is not closed.

## C3-02 — moderate: C2-04's normative terminology sweep is still incomplete

The implementation record says every current statement in contracts 00–04 was advanced to `y()`/`xy()`. Current, present-tense declarations remain:

- contract 00's D-34 decision says “Vertical sortable declares `HTMLElement`” (`contract/00-index.md:158`);
- contract 02 describes rollback as unused by “vertical sortable” (`contract/02-kernel-behavior-contract.md:59-61`), calls tier-C activation vacuous for it (`:229`), and says it declares the activation type (`:237-240`);
- the current seam table is headed “for vertical sortable” (`:335-345`), hit-testing and landing-origin text are scoped the same way (`:590`, `:1181`), and the live action-tag and failure-stage declarations still say “Vertical sortable” (`:1311-1317`, `:1431-1435`);
- contract 03 still instructs M-3 to compare against a hand-written “non-composed vertical sortable” (`contract/03-feature-composition.md:825-832`).

These are not narratives about an earlier draft or probe. They describe the current sortable behavior, which is shared by both axis compositions. Replace that scope with “sortable behavior”, “one-dimensional sortable”, or explicit `y()`/`xy()` wording as appropriate. C2-04's chosen rule — advance current normative statements rather than weaken contract 00's ranking — is sound, but it has not yet been applied completely.

## C3-03 — moderate: the invariant table assigns the terminal guarantee two incompatible tiers

I-6 still states the global property “no callback fires afterwards” as tier B (`contract/05-lifecycle-invariants.md:22`). I-36 then says the behavior-interior portion of that same property is tier C and explicitly not promotable to B (`:52`). Both cannot describe the whole guarantee at once: the kernel enforces its seam-level barriers, while a behavior that drives multiple foreign calls must remember the interior checks by discipline.

The contract already uses combined ratings for this shape — for example I-34 is “B, over a tier-C rendering rule” and I-35 is B for the public composition over tier-C behavior obligations (`:50-51`). Give I-6 the same honest split, or narrow its wording to the kernel-owned portion and make I-36 the behavior-owned complement. This matters now because Phase 18 is instructed to apply I-36 to a second behavior; leaving the umbrella invariant at B tells that author the kernel guarantees something the contract now says it cannot guarantee.

## C3-04 — minor: public/evidence prose still has several factual overclaims

These are cleanup rather than separate runtime blockers, but they should be corrected in the same closure pass:

- README says all four option domains throw on invalid values (`README.md:92-101`), but `landing({ duration: -1, run })` intentionally does not read or validate `duration` because `run` replaces the built-in runner (`src/sortable/landing.ts:58-63`; `tests/sortable/options.node.test.ts:142-147`). Contract 03 already states the exception.
- The shared `requireFinite` comment says it always validates at construction (`src/sortable/feature.ts:115-123`), and the options suite header says all four domains do too (`tests/sortable/options.node.test.ts:1-9`), despite the same suite correctly pinning settle-time thunk validation at `:119-140`.
- Contract 03 says M-3 recorded the complete composition at `+0.81 kB` (`contract/03-feature-composition.md:683`). The checked-in measurement is 10.09 versus 9.33 kB, or `+0.76 kB` (`measurements/m3.md:26-31,43`); its later note is 10.11 versus 9.34, or `+0.77 kB`, not `+0.81` (`:37`).
- The C2-01 architect resolution labels `+30–70 B` / `40–70 B` as measured (`checkpoint-d-2-resolution-c2-01.md:14,176-191,245`), while the landed measurement is `+30–90 B` and `layoutAnimation` is 10.51 kB (`checkpoint-d-2-resolution-implementation.md:44-55`). Mark the earlier table as a prototype forecast or update it to the landed result.
- The new negative type assertions test absence only from `sortable.js` (`tests/consumer.node.test.ts:309-320`), while the ledger says they prevent re-adding a name to **any** frozen entry (`ledger.md:272`). Narrow that claim to the sortable entry or add per-subpath assertions if exact type topology is intended to be executable.

## Verification performed

From `packages/drag2`:

```text
npx just typecheck
  PASS

npx just test
  PASS outside the sandbox (the browser runner requires a local port)
  33 test files passed
  734 tests passed
  18 skipped
  no type errors

npx just size
  PASS
  minimal:                    10.07 kB Brotli, 31 modules
  minimal (xy):              10.12 kB Brotli, 31 modules
  minimal + layoutAnimation: 10.51 kB Brotli, 32 modules
  minimal + landing:         10.36 kB Brotli, 32 modules
  complete:                  10.85 kB Brotli, 35 modules

npx vitest --run tests/sortable/y.browser.test.ts
  Temporary post-destroy geometry regression: FAIL as expected
  Expected placeholder geometry reads: 0; received: 1
  Temporary test removed after reproduction
```

No production or test source remains changed by this review.
