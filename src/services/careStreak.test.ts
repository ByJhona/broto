import { computeCareStreak } from './careStreak';

describe('computeCareStreak', () => {
  it('returns zero for both counts when there are no completions', () => {
    expect(computeCareStreak([], '2026-09-23')).toEqual({ current: 0, longest: 0 });
  });

  it('counts a single completion today as a streak of one', () => {
    expect(computeCareStreak(['2026-09-23'], '2026-09-23')).toEqual({ current: 1, longest: 1 });
  });

  it('keeps the streak alive when the last completion was yesterday', () => {
    const result = computeCareStreak(['2026-09-20', '2026-09-21', '2026-09-22'], '2026-09-23');
    expect(result).toEqual({ current: 3, longest: 3 });
  });

  it('resets the current streak when a day is skipped, but keeps the longest', () => {
    const result = computeCareStreak(['2026-09-15', '2026-09-16', '2026-09-17', '2026-09-22'], '2026-09-23');
    expect(result).toEqual({ current: 1, longest: 3 });
  });

  it('breaks the current streak entirely after more than one missed day', () => {
    const result = computeCareStreak(['2026-09-10', '2026-09-11'], '2026-09-23');
    expect(result).toEqual({ current: 0, longest: 2 });
  });

  it('ignores duplicate dates', () => {
    const result = computeCareStreak(['2026-09-22', '2026-09-22', '2026-09-23'], '2026-09-23');
    expect(result).toEqual({ current: 2, longest: 2 });
  });

  it('finds the longest run even when it is not the most recent one', () => {
    const result = computeCareStreak(
      ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-09-22'],
      '2026-09-23'
    );
    expect(result).toEqual({ current: 1, longest: 4 });
  });
});
