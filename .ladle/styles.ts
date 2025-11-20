const { theme } = document.documentElement.dataset;

if (theme === 'dark') {
  await import('./dark.css');
} else {
  await import('./light.css');
}

export {};
