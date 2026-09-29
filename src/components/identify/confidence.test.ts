import { confidencePercent, confidenceTier } from './confidence';

describe('confidenceTier', () => {
  it('splits scores into high, medium and low', () => {
    expect(confidenceTier(0.92)).toBe('high');
    expect(confidenceTier(0.75)).toBe('high');
    expect(confidenceTier(0.6)).toBe('medium');
    expect(confidenceTier(0.45)).toBe('medium');
    expect(confidenceTier(0.2)).toBe('low');
  });
});

describe('confidencePercent', () => {
  it('rounds and keeps the value between 0 and 100', () => {
    expect(confidencePercent(0.876)).toBe(88);
    expect(confidencePercent(1.3)).toBe(100);
    expect(confidencePercent(-0.1)).toBe(0);
  });
});
