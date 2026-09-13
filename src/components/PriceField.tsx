import { formatPrice } from '@/utils';
import { FormField } from './FormField';

type PriceFieldProps = {
  label: string;
  cents: number;
  onChangeCents: (cents: number) => void;
};

export function PriceField({ label, cents, onChangeCents }: Readonly<PriceFieldProps>) {
  const handleChangeText = (text: string) => {
    const digits = text.replace(/\D/g, '');
    onChangeCents(digits ? Number(digits) : 0);
  };

  return (
    <FormField
      label={label}
      value={cents > 0 ? formatPrice(cents) : ''}
      onChangeText={handleChangeText}
      keyboardType="number-pad"
      placeholder="R$ 0,00"
    />
  );
}
