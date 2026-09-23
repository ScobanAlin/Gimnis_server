// utils/scoring.ts
// FIG tolerance averaging, shared between rankingModel and the Google Sheets sync.

export function getAllowedTolerance(avg: number): number {
  if (avg >= 8.0) return 0.3;
  if (avg >= 7.0) return 0.4;
  if (avg >= 6.0) return 0.5;
  return 0.6;
}

export function applyTolerance(arr: number[]): number {
  if (arr.length < 4) return 0;

  const sorted = [...arr].sort((a, b) => a - b);
  const middleTwo = [sorted[1], sorted[2]];
  const avgMiddle = (middleTwo[0] + middleTwo[1]) / 2;
  const diff = Math.abs(middleTwo[0] - middleTwo[1]);
  const allowed = getAllowedTolerance(avgMiddle);

  if (diff > allowed) {
    const allAvg = arr.reduce((a, b) => a + b, 0) / arr.length;
    return allAvg;
  }

  return avgMiddle;
}
