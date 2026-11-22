// Architect probe for repo:RF-79 and repo:RF-81: the text field's disabled
// opacities, its prefix, suffix and placeholder colours, and the typescale's
// tracking, as store.select() reads them (expressive, web).
import store from '../../../packages/tproc/src/store/index.ts';

for (const name of [
  'md.comp.filled-text-field.disabled.container.opacity',
  'md.comp.filled-text-field.disabled.input-text.color',
  'md.comp.filled-text-field.disabled.input-text.opacity',
  'md.comp.filled-text-field.disabled.active-indicator.color',
  'md.comp.filled-text-field.disabled.active-indicator.opacity',
  'md.comp.outlined-text-field.disabled.outline.color',
  'md.comp.outlined-text-field.disabled.outline.opacity',
  'md.comp.filled-text-field.input-text.prefix.color',
  'md.comp.filled-text-field.input-text.suffix.color',
  'md.comp.filled-text-field.input-text.placeholder.color',
  'md.comp.filled-text-field.label-text.line-height',
  'md.comp.filled-text-field.label-text.populated.line-height',
  'md.sys.typescale.label-large.tracking',
  'md.sys.typescale.body-large.tracking',
]) {
  const token = store.getToken(name);
  console.log(
    name,
    token ? JSON.stringify(store.select(token).value) : 'MISSING',
  );
}
