Iterator.from(temp1.querySelectorAll('.token'))
  .map((token) => [
    token.querySelector('.display-name')?.textContent,
    token.querySelector('.token-value-text')?.textContent,
  ])
  .filter(([name, value]) => name != null && value != null)
  .map(([name, value]) => [
    `$${name
      .trim()
      .replaceAll(/[\s\-()]+/gu, '-')
      .toLowerCase()}`,
    `var(--${value.trim().replaceAll(/\./gu, '-')}, ${value
      .trim()
      .replaceAll(/\./gu, '-')
      .replace(/md-sys-color-/u, 'sys-color.$')
      .replace(/md-sys-/u, 'sys.$')
      .replace(/md-ref-/u, 'refs.$')})`,
  ])
  .reduce((acc, [name, value]) => {
    acc += `${name}: ${value};\n`;
    return acc;
  }, '');
