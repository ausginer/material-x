export async function updatePlaybackRate(
  animation: Animation,
  playbackRate: number,
): Promise<void> {
  animation.updatePlaybackRate(playbackRate);
  await animation.ready;
}
