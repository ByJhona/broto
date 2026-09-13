const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function formatPrice(cents: number): string {
  return currencyFormatter.format(cents / 100);
}
