'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, RefreshCw, Filter, FileDown, TrendingUp, Plus } from 'lucide-react';
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
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push(`/groups/${code}`)}
            className="mb-4 gap-2 -ml-2"
            size="sm"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden xs:inline">Back to Calculator</span>
            <span className="xs:hidden">Back</span>
          </Button>

          <div className="px-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                  {group.name || 'Group History'}
                </h1>
                <p className="text-md sm:text-lg font-medium text-slate-600 mt-1">
                  {formatGroupCode(group.code)}
                </p>
              </div>
              {/* Action Buttons */}
              <div className="flex space-x-2">
                <div className="relative [&>button]:p-1.5 [&>button]:sm:p-2 [&>button]:rounded-full [&>button]:bg-slate-100 [&>button]:hover:bg-slate-200 [&>button]:border-0 [&_svg]:h-5 [&_svg]:w-5 [&_svg]:sm:h-6 [&_svg]:sm:w-6">
                  <HistoryFilters
                    filters={filters}
                    onFiltersChange={setFilters}
                    members={allMembers}
                    currency={currency}
                  />
                  {(filters.dateFrom || filters.dateTo || filters.selectedMember || filters.minAmount || filters.maxAmount || filters.settlementStatus !== 'all') && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] sm:min-w-[18px] sm:h-[18px] flex items-center justify-center rounded-full bg-purple-600 text-white text-[10px] sm:text-xs font-semibold px-0.5 sm:px-1 pointer-events-none">
                      {[filters.dateFrom, filters.dateTo, filters.selectedMember, filters.minAmount, filters.maxAmount, filters.settlementStatus !== 'all' ? 'status' : ''].filter(Boolean).length}
                    </span>
                  )}
                </div>
                <div className="[&>button]:p-1.5 [&>button]:sm:p-2 [&>button]:rounded-full [&>button]:bg-slate-100 [&>button]:hover:bg-slate-200 [&>button]:border-0 [&>button]:whitespace-nowrap [&>button]:min-w-0 [&_svg]:h-5 [&_svg]:w-5 [&_svg]:sm:h-6 [&_svg]:sm:w-6 [&>button]:text-xs [&>button]:sm:text-sm">
                  <ExportGroupStatementButton
                    group={group}
                    expenses={expenses}
                    netSettlements={netSettlements}
                    memberBalances={memberBalances}
                    currency={currency}
                    size="icon"
                  />
                </div>
                <button
                  onClick={() => loadData(false)}
                  disabled={isRefreshing}
                  className="p-1.5 sm:p-2 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors duration-200 disabled:opacity-50"
                >
                  {isRefreshing ? (
                    <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin text-slate-700" />
                  ) : (
                    <RefreshCw className="h-5 w-5 sm:h-6 sm:w-6 text-slate-700" />
                  )}
                </button>
              </div>
            </div>
            <p className="text-sm text-slate-500 mt-2">View all expenses and settlements</p>
            
            {/* Add New Expense Button */}
            <button
              onClick={() => router.push(`/groups/${code}`)}
              className="mt-4 w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 group"
            >
              <Plus className="h-5 w-5 group-hover:rotate-90 transition-transform duration-200" />
              <span>Add New Expense</span>
            </button>
          </div>
        </div>

        {/* Stats Cards - Modern Dashboard Design */}
        <div className="grid grid-cols-2 sm:grid-cols-2 gap-4 px-4 mb-6">
          {/* Card 1: Total Expenses */}
          <div className="dashboard-card bg-white p-4 sm:p-5 rounded-none sm:rounded-xl sm:shadow-sm" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center">
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xs sm:text-sm font-medium text-slate-500">Total Expenses</h3>
            </div>
            <p className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mt-3 sm:mt-4">{totalExpenses}</p>
          </div>

          {/* Card 2: Total Amount */}
          <div className="dashboard-card bg-white p-4 sm:p-5 rounded-none sm:rounded-xl sm:shadow-sm" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center">
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xs sm:text-sm font-medium text-slate-500">Total Amount</h3>
            </div>
            <p className="text-xl sm:text-3xl md:text-4xl font-bold text-blue-600 mt-3 sm:mt-4 break-words">
              {currency} {totalAmount.toFixed(2)}
            </p>
          </div>

          {/* Card 3: Open */}
          <div className="dashboard-card bg-white p-4 sm:p-5 rounded-none sm:rounded-xl sm:shadow-sm" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xs sm:text-sm font-medium text-slate-500">Open</h3>
            </div>
            <p className="text-3xl sm:text-4xl md:text-5xl font-bold text-amber-600 mt-3 sm:mt-4">{openSettlementsCount}</p>
          </div>

          {/* Card 4: Settled */}
          <div className="dashboard-card bg-white p-4 sm:p-5 rounded-none sm:rounded-xl sm:shadow-sm" style={{ animationDelay: '0.4s' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xs sm:text-sm font-medium text-slate-500">Settled</h3>
              </div>
              {(manuallyPaidCount > 0 || autoSettledCount > 0) && (
                <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full bg-emerald-100 text-[10px] sm:text-xs font-semibold text-emerald-800">
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-0.5 sm:mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {manuallyPaidCount + autoSettledCount}
                </span>
              )}
            </div>
            <p className="text-3xl sm:text-4xl md:text-5xl font-bold text-emerald-600 mt-3 sm:mt-4">{closedSettlementsCount}</p>
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
              <h2 className="text-lg sm:text-xl font-semibold text-slate-900">
                Net Settlements
                {filters.selectedMember && (
                  <span className="text-sm font-normal text-slate-600 ml-2">
                    for {filters.selectedMember}
                  </span>
                )}
              </h2>
              {/* Modern Segmented Control Filter */}
              <div className="flex bg-slate-200/75 rounded-full p-1 space-x-1">
                <button
                  onClick={() => setFilters({ ...filters, settlementStatus: 'all' })}
                  className={`flex-1 px-4 py-2 text-sm font-semibold rounded-full focus:outline-none transition-all ${
                    filters.settlementStatus === 'all'
                      ? 'text-slate-900 bg-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilters({ ...filters, settlementStatus: 'open' })}
                  className={`flex-1 px-4 py-2 text-sm font-semibold rounded-full focus:outline-none transition-all ${
                    filters.settlementStatus === 'open'
                      ? 'text-slate-900 bg-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Open
                </button>
                <button
                  onClick={() => setFilters({ ...filters, settlementStatus: 'closed' })}
                  className={`flex-1 px-4 py-2 text-sm font-semibold rounded-full focus:outline-none transition-all ${
                    filters.settlementStatus === 'closed'
                      ? 'text-slate-900 bg-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Settled
                </button>
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
