/**
 * The source projects' setup: the oracles wrap the classes in `src`.
 */
import { Gesture } from '../../src/kernel/gesture.ts';
import { RectIndex } from '../../src/sortable/rect-index.ts';
import { installOracles } from './oracles.ts';

installOracles(RectIndex, Gesture);
