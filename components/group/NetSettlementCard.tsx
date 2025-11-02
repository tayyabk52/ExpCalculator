'use client';

import { useState } from 'react';
import { ArrowRight, CheckCircle2, Clock, Loader2, Undo2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils/expense-utils';
import { supabase } from '@/lib/db/supabase';
import type { NetSettlement } from '@/lib/types/group';
import type { Currency } from '@/lib/types/expense';
import { format } from 'date-fns';

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
    <Card
      className={`p-3 sm:p-4 shadow-sm hover:shadow-md transition-all ${
        settlement.status === 'closed'
          ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
          : ''
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        {/* Settlement Info */}
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          {settlement.status === 'closed' ? (
            <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
          ) : (
            <Clock className="h-5 w-5 text-orange-600 flex-shrink-0" />
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap text-sm sm:text-base">
              <span className="font-semibold truncate">{settlement.from}</span>
              <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
              <span className="font-semibold truncate">{settlement.to}</span>
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              {settlement.relatedExpenses.length} expense
              {settlement.relatedExpenses.length !== 1 ? 's' : ''} combined
            </div>
          </div>
        </div>

        {/* Amount & Status */}
        <div className="flex items-center justify-between sm:justify-end gap-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="font-bold text-base sm:text-lg">
              {formatCurrency(settlement.amount, currency)}
            </div>
            {settlement.status === 'closed' ? (
              <Badge variant="default" className="bg-green-600 text-xs">
                Paid
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                Outstanding
              </Badge>
            )}
          </div>

          {/* Action Button */}
          {settlement.status === 'open' ? (
            <Button
              onClick={handleMarkAsPaid}
              disabled={isUpdating}
              size="sm"
              className="gap-1 sm:gap-2"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span className="hidden md:inline">Updating...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">Mark Paid</span>
                  <span className="md:hidden">✓</span>
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleUndo}
              disabled={isUpdating}
              size="sm"
              variant="outline"
              className="gap-1 sm:gap-2"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span className="hidden md:inline">Undoing...</span>
                </>
              ) : (
                <>
                  <Undo2 className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">Undo</span>
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
