'use client';

import { useEffect, useState } from 'react';
import { SplitSquareHorizontal, FileDown } from 'lucide-react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Person, LineItem, Payer, SplitMethod, Currency } from '@/lib/types/expense';
import { generateId } from '@/lib/utils/expense-utils';
import { useExpenseCalculations } from '@/hooks/useExpenseCalculations';
import PeopleManager from '@/components/expense/PeopleManager';
import CurrencySelector from '@/components/shared/CurrencySelector';
import BillAmountSection from '@/components/expense/BillAmountSection';
import PaymentTracker from '@/components/expense/PaymentTracker';
import SplitMethodSelector from '@/components/expense/SplitMethodSelector';
import ResultsDisplay from '@/components/expense/ResultsDisplay';
import AIExpenseInput from '@/components/expense/AIExpenseInput';
import { exportExpenseToPDF } from '@/lib/utils/pdf-exporter';
import type { CalculatorState } from '@/lib/types/ai-expense';

export default function ExpenseCalculatorContainer() {
  // State
  const [people, setPeople] = useState<Person[]>([]);
  const [currency, setCurrency] = useState<Currency>('PKR');
  const [total, setTotal] = useState<number>(0);
  const [useLineItems, setUseLineItems] = useState(false);
  const [items, setItems] = useState<LineItem[]>([]);
  const [payers, setPayers] = useState<Payer[]>([]);
  const [method, setMethod] = useState<SplitMethod>('EQUAL');
  const [exactByPerson, setExactByPerson] = useState<Record<string, number>>({});
  const [percentByPerson, setPercentByPerson] = useState<Record<string, number>>({});
  const [sharesByPerson, setSharesByPerson] = useState<Record<string, number>>({});

  // Calculations
  const calculations = useExpenseCalculations(
    people,
    method,
    useLineItems,
    items,
    total,
    payers,
    exactByPerson,
    percentByPerson,
    sharesByPerson
  );

  // Auto-switch to EXACT when using line items
  useEffect(() => {
    if (!useLineItems) return;
    const anyAssigned = items.some((i) => i.ownerId && isFinite(i.amount) && i.amount > 0);
    if (anyAssigned && method !== 'EXACT') setMethod('EXACT');
  }, [useLineItems, items, method]);

  // Helper functions
  const upsertPayer = (id: string, amount: number) => {
    setPayers((prev) => {
      const idx = prev.findIndex((p) => p.id === id);
      if (idx === -1) return [...prev, { id, amount }];
      const copy = [...prev];
      copy[idx] = { id, amount };
      return copy;
    });
  };

  const addItem = () =>
    setItems((prev) => [...prev, { id: generateId(), label: '', amount: 0 }]);

  const removeItem = (id: string) =>
    setItems((prev) => prev.filter((i) => i.id !== id));

  const updateItem = (id: string, updates: Partial<LineItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const handleExportPDF = () => {
    exportExpenseToPDF({
      currency,
      people,
      items,
      payers,
      method,
      useLineItems,
      calculations,
      exactByPerson,
      percentByPerson,
      sharesByPerson,
    });
  };

  const loadDemo = () => {
    const alice = { id: generateId(), name: 'Alice', active: true };
    const bob = { id: generateId(), name: 'Bob', active: true };
    const charlie = { id: generateId(), name: 'Charlie', active: true };
    setPeople([alice, bob, charlie]);
    setCurrency('USD');
    setUseLineItems(false);
    setItems([]);
    setTotal(150);
    setPayers([
      { id: alice.id, amount: 150 },
      { id: bob.id, amount: 0 },
      { id: charlie.id, amount: 0 },
    ]);
    setMethod('EQUAL');
    setExactByPerson({});
    setPercentByPerson({});
    setSharesByPerson({});
  };

  // Handler for AI-generated data
  const handleAIApply = (state: CalculatorState) => {
    console.log('Applying AI-generated state:', state);

    // Apply all state from AI
    setPeople(state.people);
    setCurrency(state.currency);
    setTotal(state.total);
    setUseLineItems(state.useLineItems);
    setItems(state.items);
    setPayers(state.payers);
    setMethod(state.method);
    setExactByPerson(state.exactByPerson);
    setPercentByPerson(state.percentByPerson);
    setSharesByPerson(state.sharesByPerson);

    // Smooth scroll to show filled calculator
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  return (
    <TooltipProvider delayDuration={0} skipDelayDuration={0}>
      <div className="w-full overflow-x-hidden">
        <div className="mx-auto max-w-7xl p-3 sm:p-4 md:p-6 lg:p-8">
          {/* Header */}
          <div className="mb-6 sm:mb-8 space-y-4 sm:space-y-0 sm:flex sm:items-start sm:justify-between sm:gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10">
                  <SplitSquareHorizontal className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
                    Smart Expense Calculator
                  </h1>
                  <p className="text-sm sm:text-base text-muted-foreground mt-0.5">
                    Split bills fairly and easily
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className="inline-flex sm:hidden rounded-lg text-[10px] px-2 py-0.5">
                Who Paid ≠ Who Owes
              </Badge>
            </div>

            <div className="w-full sm:w-auto sm:ml-auto">
              <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2 pb-2 border-b">
                  <span className="text-xs font-medium text-muted-foreground">Currency</span>
                  <Badge variant="secondary" className="hidden sm:inline-flex text-[10px] px-2 py-0.5">
                    Who Paid ≠ Who Owes
                  </Badge>
                </div>
                <CurrencySelector value={currency} onChange={setCurrency} />
                <div className="flex items-center gap-2 pt-1">
                  <Button 
                    onClick={loadDemo} 
                    variant="secondary"
                    className="flex-1 h-9"
                    size="sm"
                  >
                    Demo
                  </Button>
                  <Button 
                    onClick={handleExportPDF} 
                    variant="outline" 
                    className="flex-1 gap-2 h-9"
                    size="sm"
                  >
                    <FileDown className="h-3.5 w-3.5" />
                    <span>Export</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* AI Quick Setup - Mobile First, Prominent */}
          <div className="mb-6 sm:mb-8">
            <AIExpenseInput
              mode="standalone"
              onApply={handleAIApply}
            />
          </div>

        {/* Main Content */}
        <div className="grid gap-4 sm:gap-5 lg:gap-6 lg:grid-cols-2 w-full min-w-0">
          {/* Left Column - Input */}
          <div className="space-y-4 sm:space-y-5 lg:space-y-6 min-w-0">
            <PeopleManager people={people} setPeople={setPeople} />

            <BillAmountSection
              total={total}
              setTotal={setTotal}
              useLineItems={useLineItems}
              setUseLineItems={setUseLineItems}
              items={items}
              addItem={addItem}
              removeItem={removeItem}
              updateItem={updateItem}
              people={people}
              currency={currency}
              calculations={calculations}
            />

            <PaymentTracker
              people={people}
              payers={payers}
              upsertPayer={upsertPayer}
              currency={currency}
              calculations={calculations}
            />
          </div>

          {/* Right Column - Split & Results */}
          <div className="space-y-4 sm:space-y-5 lg:space-y-6 min-w-0">
            <SplitMethodSelector
              method={method}
              setMethod={setMethod}
              people={people}
              exactByPerson={exactByPerson}
              setExactByPerson={setExactByPerson}
              percentByPerson={percentByPerson}
              setPercentByPerson={setPercentByPerson}
              sharesByPerson={sharesByPerson}
              setSharesByPerson={setSharesByPerson}
              useLineItems={useLineItems}
              currency={currency}
              calculations={calculations}
            />

            <ResultsDisplay
              calculations={calculations}
              currency={currency}
              method={method}
              useLineItems={useLineItems}
            />
          </div>
        </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
