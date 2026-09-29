import { chunkIntoRows } from './gridLayout';

describe('chunkIntoRows', () => {
  it('splits items into rows of the given size keeping the last partial row', () => {
    expect(chunkIntoRows([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('returns no rows for an empty list', () => {
    expect(chunkIntoRows([], 3)).toEqual([]);
  });
});
