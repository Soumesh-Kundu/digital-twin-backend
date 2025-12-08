export function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function randomStep(prev: number, stepMax: number, pUp: number): number {
  const goUp = Math.random() < pUp;
  const mag = Math.random() * stepMax;
  return prev + (goUp ? mag : -mag);
}
