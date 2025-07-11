Object.fromEntries(
  Iterator.from(temp1.querySelectorAll('.token'))
    .map((token) => [
      token.querySelector('.display-name')?.textContent,
      token.querySelector('.token-value-text')?.textContent,
    ])
    .filter(([name, value]) => name != null && value != null)
    .map(([name, value]) => [
      `$${name
        .trim()
        .replace(/[\s-()]+/g, '-')
        .toLowerCase()}`,
      `var(--${value.trim().replace(/\./g, '-')})`,
    ])
    .toArray(),
);
