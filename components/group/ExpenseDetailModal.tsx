'use client';

import { X, Calendar, Users as UsersIcon, DollarSign, ArrowRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils/expense-utils';
import type { GroupExpense } from '@/lib/types/group';
import { format } from 'date-fns';

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
  if (!expense) return null;

  const { expense_data } = expense;
  const activePeople = expense_data.people.filter(p => p.active);

  // Calculate who paid what
  const payers = expense_data.payers
    .filter(p => p.amount > 0)
    .map(p => {
      const person = expense_data.people.find(person => person.id === p.id);
      return { id: p.id, name: person?.name || 'Unknown', amount: p.amount };
    });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl pr-8">{expense.title}</DialogTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{format(new Date(expense.created_at), 'MMMM d, yyyy • h:mm a')}</span>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Summary Section */}
          <Card className="p-4 bg-muted/50">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Total Amount</div>
                <div className="text-2xl font-bold">
                  {formatCurrency(expense.total_amount, expense.currency)}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Split Method</div>
                <Badge variant="secondary" className="text-base">
                  {expense_data.method}
                </Badge>
              </div>
            </div>
          </Card>

          {/* Members Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <UsersIcon className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold text-lg">Members ({activePeople.length})</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {activePeople.map(person => (
                <Badge key={person.id} variant="outline" className="px-3 py-1.5">
                  {person.name}
                </Badge>
              ))}
            </div>
          </div>

          {/* Who Paid Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold text-lg">Who Paid</h3>
            </div>
            <div className="space-y-2">
              {payers.map(payer => (
                <div
                  key={payer.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <span className="font-medium">{payer.name}</span>
                  <span className="font-semibold">
                    {formatCurrency(payer.amount, expense.currency)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* How Split Section */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">How It's Split</h3>
            <div className="space-y-2">
              {activePeople.map(person => {
                // Find what this person owes
                const owed = expense_data.transfers.find(t =>
                  expense_data.people.find(p => p.id === t.from)?.name === person.name
                );

                const paid = payers.find(p => p.id === person.id)?.amount || 0;
                const owes = owed?.amount || 0;

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

                return (
                  <div
                    key={person.id}
                    className="p-3 rounded-lg border bg-card space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{person.name}</span>
                      <span className="text-sm text-muted-foreground">
                        Share: {formatCurrency(share, expense.currency)}
                      </span>
                    </div>
                    {paid > 0 && (
                      <div className="text-sm text-muted-foreground">
                        Paid: {formatCurrency(paid, expense.currency)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Settlements Section */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Settlements Required</h3>
            {expense_data.transfers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No settlements needed</p>
            ) : (
              <div className="space-y-2">
                {expense_data.transfers.map((transfer, idx) => {
                  const fromPerson = expense_data.people.find(p => p.id === transfer.from);
                  const toPerson = expense_data.people.find(p => p.id === transfer.to);

                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-lg bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{fromPerson?.name}</span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{toPerson?.name}</span>
                      </div>
                      <span className="font-bold">
                        {formatCurrency(transfer.amount, expense.currency)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Line Items (if any) */}
          {expense_data.useLineItems && expense_data.items.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Line Items</h3>
              <div className="space-y-2">
                {expense_data.items.map(item => {
                  const owner = expense_data.people.find(p => p.id === item.ownerId);
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div>
                        <div className="font-medium">{item.label || 'Unnamed Item'}</div>
                        {owner && (
                          <div className="text-sm text-muted-foreground">
                            Assigned to: {owner.name}
                          </div>
                        )}
                      </div>
                      <span className="font-semibold">
                        {formatCurrency(item.amount, expense.currency)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Close Button */}
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
