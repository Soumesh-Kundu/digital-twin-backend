import { ThresholdTransition } from './types/param-types';

export class ParamHistory {
  private values: number[] = new Array(5);
  private index = 0;
  private count = 0;

  push(v: number) {
    this.values[this.index] = v;
    this.index = (this.index + 1) % 5;
    if (this.count < 5) this.count++;
  }

  last(): number | undefined {
    if (this.count === 0) return undefined;
    const idx = (this.index - 1 + 5) % 5;
    return this.values[idx];
  }

  prev(): number | undefined {
    if (this.count < 2) return undefined;
    const idx = (this.index - 2 + 5) % 5;
    return this.values[idx];
  }
}

export function classifyThresholdTransition(
  history: ParamHistory,
  thresholdBandLow: number,
): ThresholdTransition {
  const last = history.last();
  const prev = history.prev();

  if (last === undefined) return 'BELOW';

  const lastIn = last >= thresholdBandLow;
  const prevIn = prev !== undefined && prev >= thresholdBandLow;

  if (lastIn && !prevIn) return 'ENTERING';
  if (lastIn && prevIn) return 'STAYING';
  if (!lastIn && prevIn) return 'LEAVING';
  return 'BELOW';
}
