'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils/expense-utils';
import type { MemberBalance } from '@/lib/types/group';
import type { Currency } from '@/lib/types/expense';

type MemberBalanceSummaryProps = {
  balances: MemberBalance[];
  currency: Currency;
};

export default function MemberBalanceSummary({ balances, currency }: MemberBalanceSummaryProps) {
  if (balances.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-center text-muted-foreground">No member data available</p>
      </Card>
    );
  }

  // Sort by net balance (creditors first, then debtors)
  const sortedBalances = [...balances].sort((a, b) => b.netBalance - a.netBalance);

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-1">Member Summary</h3>
          <p className="text-sm text-muted-foreground">
            Overall balance for each member
          </p>
        </div>

        <div className="space-y-3">
          {sortedBalances.map((balance) => {
            const isCreditor = balance.netBalance > 0.01;
            const isDebtor = balance.netBalance < -0.01;
            const isEven = !isCreditor && !isDebtor;

            return (
              <div
                key={balance.name}
                className={`p-4 rounded-lg border ${
                  isCreditor
                    ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                    : isDebtor
                    ? 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800'
                    : 'bg-muted/50'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {isCreditor ? (
                      <TrendingUp className="h-5 w-5 text-green-600 flex-shrink-0" />
                    ) : isDebtor ? (
                      <TrendingDown className="h-5 w-5 text-orange-600 flex-shrink-0" />
                    ) : (
                      <Minus className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-base">{balance.name}</div>
                      <div className="text-sm text-muted-foreground mt-0.5">
                        {isCreditor && 'Receives money'}
                        {isDebtor && 'Owes money'}
                        {isEven && 'All settled'}
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="font-bold text-lg">
                      {formatCurrency(Math.abs(balance.netBalance), currency)}
                    </div>
                    {isCreditor && (
                      <Badge variant="default" className="bg-green-600 mt-1">
                        To Receive
                      </Badge>
                    )}
                    {isDebtor && (
                      <Badge variant="secondary" className="mt-1">
                        To Pay
                      </Badge>
                    )}
                    {isEven && (
                      <Badge variant="outline" className="mt-1">
                        Settled
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Detailed breakdown */}
                {(balance.owedTo.length > 0 || balance.owedBy.length > 0) && (
                  <div className="mt-3 pt-3 border-t space-y-1.5">
                    {balance.owedTo.map((debt, idx) => (
                      <div
                        key={idx}
                        className="text-sm flex items-center justify-between"
                      >
                        <span className="text-muted-foreground">
                          Owes to <span className="font-medium text-foreground">{debt.member}</span>
                        </span>
                        <span className="font-semibold">
                          {formatCurrency(debt.amount, currency)}
                        </span>
                      </div>
                    ))}
                    {balance.owedBy.map((credit, idx) => (
                      <div
                        key={idx}
                        className="text-sm flex items-center justify-between"
                      >
                        <span className="text-muted-foreground">
                          Receives from <span className="font-medium text-foreground">{credit.member}</span>
                        </span>
                        <span className="font-semibold">
                          {formatCurrency(credit.amount, currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
