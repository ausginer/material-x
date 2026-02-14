/** @type {import('@ladle/react').UserConfig} */
export default {
  base: '/material-x/',
  stories: 'src/**/*.stories.{tsx,mdx}',
  port: 6006,
  host: '127.0.0.1',
  outDir: '.docs',
  previewHost: '127.0.0.1',
  previewPort: 5173,
  hmrHost: '127.0.0.1',
  hmrPort: 24678,
  storyOrder: (stories) => {
    return stories;
  },
};
