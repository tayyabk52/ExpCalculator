'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { SplitSquareHorizontal, FileDown, ArrowLeft, Users, Loader2, History } from 'lucide-react';
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
import SaveToGroupButton from '@/components/group/SaveToGroupButton';
import { exportExpenseToPDF } from '@/lib/utils/pdf-exporter';
import { getGroupByCode, getGroupMembers, formatGroupCode } from '@/lib/utils/group-utils';
import type { Group, GroupMember } from '@/lib/types/group';

export default function GroupCalculatorPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;

  // Group state
  const [group, setGroup] = useState<Group | null>(null);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calculator state
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

  // Load group data
  useEffect(() => {
    async function loadGroup() {
      try {
        setIsLoading(true);
        const groupData = await getGroupByCode(code);

        if (!groupData) {
          setError('Group not found. Please check the code.');
          setIsLoading(false);
          return;
        }

        const members = await getGroupMembers(groupData.id);

        setGroup(groupData);
        setGroupMembers(members);

        // Auto-populate members as people in calculator
        if (members.length > 0) {
          const initialPeople: Person[] = members.map(member => ({
            id: generateId(),
            name: member.name,
            active: true,
          }));
          setPeople(initialPeople);
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Error loading group:', err);
        setError('Failed to load group data');
        setIsLoading(false);
      }
    }

    loadGroup();
  }, [code]);

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

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading group...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !group) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="text-4xl">😕</div>
          <h2 className="text-2xl font-bold">Group Not Found</h2>
          <p className="text-muted-foreground">{error || 'This group does not exist'}</p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => router.push('/groups')}>
              Back to Groups
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={0} skipDelayDuration={0}>
      <div className="w-full min-h-screen bg-slate-50">
        {/* Modern Header - Mobile First */}
        <div className="bg-white border-b border-slate-200">
          <div className="mx-auto max-w-7xl">
            {/* Top Navigation Bar */}
            <div className="flex items-center justify-between px-4 py-3 sm:py-4">
              <button
                onClick={() => router.push('/groups')}
                className="p-2 rounded-full hover:bg-slate-100 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-slate-700" />
              </button>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportPDF}
                  className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors"
                  title="Export to PDF"
                >
                  <FileDown className="h-5 w-5 text-slate-700" />
                </button>
                <button
                  onClick={() => router.push(`/groups/${code}/history`)}
                  className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors"
                  title="View History"
                >
                  <History className="h-5 w-5 text-slate-700" />
                </button>
              </div>
            </div>

            {/* Group Info Section */}
            <div className="px-4 pb-4 sm:pb-5">
              <div className="flex items-start gap-3 mb-3">
                <div className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-sm">
                  <SplitSquareHorizontal className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                    {group.name || 'Group Calculator'}
                  </h1>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-xs font-mono font-medium text-slate-700">
                      {formatGroupCode(group.code)}
                    </span>
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <Users className="h-3.5 w-3.5" />
                      <span>{groupMembers.length} members</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Currency Selector - Compact Design */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-sm font-medium text-slate-600">Currency</span>
                <div className="flex-1 flex justify-end">
                  <CurrencySelector value={currency} onChange={setCurrency} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - Modern Card Layout */}
        <div className="mx-auto max-w-7xl px-4 py-4 sm:py-5">
          <div className="grid gap-4 lg:gap-5 lg:grid-cols-2">
            {/* Left Column - Input Sections */}
            <div className="space-y-4 lg:space-y-5">
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
            <div className="space-y-4 lg:space-y-5">
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

              {/* Save to Group Button */}
              {group && (
                <SaveToGroupButton
                  groupId={group.id}
                  groupCode={group.code}
                  people={people}
                  currency={currency}
                  total={calculations.totalToUse}
                  items={items}
                  payers={payers}
                  method={method}
                  useLineItems={useLineItems}
                  exactByPerson={exactByPerson}
                  percentByPerson={percentByPerson}
                  sharesByPerson={sharesByPerson}
                  transfers={calculations.transfers}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
