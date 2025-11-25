export function updatePlaybackRate(
  animation: Animation,
  playbackRate: number,
  callback: (animation: Animation) => void,
): void {
  animation.updatePlaybackRate(playbackRate);
  void animation.ready.then(callback);
}
