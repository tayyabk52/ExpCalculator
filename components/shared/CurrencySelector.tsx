import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import type { Currency } from '@/lib/types/expense';

interface CurrencySelectorProps {
  value: Currency;
  onChange: (currency: Currency) => void;
  label?: string;
}

const CURRENCIES: { value: Currency; label: string; symbol: string }[] = [
  { value: 'PKR', label: 'Pakistani Rupee', symbol: '₨' },
  { value: 'USD', label: 'US Dollar', symbol: '$' },
  { value: 'EUR', label: 'Euro', symbol: '€' },
  { value: 'GBP', label: 'British Pound', symbol: '£' },
  { value: 'AED', label: 'UAE Dirham', symbol: 'د.إ' },
];

export default function CurrencySelector({ value, onChange, label = 'Currency' }: CurrencySelectorProps) {
  return (
    <div className="space-y-1 sm:space-y-2">
      <Label className="text-xs sm:text-sm">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-10 sm:h-9 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CURRENCIES.map((curr) => (
            <SelectItem key={curr.value} value={curr.value} className="text-sm">
              {curr.symbol} {curr.label} ({curr.value})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
