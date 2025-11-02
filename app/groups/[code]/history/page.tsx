'use client';

import { useEffect, useState } from 'react';
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

  // Filter settlements
  const filteredSettlements = filter === 'all'
    ? netSettlements
    : netSettlements.filter(s => s.status === filter);

  // Get settlements for an expense
  const getSettlementsForExpense = (expenseId: string) => {
    return settlements.filter(s => s.expense_id === expenseId);
  };

  // Stats
  const totalExpenses = expenses.length;
  const totalAmount = expenses.reduce((sum, exp) => sum + exp.total_amount, 0);
  const openSettlementsCount = netSettlements.filter(s => s.status === 'open').length;
  const closedSettlementsCount = netSettlements.filter(s => s.status === 'closed').length;

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
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
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

              <Button
                onClick={() => loadData(false)}
                disabled={isRefreshing}
                variant="outline"
                className="gap-2 flex-shrink-0"
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

        {/* Stats Cards */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 mb-4 sm:mb-6">
          <div className="p-3 sm:p-4 rounded-lg border bg-card shadow-sm hover:shadow-md transition-shadow">
            <div className="text-xs sm:text-sm text-muted-foreground mb-1">Total Expenses</div>
            <div className="text-xl sm:text-2xl font-bold">{totalExpenses}</div>
          </div>
          <div className="p-3 sm:p-4 rounded-lg border bg-card shadow-sm hover:shadow-md transition-shadow">
            <div className="text-xs sm:text-sm text-muted-foreground mb-1">Total Amount</div>
            <div className="text-xl sm:text-2xl font-bold truncate">
              {currency} {totalAmount.toFixed(2)}
            </div>
          </div>
          <div className="p-3 sm:p-4 rounded-lg border bg-card shadow-sm hover:shadow-md transition-shadow">
            <div className="text-xs sm:text-sm text-muted-foreground mb-1">Open</div>
            <div className="text-xl sm:text-2xl font-bold text-orange-600">{openSettlementsCount}</div>
          </div>
          <div className="p-3 sm:p-4 rounded-lg border bg-card shadow-sm hover:shadow-md transition-shadow">
            <div className="text-xs sm:text-sm text-muted-foreground mb-1">Settled</div>
            <div className="text-xl sm:text-2xl font-bold text-green-600">{closedSettlementsCount}</div>
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
              <h2 className="text-lg sm:text-xl font-semibold">Net Settlements</h2>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <Button
                  variant={filter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('all')}
                  className="whitespace-nowrap"
                >
                  All
                </Button>
                <Button
                  variant={filter === 'open' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('open')}
                  className="whitespace-nowrap"
                >
                  Open
                </Button>
                <Button
                  variant={filter === 'closed' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('closed')}
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
                All Expenses ({expenses.length})
              </h2>
            </div>

            {expenses.length === 0 ? (
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
                {expenses.map(expense => (
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
            <h2 className="text-lg sm:text-xl font-semibold">Member Balances</h2>
            <MemberBalanceSummary balances={memberBalances} currency={currency} />
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
