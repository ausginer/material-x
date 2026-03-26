import { defineConfig, type UserConfigFnObject } from 'vite';
const config: UserConfigFnObject = defineConfig(() => ({
  build: {
    target: 'esnext',
  },
  cacheDir: '.vite',
}));

export default config;
