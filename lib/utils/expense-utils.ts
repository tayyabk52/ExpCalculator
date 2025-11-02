import type { Currency } from '@/lib/types/expense';

// Format currency
export const formatCurrency = (n: number, currency: Currency) =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(isFinite(n) ? n : 0);

// Generate unique ID
export const generateId = () => Math.random().toString(36).slice(2, 9);

// Clamp to 2 decimal places
export const clamp2 = (n: number) => Math.round((isFinite(n) ? n : 0) * 100) / 100;

// Settle debts algorithm - greedy approach
export function settleDebts(balances: Record<string, number>) {
  const creditors: { id: string; amt: number }[] = [];
  const debtors: { id: string; amt: number }[] = [];

  Object.entries(balances).forEach(([id, val]) => {
    const v = clamp2(val);
    if (v > 0.009) creditors.push({ id, amt: v });
    else if (v < -0.009) debtors.push({ id, amt: -v });
  });

  const transfers: { from: string; to: string; amount: number }[] = [];
  let i = 0, j = 0;

  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amt, creditors[j].amt);
    transfers.push({
      from: debtors[i].id,
      to: creditors[j].id,
      amount: clamp2(pay),
    });
    debtors[i].amt = clamp2(debtors[i].amt - pay);
    creditors[j].amt = clamp2(creditors[j].amt - pay);
    if (debtors[i].amt <= 0.009) i++;
    if (creditors[j].amt <= 0.009) j++;
  }

  return transfers;
}
