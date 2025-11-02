import type { Currency, Person, LineItem, Payer, SplitMethod, Transfer } from './expense';

// ============================================
// Database Entity Types
// ============================================

export type Group = {
  id: string;
  code: string;
  name: string | null;
  created_at: string;
};

export type GroupMember = {
  id: string;
  group_id: string;
  name: string;
  created_at: string;
};

export type GroupExpense = {
  id: string;
  group_id: string;
  title: string;
  currency: Currency;
  total_amount: number;
  expense_data: ExpenseData;
  created_at: string;
};

export type GroupSettlement = {
  id: string;
  expense_id: string;
  group_id: string;
  from_member: string;
  to_member: string;
  amount: number;
  status: 'open' | 'closed';
  created_at: string;
  closed_at: string | null;
};

// ============================================
// Expense Data Structure (stored as JSONB)
// ============================================

export type ExpenseData = {
  title: string;
  timestamp: string;
  currency: Currency;
  total: number;
  people: Person[];
  items: LineItem[];
  payers: Payer[];
  method: SplitMethod;
  useLineItems: boolean;
  exactByPerson?: Record<string, number>;
  percentByPerson?: Record<string, number>;
  sharesByPerson?: Record<string, number>;
  transfers: Transfer[]; // Pre-calculated settlements
};

// ============================================
// API Response Types
// ============================================

export type GroupWithStats = Group & {
  memberCount: number;
  totalExpenses: number;
  totalAmount: number;
  openSettlements: number;
};

export type ExpenseWithDetails = GroupExpense & {
  settlements: GroupSettlement[];
};

// ============================================
// Net Settlement Calculation Types
// ============================================

export type NetSettlement = {
  from: string;
  to: string;
  amount: number;
  status: 'open' | 'closed';
  relatedExpenses: string[]; // Expense IDs that contribute to this net settlement
};

export type MemberBalance = {
  name: string;
  netBalance: number; // Positive = receives money, Negative = owes money
  owedTo: Array<{ member: string; amount: number }>;
  owedBy: Array<{ member: string; amount: number }>;
};

// ============================================
// Form/UI Types
// ============================================

export type CreateGroupInput = {
  name?: string;
  memberNames: string[];
};

export type SaveExpenseToGroupInput = {
  groupId: string;
  groupCode: string;
  title: string;
  expenseData: ExpenseData;
};

export type GroupSearchResult = {
  group: Group;
  memberNames: string[];
};

// ============================================
// Error Types
// ============================================

export type GroupError =
  | { type: 'GROUP_NOT_FOUND'; code: string }
  | { type: 'DUPLICATE_CODE'; code: string }
  | { type: 'INVALID_CODE'; code: string }
  | { type: 'DATABASE_ERROR'; message: string }
  | { type: 'VALIDATION_ERROR'; message: string };
