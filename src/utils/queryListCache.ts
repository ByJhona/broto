type UpsertOptions<T> = {
  merge?: (existing: T, incoming: T) => T;
  position?: 'start' | 'end';
};

export function upsertInList<T extends { id: string }>(list: T[], incoming: T, options?: UpsertOptions<T>): T[] {
  const index = list.findIndex((item) => item.id === incoming.id);

  if (index === -1) {
    return options?.position === 'start' ? [incoming, ...list] : [...list, incoming];
  }

  const next = [...list];
  next[index] = options?.merge ? options.merge(next[index], incoming) : incoming;
  return next;
}

export function patchInList<T extends { id: string }>(list: T[], id: string, updater: (item: T) => T): T[] {
  return list.map((item) => (item.id === id ? updater(item) : item));
}

export function removeFromList<T extends { id: string }>(list: T[], id: string): T[] {
  return list.filter((item) => item.id !== id);
}
