'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, RefreshCw, Filter, FileDown, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  getGroupByCode,
  getGroupMembers,
  getGroupExpenses,
  getGroupSettlements,
  calculateNetSettlements,
  calculateMemberBalances,
  formatGroupCode,
} from '@/lib/utils/group-utils';
import ExpenseCard from '@/components/group/ExpenseCard';
import NetSettlementCard from '@/components/group/NetSettlementCard';
import MemberBalanceSummary from '@/components/group/MemberBalanceSummary';
import ExpenseDetailModal from '@/components/group/ExpenseDetailModal';
import ExportGroupStatementButton from '@/components/group/ExportGroupStatementButton';
import HistoryFilters, { type HistoryFiltersState } from '@/components/group/HistoryFilters';
import type { Group, GroupExpense, GroupSettlement, NetSettlement, MemberBalance } from '@/lib/types/group';
import type { Currency } from '@/lib/types/expense';

export default function GroupHistoryPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;

  // State
  const [group, setGroup] = useState<Group | null>(null);
  const [expenses, setExpenses] = useState<GroupExpense[]>([]);
  const [settlements, setSettlements] = useState<GroupSettlement[]>([]);
  const [netSettlements, setNetSettlements] = useState<NetSettlement[]>([]);
  const [memberBalances, setMemberBalances] = useState<MemberBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedExpense, setSelectedExpense] = useState<GroupExpense | null>(null);
  const [filter, setFilter] = useState<'all' | 'open' | 'closed'>('all');
  
  // Filter state
  const [filters, setFilters] = useState<HistoryFiltersState>({
    dateFrom: '',
    dateTo: '',
    selectedMember: '',
    minAmount: '',
    maxAmount: '',
    settlementStatus: 'all',
    sortBy: 'date-desc',
  });

  // Detect currency (use most common currency from expenses)
  const currency: Currency = expenses.length > 0
    ? expenses[0].currency
    : 'PKR';

  // Load data
  const loadData = async (showLoader = true) => {
    try {
      if (showLoader) setIsLoading(true);
      else setIsRefreshing(true);

      const groupData = await getGroupByCode(code);

      if (!groupData) {
        setError('Group not found');
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      setGroup(groupData);

      // Fetch expenses and settlements in parallel
      const [expensesData, settlementsData] = await Promise.all([
        getGroupExpenses(groupData.id),
        getGroupSettlements(groupData.id),
      ]);

      setExpenses(expensesData);
      setSettlements(settlementsData);

      // Calculate net settlements and member balances
      const [netSettlementsData, balancesData] = await Promise.all([
        calculateNetSettlements(groupData.id),
        calculateMemberBalances(groupData.id),
      ]);

      setNetSettlements(netSettlementsData);
      setMemberBalances(balancesData);

      setIsLoading(false);
      setIsRefreshing(false);
    } catch (err) {
      console.error('Error loading group history:', err);
      setError('Failed to load group data');
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [code]);

  // Get all unique members
  const allMembers = useMemo(() => {
    const memberSet = new Set<string>();
    expenses.forEach(exp => {
      exp.expense_data.people.forEach(person => memberSet.add(person.name));
    });
    return Array.from(memberSet).sort();
  }, [expenses]);

  // Apply filters to expenses
  const filteredExpenses = useMemo(() => {
    let filtered = [...expenses];

    // Date filter
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      filtered = filtered.filter(exp => new Date(exp.created_at) >= fromDate);
    }
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999); // End of day
      filtered = filtered.filter(exp => new Date(exp.created_at) <= toDate);
    }

    // Member filter
    if (filters.selectedMember) {
      filtered = filtered.filter(exp =>
        exp.expense_data.people.some(person => person.name === filters.selectedMember)
      );
    }

    // Amount filter
    if (filters.minAmount) {
      const min = parseFloat(filters.minAmount);
      filtered = filtered.filter(exp => exp.total_amount >= min);
    }
    if (filters.maxAmount) {
      const max = parseFloat(filters.maxAmount);
      filtered = filtered.filter(exp => exp.total_amount <= max);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case 'date-desc':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'date-asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'amount-desc':
          return b.total_amount - a.total_amount;
        case 'amount-asc':
          return a.total_amount - b.total_amount;
        default:
          return 0;
      }
    });

    return filtered;
  }, [expenses, filters]);

  // Apply filters to settlements
  const filteredSettlements = useMemo(() => {
    let filtered = [...netSettlements];

    // Status filter (from filters state, not the old filter state)
    if (filters.settlementStatus !== 'all') {
      filtered = filtered.filter(s => s.status === filters.settlementStatus);
    }

    // Member filter
    if (filters.selectedMember) {
      filtered = filtered.filter(s =>
        s.from === filters.selectedMember || s.to === filters.selectedMember
      );
    }

    // Amount filter
    if (filters.minAmount) {
      const min = parseFloat(filters.minAmount);
      filtered = filtered.filter(s => s.amount >= min);
    }
    if (filters.maxAmount) {
      const max = parseFloat(filters.maxAmount);
      filtered = filtered.filter(s => s.amount <= max);
    }

    return filtered;
  }, [netSettlements, filters]);

  // Apply filters to member balances
  const filteredMemberBalances = useMemo(() => {
    if (!filters.selectedMember) return memberBalances;
    return memberBalances.filter(mb => mb.name === filters.selectedMember);
  }, [memberBalances, filters.selectedMember]);

  // Get settlements for an expense
  const getSettlementsForExpense = (expenseId: string) => {
    return settlements.filter(s => s.expense_id === expenseId);
  };

  // Stats (based on ALL settlements, not filtered net settlements)
  const totalExpenses = filteredExpenses.length;
  const totalAmount = filteredExpenses.reduce((sum, exp) => sum + exp.total_amount, 0);
  
  // Count from actual settlements table for accurate reconciliation tracking
  const openSettlementsCount = settlements.filter(s => s.status === 'open').length;
  const manuallyPaidCount = settlements.filter(s => s.status === 'closed' && s.reconciliation_method === 'manual_payment').length;
  const autoSettledCount = settlements.filter(s => s.status === 'closed' && s.reconciliation_method === 'auto_offset').length;
  const closedSettlementsCount = manuallyPaidCount + autoSettledCount;

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading history...</p>
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
          <Button onClick={() => router.push('/groups')}>
            Back to Groups
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl p-3 sm:p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push(`/groups/${code}`)}
            className="mb-3 sm:mb-4 gap-2 -ml-2"
            size="sm"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden xs:inline">Back to Calculator</span>
            <span className="xs:hidden">Back</span>
          </Button>

          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">
                    {group.name || 'Group History'}
                  </h1>
                  <Badge variant="secondary" className="font-mono text-xs sm:text-sm">
                    {formatGroupCode(group.code)}
                  </Badge>
                </div>
                <p className="text-sm sm:text-base text-muted-foreground">
                  View all expenses and settlements
                </p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <HistoryFilters
                  filters={filters}
                  onFiltersChange={setFilters}
                  members={allMembers}
                  currency={currency}
                />
                <ExportGroupStatementButton
                  group={group}
                  expenses={expenses}
                  netSettlements={netSettlements}
                  memberBalances={memberBalances}
                  currency={currency}
                  size="sm"
                />
                <Button
                  onClick={() => loadData(false)}
                  disabled={isRefreshing}
                  variant="outline"
                  className="gap-2"
                  size="sm"
                >
                  {isRefreshing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="hidden sm:inline">Refreshing...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4" />
                      <span className="hidden sm:inline">Refresh</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards - Clean Slate Design */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 mb-4 sm:mb-6">
          <div className="p-3 sm:p-4 rounded-xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-shadow">
            <div className="text-xs sm:text-sm text-slate-500 mb-1">Total Expenses</div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900">{totalExpenses}</div>
          </div>
          <div className="p-3 sm:p-4 rounded-xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-shadow">
            <div className="text-xs sm:text-sm text-slate-500 mb-1">Total Amount</div>
            <div className="text-base sm:text-xl font-bold text-slate-900 truncate">
              {currency} {totalAmount.toFixed(2)}
            </div>
          </div>
          <div className="p-3 sm:p-4 rounded-xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-shadow">
            <div className="text-xs sm:text-sm text-slate-500 mb-1">Open</div>
            <div className="text-xl sm:text-2xl font-bold text-slate-700">{openSettlementsCount}</div>
          </div>
          <div className="p-3 sm:p-4 rounded-xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-shadow">
            <div className="text-xs sm:text-sm text-slate-500 mb-1">Settled</div>
            <div className="text-xl sm:text-2xl font-bold text-emerald-600">{closedSettlementsCount}</div>
            {(manuallyPaidCount > 0 || autoSettledCount > 0) && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {manuallyPaidCount > 0 && (
                  <span className="text-[10px] sm:text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium">
                    ✓ {manuallyPaidCount}
                  </span>
                )}
                {autoSettledCount > 0 && (
                  <span className="text-[10px] sm:text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">
                    ⚖️ {autoSettledCount}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="settlements" className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full max-w-2xl mx-auto grid-cols-3 h-auto">
            <TabsTrigger value="settlements" className="text-xs sm:text-sm py-2">
              <span className="hidden sm:inline">Net Settlements</span>
              <span className="sm:hidden">Settlements</span>
            </TabsTrigger>
            <TabsTrigger value="expenses" className="text-xs sm:text-sm py-2">
              Expenses
            </TabsTrigger>
            <TabsTrigger value="members" className="text-xs sm:text-sm py-2">
              Members
            </TabsTrigger>
          </TabsList>

          {/* Net Settlements Tab */}
          <TabsContent value="settlements" className="space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-lg sm:text-xl font-semibold">
                Net Settlements
                {filters.selectedMember && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    for {filters.selectedMember}
                  </span>
                )}
              </h2>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <Button
                  variant={filters.settlementStatus === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilters({ ...filters, settlementStatus: 'all' })}
                  className="whitespace-nowrap"
                >
                  All
                </Button>
                <Button
                  variant={filters.settlementStatus === 'open' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilters({ ...filters, settlementStatus: 'open' })}
                  className="whitespace-nowrap"
                >
                  Open
                </Button>
                <Button
                  variant={filters.settlementStatus === 'closed' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilters({ ...filters, settlementStatus: 'closed' })}
                  className="whitespace-nowrap"
                >
                  Settled
                </Button>
              </div>
            </div>

            {filteredSettlements.length === 0 ? (
              <div className="p-8 text-center border rounded-lg bg-muted/20">
                <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">
                  {filter === 'all'
                    ? 'No settlements yet. Add expenses to get started!'
                    : `No ${filter} settlements found.`}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredSettlements.map((settlement, idx) => (
                  <NetSettlementCard
                    key={idx}
                    settlement={settlement}
                    currency={currency}
                    onStatusChanged={() => loadData(false)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Expenses Tab */}
          <TabsContent value="expenses" className="space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-semibold">
                All Expenses ({filteredExpenses.length})
                {filters.selectedMember && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    involving {filters.selectedMember}
                  </span>
                )}
              </h2>
            </div>

            {filteredExpenses.length === 0 ? (
              <div className="p-8 text-center border rounded-lg bg-muted/20">
                <p className="text-muted-foreground">
                  No expenses yet. Go to the calculator to add your first expense!
                </p>
                <Button
                  onClick={() => router.push(`/groups/${code}`)}
                  className="mt-4"
                >
                  Go to Calculator
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredExpenses.map(expense => (
                  <ExpenseCard
                    key={expense.id}
                    expense={expense}
                    settlements={getSettlementsForExpense(expense.id)}
                    onViewDetails={() => setSelectedExpense(expense)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Members Tab */}
          <TabsContent value="members" className="space-y-3 sm:space-y-4">
            <h2 className="text-lg sm:text-xl font-semibold">
              Member Balances
              {filters.selectedMember && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  for {filters.selectedMember}
                </span>
              )}
            </h2>
            <MemberBalanceSummary balances={filteredMemberBalances} currency={currency} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Expense Detail Modal */}
      <ExpenseDetailModal
        expense={selectedExpense}
        isOpen={selectedExpense !== null}
        onClose={() => setSelectedExpense(null)}
      />
    </div>
  );
}
