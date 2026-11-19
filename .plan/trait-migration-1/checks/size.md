| Package | Row | Commit 1 | Commit 7 | Change | Noise bound | Within |
| --- | --- | --: | --: | --: | --: | --- |
| core | element | 312 | 312 | 0 | 10 | yes |
| core | emitter | 198 | 198 | 0 | 10 | yes |
| core | traits/reorderable | 3270 | 3114 | -156 | 33 | **no** |
| material-x | button/button | 4828 | 4844 | +16 | 49 | yes |
| material-x | button/icon-button | 5380 | 5109 | -271 | 54 | **no** |
| material-x | button/link-button | 4799 | 4808 | +9 | 48 | yes |
| material-x | button/switch-button | 5411 | 5188 | -223 | 55 | **no** |
| material-x | button/switch-icon-button | 5870 | 5603 | -267 | 59 | **no** |
| material-x | button/split-button | 7514 | 7408 | -106 | 76 | **no** |
| material-x | button-group/button-group | 3308 | 3120 | -188 | 34 | **no** |
| material-x | button-group/connected-button-group | 4024 | 3884 | -140 | 41 | **no** |
| material-x | checkbox/checkbox | 4144 | 4021 | -123 | 42 | **no** |
| material-x | fab/fab | 4351 | 4234 | -117 | 44 | **no** |
| material-x | icon/icon | 661 | 661 | 0 | 10 | yes |
| material-x | list/list | 3664 | 3673 | +9 | 37 | yes |
| material-x | list/list-item | 2585 | 2599 | +14 | 26 | yes |
| material-x | list/list-button-item | 4555 | 4575 | +20 | 46 | yes |
| material-x | list/list-link-item | 4763 | 4746 | -17 | 48 | yes |
| material-x | radio/radio | 3581 | 3590 | +9 | 36 | yes |
| material-x | text-field/multiline-text-field | 4434 | 4437 | +3 | 45 | yes |
| material-x | text-field/text-field | 8396 | 8128 | -268 | 84 | **no** |
| material-x | complete | 17137 | 16949 | -188 | 172 | **no** |

11 rows outside the noise bound.

**The cause of each row outside the bound.** Every one of them is smaller. At commit 1, each of these entries kept core's runtime trait factory (`trait` from `traits/attributes.js` and `traits/primitives.js`) in the bundle, for one of two reasons:

- the entry exports a trait object: `Reorderable` (core's `traits/reorderable`), `FABLike` (`fab/fab`), `Indeterminable` (`checkbox/checkbox`) and `SplitButtonLike` (`button/split-button`);
- the entry imports a module that keeps a spread of a shared trait list as a dead statement, `[...BUTTON_CORE_TRAITS];` and its kin, which is `repo:RF-63`'s defect: `button/IconButtonCore.js`, `button/SwitchCore.js`, `button-group/ButtonGroupCore.js` and `text-field/TextFieldCore.js` reach `button/icon-button`, `button/switch-button`, `button/switch-icon-button`, `button-group/button-group`, `button-group/connected-button-group`, `button/split-button` and `text-field/text-field`.

At commit 7 a trait is a plain class, the lists are tuple types, and no factory exists, so neither cause is left. `complete` holds all of them. The rows that move by less than the bound are the brand install becoming `impl(this, …)`, `observedAttributes` losing its `new Set` and linking each trait's hoisted list.