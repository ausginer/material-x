# Mangle remediation assessment

> **Withdrawn on 2026-11-13 before implementation, by `DRD-59`.** The owner's requirements for the publication withdrew the requirement to keep the JavaScript text and the source map segments, which this record's custom pipeline exists to meet. Don't run it. [`publication-build-proposal.md`](publication-build-proposal.md) §4.2 says what replaces each item, and [`publication-build-handoff.md`](publication-build-handoff.md) is the unit.

**Read:** the [publish mangle review summary](reviews/publish-mangle/publish-mangle-summary.md) and its three pass reports, committed at `6e8174f64`, by the architect on 2026-11-13. The reviewed tree is `436b105c6`. Every pass read that commit, and its `src`, `build/`, `tests` and `tsdown.config.ts` are as at `31f92f5a9`. **Governing records:** `drag:DRD-56` as corrected on 2026-11-13, `DRD-55` property 1, and `DRD-57`, which was decided at `ed759485e` during the round and isn't implemented on `drag/size` at `6e8174f64`. **Handoff:** [`mangle-remediation-handoff.md`](mangle-remediation-handoff.md).

**This record allocates no identifier and doesn't edit the register.** §6 gives the decision text, the in-place corrections and the register lines for the architect to integrate into [`00-index.md`](00-index.md). The decision proposed there is called **the validation decision** until integration gives it a `DRD-` number.

**Outcome:**

- **No finding changes a published value at `436b105c6`.** The summary's tiers stand. No accepted evidence is disputed, and nothing here reruns it.
- **Required fixes, in one implementer unit:** `DRF-24`, `DRF-25`, `DRF-26`, `DRF-27`, `DRF-28` and `DRF-29`. They make the publication test check what `DRD-56` properties 4 to 6 state, and make the step's map follow Rolldown's line rule. The central change replaces V4's text test with a comparison against a build without the step (§3.1).
- **Overstated guarantees, corrected in the record only:** `DRF-30`, `DRF-31` and `DRF-34`. `DRD-56`'s rationale says that V1 finds dynamic keys and that the step's placement covers a publish. Neither is true, and no code change is owed for either (§3.4, §3.6).
- **Minor corrections, batched into the unit:** `DRF-32`'s build message, `DRF-33`'s attribution, `DRF-35` and `DRF-36`. `DRF-32` also owes a CONTRIBUTING sentence at integration (§3.5).
- **No change:** `DRF-37`. `DRD-57`'s map needs names of two characters, so the sequence's extent is used, and V3 checks every name it produces (§3.7).
- **No publication hook.** The repository has no release workflow, and `@ydinjs/drag` is `private`. A hook would guard a path that doesn't exist. The obligation moves to whatever change first makes the package publishable (§2, §3.4).
- **Order:** `DRD-57`'s unit lands and is accepted first, then §6 is integrated, then the handoff's unit runs (§5).

## 1. What the architect checked

| Check | Result |
| --- | --- |
| `build/rename-properties.ts`, `build/property-names.ts`, `build/generate-property-names.ts`, `build/property-names.json` and `tests/publication.node.test.ts` at `6e8174f64` | Read in full. Equal to `436b105c6`'s, so the round's line references hold |
| `DRF-26`'s and `DRF-27`'s line rule | The step starts a line only at `code[i] === '\n'` (`rename-properties.ts:71`). The test splits at `'\n'` (`publication.node.test.ts:68`, `:70` and `:161`) |
| `DRF-28`'s reader | `readNames` records a key only when it is a non-computed `Identifier` (`property-names.ts:147`). The generator's `kept` set and V3's occurrences both come from that list |
| `DRF-29`'s V2 | `Visitor({ Identifier })` only (`publication.node.test.ts:243-249`) |
| `DRF-35` | `RESERVED` at `generate-property-names.ts:28` and `publication.node.test.ts:17`, with the same words |
| V4's acceptance rule | `writes(mapped.text, key) |  | writes(mapped.text, name)`for every occurrence, where`writes`allows`MODIFIERS` before the name. Nothing tells a declaration from an access |
| Short string texts in `src` | A scratch probe ran `readNames` over every `src` file: the only string texts of one or two identifier characters are `'x'` (3), `'y'` (3) and `'px'` (9). `x` and `y` are already kept as property names |
| `DRD-57`'s map | 53 keys. `FIRST` has 53 characters, and `x` and `y` are kept, so 51 one-character names exist and 2 keys get two characters. `$` is one of the 51 |
| The release workflow | §2 |

The probe is in the session's scratch directory and isn't kept: it reads only committed source, and the table gives its whole result.

## 2. The release workflow

**No path publishes `@ydinjs/drag`.**

- `.github/workflows/` holds only `docs.yml`, which builds and deploys the documentation site on a push to `main`. No workflow runs `npm publish`, `npm pack` or a release tool.
- The root `package.json` has no release script. `nx.json` has no release configuration, and the repository has no changesets directory.
- `packages/drag/package.json` is `"private": true`, so `npm publish` refuses it. It has no `prepack`, `prepublishOnly` or `prepare` script.
- `npm pack` works, and the publish mangle unit used it only to list the packed files ([`2026-11-13-mangle-npm-pack-files.txt`](measurements/2026-11-13-mangle-npm-pack-files.txt)).

So `DRD-56`'s rationale is wrong where it lists "a publish" among the paths that build the publication, and `DRF-31`'s observation that a publish neither builds nor validates is true of a path that nobody can run.

## 3. Decisions

| Finding | Class | Decision | Where |
| --- | --- | --- | --- |
| `DRF-24` | Required fix | V4 compares each published map with the map of a build without the step, so a renamed position must be the position that Rolldown gives the same token. The member-start exception applies only to the key of a class member declaration | Unit, §3.1 |
| `DRF-25` | Required fix | The same comparison checks every mapping and every module's text, so `DRD-56` property 5 (for `.js`) and property 6 hold for every build the suite accepts | Unit, §3.1 |
| `DRF-26` | Required fix | The step counts generated lines with the rule that Rolldown's chunk maps use | Unit, §3.2 |
| `DRF-27` | Required fix | The test resolves generated and original positions with the rules that the maps use | Unit, §3.2 |
| `DRF-28` | Required fix | A name that stays includes every string text in the build without the step. The generator and V3 both exclude those | Unit, §3.3 |
| `DRF-29` | Required fix | V2 also rejects a string literal or template text that matches the marker in an emitted `.d.ts` | Unit, §3.3 |
| `DRF-30` | Overstated guarantee | `DRD-56`'s rationale states what V1 finds. V1 doesn't change | Record, §3.4 |
| `DRF-31` | Overstated guarantee | `DRD-56`'s rationale drops "a publish". A tree is publishable only when a Vitest run's node and consumer projects read it and passed. No hook is added | Record, §3.4 |
| `DRF-32` | Minor correction | The build's error for an unmapped name says what is owed and names the generator. CONTRIBUTING Part I states the convention. A regeneration's reviewed content is its key set | Unit and integration, §3.5 |
| `DRF-33` | Minor correction | A V4 failure whose mapping already comes from the build without the step says so. The record states that enabling `nativeMagicString` in drag isn't a size-only change | Unit and record, §3.1 |
| `DRF-34` | Overstated guarantee | Published comments keep their source text, including the source names of renamed members. `DRD-56` property 5 says so | Record, §3.6 |
| `DRF-35` | Minor correction | One definition of the reserved words and of the output-name rule, used by the generator and V3 | Unit, §3.7 |
| `DRF-36` | Minor correction | One function finds the prefixed property names in `src`, and the generator and the name-set test both call it. The test states that it checks the committed map against the tree | Unit, §3.7 |
| `DRF-37` | No change | `DRD-57`'s map uses the two-character branch. V3 checks each name on every run | Record, §3.7 |

### 3.1 V4 compares the publication with a build without the step

**Decision.** The publication test builds the package a second time, with every plugin but the step, into a temporary directory. This is **the reference build**. It uses `tsdown.config.ts` with the step removed from the plugin list, keeps source maps, and emits no declarations. The generator already builds this way, without maps. V4 then checks three things for every emitted `.js`:

- **(a) The text.** The published module equals the reference module with each prefixed property name replaced by its map value. This checks `DRD-56` property 5 for `.js`: the statements, every comment, the bundler annotations and the `sourceMappingURL` are unchanged.
- **(b) The mappings.** The published map decodes and has the reference map's mappings, in the same order. Each has the same source, original line and original column, and the same generated line. Its generated column moves only by the length change of the names renamed before it on its line. This checks property 6 bullets 1 and 3 for every token, and shows that the step doesn't move a renamed token.
- **(c) Where a renamed name leads.** Each renamed name's mapping leads to `src` text that is its prefixed name. When the renamed name is the key of a class member declaration in the emitted module, the mapping may instead lead to the start of that member, with only class member modifiers and whitespace before the prefixed name. Nothing else passes. This is property 6 bullet 2 and its exception, as the correction of 2026-11-13 bounds it. When (c) fails and (b) holds, the failure says that the reference build already maps the token there.

**Why a reference build.**

- **The renamed position has to be a specific token's position, and only a reference build knows which.** `DRF-24`'s `t2b` maps an access to another access of the same name, and `t2c` maps a declaration into the constructor. Any test that reads only the published map and `src` sees a correct text at a wrong place. Property 6 states a position, so its check needs a second source of positions.
- **The step's correctness depends on Rolldown, and Rolldown changes without a drag unit.** The step relies on Rolldown composing the returned map with the chunk's map segment by segment, and on its line rule (`DRF-26`). A dependency update can change either, and no one reads `DRD-56` when that happens. A one-time acceptance, the alternative that `DRF-25` offers, doesn't survive that. A standing check does.
- **It is the publish mangle report's own step check, made standing.** That check ([`step-check.ts.txt`](measurements/2026-11-13-mangle-step-check.ts.txt)) compared 6,902 mappings and found 0 failures. The method is proven on this build. (a) is that script's checks 1 and 2, (b) its check 4, and (c) its check 5. Its check 3, the byte comparison of the other files, stays one-time.
- **It attributes `DRF-33`'s failure.** With `nativeMagicString` on, the class-var cleanup coarsens the chunk's own map. The step stays transparent, so (a) and (b) pass, and (c) fails at the 79 positions that the integrity pass found. The message then says that the reference build already maps them to a statement start. That is "checked where it fails with its cause", the first form of `DRF-33`'s required property.
- **The cost is one build without declarations.** `tsdown` reported 362 ms for the build without the step at the publish mangle base ([assessment](publish-mangle-assessment.md) §1). The unit reports the node project's wall time before and after. It isn't gated.

**`.d.ts` stays by construction.** The step returns `null` for a declaration chunk, so the reference build needs no declarations. `DRD-56` property 5's `.d.ts` clause stays a property of the step's code, as the reviewer's table records.

**`DRD-55` property 1 still holds.** The reference build writes only to a temporary directory. It doesn't write the package root, which is the tree that the rule protects, and it isn't `just build`'s build. It starts after the global setup's build has finished, inside the publication test. §6.2 records this as a clarification of `DRD-55`.

**Rejected:**

- **Stating V4's text bound in the record.** It would correct `DRF-24`'s overstatement and leave `DRF-25` and `t2b` and `t2c` unchecked. Property 6 would then state a position that no instrument checks.
- **Narrowing the text test to declarations only.** It rejects `t2a` and nothing else of `DRF-24`, and it does nothing for `DRF-25`.
- **A re-run obligation on any unit that changes `build/`.** A Rolldown update is not such a unit.

**Correction to the record.** [`publish-mangle-assessment.md`](publish-mangle-assessment.md) §3 says that applying the exception to every occurrence "doesn't make it weaker than V4 as first written". `DRF-24`'s `t2a` shows that it is weaker for an access mapped to its declaration's member start, which the first form rejected. That record is append-only, so §6.1's decision records the correction.

**`classVarCleanupPlugin`.** [`publish-mangle-assessment.md`](publish-mangle-assessment.md) §8 prices enabling `experimental.nativeMagicString` in drag by size. The integrity pass shows that it also breaks property 6 bullet 2 in 8 modules, through the plugin's map and not the step. Enabling it in drag would therefore need the plugin to keep token positions, or drag's plugin list to leave it out. That stays the owner's question, as §8 left it, and §6.1 records the added cost.

### 3.2 One line rule, the maps' own (`DRF-26`, `DRF-27`)

**Decision.**

- **The step** starts a new generated line wherever Rolldown's chunk map does. The reviewer showed that Rolldown counts a raw U+2028 in a template literal as a line break. The unit establishes Rolldown's rule for LF, CR, CRLF, U+2028 and U+2029 in emitted code by a witness, and the step follows it. A CRLF is one break if Rolldown counts it as one.
- **The test** computes generated positions with the same rule, and reads `src` lines with the rule that Rolldown uses for original positions. The reviewer's `dump.ts` shows that original lines count CR, LS and PS.
- **One definition** of the generated line rule serves the step and the test.

**Why now, with no instance in `src`.** The step's defect is silent when no renamed name follows the separator, and it produces a wrong published map. The test's defect fails a correct change, such as a pasted U+2028 in a comment. Both fixes are a few lines, and the witnesses already exist in the reviewer's probes. §3.1's (b) would catch a future step defect of this kind loudly, but it wouldn't make the map right.

### 3.3 What stays includes strings, and V2 sees strings (`DRF-28`, `DRF-29`)

**`DRF-28`: decision.** A name that stays, for `DRD-56` property 4, is any property name **or any string text** (a string literal, including a quoted or computed key, or a template text) in the modules of the reference build. The generator excludes all of them, and V3 fails when a map value equals one of them.

- **Why strings, and not only keys.** Every way that a source names a property as text, such as a quoted key, `this['k']`, `'k' in o`, or a comparison with an enumerated key, holds the name as a string literal. Excluding every string text covers all of them with one rule, and needs no judgment about which strings are keys. The cost is that a string equal to a short name removes that name from the candidates. `src` holds only `'x'`, `'y'` and `'px'` among short strings, so the map doesn't change (§1).
- **Why not forbid unprefixed string keys in `src` instead.** That moves the check to reading the code, which is what `DRF-28` found unreliable, and a platform-facing string key can be legitimate.
- **V3 reads the reference build directly.** It no longer infers from source maps whether an output-name occurrence is a property that stays. That inference is the reviewer's remaining theoretical gap under target 3, and the reference build exists anyway for §3.1.

**`DRF-29`: decision.** V2 fails on any identifier, string literal or template text in an emitted `.d.ts` that matches `^_[A-Za-z]`. That covers a quoted key, a computed string key, a string-literal type and a template literal type. The integrity pass found no prefixed text at all in the emitted `.d.ts` files, so this passes today.

### 3.4 What V1 finds, and what is publishable (`DRF-30`, `DRF-31`)

**`DRF-30`: the record changes, and V1 doesn't.** V1 finds a prefixed property name and a string or template text that starts with the marker. It can't find a key that is computed at runtime, such as `o['_' + 'config']` or a key read from `JSON.parse` or `Object.keys`, and no static check can find all of them. `DRD-56` property 1 forbids them, and property 2's reading of every declaration's use sites is what excludes them. The rationale says that. §6.3 gives the text.

**`DRF-31`: the record changes, and no hook is added.**

- **What is publishable:** a tree that a Vitest run's node and consumer projects read and passed. That is the tree that `DRD-55` property 1's one build produced. `just build` alone guarantees only what the reviewer's table lists: no prefixed non-computed property name survives unrenamed, and no prefixed shorthand key exists.
- **Why no `prepack` or `prepublishOnly` hook now.** No release path exists (§2). `"private": true` already stops `npm publish`. A `prepack` hook would also run on `npm pack`, which the record uses to list files, and it would have to start both projects, including a browser. It would be machinery for a path nobody runs, which CONTRIBUTING Part II §2 and §16 advise against.
- **The obligation moves to the change that makes the package publishable.** The change that removes `"private": true` from `packages/drag/package.json`, or adds a workflow or script that packs or publishes drag, must make the packed tree one that the node and consumer projects read and passed in the same job. That change chooses the mechanism. §6.1 states this as the validation decision's obligation, so it is found where the rule is.
- **Why moving the step out of the build isn't reopened.** The step's placement still serves `just build`, the consumer project and the gate. Only the rationale's "and a publish" is wrong.

### 3.5 Where a contributor learns the convention (`DRF-32`)

**Decision.**

- **The failure says what is owed.** The build's error for a prefixed name that the map lacks says that a `_` property is renamed in the publication, and that the map is regenerated with `node build/generate-property-names.ts` in the same commit as the new name. The unit changes the message.
- **CONTRIBUTING Part I states the convention,** because a contributor reads CONTRIBUTING before writing source (`AGENTS.md`), and a convention's home is `CONTRIBUTING.md` Part I or `.agents/docs/` ([documentation model](../../../.agents/docs/documentation.md), the table at the top). The sentence is scoped to `@ydinjs/drag`, so it doesn't decide prefixes for other packages, which `DRD-56` leaves open. §6.4 gives the text and the change-record row. It is integrated with the validation decision, because the change record cites a decision.
- **A regeneration's diff is reviewed by its keys.** The generator assigns names by frequency, so adding one name can reassign existing ones. That keeps the output short, and V3 checks every value on every run. A person reviewing a regeneration reviews the added and removed keys. A changed value for an existing key is expected. The alternative, a generator that keeps existing assignments, trades bytes for a shorter diff, and nothing here needs that trade. `DRD-57` property 4's "a person reviews its diff" reads this way. §6.1 records it.

### 3.6 Comments in the published modules (`DRF-34`)

**Decision: they keep their source text.** `DRD-56` property 5 says that the step changes nothing else in a module, and that includes a comment that names a renamed member by its source name. The record states it, so the guarantee is no longer silent.

- A renamed member is internal. No correct integration reads it, and the contract doesn't name it.
- Every published module's map leads back to `src`, where the comment and the code agree.
- Rewriting comments would make the step edit prose, a new kind of change with no consumer-observable benefit. Stripping comments would remove the license header and the bundler annotations, or need a rule for which comments stay. Neither is worth it at tier C.

### 3.7 Cleanup batched into the unit, and `DRF-37`

- **`DRF-35`.** The reserved words and the output-name rule (an identifier name whose first character isn't `_`, and that isn't reserved) get one definition in `build/`, which the generator uses to produce names and V3 uses to check the committed file. V3's job is to check a committed file that a person may edit by hand, against the current tree, so it doesn't need a second copy of the rule to be useful.
- **`DRF-36`.** One function returns the prefixed property names in `src`, and the generator and the name-set test both call it. The test's comment says what it checks that the generator can't: that the committed map's keys equal the tree's prefixed names, which fails on a stale or hand-edited map. A defect in the shared reader isn't caught by sharing it. §3.3's string rule closes the one blind spot that `DRF-28` found, and property 1 with property 2's reading bounds the rest.
- **`DRF-37`: no change.** The finding's premise, that the multi-character branch is unreached, holds at `436b105c6` and doesn't hold under `DRD-57` (§1). The branch's first use is `DRD-57`'s regeneration, and V3 checks that every output name is a valid, unreserved, distinct identifier name that no remaining name uses. So the first use is checked by the instrument that guards the map. No separate test of `candidates()` is owed.

### 3.8 `DRD-57`'s names in this unit

The unit starts after `DRD-57` lands, so it works with 53 keys, two output names of two characters, and `$` as an output name.

- **Two-character names.** (a) to (c) compute each rename's length change from the map, not from a fixed width, and the step already replaces with the value's own length.
- **`$`.** Any regular expression built from an output name escapes it, as `writes` does today.
- **The map shouldn't change.** §3.3's string rule removes no candidate that `DRD-57`'s map uses, if the publication's short strings are `src`'s. The unit regenerates the map, and a difference is a return condition, because it would mean a string equals a published output name today.
- **The publication shouldn't change.** The step's line rule changes nothing on a tree without CR, LS or PS, and the error message is used only on failure. The unit shows that the published files are byte-identical to the base tree, which substitutes for a size reading.

## 4. Not decided here

- **The dangling `//# sourceMappingURL=<name>.d.ts.map`** at the end of every emitted `.d.ts`, with no `.d.ts.map` emitted. It predates `DRD-56` (integrity pass, observations). §6.3 corrects `DRD-56` property 5's and V5's `.d.ts.map` clauses, which hold of nothing. Whether the build should stop writing the comment, or emit the maps, is the owner's to open.
- **`classVarCleanupPlugin`**, and whether drag enables `nativeMagicString`. The owner's (§3.1).
- **The release mechanism** for `@ydinjs/drag`. Only its obligation is recorded (§3.4).
- **`just fmt-check` failing on 52 files under `.plan/`**, and the root-only declaration of `build/`'s imports. Both are repository observations from the integrity pass, and neither concerns `DRD-56`.
- The type-directed transform stays deferred ([`performance-plan.md`](performance-plan.md) §6). `DRO-4`'s re-base and the `shipped` census are unchanged. The deferred campaigns stay stopped.

## 5. Order

1. **`DRD-57`'s unit** ([`mangle-selection-handoff.md`](mangle-selection-handoff.md)) lands on `drag/size` and the architect accepts its report. Its handoff forbids changes to `build/` and the publication test, so this unit can't come first without amending it.
2. **The architect integrates §6** on `drag/size`: this branch's two files, the validation decision under the next free `DRD-` number, the in-place corrections, the register lines and the CONTRIBUTING sentence. The handoff's base check reads that commit.
3. **The unit runs** ([`mangle-remediation-handoff.md`](mangle-remediation-handoff.md)).
4. **The architect reads its report** and closes the findings that §6.5 marks for the unit.

No independent review round is recommended after the unit. The change replaces an instrument with the report's own step check made standing, and the handoff's witnesses show that each new check rejects what the round's probes showed the old one accepting.

## 6. Amendments to integrate

Each block below is written to be copied into [`00-index.md`](00-index.md) or `CONTRIBUTING.md`. `<V>` is the number that integration allocates to the validation decision, `<U>` is the unit's code commit, and `<I>` is the integration commit.

### 6.1 The validation decision

Heading: `#### DRD-<V> — The publication test compares the publication with a build without the step, and a name that stays includes every string`

> **The publication test builds the package a second time without the step, into a temporary directory, and V4 compares each published module and map with that reference build. V2 and V3 see names written as strings. The step's map counts lines as Rolldown's maps do. A tree is publishable only when a Vitest run's node and consumer projects read it and passed.** This supersedes `DRD-56` property 4's third bullet and property 7's V2, V3 and V4. [`mangle-remediation-assessment.md`](mangle-remediation-assessment.md) is the reasoning, and [`mangle-remediation-handoff.md`](mangle-remediation-handoff.md) implements it.
>
> Decided on 2026-11-13 by the architect, on the publish mangle review's `DRF-24` to `DRF-37`.
>
> **Why:**
>
> - **Property 6 states positions, and only a second build knows them.** V4's text test accepted an access mapped to another access of the same name, a declaration mapped into another member, and, through the exception, an access mapped to its declaration's member start (`DRF-24`). It didn't check other tokens at all (`DRF-25`).
> - **The step depends on Rolldown's map composition and line rule,** and a dependency update changes them without a drag unit. A standing comparison survives that, and a one-time acceptance doesn't.
> - **The comparison is the publish mangle report's step check,** which compared 6,902 mappings with 0 failures.
> - **A name that stays can be written as a string** (`DRF-28`). Excluding every string text covers every textual form with one rule.
> - **No release path exists.** `@ydinjs/drag` is `private`, and the repository's only workflow deploys documentation. A publication hook would guard nothing.
> - **[`publish-mangle-assessment.md`](publish-mangle-assessment.md) §3 is corrected:** applying the exception to every occurrence was weaker than V4's first form for an access mapped to its declaration's member start (`DRF-24`, `t2a`).
> - **Enabling `experimental.nativeMagicString` in drag isn't a size-only change,** as that assessment's §8 priced it. The class-var cleanup's map points renamed tokens at statement starts, which breaks property 6 bullet 2 in 8 modules (`DRF-33`).
>
> **Required properties:**
>
> 1. **The reference build.** The publication test builds `tsdown.config.ts` with every plugin but the step, with source maps and without declarations, into a temporary directory that it removes. It doesn't write the package root, and it starts after the run's one build has finished (`DRD-55` property 1). The generator builds the same way, through the same code, without source maps.
> 2. **Names that stay.** A name that stays is every property name and every string text, a string literal or a template text, in the reference build's modules, apart from the prefixed ones. No output name equals one. The generator excludes them, and V3 checks them. This replaces `DRD-56` property 4's third bullet, "equal to no property name that stays in the publication".
> 3. **Line rules.** The step's map starts a generated line wherever Rolldown's chunk map does. The test reads generated positions with that rule and `src` positions with the rule of Rolldown's original positions. One definition of the generated rule serves the step and the test.
> 4. **The checks.** `DRD-56` property 7's V1 and V5 stay, and V5's `.d.ts.map` clause is dropped. The others read:
>    - **V2:** no emitted `.d.ts` holds an identifier, a string literal or a template text that matches `^_[A-Za-z]`.
>    - **V3:** the map's values are distinct, satisfy the one output-name rule, and equal no name that stays (property 2).
>    - **V4,** for every emitted `.js`:
>      - (a) the module equals the reference module with each prefixed property name replaced by its map value;
>      - (b) its map has the reference map's mappings in order, with the same source, original position and generated line, and a generated column moved only by the length change of the names renamed before it on its line;
>      - (c) each renamed name's mapping leads to `src` text that is its prefixed name, or, for the key of a class member declaration, to that member's start with only modifiers and whitespace before the prefixed name. When (c) fails and (b) holds, the failure says that the reference build maps the token there.
>    - **The name set:** the map's keys equal the prefixed property names in `src`, through the function that the generator uses. The test checks the committed file against the tree.
> 5. **One definition** each of the reserved words, the output-name rule and the prefixed names in `src`, shared by the generator and the test.
> 6. **The build's error for an unmapped name** says that a `_` property is renamed in the publication, and that the map is regenerated with `node build/generate-property-names.ts` in the same commit.
> 7. **Regeneration.** A person reviews a regenerated map's added and removed keys. A changed value for an existing key is expected, because names are assigned by frequency, and V3 checks every value. This is how `DRD-56` property 4 and `DRD-57` property 4 read "a person reviews the diff".
> 8. **Publishable.** A tree is publishable only when a Vitest run's node and consumer projects read it and passed. `just build` alone guarantees only that no prefixed non-computed property name survives unrenamed and no prefixed shorthand key exists. **Obligation:** the change that removes `"private": true` from `packages/drag/package.json`, or adds a workflow or script that packs or publishes the package, makes the packed tree one that those projects read and passed in the same job, and chooses how.
> 9. **Unchanged:** the step's renaming, `src`, the map's keys and values, `.d.ts` output, the published files, budgets and `DRD-56` properties 1 to 3, 5, 6, 8 and 9.
>
> **Witnesses:** each check fails on the round's probe that the old check passed ([handoff](mangle-remediation-handoff.md) item 5).
>
> **What this amends:** `DRD-56` property 4's third bullet and property 7's V2, V3 and V4, superseded. `DRD-55` property 1 is clarified (below).
>
> **What this doesn't decide:** the release mechanism; the dangling `.d.ts` `sourceMappingURL`; `classVarCleanupPlugin` and `nativeMagicString`; the type-directed transform; `DRO-4`'s re-base; the `shipped` census.

### 6.2 `DRD-55`, clarified in place

Append to `DRD-55`:

> **Clarified on 2026-11-13 by `DRD-<V>`:** property 1's "No file builds the tree" refers to the package root. The publication test's reference build, without the step, writes only to a temporary directory, starts after the run's one build, and isn't `just build`'s build.

### 6.3 `DRD-56`, corrected in place

These change no requirement on the code, so they are made in place ([documentation model](../../../.agents/docs/documentation.md) §6).

- **In Why, the second bullet,** replace "Property 1 forbids those, and validation V1 finds them." with: "Property 1 forbids those. V1 finds a string or template text that starts with the marker. A key computed at runtime, such as a concatenation or a key read from an enumeration, is excluded by property 2's reading of the use sites, and no check finds it."
- **In Why, the fifth bullet,** replace "`just build`, the consumer project, the gate, and a publish. A separate step after the build could be skipped." with: "`just build`, the consumer project and the gate. A separate step after the build could be skipped. No path publishes the package. What is publishable is `DRD-<V>` property 8."
- **Property 5, second bullet,** append: "A comment keeps its source text, including a renamed member's source name."
- **Property 5, fourth bullet,** replace "The `.d.ts` and `.d.ts.map` output is byte-identical" with "The `.d.ts` output is byte-identical". The build emits no `.d.ts.map`.
- **After the "Extended on 2026-11-13 by `DRD-57`" line,** add a dated block:

  > **Corrected on 2026-11-13, in place** ([assessment](mangle-remediation-assessment.md) §3.4 and §3.6): the rationale said that V1 finds computed keys and enumerations, and listed a publish among the paths that build the publication (`DRF-30`, `DRF-31`). Property 5 now states that comments keep the source names of renamed members (`DRF-34`), and no longer names `.d.ts.map` output, which the build doesn't emit.
  >
  > **Superseded in part on 2026-11-13 by `DRD-<V>`:** property 4's third bullet and property 7's V2, V3 and V4.

### 6.4 CONTRIBUTING

**Part I, §Naming and self-documentation**, a new paragraph after the first:

> In `@ydinjs/drag`, a property that only the package's own code reads or writes, and that isn't `#private`, takes a `_` prefix: `_` and then a letter. The publication build renames every such property through `packages/drag/build/property-names.json`. Add or remove a prefixed name and the regenerated map in one commit, with `node build/generate-property-names.ts` from `packages/drag`. A name that an emitted `.d.ts` declares, that the platform reads, writes or calls, or that is one character long keeps its name. The full rule is `drag:DRD-56` property 1.

**Change record**, a new row. Its link is relative to `CONTRIBUTING.md`:

```markdown
| 2026-11-13 | Part I, Naming and self-documentation | **Added:** the `_` prefix for `@ydinjs/drag`'s internal properties, and the map that the publication build renames them through. The rule was stated only in the record. Record: [`00-index.md`](packages/drag/.plan/00-index.md) DRD-56, DRD-57, DRD-<V> |
```

### 6.5 The register

**Status lines for §Findings,** each replacing the finding's first line:

| Finding | Status line |
| --- | --- |
| `DRF-24` | Tier B, **closed at `<U>`** by `DRD-<V>` property 4, V4 (a) to (c) |
| `DRF-25` | Tier B, **closed at `<U>`** by `DRD-<V>` property 4, V4 (a) and (b) |
| `DRF-26` | Tier B, **closed at `<U>`** by `DRD-<V>` property 3 |
| `DRF-27` | Tier B, **closed at `<U>`** by `DRD-<V>` property 3 |
| `DRF-28` | Tier B, **closed at `<U>`** by `DRD-<V>` property 2 |
| `DRF-29` | Tier B, **closed at `<U>`** by `DRD-<V>` property 4, V2 |
| `DRF-30` | Tier B, **closed at `<I>`**: `DRD-56`'s rationale corrected in place. V1 is unchanged |
| `DRF-31` | Tier B, **closed at `<I>`**: no release path exists. `DRD-<V>` property 8 states what is publishable and the obligation on a release change |
| `DRF-32` | Tier C, **closed at `<U>`**: the error message (`DRD-<V>` property 6), CONTRIBUTING Part I at `<I>`, and regeneration review (property 7) |
| `DRF-33` | Tier C, **closed at `<U>`**: V4 (c) attributes the failure. The added cost of `nativeMagicString` is recorded in `DRD-<V>` |
| `DRF-34` | Tier C, **closed at `<I>`**: `DRD-56` property 5 states that comments keep source names |
| `DRF-35` | Tier C, **closed at `<U>`** by `DRD-<V>` property 5 |
| `DRF-36` | Tier C, **closed at `<U>`** by `DRD-<V>` property 5 and the name-set test's stated role |
| `DRF-37` | Tier C, **closed at `<I>`, no change**: `DRD-57`'s map uses the two-character branch, and V3 checks every output name |

Until the unit's report is accepted, the `<U>` rows read "open, decided by `DRD-<V>`".

**A disposition section,** after §Disposition of the publish mangle report:

> ## Disposition of the publish mangle review
>
> The [summary](reviews/publish-mangle/publish-mangle-summary.md) at `6e8174f64`, of the tree at `436b105c6`, read by the architect on 2026-11-13 in [`mangle-remediation-assessment.md`](mangle-remediation-assessment.md). No tier A finding. No accepted evidence was disputed.
>
> | Findings | Disposition |
> | --- | --- |
> | `DRF-24` to `DRF-29` | Required. `DRD-<V>` decides them, and [`mangle-remediation-handoff.md`](mangle-remediation-handoff.md) implements them |
> | `DRF-30`, `DRF-31`, `DRF-34` | Overstated guarantees. `DRD-56` is corrected in place, and `DRD-<V>` property 8 states what is publishable. No hook: no release path exists |
> | `DRF-32`, `DRF-33`, `DRF-35`, `DRF-36` | Minor corrections in the same unit. CONTRIBUTING Part I states the `_` convention |
> | `DRF-37` | No change |
>
> **Next:** the unit, after `DRD-57`'s unit is accepted.

**The status paragraph** at the top of the register gains one sentence after the last: "**The publish mangle review read `436b105c6`** and registered `DRF-24` to `DRF-37`, with no tier A finding. `DRD-<V>` makes the publication test compare the publication with a build without the step, and corrects what `DRD-56` said that V1 and the build's placement guarantee. [`mangle-remediation-handoff.md`](mangle-remediation-handoff.md) implements it after `DRD-57`'s unit."