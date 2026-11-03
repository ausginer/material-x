# D-208 step 5 — the comment pass

> **In progress 2026-11-03.** This record grows with step 5's series. Acceptance belongs to the independent step-5 feature review.

**Canonical entry: `drag2:D-208`**, step 5 as [`request-application-claude.md`](../reviews/architecture/request-application-claude.md) §19.5 states it. This record holds step 5's results and verification. It is **not** the decision's measurement record. `d208-requests.md` is written at step 6, and its absence is still the witness.

**Input.** `4987d33dd` on `drag2/fin-review2`. Its `src/` equals `dbbb62199`'s, which is step 4 as accepted.

## Corrections

All three are record-only and land as step 5's first commit (§19.4, step4-B).

- **step4-B, step3-B's record half.** `d207-step3.md` §Guard-site census, the lifecycle-request row, gets a dated correction:
  - the `dispatch` lifecycle read is moved from the armed controller's intake to the façade's. At `ef1e4ef6b` it is `Kernel.dispatch`, which reads `this.#bracket.closed`;
  - `#onPointerDown` is added under _the runner_. It reads `this.#bracket.idle` before an ingress pass.

  The row's other sites are unchanged. step3-B's instrument half was repaired in step 4 (`d208-step4.md` §R21 and step3-B).

- **`d208-step4.md` §Verification**, the lint bullet, gets a dated correction. The baseline had fifteen eslint errors in the changed files, not fourteen. The fifteenth was `prefer-includes` in `g3-conformance.browser`; step 4's rewritten assertion there calls `.includes`. The count is the feature proof's.
- **`d208-step4.md` §Published-surface change**, the `InsertionRuntimeView` row, gets a dated correction. `sortable/runtime.d.ts` is not emitted, and the type is declared in `sortable/slots.d.ts`. The built tree has no `sortable/runtime.d.ts`.