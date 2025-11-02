'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Receipt, Calendar, Users as UsersIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils/expense-utils';
import type { GroupExpense, GroupSettlement } from '@/lib/types/group';
import { format } from 'date-fns';

type ExpenseCardProps = {
  expense: GroupExpense;
  settlements: GroupSettlement[];
  onViewDetails?: () => void;
};

export default function ExpenseCard({ expense, settlements, onViewDetails }: ExpenseCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const { expense_data } = expense;
  const activePeople = expense_data.people.filter(p => p.active);

  // Calculate who paid
  const payers = expense_data.payers
    .filter(p => p.amount > 0)
    .map(p => {
      const person = expense_data.people.find(person => person.id === p.id);
      return { name: person?.name || 'Unknown', amount: p.amount };
    });

  // Group settlements by member
  const settlementsByMember = settlements.reduce((acc, settlement) => {
    const key = settlement.from_member;
    if (!acc[key]) acc[key] = [];
    acc[key].push(settlement);
    return acc;
  }, {} as Record<string, GroupSettlement[]>);

  // Count settled vs open
  const settledCount = settlements.filter(s => s.status === 'closed').length;
  const openCount = settlements.filter(s => s.status === 'open').length;

  return (
    <Card className="overflow-hidden shadow-sm hover:shadow-md transition-all">
      <div className="p-3 sm:p-4 space-y-2.5 sm:space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 sm:gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-1.5 sm:gap-2">
              <div className="mt-0.5">
                <Receipt className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base sm:text-lg leading-tight break-words">
                  {expense.title}
                </h3>
                <div className="flex items-center gap-2 mt-1 text-xs sm:text-sm text-muted-foreground flex-wrap">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    <span className="hidden sm:inline">{format(new Date(expense.created_at), 'MMM d, yyyy • h:mm a')}</span>
                    <span className="sm:hidden">{format(new Date(expense.created_at), 'MMM d, yyyy')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex-shrink-0 h-8 w-8 p-0"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Summary */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="font-semibold text-xs sm:text-sm">
            {formatCurrency(expense.total_amount, expense.currency)}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {expense_data.method}
          </Badge>
          <div className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground">
            <UsersIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span>{activePeople.length}</span>
          </div>
        </div>

        {/* Payer Info */}
        <div className="text-xs sm:text-sm">
          <span className="text-muted-foreground">Paid by: </span>
          <span className="font-medium">
            {payers.map((p, i) => (
              <span key={i}>
                {p.name} ({formatCurrency(p.amount, expense.currency)})
                {i < payers.length - 1 && ', '}
              </span>
            ))}
          </span>
        </div>

        {/* Settlement Status */}
        <div className="flex items-center gap-1.5 sm:gap-2 text-sm flex-wrap">
          {settledCount > 0 && (
            <Badge variant="default" className="bg-green-600 text-xs">
              ✓ {settledCount}
            </Badge>
          )}
          {openCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              ⏳ {openCount}
            </Badge>
          )}
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="pt-2.5 sm:pt-3 border-t space-y-2.5 sm:space-y-3">
            {/* Individual Settlements */}
            <div className="space-y-1.5 sm:space-y-2">
              <p className="text-xs sm:text-sm font-medium">Settlements:</p>
              <div className="space-y-1.5">
                {activePeople.map(person => {
                  const personSettlements = settlements.filter(s => s.from_member === person.name);
                  const owed = expense_data.transfers.find(t =>
                    expense_data.people.find(p => p.id === t.from)?.name === person.name
                  );

                  if (!owed || owed.amount === 0) return null;

                  const toPerson = expense_data.people.find(p => p.id === owed.to);
                  const settlement = personSettlements.find(s => s.to_member === toPerson?.name);

                  return (
                    <div
                      key={person.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-sm"
                    >
                      <div>
                        <span className="font-medium">{person.name}</span>
                        <span className="text-muted-foreground"> owes </span>
                        <span className="font-medium">{toPerson?.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">
                          {formatCurrency(owed.amount, expense.currency)}
                        </span>
                        {settlement?.status === 'closed' ? (
                          <Badge variant="default" className="bg-green-600 text-xs">
                            ✓ Paid
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            ⏳ Open
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* View Details Button */}
            {onViewDetails && (
              <Button
                variant="outline"
                onClick={onViewDetails}
                className="w-full"
                size="sm"
              >
                View Full Details
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
