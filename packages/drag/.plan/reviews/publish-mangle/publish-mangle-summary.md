# Publish mangle: review round summary

**Reviewed tree:** `436b105c6` on `drag/size`. All three passes verified HEAD and read that commit. Its `src`, `build/`, `tests` and `tsdown.config.ts` are as at `31f92f5a9`. **Brief:** [`publish-mangle-assessment.md`](../../publish-mangle-assessment.md) §9. **Binding sources:** `DRD-56` as corrected by that assessment, and `DRD-55` property 1, in [`00-index.md`](../../00-index.md).

**The passes ran independently and in parallel.** None saw another's prompt or report:

| Pass | Lens | Report |
| --- | --- | --- |
| `reviewer` | Feature proof against `DRD-56` as corrected, with §9's five targets, and V1's test-time checks set apart from what `just build` enforces | [`proof-reviewer.md`](proof-reviewer.md), probes in [`proof-reviewer-probes/`](proof-reviewer-probes/) |
| `integrity` | Coherence outside the change: every path that builds the publication, the shared plugin list, the shared build | [`integration-integrity.md`](integration-integrity.md) |
| `cleanup` | Limited to `build/` and `tests/publication.node.test.ts` | [`discipline-cleanup.md`](discipline-cleanup.md) |

`der` didn't run, as §9 recommends and the request directs. Only `reviewer` received §9's feature-proof targets.

**A commit landed during the round.** `ed759485e` adds `DRD-57`, which extends the selection by 30 declarations and hands off their rename. It changes only `.plan/`, and `DRD-57` says that this round's pin, scope and passes stay as they are. Every finding below is a reading of `436b105c6`. Where `DRD-57` changes a finding's premise or urgency, the finding says so.

## Result

**No tier A finding.** No pass found a consumer-observable runtime change at `436b105c6`. The step is in every path that builds the publication, the shared build holds, and none of the 37 declarations is reachable by a consumer (`reviewer` target 5, null). **Eight tier B findings** concern the publication test and the step as instruments, and the record's statement of what they guarantee. Four of the eight have no instance in today's source. **Six tier C findings** are internal.

**Accepted evidence was not disputed.** No pass challenged the size readings, the engine runs, V5, the dry checks, the rename check or M1 to M7. Two passes confirmed accepted claims by a second route: a fresh build of HEAD is byte-identical to the tree's build, and the generator reproduces the committed map.

**V1 at test time against `just build`, as the request asked.** A plain `just build` guarantees two things only: no non-computed prefixed property name survives unrenamed, and no prefixed shorthand key exists. Both fail the build. V1's string half, V2, V3, V4 and the name set hold only for a tree that a publication-test run read and passed. `package.json` has no `prepack` or `prepublishOnly` script, so a publish neither builds nor validates. The reviewer's table (§What a plain `just build` guarantees) has the details by property, and `DRF-31` is the finding.

## Identifiers

Canonical ids are registered in [`00-index.md`](../../00-index.md) §Findings in the commit that carries this summary. The `DRF-` high-water mark moves from `DRF-23` to **`DRF-37`**. **Witness:** the register's stated mark and its highest `#### DRF-` heading were both `DRF-23` at `ed759485e`, and `git grep` found no `DRF-24` to `DRF-37` anywhere in the tree. That witness proves the `DRF-` series only. The scope has no question series. This round allocates no `DRI-`, `DRD-` or `DRO-` id.

### Local → canonical

| Local | Canonical | Tier | Claim |
| --- | --- | --- | --- |
| `reviewer-1` | `DRF-24` | B | V4 checks the text at the mapped position, not the position that property 6 requires |
| `reviewer-2` | `DRF-25` | B | No standing check covers property 6's kept-token mappings |
| `reviewer-3` | `DRF-26` | B | The step's map counts lines at LF only, and breaks after a raw U+2028 in emitted code |
| `reviewer-4` | `DRF-27` | B | The publication test splits lines at LF only, and fails a correct build after CR, LS or PS in `src` |
| `reviewer-5` | `DRF-28` | B | A kept property written as a string key can share an output name and pass every check |
| `reviewer-6` | `DRF-29` | B | V2 doesn't see prefixed members written as quoted keys or string-literal types in `.d.ts` |
| `reviewer-7` | `DRF-30` | B | `DRD-56`'s rationale says V1 finds computed keys and enumerations, and it doesn't |
| `reviewer-8` | `DRF-31` | B | A plain build or a publish enforces almost none of the validation |
| `integrity-1` | `DRF-32` | C | The `_` marker and the map workflow are stated only in the record |
| `integrity-2` | `DRF-33` | C | Property 6 holds only while `classVarCleanupPlugin` is inert in drag's build |
| `integrity-3` | `DRF-34` | C | Comments in emitted modules name members by their source names |
| `cleanup-1` | `DRF-35` | C | The reserved-word list and the identifier rule are written twice |
| `cleanup-2` | `DRF-36` | C | The test recomputes the prefixed names in `src` with the generator's own reader |
| `cleanup-3` | `DRF-37` | C | The generator's name sequence handles names of any length, and the committed map has only one-character names |

## How the findings were validated

**What I re-ran or read myself:**

- **`DRF-24`:** I re-ran the reviewer's `t2a`, `t2b` and `t2d` copies. In `t2a`, `free-drag/behavior.js` 41:37 maps to `src/free-drag/behavior.ts` 63:2 (`readonly _root`), where the build maps it to 91:45, and all five tests pass. `t2b` passes too, and `t2d` fails V4. `writes` is the regex `^${MODIFIERS}name(?![\w$])` (`tests/publication.node.test.ts:183-187`). On §3: its sentence covers an access mapped onto the declaration's _name_, which the first form accepted. `t2a` is an access mapped onto the declaration's _member start_, which the first form rejected. So the reviewer's refutation stands for that case, and §3's argument holds for the case it names.
- **`DRF-26` and `DRF-27`:** the step starts a line only at `code[i] === '\n'` (`build/rename-properties.ts:71`). The test splits at `'\n'` (`tests/publication.node.test.ts:68`, `:70` and `:161`). The probes' movement counts rest on the reviewer's runs.
- **`DRF-28`:** I rebuilt `synth3` with the real step. The output is `k = 1; "k" = 2; … this.k * 10 + this["k"]`, and `probe()` returns 22. The scratch build without the step returned 12. I didn't re-run the five tests on it.
- **`DRF-29`:** V2 is `Visitor({ Identifier })` (`tests/publication.node.test.ts:244`). I re-ran `v2-quoted`, and all five tests pass.
- **`DRF-30`:** the rationale bullet of `DRD-56` reads "Property 1 forbids those, and validation V1 finds them".
- **`DRF-31`:** `package.json` is `private` and has no `prepack`, `prepublishOnly` or `prepare` script. `DRD-56`'s rationale reads "A separate step after the build could be skipped".
- **`DRF-32`:** outside `.plan/`, only `build/generate-property-names.ts` names the generator.
- **`DRF-33`:** `classVarCleanupPlugin` returns `null` without `magicString` (`.scripts/tsdown-library.ts:7-9`). Assessment §8 prices enabling the option by "its own size reading" only. The 79-position V4 failure rests on the integrity pass's run.
- **`DRF-34`:** `kernel/callbacks.js:11-12` names `_run`. **One correction:** the method is `t(argument)` at line 46, not line 38 as the report says.
- **`DRF-35`:** `RESERVED` is defined at `build/generate-property-names.ts:28` and `tests/publication.node.test.ts:17`.

**What rests on the pass's evidence**, read but not reproduced: `DRF-25`'s 3,737 moved mappings, `DRF-26`'s and `DRF-27`'s synthetic builds, `DRF-32`'s regeneration diff, and `DRF-36`'s and `DRF-37`'s line ranges.

**No finding was rejected.** No finding is incomplete: each states the current behavior, why it is a problem, the evidence and the property that must hold.

**I merged no findings.** These pairs touch, but each is a different remediation unit:

- **`DRF-24` and `DRF-25`** both concern property 6's check. `DRF-24` is about renamed positions, which V4 inspects too loosely. `DRF-25` is about kept tokens, which nothing inspects.
- **`DRF-26` and `DRF-25`:** when no renamed name follows the separator, `DRF-26`'s defect is silent only because of `DRF-25`. That is a dependency, not the same defect.
- **`DRF-26` and `DRF-27`** share a cause: lines are counted at LF only. But one is in the step and produces a wrong published map, and the other is in the test and fails a correct build. Their consequences and their owners differ.
- **`DRF-28` and `DRF-36`:** `DRF-36` finds that the test's walk of `src` adds no independence, because it uses the generator's reader. `DRF-28` shows a blind spot of that shared reader that neither the generator nor V3 sees. Whoever settles `DRF-36` should know that the test's independence from the reader is what `DRF-28` lacks.
- **`DRF-35`:** the integrity pass noted the same duplicated list as an observation and filed no finding. There is nothing to merge.

**The passes don't contradict each other.** Integrity's null result, "no output name equals a property name that stays", was checked over identifiers in today's build. `DRF-28` is a latent form that the build doesn't contain. Integrity's "the step is in every path that builds the publication" and `DRF-31`'s "the validation is in none of them except a test run" are both true.

## Tier notes

The tiers are the passes' own, and I checked each against the vocabulary's consequence rule.

- **`DRF-24` to `DRF-31`, B:** the publication test is the instrument that `DRD-56` property 7 relies on to guard the publication, and the step's map is relied on by property 6. Each finding shows that instrument or the record's account of it to be unsound. `DRF-26` and `DRF-28` would change a published value if they had an instance: a wrong source map, and a changed result (12 to 22). None exists at `436b105c6`, so no consumer observes a difference today. **I keep them at B.** If an instance appears, they rise to A.
- **`DRF-34`, C:** a comment in a published file names a member that doesn't exist in that file. That could be read as the package misleading an integrator (B). Every member it names is internal, and no correct integration reads them, so I keep it at C as the pass filed it.
- **`DRF-37`, C, with a premise that `DRD-57` changes.** Its claim is that the multi-character branch is unreached. `DRD-57` property 4 makes the map 53 keys. `FIRST` has 53 characters, and `x` and `y` are kept property names in the publication (24 occurrences each), so at least two output names will need two characters. **What this establishes:** under `DRD-57` the branch is reached on the map's next regeneration. **What it doesn't establish:** which names get two characters, or the effect on bytes. The finding then reduces to whether the branch is tested before it is first used.

## Routed to the architect

**All fourteen go to the architect.** The passes routed `DRF-32` to `DRF-34` "to the owner". The architect decides whether the owner needs to answer them. Nothing here repairs code, amends `DRD-56` or `DRD-57`, or chooses between a wording change and a new check.

| Canonical | Tier | Why it is the architect's |
| --- | --- | --- |
| `DRF-24` | B | Either V4 enforces property 6's position bound, or property 6, property 7 and §3 state the text bound that V4 enforces. Both change a decision's wording or its witness |
| `DRF-25` | B | Whether property 6 bullets 1 and 3 need a standing check, or were a one-time acceptance |
| `DRF-26` | B | The step's line rule. It is latent, and it interacts with `DRF-25` |
| `DRF-27` | B | The test's line rule. It is latent and fails closed |
| `DRF-28` | B | Property 4 says "no property name that stays", whatever its form. Either the reader, V3 and the generator see string keys, or property 1 forbids unprefixed string keys too |
| `DRF-29` | B | The forms that V2 must reject, under property 1 |
| `DRF-30` | B | Either the rationale states what V1 detects, or V1 detects what the rationale says |
| `DRF-31` | B | Release policy: whether a publishable tree must have passed the publication test, and where that is enforced. `DRD-56` gave the step's placement as the reason it can't be skipped, and the validation has no placement |
| `DRF-32` | C | Where the `_` convention and the map workflow are written down. **Becomes more pressing with `DRD-57`:** its property 4 regenerates the map, and the integrity pass found that regeneration moves existing assignments, so "a person reviews its diff" reviews more than the new names |
| `DRF-33` | C | Whether property 6 is bounded by the plugin's inertness, and where that is stated. It bears on assessment §8's open observation |
| `DRF-34` | C | Property 5 keeps every comment. Whether published comments may name source names is a decision |
| `DRF-35` | C | Whether the second definition is a deliberate independent oracle |
| `DRF-36` | C | Whether the test's walk should be independent of the generator's reader. It interacts with `DRF-28` |
| `DRF-37` | C | Whether the multi-character branch needs a test before `DRD-57`'s regeneration first uses it |

**Observations from the passes that aren't findings**, recorded so that they aren't lost:

- Every emitted `.d.ts` ends with `//# sourceMappingURL=<name>.d.ts.map`, and no `.d.ts.map` is emitted. That predates the unit, and it makes property 5's `.d.ts.map` clause hold of nothing (integrity).
- `just fmt-check` over the whole package fails on 52 files, all under `.plan/` (integrity).
- `build/` imports `rolldown`, `tsdown` and `@jridgewell/gen-mapping`, which only the root declares (integrity).
- A member that `src` writes only as a prefixed constructor parameter property fails closed: the name-set test reports it as extra. Property 1 forbids the form (reviewer, target 1).

## Not covered

- Consumer and engine runs. No pass ran a browser test.
- `der`, by direction.
- The selection added by `DRD-57`. It postdates the pin, and `DRD-57` keeps the round's scope as it was.
- Everything that §9 lists as out of scope.