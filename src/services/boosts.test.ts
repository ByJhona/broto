import { isBoostActive } from './boosts';

describe('isBoostActive', () => {
  it('is false when there is no boost at all', () => {
    expect(isBoostActive(null)).toBe(false);
  });

  it('is true while the boost has not expired yet', () => {
    const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    expect(isBoostActive(oneHourFromNow)).toBe(true);
  });

  it('is false once the boost has expired', () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    expect(isBoostActive(oneHourAgo)).toBe(false);
  });
});
