import getColors from './base/colors.js';
import getElevation from './base/elevation.js';
import getMotion from './base/motion.js';
import getTypography from './base/typography.js';
import getButtons from './components/buttons.js';

try {
  await getColors();
  await getTypography();
  await getMotion();
  await getElevation();
  await getButtons();
} catch (e) {
  console.error(e);
  process.exit(1);
}
