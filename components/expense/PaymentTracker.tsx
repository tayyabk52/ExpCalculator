'use client';

import { Wallet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import HelpButton from '@/components/shared/HelpButton';
import type { Person, Payer, Currency } from '@/lib/types/expense';
import { formatCurrency, clamp2 } from '@/lib/utils/expense-utils';

interface PaymentTrackerProps {
  people: Person[];
  payers: Payer[];
  upsertPayer: (id: string, amount: number) => void;
  currency: Currency;
  calculations: any;
}

export default function PaymentTracker({
  people,
  payers,
  upsertPayer,
  currency,
  calculations,
}: PaymentTrackerProps) {
  const activePeople = people.filter((p) => p.active);
  const totalToShow = calculations.totalToUse || 0;
  const paidTotal = calculations.paidTotal || 0;
  const payerDelta = clamp2(totalToShow - paidTotal);
  const progress = totalToShow > 0 ? Math.min((paidTotal / totalToShow) * 100, 100) : 0;

  return (
    <Card>
      <CardHeader className="pb-3 sm:pb-6">
        <div className="flex items-center gap-2">
          <Badge className="bg-purple-600">3</Badge>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg flex-1">
            <Wallet className="h-4 w-4 sm:h-5 sm:w-5" />
            Who Paid
          </CardTitle>
          <HelpButton title="Record Payments" color="text-purple-600">
            <p>Enter how much money each person paid. This is different from how much they owe! For example, if Sarah paid the whole bill of $100, enter 100 next to her name even if she only owes $33.</p>
          </HelpButton>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <span>Total Paid</span>
            <span className="font-medium">{formatCurrency(paidTotal, currency)}</span>
          </div>
          <Progress value={progress} className="h-2" />
          {payerDelta !== 0 && (
            <div
              className={`text-xs ${
                payerDelta > 0 ? 'text-orange-600' : 'text-emerald-600'
              }`}
            >
              {payerDelta > 0
                ? `Need ${formatCurrency(Math.abs(payerDelta), currency)} more`
                : `Overpaid by ${formatCurrency(Math.abs(payerDelta), currency)}`}
            </div>
          )}
        </div>

        <div className="space-y-2 sm:space-y-3">
          {activePeople.map((person) => {
            const payer = payers.find((p) => p.id === person.id);
            const amount = payer?.amount || 0;

            return (
              <div key={person.id} className="flex items-center gap-2 sm:gap-3">
                <Label className="min-w-[80px] sm:min-w-[100px] text-sm sm:text-base truncate">
                  {person.name}
                </Label>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => upsertPayer(person.id, Number(e.target.value))}
                  className="flex-1 text-base"
                  placeholder="0"
                />
                <span className="text-xs sm:text-sm text-muted-foreground min-w-[40px] sm:min-w-[50px] whitespace-nowrap">
                  {currency}
                </span>
              </div>
            );
          })}
        </div>

        {activePeople.length === 0 && (
          <div className="text-center text-xs sm:text-sm text-muted-foreground py-4">
            Add people first
          </div>
        )}
      </CardContent>
    </Card>
  );
}
