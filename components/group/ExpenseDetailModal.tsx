'use client';

import { useEffect, useState } from 'react';
import { X, Calendar, Users as UsersIcon, CreditCard, ArrowRightLeft, Receipt, History } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/expense-utils';
import type { GroupExpense, GroupSettlement } from '@/lib/types/group';
import { format } from 'date-fns';
import { getExpenseSettlements } from '@/lib/utils/group-utils';

type ExpenseDetailModalProps = {
  expense: GroupExpense | null;
  isOpen: boolean;
  onClose: () => void;
};

export default function ExpenseDetailModal({
  expense,
  isOpen,
  onClose,
}: ExpenseDetailModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [settlements, setSettlements] = useState<GroupSettlement[]>([]);

  useEffect(() => {
    if (isOpen) {
      // Small delay to trigger animation after render
      setTimeout(() => setIsVisible(true), 10);

      // Fetch settlements for this expense
      if (expense?.id) {
        getExpenseSettlements(expense.id).then(setSettlements);
      }
    } else {
      setIsVisible(false);
      setSettlements([]);
    }
  }, [isOpen, expense?.id]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen || !expense) return null;

  const { expense_data } = expense;
  const activePeople = expense_data.people.filter(p => p.active);

  // Calculate who paid what
  const payers = expense_data.payers
    .filter(p => p.amount > 0)
    .map(p => {
      const person = expense_data.people.find(person => person.id === p.id);
      return { id: p.id, name: person?.name || 'Unknown', amount: p.amount };
    });

  // Helper to get initials from name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div
      className={`modal-backdrop fixed inset-0 bg-black/60 flex flex-col justify-end sm:items-center sm:justify-center z-50 ${isVisible ? 'modal-visible' : ''}`}
      onClick={handleBackdropClick}
    >
      <div className="modal-panel bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Drag Handle (mobile only) */}
        <div className="sm:hidden flex justify-center py-2 bg-white">
          <div className="w-12 h-1 bg-slate-300 rounded-full"></div>
        </div>

        {/* Header */}
        <div className="animated-content delay-100 flex items-start justify-between p-4 border-b border-slate-200 bg-white">
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-slate-900">{expense.title}</h2>
            <div className="flex items-center gap-1 text-sm text-slate-600 mt-1">
              <Calendar className="h-3.5 w-3.5" />
              {format(new Date(expense.created_at), 'MMMM d, yyyy • h:mm a')}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 -mt-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1">
          <div className="p-4 space-y-4">
            {/* Hero Summary Box */}
            <div className="animated-content delay-200 bg-emerald-600 rounded-xl p-4 text-white">
              <div className="text-sm opacity-90 mb-1">Total Amount</div>
              <div className="text-3xl font-bold mb-3">
                {formatCurrency(expense.total_amount, expense.currency)}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs opacity-90">Split Method:</span>
                <span className="bg-emerald-700 px-2 py-0.5 rounded text-xs font-medium capitalize">
                  {expense_data.method}
                </span>
              </div>
            </div>

            {/* Members Section */}
            {activePeople.length > 0 && (
              <div className="animated-content delay-300">
                <div className="flex items-center gap-2 mb-3">
                  <UsersIcon className="h-4 w-4 text-slate-600" />
                  <h3 className="text-sm font-semibold text-slate-900">Members Involved</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {activePeople.map((person) => (
                    <div key={person.id} className="flex items-center gap-2 bg-slate-100 border border-slate-200 rounded-full pl-1 pr-3 py-1">
                      <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-medium text-slate-700">
                        {getInitials(person.name)}
                      </div>
                      <span className="text-sm text-slate-900">{person.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Who Paid Section */}
            {payers.length > 0 && (
              <div className="animated-content delay-400">
                <div className="flex items-center gap-2 mb-3">
                  <CreditCard className="h-4 w-4 text-slate-600" />
                  <h3 className="text-sm font-semibold text-slate-900">Who Paid</h3>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
                  {payers.map((payer) => (
                    <div key={payer.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-medium text-slate-700">
                          {getInitials(payer.name)}
                        </div>
                        <span className="text-sm text-slate-900">{payer.name}</span>
                      </div>
                      <span className="text-sm font-semibold text-slate-900">
                        {formatCurrency(payer.amount, expense.currency)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* How Split Section */}
            <div className="animated-content delay-500">
              <div className="flex items-center gap-2 mb-3">
                <UsersIcon className="h-4 w-4 text-slate-600" />
                <h3 className="text-sm font-semibold text-slate-900">How It's Split</h3>
              </div>
              <div className="space-y-2">
                {activePeople.map(person => {
                  // Calculate share
                  let share = 0;
                  switch (expense_data.method) {
                    case 'EQUAL':
                      share = expense.total_amount / activePeople.length;
                      break;
                    case 'EXACT':
                      share = expense_data.exactByPerson?.[person.id] || 0;
                      break;
                    case 'PERCENT':
                      share = (expense.total_amount * (expense_data.percentByPerson?.[person.id] || 0)) / 100;
                      break;
                    case 'SHARES':
                      const totalShares = activePeople.reduce((sum, p) =>
                        sum + (expense_data.sharesByPerson?.[p.id] || 0), 0
                      );
                      share = totalShares > 0
                        ? (expense.total_amount * (expense_data.sharesByPerson?.[person.id] || 0)) / totalShares
                        : 0;
                      break;
                  }

                  const paid = payers.find(p => p.id === person.id)?.amount || 0;
                  const percentage = ((share / expense.total_amount) * 100).toFixed(1);

                  return (
                    <div key={person.id} className="border border-slate-200 rounded-lg p-3 bg-white">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-medium text-slate-700">
                            {getInitials(person.name)}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-slate-900">{person.name}</div>
                            <div className="text-xs text-slate-600">{percentage}% of total</div>
                          </div>
                        </div>
                        <div className="text-sm font-semibold text-slate-900">
                          {formatCurrency(share, expense.currency)}
                        </div>
                      </div>
                      {paid > 0 && (
                        <div className="text-xs text-slate-600 mt-2">
                          Paid: {formatCurrency(paid, expense.currency)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Settlements Section */}
            {expense_data.transfers.length > 0 && (
              <div className="animated-content delay-500">
                <div className="flex items-center gap-2 mb-3">
                  <ArrowRightLeft className="h-4 w-4 text-slate-600" />
                  <h3 className="text-sm font-semibold text-slate-900">Required Settlements</h3>
                </div>
                <div className="space-y-2">
                  {expense_data.transfers.map((transfer, idx) => {
                    const fromPerson = expense_data.people.find(p => p.id === transfer.from);
                    const toPerson = expense_data.people.find(p => p.id === transfer.to);

                    // Find matching settlement to show current vs original amount
                    const settlement = settlements.find(
                      s => s.from_member === fromPerson?.name && s.to_member === toPerson?.name
                    );

                    const originalAmount = transfer.amount;
                    const currentAmount = settlement?.amount ?? originalAmount;
                    const totalAutoSettled = settlement?.offset_history?.reduce(
                      (sum, offset) => sum + offset.offset_amount, 0
                    ) ?? 0;
                    const hasBeenOffset = totalAutoSettled > 0;

                    return (
                      <div
                        key={idx}
                        className="bg-emerald-50 border border-emerald-200 rounded-lg p-3"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-medium text-slate-700">
                              {getInitials(fromPerson?.name || 'Unknown')}
                            </div>
                            <ArrowRightLeft className="h-3.5 w-3.5 text-slate-500" />
                            <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-medium text-slate-700">
                              {getInitials(toPerson?.name || 'Unknown')}
                            </div>
                          </div>
                          <div className="text-right">
                            {hasBeenOffset && settlement?.status === 'open' ? (
                              <>
                                <div className="text-sm font-semibold text-slate-900">
                                  {formatCurrency(currentAmount, expense.currency)}
                                </div>
                                <div className="text-xs text-slate-500 line-through">
                                  {formatCurrency(originalAmount, expense.currency)}
                                </div>
                              </>
                            ) : (
                              <span className="text-sm font-semibold text-slate-900">
                                {formatCurrency(originalAmount, expense.currency)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-slate-600">
                          <span className="font-medium text-slate-900">{fromPerson?.name}</span>
                          {' '}owes{' '}
                          <span className="font-medium text-slate-900">{toPerson?.name}</span>
                        </div>
                        {hasBeenOffset && settlement?.status === 'open' && (
                          <div className="mt-2 pt-2 border-t border-emerald-300">
                            <div className="text-xs text-emerald-700">
                              ✓ Auto-settled: {formatCurrency(totalAutoSettled, expense.currency)}
                            </div>
                          </div>
                        )}
                        {settlement?.status === 'closed' && settlement.reconciliation_method === 'auto_offset' && (
                          <div className="mt-2 pt-2 border-t border-emerald-300">
                            <div className="text-xs text-emerald-700">
                              ✓ Fully auto-settled
                            </div>
                          </div>
                        )}
                        {settlement?.status === 'closed' && settlement.reconciliation_method === 'manual_payment' && (
                          <div className="mt-2 pt-2 border-t border-emerald-300">
                            <div className="text-xs text-emerald-700">
                              ✓ Paid on {format(new Date(settlement.closed_at!), 'MMM d, yyyy')}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Settlement Offset History Section */}
            {settlements.some(s => s.offset_history && s.offset_history.length > 0) && (
              <div className="animated-content delay-600">
                <div className="flex items-center gap-2 mb-3">
                  <History className="h-4 w-4 text-slate-600" />
                  <h3 className="text-sm font-semibold text-slate-900">Settlement History</h3>
                </div>
                <div className="space-y-3">
                  {settlements
                    .filter(s => s.offset_history && s.offset_history.length > 0)
                    .map(settlement => (
                      <div key={settlement.id} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                        <div className="text-xs font-medium text-slate-700 mb-2">
                          {settlement.from_member} → {settlement.to_member}
                        </div>
                        <div className="space-y-2">
                          {settlement.offset_history.map((offset, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-xs">
                              <div className="w-1 h-1 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0"></div>
                              <div className="flex-1">
                                <div className="text-slate-900">
                                  <span className="font-medium">{format(new Date(offset.offset_at), 'MMM d, yyyy')}</span>
                                  {' - '}Auto-offset by "{offset.offset_by_expense_title}"
                                </div>
                                <div className="text-slate-600 mt-0.5">
                                  {offset.offset_from} paid {offset.offset_to}{' '}
                                  {formatCurrency(offset.offset_amount, expense.currency)}
                                </div>
                                <div className="text-slate-500 mt-0.5">
                                  Reduced from {formatCurrency(offset.previous_amount, expense.currency)}{' '}
                                  to {formatCurrency(offset.new_amount, expense.currency)}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Line Items Section */}
            {expense_data.useLineItems && expense_data.items.length > 0 && (
              <div className="animated-content delay-500">
                <div className="flex items-center gap-2 mb-3">
                  <Receipt className="h-4 w-4 text-slate-600" />
                  <h3 className="text-sm font-semibold text-slate-900">Line Items</h3>
                </div>
                <div className="space-y-2">
                  {expense_data.items.map(item => {
                    const owner = expense_data.people.find(p => p.id === item.ownerId);
                    return (
                      <div
                        key={item.id}
                        className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0"
                      >
                        <div>
                          <div className="text-sm font-medium text-slate-900">{item.label || 'Unnamed Item'}</div>
                          {owner && (
                            <div className="text-xs text-slate-600">
                              Assigned to: {owner.name}
                            </div>
                          )}
                        </div>
                        <span className="text-sm font-semibold text-slate-900">
                          {formatCurrency(item.amount, expense.currency)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
