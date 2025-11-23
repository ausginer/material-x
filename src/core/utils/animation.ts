export async function playWith(
  animation: Animation,
  playbackRate: number,
): Promise<void> {
  await animation.ready;
  animation.playbackRate = playbackRate;
  animation.play();
}
