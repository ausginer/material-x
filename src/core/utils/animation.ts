export function updatePlaybackRate(
  animation: Animation,
  playbackRate: number,
  callback: (animation: Animation) => void,
): void {
  animation.updatePlaybackRate(playbackRate);
  animation.ready.then(callback);
}
