/** Format an elapsed-ms duration as `M:SS.S` (e.g. `0:04.7`, `1:23.4`). */
export function formatTime(ms: number): string {
  const total = Math.max(0, ms) / 1000;
  const minutes = Math.floor(total / 60);
  const seconds = total - minutes * 60;
  // Pad seconds with a leading zero for sub-10s, keep one decimal place.
  const secStr = (seconds < 10 ? '0' : '') + seconds.toFixed(1);
  return `${minutes}:${secStr}`;
}
