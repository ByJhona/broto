import { toggleListItem } from './list';

describe('toggleListItem', () => {
  it('adds an item that is not in the list', () => {
    expect(toggleListItem(['a'], 'b')).toEqual(['a', 'b']);
  });

  it('removes an item that is already in the list', () => {
    expect(toggleListItem(['a', 'b'], 'a')).toEqual(['b']);
  });
});
