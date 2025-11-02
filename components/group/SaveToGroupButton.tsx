'use client';

import { useState } from 'react';
import { Save, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { supabase } from '@/lib/db/supabase';
import { ensureGroupMembers } from '@/lib/utils/group-utils';
import type { Person, LineItem, Payer, SplitMethod, Currency, Transfer } from '@/lib/types/expense';
import type { ExpenseData } from '@/lib/types/group';

type SaveToGroupButtonProps = {
  groupId: string;
  groupCode: string;
  people: Person[];
  currency: Currency;
  total: number;
  items: LineItem[];
  payers: Payer[];
  method: SplitMethod;
  useLineItems: boolean;
  exactByPerson?: Record<string, number>;
  percentByPerson?: Record<string, number>;
  sharesByPerson?: Record<string, number>;
  transfers: Transfer[];
  disabled?: boolean;
};

export default function SaveToGroupButton({
  groupId,
  groupCode,
  people,
  currency,
  total,
  items,
  payers,
  method,
  useLineItems,
  exactByPerson,
  percentByPerson,
  sharesByPerson,
  transfers,
  disabled = false,
}: SaveToGroupButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expenseTitle, setExpenseTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activePeople = people.filter(p => p.active);

  const handleSave = async () => {
    if (!expenseTitle.trim()) {
      setError('Please enter an expense title');
      return;
    }

    if (activePeople.length === 0) {
      setError('No active members in this expense');
      return;
    }

    if (total <= 0) {
      setError('Expense total must be greater than 0');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // Step 1: Ensure all people are added as group members
      const memberNames = activePeople.map(p => p.name);
      await ensureGroupMembers(groupId, memberNames);

      // Step 2: Prepare expense data
      const expenseData: ExpenseData = {
        title: expenseTitle.trim(),
        timestamp: new Date().toISOString(),
        currency,
        total,
        people: activePeople,
        items,
        payers,
        method,
        useLineItems,
        exactByPerson,
        percentByPerson,
        sharesByPerson,
        transfers,
      };

      // Step 3: Insert expense
      const { data: expense, error: expenseError } = await supabase
        .from('group_expenses')
        .insert({
          group_id: groupId,
          title: expenseTitle.trim(),
          currency,
          total_amount: total,
          expense_data: expenseData,
        })
        .select()
        .single();

      if (expenseError) throw expenseError;
      if (!expense) throw new Error('Failed to create expense');

      // Step 4: Insert settlements
      if (transfers.length > 0) {
        const settlements = transfers.map(transfer => ({
          expense_id: expense.id,
          group_id: groupId,
          from_member: people.find(p => p.id === transfer.from)?.name || '',
          to_member: people.find(p => p.id === transfer.to)?.name || '',
          amount: transfer.amount,
          status: 'open' as const,
        }));

        const { error: settlementsError } = await supabase
          .from('group_settlements')
          .insert(settlements);

        if (settlementsError) throw settlementsError;
      }

      // Success!
      setSaveSuccess(true);
      setIsSaving(false);

      // Close dialog after 2 seconds
      setTimeout(() => {
        setIsOpen(false);
        setSaveSuccess(false);
        setExpenseTitle('');
      }, 2000);

    } catch (err: any) {
      console.error('Error saving expense:', err);
      setError(err.message || 'Failed to save expense');
      setIsSaving(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!isSaving) {
      setIsOpen(open);
      if (!open) {
        setError(null);
        setSaveSuccess(false);
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          disabled={disabled || activePeople.length === 0 || total <= 0}
          className="w-full gap-2 min-w-0"
          size="lg"
        >
          <Save className="h-4 w-4" />
          Add to Group List
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save Expense to Group</DialogTitle>
          <DialogDescription>
            This expense will be added to group {groupCode} and settlements will be tracked
          </DialogDescription>
        </DialogHeader>

        {!saveSuccess ? (
          <div className="space-y-4 py-4">
            {/* Expense Title */}
            <div className="space-y-2">
              <Label htmlFor="expense-title">Expense Title *</Label>
              <Input
                id="expense-title"
                placeholder="e.g., Dinner at Italian Restaurant"
                value={expenseTitle}
                onChange={(e) => setExpenseTitle(e.target.value)}
                disabled={isSaving}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSave();
                  }
                }}
              />
            </div>

            {/* Summary */}
            <div className="p-3 rounded-lg bg-muted/50 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Amount:</span>
                <span className="font-medium">{currency} {total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Members:</span>
                <span className="font-medium">{activePeople.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Settlements:</span>
                <span className="font-medium">{transfers.length}</span>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleSave}
                disabled={isSaving || !expenseTitle.trim()}
                className="flex-1"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Expense'
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center space-y-4">
            <div className="flex justify-center">
              <div className="rounded-full bg-green-100 dark:bg-green-900/20 p-3">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold">Expense Saved!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Successfully added to group {groupCode}
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
