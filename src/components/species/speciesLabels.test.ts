import { careLevelLabel, suggestedWateringDays, temperatureRangeLabel, wateringRangeLabel } from './speciesLabels';

const t = (key: string, options?: Record<string, unknown>) => (options ? `${key}:${JSON.stringify(options)}` : key);

describe('wateringRangeLabel', () => {
  it('shows a range when the interval varies', () => {
    expect(wateringRangeLabel(7, 10, t)).toBe('species:wateringEveryRange:{"min":7,"max":10}');
  });

  it('collapses equal bounds into a single interval', () => {
    expect(wateringRangeLabel(5, 5, t)).toBe('species:wateringEvery:{"days":5}');
    expect(wateringRangeLabel(1, 1, t)).toBe('species:wateringDaily');
  });
});

describe('suggestedWateringDays', () => {
  it('uses the middle of the range and never goes below one day', () => {
    expect(suggestedWateringDays(7, 10)).toBe(9);
    expect(suggestedWateringDays(1, 1)).toBe(1);
  });
});

describe('labels', () => {
  it('formats temperature and care level', () => {
    expect(temperatureRangeLabel(18, 30)).toBe('18–30 °C');
    expect(careLevelLabel('easy', t)).toBe('species:careLevelEasy');
  });
});
