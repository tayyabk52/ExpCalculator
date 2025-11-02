'use client';

import { Scale, Receipt, Percent, Sigma, ArrowRightLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import HelpButton from '@/components/shared/HelpButton';
import type { Person, SplitMethod, Currency } from '@/lib/types/expense';
import { formatCurrency } from '@/lib/utils/expense-utils';

interface SplitMethodSelectorProps {
  method: SplitMethod;
  setMethod: (method: SplitMethod) => void;
  people: Person[];
  exactByPerson: Record<string, number>;
  setExactByPerson: (exact: Record<string, number>) => void;
  percentByPerson: Record<string, number>;
  setPercentByPerson: (percent: Record<string, number>) => void;
  sharesByPerson: Record<string, number>;
  setSharesByPerson: (shares: Record<string, number>) => void;
  useLineItems: boolean;
  currency: Currency;
  calculations: any;
}

export default function SplitMethodSelector({
  method,
  setMethod,
  people,
  exactByPerson,
  setExactByPerson,
  percentByPerson,
  setPercentByPerson,
  sharesByPerson,
  setSharesByPerson,
  useLineItems,
  currency,
  calculations,
}: SplitMethodSelectorProps) {
  const activePeople = people.filter((p) => p.active);

  return (
    <Card>
      <CardHeader className="pb-3 sm:pb-6">
        <div className="flex items-center gap-2">
          <Badge className="bg-amber-600">4</Badge>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg flex-1">
            <ArrowRightLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            Split Method
          </CardTitle>
          <HelpButton title="How to Split the Bill?" color="text-amber-600">
            <ul className="space-y-1.5">
              <li><strong>Equal:</strong> Everyone pays the same amount (good for shared meals)</li>
              <li><strong>Exact:</strong> Each person pays a specific amount you set</li>
              <li><strong>Percent:</strong> Split by percentage (like 60% / 40%)</li>
              <li><strong>Shares:</strong> Split by ratio (like 2 shares for John, 1 share for Mary)</li>
            </ul>
          </HelpButton>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={method} onValueChange={(v) => setMethod(v as SplitMethod)}>
          <TabsList className="grid w-full grid-cols-4 h-auto">
            <TabsTrigger value="EQUAL" className="gap-1 sm:gap-2 flex-col sm:flex-row py-2 px-1 sm:px-3">
              <Scale className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="text-xs sm:text-sm">Equal</span>
            </TabsTrigger>
            <TabsTrigger value="EXACT" className="gap-1 sm:gap-2 flex-col sm:flex-row py-2 px-1 sm:px-3">
              <Receipt className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="text-xs sm:text-sm">Exact</span>
            </TabsTrigger>
            <TabsTrigger value="PERCENT" className="gap-1 sm:gap-2 flex-col sm:flex-row py-2 px-1 sm:px-3">
              <Percent className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="text-xs sm:text-sm">Percent</span>
            </TabsTrigger>
            <TabsTrigger value="SHARES" className="gap-1 sm:gap-2 flex-col sm:flex-row py-2 px-1 sm:px-3">
              <Sigma className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="text-xs sm:text-sm">Shares</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="EQUAL" className="mt-3 sm:mt-4 text-xs sm:text-sm text-muted-foreground">
            Everyone pays the same. Toggle participants in Step 1.
          </TabsContent>

          <TabsContent value="EXACT" className="mt-3 sm:mt-4">
            <div className="mb-2 text-xs sm:text-sm text-muted-foreground">
              {useLineItems ? (
                <>
                  Assigned: {formatCurrency(calculations.assignedSum, currency)} · Unassigned:{' '}
                  {formatCurrency(calculations.unassignedAmount, currency)}
                </>
              ) : (
                <>Type per-person exact amounts or use line items</>
              )}
            </div>
            <div className="space-y-2">
              {activePeople.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-2 rounded-lg border p-2 sm:p-2.5">
                  <Badge variant="outline" className="text-xs sm:text-sm">{p.name}</Badge>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      className="w-24 sm:w-32 text-base"
                      value={
                        useLineItems
                          ? (calculations.assignedForDisplay[p.id] || 0) +
                            calculations.exactEachUnassigned
                          : exactByPerson[p.id] || 0
                      }
                      onChange={(e) =>
                        setExactByPerson({ ...exactByPerson, [p.id]: Number(e.target.value) })
                      }
                      disabled={useLineItems}
                    />
                    <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">{currency}</span>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="PERCENT" className="mt-3 sm:mt-4">
            <div className="space-y-2">
              {activePeople.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-2 rounded-lg border p-2 sm:p-2.5">
                  <Badge variant="outline" className="text-xs sm:text-sm">{p.name}</Badge>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      className="w-24 sm:w-32 text-base"
                      value={percentByPerson[p.id] || 0}
                      onChange={(e) =>
                        setPercentByPerson({ ...percentByPerson, [p.id]: Number(e.target.value) })
                      }
                    />
                    <span className="text-xs sm:text-sm text-muted-foreground">%</span>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="SHARES" className="mt-3 sm:mt-4">
            <div className="space-y-2">
              {activePeople.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-2 rounded-lg border p-2 sm:p-2.5">
                  <Badge variant="outline" className="text-xs sm:text-sm">{p.name}</Badge>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      className="w-24 sm:w-32 text-base"
                      value={sharesByPerson[p.id] || 0}
                      onChange={(e) =>
                        setSharesByPerson({ ...sharesByPerson, [p.id]: Number(e.target.value) })
                      }
                    />
                    <span className="text-xs sm:text-sm text-muted-foreground">shares</span>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
