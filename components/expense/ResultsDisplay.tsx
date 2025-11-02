'use client';

import { Info, ArrowRightLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import HelpButton from '@/components/shared/HelpButton';
import type { Currency, SplitMethod } from '@/lib/types/expense';
import { formatCurrency, clamp2 } from '@/lib/utils/expense-utils';

interface ResultsDisplayProps {
  calculations: any;
  currency: Currency;
  method: SplitMethod;
  useLineItems: boolean;
}

export default function ResultsDisplay({
  calculations,
  currency,
  method,
  useLineItems,
}: ResultsDisplayProps) {
  const { activePeople, transfers, owedByPerson, payersMap, assignedSum, unassignedAmount, exactEachUnassigned, assignedForDisplay, unassignedForDisplay } = calculations;

  return (
    <div className="space-y-4 sm:space-y-5 lg:space-y-6">
      {/* Summary */}
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <div className="flex items-center gap-2">
            <Badge className="bg-indigo-600">5</Badge>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg flex-1">
              <Info className="h-4 w-4 sm:h-5 sm:w-5" />
              Summary
            </CardTitle>
            <HelpButton title="Net Balance Explained" color="text-indigo-600">
              <p className="mb-2">This shows the final balance for each person:</p>
              <ul className="space-y-1">
                <li><span className="text-emerald-600 font-semibold">Green (positive):</span> They should receive this money</li>
                <li><span className="text-rose-600 font-semibold">Red (negative):</span> They owe this money</li>
              </ul>
            </HelpButton>
          </div>
        </CardHeader>
        <CardContent>
          {activePeople.length === 0 ? (
            <div className="text-xs sm:text-sm text-muted-foreground text-center py-4">
              Add people and amounts to see results
            </div>
          ) : (
            <div className="space-y-2">
              {activePeople.map((p: any) => {
                const paid = payersMap[p.id] || 0;
                const owes = owedByPerson[p.id] || 0;
                const net = clamp2(paid - owes);
                return (
                  <div key={p.id} className="flex items-center justify-between rounded-lg border p-2.5 sm:p-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-muted text-xs sm:text-sm font-semibold flex-shrink-0">
                        {p.name.charAt(0).toUpperCase()}
                      </span>
                      <span className="font-medium text-sm sm:text-base truncate">{p.name}</span>
                    </div>
                    <div
                      className={`font-semibold text-sm sm:text-base whitespace-nowrap ml-2 ${
                        net < -0.01
                          ? 'text-rose-600'
                          : net > 0.01
                          ? 'text-emerald-600'
                          : 'text-slate-500'
                      }`}
                    >
                      {formatCurrency(net, currency)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Settlements */}
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <div className="flex items-center gap-2">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg flex-1">
              <ArrowRightLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              Suggested Settlements
            </CardTitle>
            <HelpButton title="Minimum Payments" color="text-indigo-600">
              <p>These are the smallest number of money transfers needed to settle all debts. Instead of everyone paying everyone, we combine payments efficiently.</p>
            </HelpButton>
          </div>
        </CardHeader>
        <CardContent>
          {transfers.length === 0 ? (
            <div className="text-xs sm:text-sm text-muted-foreground text-center py-4">
              No transfers needed. 🎉
            </div>
          ) : (
            <div className="space-y-2">
              {transfers.map((t: any, idx: number) => {
                const from = activePeople.find((p: any) => p.id === t.from)?.name || '';
                const to = activePeople.find((p: any) => p.id === t.to)?.name || '';
                return (
                  <div key={idx} className="flex items-center justify-between rounded-lg border p-2.5 sm:p-3 gap-2">
                    <div className="text-xs sm:text-sm min-w-0">
                      <span className="font-medium">{from}</span> ➜{' '}
                      <span className="font-medium">{to}</span>
                    </div>
                    <div className="font-semibold text-sm sm:text-base whitespace-nowrap">
                      {formatCurrency(t.amount, currency)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="mt-3 text-xs text-muted-foreground">
            Net balances are computed (paid − owes), then settled with minimal transfers
          </div>
        </CardContent>
      </Card>

      {/* Audit */}
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="text-base sm:text-lg">Detailed Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          {useLineItems && method === 'EXACT' && (
            <div className="text-xs text-muted-foreground">
              Assigned: <b>{formatCurrency(assignedSum, currency)}</b> · Unassigned:{' '}
              <b>{formatCurrency(unassignedAmount, currency)}</b> → split equally (
              <b>{formatCurrency(exactEachUnassigned, currency)}</b> each)
            </div>
          )}

          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <div className="inline-block min-w-full align-middle">
              <div className="overflow-hidden rounded-lg border">
                <table className="w-full text-left text-[10px] sm:text-xs">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-1.5 sm:p-2 whitespace-nowrap">Person</th>
                      <th className="p-1.5 sm:p-2 whitespace-nowrap">Assigned</th>
                      <th className="p-1.5 sm:p-2 whitespace-nowrap">Unassigned</th>
                      <th className="p-1.5 sm:p-2 whitespace-nowrap">Owes</th>
                      <th className="p-1.5 sm:p-2 whitespace-nowrap">Paid</th>
                      <th className="p-1.5 sm:p-2 whitespace-nowrap">Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activePeople.map((p: any) => {
                      const assigned = assignedForDisplay[p.id] || 0;
                      const unassigned = unassignedForDisplay[p.id] || 0;
                      const owes = owedByPerson[p.id] || 0;
                      const paid = payersMap[p.id] || 0;
                      const net = clamp2(paid - owes);
                      return (
                        <tr key={p.id} className="border-t">
                          <td className="p-1.5 sm:p-2 font-medium whitespace-nowrap">{p.name}</td>
                          <td className="p-1.5 sm:p-2 whitespace-nowrap">{formatCurrency(assigned, currency)}</td>
                          <td className="p-1.5 sm:p-2 whitespace-nowrap">{formatCurrency(unassigned, currency)}</td>
                          <td className="p-1.5 sm:p-2 whitespace-nowrap">{formatCurrency(owes, currency)}</td>
                          <td className="p-1.5 sm:p-2 whitespace-nowrap">{formatCurrency(paid, currency)}</td>
                          <td className="p-1.5 sm:p-2 font-medium whitespace-nowrap">{formatCurrency(net, currency)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
