import { patchInList, removeFromList, upsertInList } from './queryListCache';

type Item = { id: string; label: string };

describe('upsertInList', () => {
  it('appends the item at the end by default when the id is missing', () => {
    const current: Item[] = [{ id: '1', label: 'first' }];

    const result = upsertInList(current, { id: '2', label: 'second' });

    expect(result).toEqual([
      { id: '1', label: 'first' },
      { id: '2', label: 'second' },
    ]);
  });

  it('inserts the item at the start when position is "start"', () => {
    const current: Item[] = [{ id: '1', label: 'first' }];

    const result = upsertInList(current, { id: '2', label: 'second' }, { position: 'start' });

    expect(result).toEqual([
      { id: '2', label: 'second' },
      { id: '1', label: 'first' },
    ]);
  });

  it('replaces the existing item instead of duplicating it when no merge is given', () => {
    const current: Item[] = [
      { id: '1', label: 'first' },
      { id: '2', label: 'second' },
    ];

    const result = upsertInList(current, { id: '1', label: 'updated' });

    expect(result).toHaveLength(2);
    expect(result).toEqual([
      { id: '1', label: 'updated' },
      { id: '2', label: 'second' },
    ]);
  });

  it('runs the custom merge function, letting it preserve fields from the existing item', () => {
    type Proposal = { id: string; status: string; joinedField: string };
    const current: Proposal[] = [{ id: '1', status: 'pending', joinedField: 'from initial fetch' }];
    const incoming: Proposal = { id: '1', status: 'accepted', joinedField: '' };

    const result = upsertInList(current, incoming, {
      merge: (existing, next) => ({ ...next, joinedField: existing.joinedField }),
    });

    expect(result).toEqual([{ id: '1', status: 'accepted', joinedField: 'from initial fetch' }]);
  });
});

describe('patchInList', () => {
  it('applies the updater to the item with a matching id', () => {
    const current: Item[] = [
      { id: '1', label: 'first' },
      { id: '2', label: 'second' },
    ];

    const result = patchInList(current, '2', (item) => ({ ...item, label: 'updated' }));

    expect(result).toEqual([
      { id: '1', label: 'first' },
      { id: '2', label: 'updated' },
    ]);
  });

  it('returns the list unchanged when no item matches the id', () => {
    const current: Item[] = [{ id: '1', label: 'first' }];

    const result = patchInList(current, '2', (item) => ({ ...item, label: 'updated' }));

    expect(result).toEqual(current);
  });
});

describe('removeFromList', () => {
  it('removes the item with a matching id', () => {
    const current: Item[] = [
      { id: '1', label: 'first' },
      { id: '2', label: 'second' },
    ];

    const result = removeFromList(current, '1');

    expect(result).toEqual([{ id: '2', label: 'second' }]);
  });

  it('returns the list unchanged when no item matches the id', () => {
    const current: Item[] = [{ id: '1', label: 'first' }];

    const result = removeFromList(current, '2');

    expect(result).toEqual(current);
  });
});
