export function toggleListItem<T>(items: readonly T[], item: T): T[] {
  return items.includes(item) ? items.filter((current) => current !== item) : [...items, item];
}
