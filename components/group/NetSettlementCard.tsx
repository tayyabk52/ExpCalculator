'use client';

import { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/expense-utils';
import { supabase } from '@/lib/db/supabase';
import type { NetSettlement } from '@/lib/types/group';
import type { Currency } from '@/lib/types/expense';

type NetSettlementCardProps = {
  settlement: NetSettlement;
  currency: Currency;
  onStatusChanged?: () => void;
};

export default function NetSettlementCard({
  settlement,
  currency,
  onStatusChanged,
}: NetSettlementCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleMarkAsPaid = async () => {
    setIsUpdating(true);

    try {
      const { error } = await supabase
        .from('group_settlements')
        .update({
          status: 'closed',
          closed_at: new Date().toISOString(),
          reconciliation_method: 'manual_payment',
        })
        .in('expense_id', settlement.relatedExpenses)
        .eq('from_member', settlement.from)
        .eq('to_member', settlement.to)
        .eq('status', 'open');

      if (error) throw error;

      onStatusChanged?.();
    } catch (error) {
      console.error('Error marking settlement as paid:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUndo = async () => {
    setIsUpdating(true);

    try {
      const { error } = await supabase
        .from('group_settlements')
        .update({
          status: 'open',
          closed_at: null,
          reconciliation_method: null,
        })
        .in('expense_id', settlement.relatedExpenses)
        .eq('from_member', settlement.from)
        .eq('to_member', settlement.to)
        .eq('status', 'closed');

      if (error) throw error;

      onStatusChanged?.();
    } catch (error) {
      console.error('Error undoing settlement:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg sm:rounded-xl sm:shadow-sm border border-slate-100">
      {/* Row 1: The "What" and "How much" */}
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          {/* Semantic Icon - Outstanding (Amber) or Settled (Emerald) */}
          <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
            settlement.status === 'closed'
              ? 'bg-emerald-100'
              : 'bg-amber-100'
          }`}>
            {settlement.status === 'closed' ? (
              <svg className="w-5 h-5 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
          <div>
            <p className="text-base font-semibold text-slate-900">
              {settlement.from} → {settlement.to}
            </p>
            <p className="text-sm text-slate-500">
              {settlement.relatedExpenses.length} expense{settlement.relatedExpenses.length !== 1 ? 's' : ''} combined
            </p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-lg font-bold text-slate-900">
            {formatCurrency(settlement.amount, currency)}
          </p>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-slate-100 my-4"></div>

      {/* Row 2: The "Status & Action" */}
      <div className="flex items-center justify-between">
        <div>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
            settlement.status === 'closed'
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-amber-100 text-amber-800'
          }`}>
            {settlement.status === 'closed' ? 'Settled' : 'Outstanding'}
          </span>
        </div>

        {/* Action Button - Only show for open settlements */}
        {settlement.status === 'open' && (
          <button
            onClick={handleMarkAsPaid}
            disabled={isUpdating}
            className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-800 text-white flex items-center justify-center hover:bg-slate-900 transition-all focus:outline-none focus:ring-2 focus:ring-slate-800 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUpdating ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Check className="w-5 h-5" strokeWidth={3} />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
