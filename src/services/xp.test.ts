import { computeXpProgress } from './xp';

describe('computeXpProgress', () => {
  it('starts at level 1 with no xp', () => {
    expect(computeXpProgress(0)).toEqual({ level: 1, totalXp: 0, currentLevelXp: 0, xpToNextLevel: 50 });
  });

  it('stays at level 1 just below the next threshold', () => {
    expect(computeXpProgress(49)).toEqual({ level: 1, totalXp: 49, currentLevelXp: 49, xpToNextLevel: 1 });
  });

  it('levels up exactly at a threshold', () => {
    expect(computeXpProgress(50)).toEqual({ level: 2, totalXp: 50, currentLevelXp: 0, xpToNextLevel: 70 });
  });

  it('computes progress in the middle of a level', () => {
    expect(computeXpProgress(180)).toEqual({ level: 3, totalXp: 180, currentLevelXp: 60, xpToNextLevel: 40 });
  });

  it('caps at the highest level once xp exceeds every threshold', () => {
    expect(computeXpProgress(10000)).toEqual({ level: 11, totalXp: 10000, currentLevelXp: 7000, xpToNextLevel: null });
  });
});
