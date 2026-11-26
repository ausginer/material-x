# A list item's long texts (RF-139, #254, #286) — feature proof

**Files were read at:** `ae13309e66a3de10bb506838f4364f8d33be8eb6`, the head of `material-x/item-overflow-1`, in slot `c`, equal to `origin`. **Diff reviewed:** `2485fb2df..ae13309e6`. Mutations changed the list item's sheet for a run and restored it, and `packages/` is unchanged. Playwright's Chromium 158, Firefox 159 and WebKit 27.2, one at a time.

**Contract:** `repo:RF-139` in [`00-index.md`](../../00-index.md), with all its notes. The architect's ruling on Q4 governs properties 1, 2 and 4 as narrowed there. Evidence: [`.plan/item-overflow-1/`](../../item-overflow-1/).

**Verdict: the ruled declarations are implemented as ruled, and hold their rows in three engines. Not a pass yet, for a point that the ruling doesn't decide:** a narrowed control's label is broken inside its words, down to a letter a line, and runs out of the item above and below (`reviewer-1`, Tier A, for the architect). Two more are Tier A for the architect: a list that is sized by its contents, and the ruling's 15% in Roboto. The rows don't hold two properties (`reviewer-4`, Tier B).

## Readings

**Rows.** `tests/list/` in WebKit: 818 passed, 2 skipped. With `slotted-content` and `aria-own-value`, Firefox 886 and 2 skipped, Chromium 898. The 450 rows of the new file pass in each. CI is green at this head in the three engines.

**Witnesses** ([WebKit](checks/mutations-webkit.txt), [Firefox](checks/mutations-firefox.txt), [Chromium](checks/mutations-chromium.txt), [script](probes/mutations.mjs)). All ten of the implementer's and 17 of the review's, each on the 450 rows. **The three engines give the same failures, line for line**, and the implementer's ten give his numbers: `main` 180, without the 15% 26, 15% as a minimum 16, the cap 12, and 24, 12, 12, 104, 60, 24. The review's own:

| Mutation | Fails | Reading |
| --- | --: | --- |
| `break-word` for `anywhere` | 12 | Held |
| The trail slot's minimum is 0 | 16 | Held |
| The trail slot doesn't shrink; shrinks by 10 | 28; 20 | Held |
| `.content` starts from `auto` | 10 | Held |
| 14%; 20% | 26; 2 | Held |
| 16%; the trail slot shrinks by 100 | 0; 0 | Within what the contract allows: the label has at least 15% |
| The trail slot's minimum is `auto`; half is 45%; half is 40%; the trail slot grows; `.content` doesn't grow; `.lead` shrinks | 0 each | `reviewer-4` |
| `.lead` starts from `auto` | 0 | Not a required property |
| The trail slot clips | 0 | 12 rows of `list-item.spec` hold it ([reading](checks/mutations-list-chromium.txt), Chromium, 820 rows) |

**The review's contents** ([probe](probes/contents.mjs); `<part>-<engine>.txt` in [`checks/`](checks/)), in Roboto, on the built elements. The node project builds the package before its files run, so a mutation run that includes it left a mutated build, and three parts were first read on one. The package was rebuilt from the clean tree and **every part was read again**. Only `survivors` differs, in its `trail min auto` lines, and the committed files are the second readings. `main` there is the merge base's declarations, adopted. Chromium, Firefox and WebKit differ by at most 2.2px of a text's own width, apart from native controls and fonts in `breaks`.

- **Kinds:** 13 contents in the static, button and link items and in the sortable list's static and button items, both directions, 240, 300 and 360px, 390 readings an engine. No label or trailing child passes the item's sides. A link item reads as the button item, the sortable list as the list, and RTL as LTR.
- **200%:** with the item's own texts at twice their size, nothing passes in 300px. With CSS `zoom: 2` in 600px nothing passes either. In 300px, which is an item of 150px, the 20 cases of a button beside a video do (65 to 93px), and the 10 of an address beside one by about 1px, in all kinds and directions alike. The lead is then wider than half of the item, which property 2 leaves out.
- **Lift:** 16 drags an engine, by real pointer. The lifted item's boxes are its boxes at rest ([Chromium](checks/lift-chromium.txt), [Firefox](checks/lift-firefox.txt), [WebKit](checks/lift-webkit.txt)).
- **Children that can't get narrower:** a native input and `select`, an image and a block 200px wide keep their width and stay in the item, as on `main`. `mx-slider` is 0px wide and `mx-text-field` 32 to 33px, as on `main`.
- **Beside the 40px avatar and a 56px image,** which the ruling left unread: the two-word button keeps its box at 300px, with the label at 103 and 87px. At 240px it keeps it beside the avatar. Beside the image it is narrowed to 92 and 97px, with two lines.

**The 101px button, read and not judged** (`reviewer-2`). Narrowest list in which _Two words_ keeps its box, Chromium, by 1px steps:

| Lead               | Static item | Button item |
| ------------------ | ----------: | ----------: |
| Video, 100px       |   **302px** |       296px |
| Large video, 114px |       319px |       313px |
| Avatar             |       231px |       233px |

At 300px beside the 100px video, in the static item, the button is 99px with two lines at 15% and 96px at 16%, and it keeps its box and one line at 10, 12, 13 and **14%** (label 43px). In the button item it keeps its box at each of them. _Two bits_, _Download_ (96px) and _Save draft_ (98px) keep theirs at 15%. So 14% is the largest whole percent that holds the ruling's stated reason in Roboto, and 10% the largest multiple of 5%.

## Scope

**Covered:** the above, the prose of `list.mdx`, and the PR's description against the readings. **Not covered:** the full suite, the size numbers, `docs-build`, Safari, screen readers, a visual baseline, 200% by a browser's text zoom or with enlarged control text, `forced-colors`. The probe's `past` covers the label and the trailing children and not the overline or support, which the rows cover. The survivors were run on all of `tests/list` in Chromium alone.

**The root `fmt-check` passes.**

## Findings

### reviewer-1 — A narrowed control's label is broken inside its words, down to one letter a line, and runs out of the item

Tier A, for the architect.

- **Finding:** `overflow-wrap: anywhere` is on the slotted control, so it is inherited by the text inside it. The control's narrowest content is then one letter, and the trail slot's `min-content` minimum doesn't stop before its longest word. The button's own height stays at most 40px, so the extra lines run out of it.
- **Contract:** property 4 says that a control with too little room gets what is left _and its label wraps_. Property 1 is that no text runs past the item's end. The ruling keeps `anywhere` for the trailing text's address and long word (`words15`), and reads controls of two words at 95 to 118px, which break between words. It doesn't name a control's one word, or a block-direction end.
- **Why it is a problem:** the label is unreadable, and at 240px it is drawn over the item above and the one below. On `main` the label is whole. There the control passes the item's end at 240px, so this replaces one defect by another, but not in the 280px case.
- **Evidence** ([WebKit](checks/labels-webkit.txt); the engines differ by a pixel of height, and by the place of a break in three lines between Chromium and the other two; `labels-*`), on the static item unless named:

  | List, lead | Control, own width | `main` | Subject |
  | --- | --- | --- | --- |
  | 280px, video | _Download_, 95px | 95px, past 0 | 82px, `Downlo/ad`; button item 87px, the same |
  | 300px, video | _Unsubscribe_, label _Hi_, 111px | 111px, past 0 | 99px (button item 104px), two lines |
  | 300px, large video | _Download_, 95px | past 0.2px | 85px, `Downlo/ad` |
  | 260px, video | _Download_, 95px | past 16px | 65px, `Dow/nloa/d`, 8px out of the button |
  | 240px, video | _Download_, 95px | past 36px | 48px, six lines, 116px high, 28px out of the item above and below |
  | 240px, large video | _Two words_, 101px | past 66px | 43px, eight lines, 48px out of the item |

  In 240px the lead is under half of the item, so the case is inside the properties. Without a lead nothing breaks in 240 to 320px.

- **Required property:** a control in `trail` isn't narrowed to less than its label can be read in, or the contract says that it may be. A label isn't drawn over another item.

### reviewer-2 — The ruling's reason for 15% doesn't hold in Roboto, the family's font

Tier A, for the architect, who has the question.

- **Current behavior / contract:** the ruling says that 15% is the largest multiple of 5% at which _a button of two words, 95 to 97px, keeps its box_ beside the 100px video in a 300px item. In Roboto the same button is 101px and doesn't keep it in the static item (99px, two lines).
- **Why it is a problem:** the ruling's rule of use, a control of at most half that fits beside the lead and 15%, is kept. Its stated effect isn't, and the button that the ruling chose the number for is narrowed. The rows' button is _Two bits_, 86.8px, so they read a narrower button than the ruling's. Beside the 114px video that one is narrowed too in the static item: 85px, two lines. No row asserts its width there.
- **Evidence:** the table above, and `buttons-*`.
- **Required property:** the number and its reason agree in the font that the rows and a page use, or the reason is changed.

### reviewer-3 — In a list sized by its contents, a trailing child that has its room is narrowed and wraps

Tier A, for the architect: read by none of the notes, and it follows from the letter of _at most half_.

- **Current behavior / contract:** the list is as wide as its contents (`fit-content`, `max-content`, `inline-block`, absolute, a flex row). The item's width is the label's and the trailing child's, so there is no other room to leave. The half is then a percentage of that width, and a child wider than half of it wraps, although the item is as wide as on `main` and the room is empty.
- **Contract:** property 4, a control of at most half keeps its box, and Q3 (a), a trailing text takes up to half. Both hold as written. Property 4's first line, _short texts, icons, and controls keep their boxes_, doesn't: "Yesterday, 12:30" isn't long. The entry's accepted cost names a text wider than half beside a short label, in a 300px list.
- **Evidence** ([WebKit](checks/fit-webkit.txt); `fit-*`): 50 of 180 readings have another child box in each engine, and the item's own width is the same in all 180. _Label_ with _Yesterday, 12:30_: one line on `main`, two lines now, in the static (87px of 174px) and the button item (71px). A two-word button: 101px with one line, now 77px with two in the button item. _Copy_ with _Ctrl+Shift+C_ in a button or link item: 66px on `main`, 58px and two lines. A short time, icons and a checkbox are unchanged. A `min-content` list is outside the 180: there the item is narrower than on `main` (72px, was 95px), and `12:30` breaks. A menu or a popover that is as wide as its longest entry is this case.
- **Required property:** the ruling says what a trailing child does in a list sized by its contents.

### reviewer-4 — The rows don't hold the label's growth, the half, or a child wider than half

Tier B: the rows are the instrument for properties that this unit delivers, and each of these passes all 450 rows in each engine, and all 820 of `tests/list` in Chromium ([reading](checks/mutations-list-chromium.txt); their effects, `survivors-*`).

| Mutation | What it changes, in a 300px static item |
| --- | --- |
| `.content` doesn't grow | The label of "A label of several words here" is 45px wide, the item 164px high, and the trailing text isn't at the end. 225.6px and 56px as built |
| The trail slot grows | The trailing `12:30` isn't at the item's end: its slot is 121px wide, the label 135px |
| Half is 40% | "A text of some more px", 125px, wraps. The same for 45% in the button item. In the button item the button _A button, 130_ (117px) is 107px, two lines |
| The trail slot's minimum is `auto` | A fixed 200px child runs 34px past the static item's end and 50px past the button item's, where it is in the item as built and on `main` |
| `.lead` shrinks | Beside the large video and the fixed 120px child the label is 35px, not 10px, and the leading slot narrower than its 114px video |

- **Required property:** Q3 (a)'s _up to half_ and property 4's _at most half_ are held from below as well as from above: the rows assert at most half, and no row has a child between 41 and 49% of the item. A child wider than half that can't get narrower stays in the item. A trailing child is at the item's end, and the label takes the rest.

### reviewer-5 — Two children with room in the item are stacked when together they are wider than half

Tier A, for the architect; not a regression, because `main` stacks them too. Property 3 (_side by side while the item has room_) isn't narrowed by the ruling. In a 300px item two 87px buttons stack in each kind, with the label at 106px and 122px, and so do four icon buttons and, beside the video, three icon buttons. In the 360px button item two buttons stack, in the static one they don't. _Text and button_, three icon buttons and a text with two icon buttons are side by side at 300px ([WebKit](checks/sides-webkit.txt); `sides-*`). Required property: property 3 says what "room" is.

**Null result:** nothing was found against the ruling's correction 1 or 2. Nothing in the link item, the sortable list, RTL or the drag lift differs from the static and button items. No difference between the engines was found in any property.