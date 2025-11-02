'use client';

import { Receipt, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import HelpButton from '@/components/shared/HelpButton';
import type { LineItem, Person, Currency } from '@/lib/types/expense';
import { formatCurrency } from '@/lib/utils/expense-utils';

interface BillAmountSectionProps {
  total: number;
  setTotal: (total: number) => void;
  useLineItems: boolean;
  setUseLineItems: (use: boolean) => void;
  items: LineItem[];
  addItem: () => void;
  removeItem: (id: string) => void;
  updateItem: (id: string, updates: Partial<LineItem>) => void;
  people: Person[];
  currency: Currency;
  calculations: any;
}

export default function BillAmountSection({
  total,
  setTotal,
  useLineItems,
  setUseLineItems,
  items,
  addItem,
  removeItem,
  updateItem,
  people,
  currency,
  calculations,
}: BillAmountSectionProps) {
  const activePeople = people.filter((p) => p.active);

  return (
    <Card>
      <CardHeader className="pb-3 sm:pb-6">
        <div className="flex items-center gap-2">
          <Badge className="bg-emerald-600">2</Badge>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg flex-1">
            <Receipt className="h-4 w-4 sm:h-5 sm:w-5" />
            Bill Amount
          </CardTitle>
          <HelpButton title="What are Line Items?" color="text-emerald-600">
            <p>Turn this ON when each person ordered different things (like at a restaurant). You can enter each item separately and assign it to who ordered it. Items not assigned to anyone will be split equally among everyone.</p>
            <p className="mt-2 text-xs opacity-80">Example: Pizza for $20 → assign to John. Drinks for $15 → split equally.</p>
          </HelpButton>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4">
        <div className="space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 sm:gap-3 flex-1">
            <Label className="min-w-[60px] sm:min-w-[90px] text-sm sm:text-base">Total</Label>
            <Input
              type="number"
              value={total}
              onChange={(e) => setTotal(Number(e.target.value))}
              disabled={useLineItems}
              className="w-full max-w-xs text-base"
            />
            <span className="text-sm text-muted-foreground whitespace-nowrap">{currency}</span>
          </div>
          <div className="flex items-center gap-2 justify-end sm:justify-start">
            <Label className="text-xs sm:text-sm">Line Items</Label>
            <Switch checked={useLineItems} onCheckedChange={setUseLineItems} />
          </div>
        </div>

        {useLineItems && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-muted-foreground">Total from items</span>
              <span className="font-medium">
                {formatCurrency(calculations.totalFromItems, currency)}
              </span>
            </div>

            <div className="rounded-lg border bg-muted/50 p-2.5 sm:p-3 text-xs text-muted-foreground">
              <b>Assigned</b> amounts are billed exactly; any <b>unassigned</b> remainder
              is split equally
            </div>

            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col sm:grid sm:grid-cols-12 items-stretch sm:items-center gap-2 rounded-lg border bg-card p-2"
                >
                  <Input
                    className="sm:col-span-5 text-base"
                    placeholder="Label"
                    value={item.label}
                    onChange={(e) => updateItem(item.id, { label: e.target.value })}
                  />
                  <div className="flex gap-2 sm:contents">
                    <Input
                      className="sm:col-span-3 flex-1 text-base"
                      type="number"
                      placeholder="Amount"
                      value={item.amount}
                      onChange={(e) => updateItem(item.id, { amount: Number(e.target.value) })}
                    />
                    <Select
                      value={item.ownerId}
                      onValueChange={(v) => updateItem(item.id, { ownerId: v })}
                    >
                      <SelectTrigger className="sm:col-span-3 flex-1">
                        <SelectValue placeholder="Assign" />
                      </SelectTrigger>
                      <SelectContent>
                        {activePeople.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeItem(item.id)}
                      className="sm:col-span-1 h-10 w-10 flex-shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button variant="secondary" onClick={addItem} className="w-full h-10 sm:h-9">
                <Plus className="mr-2 h-4 w-4" />
                Add Line Item
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
