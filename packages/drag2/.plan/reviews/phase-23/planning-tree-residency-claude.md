# The planning tree's residency, against the four-kind rule

**Decided 2026-08-26** on `drag2/fin-review`, on an owner review asking whether the planning tree's physical layout matches the roles D-135's model assigns. Two questions were put: whether `contract/00-index.md` belongs among the contract documents, and whether `packages/drag2/docs/` should exist.

**They have different answers, and the difference is the useful part of this record.** One namespace was wrong and moved. The other boundary is real, does not run between files, and a move would have advertised a separation that the contents do not have.

## 0. Verdict

- **`docs/` is gone.** Its five executable fixtures are now `tests/probes/` and `tests/revision/`, and `tsconfig.json` no longer names a `docs` root. No new namespace was created; one was removed.
- **`contract/00-index.md` does not move.** Instead the directory gains a `README.md` stating the register map and the one fact a reader needs before opening 01–07: they are revised in place and carry their amendment history inline, so the term in force is the unstruck text.

## 1. `.plan/` cannot hold executable evidence, and that is measured

The obvious placement — fixtures beside the write-ups they pair with, in `.plan/probes/` — is not available. **TypeScript will not glob into a dot-directory, even when the pattern names it explicitly:**

| `include` pattern     | Files resolved |
| --------------------- | -------------- |
| `./docs/**/*`         | 5              |
| `./.plan/**/*`        | **0**          |
| `./.plan/probes/*.ts` | **0**          |

So `.plan/probes/13a-discrete-input.ts` would have compiled nowhere while `npx just typecheck` stayed green — the probes' whole evidentiary value is that a green build asserts every negative claim still fails to compile, and the move would have removed the assertion without removing the file. That is D-115's fail-open shape, and it would have been invisible.

**`.plan/` is therefore a Markdown-only namespace by tooling, not by convention.** Worth stating, because it is the constraint that decides where any future executable artefact of the record can live.

## 2. Why `tests/`, and not a new top-level directory

A probe fixture's job is to fail when a stated property stops holding. That is what everything in `tests/` is for; the runner differing — `tsc` rather than Vitest — is not a second namespace's worth of difference. Three properties fell out rather than being designed for:

- **Nothing in the toolchain needed teaching.** `tsconfig.json` already included `./tests/**/*`, and the Vitest projects collect `tests/**/*.{node,browser,declaration}.test.ts`, which no fixture matches. The only config change was deleting the now-dangling `./docs/**/*`.
- **The path rewrite is a prefix substitution.** `docs/probes` → `tests/probes` and `docs/revision` → `tests/revision`, across 27 files, with every relative depth unchanged. Mechanical, and verified rather than trusted.
- **`tests/` is already a scope root of `references.node.test.ts`.** `docs/` never was.

## 3. What the move immediately found

Bringing five files into the reference instrument's scope surfaced **three citations that had never been checked**, all of them in fixtures that have compiled green for phases:

- `13a` cited `02 §\`ActionTransition\`` with the prose running on undelimited — a real heading, an unresolvable citation.
- `13b` cited `contract 05 §two independent gates`, a section D-41 retired. The claim is sound as history and was reworded to say so rather than to point at a section that no longer exists.
- `revision-2.ts` cited a bare `§L-14`, which is a `ledger.md` id and not a contract one.

All three are repaired. **This is the argument for the move restated as evidence** — a directory the type-checker sees and the reference instrument does not is a place where prose decays with nothing failing (F-108).

## 4. `contract/00-index.md` stays, and the premise it was challenged on is false

The proposition was that `00-index.md` is the chronological record while 01–07 are the effective contract and must stay current. **The second half does not hold as measured:**

| Document set  | Strikethrough | Dates  | Ids       |
| ------------- | ------------- | ------ | --------- |
| `00-index.md` | 66            | 163    | 1,566     |
| `01`–`07`     | **243**       | **55** | **2,232** |

01–07 are not a clean effective contract. They are revised-in-place normative documents in which a superseded term is struck where it stands and the replacement follows. **A directory boundary asserting `contract/` = effective, current would be a claim its contents contradict**, and a reader who trusts a directory name is worse off than one who knows the file is mixed. The boundary the owner wants is real, and it runs inside every one of these documents sentence by sentence; separating it there is a rewrite, not a move.

Two further reasons, each independently sufficient.

**The instrument already implements the separation, by shape rather than by container, and says why that is sound.** `references.node.test.ts` skips decision-ledger rows by matching the row, not the file, explicitly so that `00-index.md`'s findings, verdict and index prose stay in scope. It rests that on D-116 (a): a live clause is never stated inside a dated row, because the standing conditions were extracted to `.plan/obligations.md` in the present tense. **That is this package's established remedy for a register-mixed document — extract the live clauses into a present-tense register, and leave the dated ones where they are.** It was applied deliberately once already.

**The address space forbids the split.** Contract citations are `NN §…` with `NN` from `00` to `07`, and 25 live citations address `00 §…` — including `00 §D-117`, `00 §F-59` and `00 §F-60`, which reach _into_ the ledger and the findings register. The registers are inside the contract citation namespace by design. Moving them out requires a new citation form and a resolver change, which is an instrument redesign rather than a filesystem move, against 120 references spread across 45 files, most of them dated reviews.

## 5. What was done instead

[`contract/README.md`](../../contract/README.md) — present tense, no history of its own — states the register map per file and per section, the rule that **the term in force is the unstruck text**, how contract citations and ids are addressed, and what deliberately lives elsewhere. It restates no rule: the precedence and freeze rule is cited, not copied.

A directory README is the filesystem's own mechanism for saying what a directory is. It makes the boundary legible where a reader enters, which is what was actually asked for, without asserting a separation that would not survive a reading of 01–07.

## 6. What a real separation would cost, if it is ever wanted

Distilling an effective contract out of 01–07 means deciding, for each of 243 struck passages, whether the surviving text still states the term completely — because a strike often carries the correction in its replacement sentence and sometimes only in the ledger row that made it. It is D-135's safety property at contract scale, and it is a rewrite with the same risk profile: the failure mode is a normative clause silently lost, and no instrument can see it. **Not booked.** It should be commissioned deliberately, if at all, and never as tidying.

## 7. Findings

**F-108.** `docs/` was compiled by `tsc` and invisible to `references.node.test.ts`, whose scope roots are a hand-maintained enumeration — so a directory is out of that instrument's scope **by default**, and its prose decays with nothing failing. Three dangling citations had accumulated in five files. The general form is D-115's fail-open shape one level up: the roots list asserts that the listed roots exist, and asserts nothing about what is missing from it.

**F-109.** `references.node.test.ts` states that a deliberately absent reference is marked with strike-through, _"the convention this record already uses for a retired symbol, extended to paths and sections"_. The resolver implements it for paths only; a struck `NN §…` citation is reported as dangling. Found by writing one. The prose outran the mechanism — F-81's class inside an instrument, and the second instance after F-106.

## 8. Ratified unchanged

- **The `NN §…` citation vocabulary**, including `00` as an addressable document. It is the reason the registers stay where they are.
- **`.plan/probes/` keeps the write-ups.** Splitting a probe's prose from its fixture is not a defect; the pairing is a documented cross-reference and the instrument checks it.
- **`challenge-response.md` stays in `contract/`.** It is dated, and it is the provenance of the accepted contract rather than a separate round.
- **No other package was touched.** `packages/drag/docs/contract-probe-2/` has the same shape and is out of this package's scope.