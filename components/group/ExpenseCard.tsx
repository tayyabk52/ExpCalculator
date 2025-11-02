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
  const manuallyPaidCount = settlements.filter(s => s.status === 'closed' && s.reconciliation_method === 'manual_payment').length;
  const autoOffsetCount = settlements.filter(s => s.status === 'closed' && s.reconciliation_method === 'auto_offset').length;
  const openCount = settlements.filter(s => s.status === 'open').length;
  const totalSettlements = settlements.length;

  // Determine overall expense status
  const getExpenseStatus = () => {
    if (totalSettlements === 0) return 'no-settlements';
    if (settledCount === totalSettlements) return 'fully-settled';
    if (settledCount > 0) return 'partially-settled';
    return 'outstanding';
  };

  const expenseStatus = getExpenseStatus();

  // Get status badge config (matching template exactly)
  const getStatusConfig = () => {
    switch (expenseStatus) {
      case 'fully-settled':
        return {
          label: 'Fully Settled',
          badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
          iconBg: 'bg-emerald-100',
          iconColor: 'text-emerald-600',
          icon: 'check_circle'
        };
      case 'partially-settled':
        return {
          label: 'Partially Settled',
          badgeClass: 'bg-amber-50 text-amber-700 border border-amber-200',
          iconBg: 'bg-amber-100',
          iconColor: 'text-amber-600',
          icon: 'timelapse'
        };
      case 'outstanding':
        return {
          label: 'Pending',
          badgeClass: 'bg-amber-50 text-amber-700 border border-amber-200',
          iconBg: 'bg-amber-100',
          iconColor: 'text-amber-600',
          icon: 'hourglass_top'
        };
      default:
        return {
          label: 'No Status',
          badgeClass: 'bg-slate-50 text-slate-600 border border-slate-200',
          iconBg: 'bg-slate-100',
          iconColor: 'text-slate-500',
          icon: 'receipt_long'
        };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <Card className={`bg-white rounded-xl shadow-sm border border-slate-100 transition-all hover:shadow-md overflow-hidden ${isExpanded ? 'expense-card-expanded' : ''}`}>
      {/* Clickable Header Area */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center space-x-3 sm:space-x-4 p-3 sm:p-4 cursor-pointer"
      >
        {/* 1. Icon */}
        <div className="flex-shrink-0">
          <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full ${statusConfig.iconBg} flex items-center justify-center`}>
            <Receipt className={`h-5 w-5 ${statusConfig.iconColor}`} />
          </div>
        </div>

        {/* 2. Main Content (Title & Date) */}
        <div className="flex-grow min-w-0">
          <h3 className="text-sm sm:text-base font-semibold text-slate-900 truncate">
            {expense.title}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 truncate">
            <span className="hidden sm:inline">{format(new Date(expense.created_at), 'MMM dd, yyyy • h:mm a')}</span>
            <span className="sm:hidden">{format(new Date(expense.created_at), 'MMM dd, yyyy')}</span>
          </p>
        </div>

        {/* 3. Amount & Status */}
        <div className="flex-shrink-0 text-right">
          <div className="text-sm sm:text-base font-semibold text-slate-900 whitespace-nowrap">
            {formatCurrency(expense.total_amount, expense.currency)}
          </div>
          {/* Modern Status Chip */}
          <div className={`mt-1 inline-flex items-center space-x-1 px-2 sm:px-2.5 py-0.5 rounded-full ${statusConfig.badgeClass} text-[10px] sm:text-xs font-medium`}>
            <span className="hidden sm:inline">{statusConfig.label}</span>
            <span className="sm:hidden">{statusConfig.label.split(' ')[0]}</span>
          </div>
        </div>

        {/* 4. Chevron */}
        <div className="flex-shrink-0 pl-1 sm:pl-2">
          <ChevronDown className="h-5 w-5 text-slate-400 expense-card-chevron" />
        </div>
      </div>

      {/* Expandable Details Content */}
      <div className="expense-card-details">
        <div className="border-t border-slate-100 px-3 sm:px-4 py-3 sm:py-4 space-y-3">
          {/* Payer Info */}
          <p className="text-xs sm:text-sm text-slate-600">
            Paid by{' '}
            {payers.map((p, i) => (
              <span key={i}>
                <span className="font-medium text-slate-800">{p.name}</span>
                <span className="text-slate-500"> ({formatCurrency(p.amount, expense.currency)})</span>
                {i < payers.length - 1 && ', '}
              </span>
            ))}
          </p>

          {/* Settlement Progress */}
          {totalSettlements > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs sm:text-sm font-medium text-slate-700">Settlement Progress</span>
                <span className="text-xs sm:text-sm font-medium text-slate-500">{settledCount}/{totalSettlements} paid</span>
              </div>
              {/* Progress Bar */}
              <div className="w-full bg-slate-200 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    expenseStatus === 'fully-settled'
                      ? 'bg-emerald-500'
                      : expenseStatus === 'partially-settled'
                      ? 'bg-amber-500'
                      : 'bg-slate-400'
                  }`}
                  style={{ width: `${(settledCount / totalSettlements) * 100}%` }}
                />
              </div>

              {/* Settlement Type Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                {manuallyPaidCount > 0 && (
                  <span className="inline-flex items-center space-x-1 px-2 sm:px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] sm:text-xs font-medium text-emerald-700">
                    <span>✓ {manuallyPaidCount} paid</span>
                  </span>
                )}
                {autoOffsetCount > 0 && (
                  <span className="inline-flex items-center space-x-1 px-2 sm:px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-[10px] sm:text-xs font-medium text-blue-700">
                    <span>⚖️ {autoOffsetCount} auto-settled</span>
                  </span>
                )}
                {openCount > 0 && (
                  <span className="inline-flex items-center space-x-1 px-2 sm:px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-[10px] sm:text-xs font-medium text-amber-700">
                    <span>⏳ {openCount} pending</span>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Individual Settlements */}
          {settlements.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs sm:text-sm font-medium text-slate-600">Individual Settlements:</p>
              <div className="space-y-2">
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
                      className="flex items-center justify-between p-2 sm:p-2.5 rounded-lg bg-slate-50 border border-slate-100"
                    >
                      <div className="flex-1 min-w-0">
                        <span className="text-xs sm:text-sm text-slate-600">
                          <span className="font-medium text-slate-800">{person.name}</span>
                          {' → '}
                          <span className="font-medium text-slate-800">{toPerson?.name}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs sm:text-sm font-semibold text-slate-900 whitespace-nowrap">
                          {formatCurrency(owed.amount, expense.currency)}
                        </span>
                        {settlement?.status === 'closed' ? (
                          settlement.reconciliation_method === 'auto_offset' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-[10px] sm:text-xs font-medium text-blue-700">
                              Auto
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] sm:text-xs font-medium text-emerald-700">
                              Paid
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-[10px] sm:text-xs font-medium text-amber-700">
                            Open
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* View Details Button */}
          {onViewDetails && (
            <Button
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails();
              }}
              className="w-full text-sm font-medium border-slate-200 hover:bg-slate-50"
              size="sm"
            >
              View Full Details
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
