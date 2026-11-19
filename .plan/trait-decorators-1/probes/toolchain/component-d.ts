import { Traits } from './element.ts';
import type { Disableable, FocusForwarding } from './traits.ts';
import type { ButtonCoreTraits } from './groups.ts';

export class IconButton extends Traits<
  [...ButtonCoreTraits, typeof Disableable, typeof FocusForwarding]
> {
  override focus(options?: FocusOptions): void {
    this.disabled = false;
    super.focus(options);
  }
}
