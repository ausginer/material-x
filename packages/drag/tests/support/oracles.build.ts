/**
 * The consumer project's setup: the oracles wrap the classes in the emitted
 * modules, which are the instances that the published `sortable/y.js` and
 * `kernel/session.js` import. The project's resolver refuses an unpublished
 * module of `src`, so these are imported by their emitted paths.
 */
// @ts-ignore -- the emitted tree is a build output, and may have no declaration
import { Gesture } from '../../kernel/gesture.js';
// @ts-ignore -- the emitted tree is a build output, and may have no declaration
import { RectIndex } from '../../sortable/rect-index.js';
import { installOracles } from './oracles.ts';

installOracles(RectIndex, Gesture);
