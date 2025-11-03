import { supabase } from '@/lib/db/supabase';
import type {
  Group,
  GroupMember,
  GroupSettlement,
  NetSettlement,
  MemberBalance,
} from '@/lib/types/group';
import { clamp2 } from './expense-utils';

// ============================================
// Code Generation
// ============================================

/**
 * Generates a unique 6-character alphanumeric group code
 * Format: XXXNNN (3 uppercase letters + 3 numbers)
 * Example: A3X9K2
 */
export function generateGroupCode(): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';

  let code = '';

  // Generate 3 random letters
  for (let i = 0; i < 3; i++) {
    code += letters.charAt(Math.floor(Math.random() * letters.length));
  }

  // Generate 3 random numbers
  for (let i = 0; i < 3; i++) {
    code += numbers.charAt(Math.floor(Math.random() * numbers.length));
  }

  // Shuffle the code to mix letters and numbers
  return code.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Validates a group code format
 */
export function isValidGroupCode(code: string): boolean {
  // Must be exactly 6 characters, alphanumeric only
  const regex = /^[A-Z0-9]{6}$/;
  return regex.test(code.toUpperCase());
}

/**
 * Generates a unique group code that doesn't exist in the database
 */
export async function generateUniqueGroupCode(maxAttempts = 10): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const code = generateGroupCode();

    // Check if code exists in database
    const { data, error } = await supabase
      .from('groups')
      .select('code')
      .eq('code', code)
      .single();

    // If no data found (error is PGRST116), the code is unique
    if (error && error.code === 'PGRST116') {
      return code;
    }
  }

  throw new Error('Failed to generate unique group code after multiple attempts');
}

// ============================================
// Group Operations
// ============================================

/**
 * Creates a new group with members
 */
export async function createGroup(
  name: string | null,
  memberNames: string[]
): Promise<{ group: Group; members: GroupMember[] } | { error: string }> {
  try {
    // Generate unique code
    const code = await generateUniqueGroupCode();

    // Insert group
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .insert({ code, name })
      .select()
      .single();

    if (groupError) throw groupError;
    if (!group) throw new Error('Failed to create group');

    // Insert members if provided
    const members: GroupMember[] = [];
    if (memberNames.length > 0) {
      const uniqueNames = [...new Set(memberNames.filter(n => n.trim()))];

      const { data: insertedMembers, error: membersError } = await supabase
        .from('group_members')
        .insert(
          uniqueNames.map(name => ({
            group_id: group.id,
            name: name.trim(),
          }))
        )
        .select();

      if (membersError) throw membersError;
      if (insertedMembers) members.push(...insertedMembers);
    }

    return { group, members };
  } catch (error: any) {
    return { error: error.message || 'Failed to create group' };
  }
}

/**
 * Fetches a group by code
 */
export async function getGroupByCode(code: string): Promise<Group | null> {
  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .eq('code', code.toUpperCase())
    .single();

  if (error || !data) return null;
  return data;
}

/**
 * Fetches all members of a group
 */
export async function getGroupMembers(groupId: string): Promise<GroupMember[]> {
  const { data, error } = await supabase
    .from('group_members')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: true });

  if (error || !data) return [];
  return data;
}

/**
 * Adds or ensures members exist in a group
 * Returns all members (existing + new)
 */
export async function ensureGroupMembers(
  groupId: string,
  memberNames: string[]
): Promise<GroupMember[]> {
  try {
    // Get existing members
    const existingMembers = await getGroupMembers(groupId);
    const existingNames = new Set(existingMembers.map(m => m.name.toLowerCase()));

    // Find new members to add
    const newNames = memberNames
      .map(n => n.trim())
      .filter(n => n && !existingNames.has(n.toLowerCase()));

    // Add new members if any
    if (newNames.length > 0) {
      const { data: newMembers, error } = await supabase
        .from('group_members')
        .insert(
          newNames.map(name => ({
            group_id: groupId,
            name,
          }))
        )
        .select();

      if (!error && newMembers) {
        existingMembers.push(...newMembers);
      }
    }

    return existingMembers;
  } catch (error) {
    console.error('Error ensuring group members:', error);
    return [];
  }
}

// ============================================
// Settlement Netting Logic
// ============================================

/**
 * Calculates net settlements from all open settlements in a group
 * This implements the auto-netting feature
 * Also automatically reconciles offsetting settlements before calculating net
 */
export async function calculateNetSettlements(
  groupId: string
): Promise<NetSettlement[]> {
  // First, run auto-reconciliation to close offsetting settlements
  await autoReconcileOffsetSettlements(groupId);

  // Fetch all open settlements (after reconciliation)
  const { data: settlements, error } = await supabase
    .from('group_settlements')
    .select('*')
    .eq('group_id', groupId)
    .eq('status', 'open');

  if (error || !settlements) return [];

  // Build a map of net amounts between each pair of people
  // Key format: "personA|personB" (alphabetically sorted)
  const pairMap: Record<string, {
    fromA: number;  // Total amount A owes B
    fromB: number;  // Total amount B owes A
    expenseIds: Set<string>;
  }> = {};

  settlements.forEach(settlement => {
    const [person1, person2] = [settlement.from_member, settlement.to_member].sort();
    const key = `${person1}|${person2}`;

    if (!pairMap[key]) {
      pairMap[key] = { fromA: 0, fromB: 0, expenseIds: new Set() };
    }

    // Determine which direction this settlement flows
    if (settlement.from_member === person1) {
      // person1 owes person2
      pairMap[key].fromA += settlement.amount;
    } else {
      // person2 owes person1
      pairMap[key].fromB += settlement.amount;
    }

    pairMap[key].expenseIds.add(settlement.expense_id);
  });

  // Calculate net settlements
  const netSettlements: NetSettlement[] = [];

  Object.entries(pairMap).forEach(([key, data]) => {
    const [person1, person2] = key.split('|');
    const netAmount = clamp2(data.fromA - data.fromB);

    if (Math.abs(netAmount) > 0.01) { // Ignore amounts less than 1 cent
      netSettlements.push({
        from: netAmount > 0 ? person1 : person2,
        to: netAmount > 0 ? person2 : person1,
        amount: clamp2(Math.abs(netAmount)),
        status: 'open',
        relatedExpenses: Array.from(data.expenseIds),
      });
    }
  });

  return netSettlements;
}

/**
 * Calculates member balances showing who owes whom
 */
export async function calculateMemberBalances(
  groupId: string
): Promise<MemberBalance[]> {
  const netSettlements = await calculateNetSettlements(groupId);
  const members = await getGroupMembers(groupId);

  // Initialize balances
  const balanceMap: Record<string, MemberBalance> = {};
  members.forEach(member => {
    balanceMap[member.name] = {
      name: member.name,
      netBalance: 0,
      owedTo: [],
      owedBy: [],
    };
  });

  // Process net settlements
  netSettlements.forEach(settlement => {
    // Debtor (from)
    if (balanceMap[settlement.from]) {
      balanceMap[settlement.from].netBalance -= settlement.amount;
      balanceMap[settlement.from].owedTo.push({
        member: settlement.to,
        amount: settlement.amount,
      });
    }

    // Creditor (to)
    if (balanceMap[settlement.to]) {
      balanceMap[settlement.to].netBalance += settlement.amount;
      balanceMap[settlement.to].owedBy.push({
        member: settlement.from,
        amount: settlement.amount,
      });
    }
  });

  return Object.values(balanceMap);
}

/**
 * Marks specific settlements as closed/paid
 */
export async function markSettlementsAsPaid(
  expenseIds: string[],
  fromMember: string,
  toMember: string,
  reconciliationMethod: 'manual_payment' | 'auto_offset' = 'manual_payment'
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('group_settlements')
      .update({
        status: 'closed',
        closed_at: new Date().toISOString(),
        reconciliation_method: reconciliationMethod,
      })
      .in('expense_id', expenseIds)
      .eq('from_member', fromMember)
      .eq('to_member', toMember)
      .eq('status', 'open');

    return !error;
  } catch (error) {
    console.error('Error marking settlements as paid:', error);
    return false;
  }
}

/**
 * Helper function: Reduces settlement amounts in FIFO order
 * Used for partial offsetting when debts don't fully cancel out
 *
 * @param settlements - Array of settlements to reduce (must be sorted by created_at ASC)
 * @param offsetAmount - Total amount to offset/reduce from these settlements
 * @returns Number of settlements modified (closed or amount reduced)
 *
 * Algorithm:
 * - Process settlements oldest-first (FIFO)
 * - If settlement.amount >= offsetAmount: reduce by offsetAmount, stop
 * - If settlement.amount < offsetAmount: close settlement, continue with remainder
 *
 * Example:
 * - Settlements: [100 (old), 80 (new)]
 * - Offset: 150
 * - Result: First settlement closed (100), second reduced to 30 (80-50)
 */
async function reduceSettlementsInFIFOOrder(
  settlements: GroupSettlement[],
  offsetAmount: number
): Promise<number> {
  let remainingOffset = clamp2(offsetAmount);
  let modifiedCount = 0;
  const ZERO_THRESHOLD = 0.01;

  // Process settlements in order (already sorted by created_at ASC)
  for (const settlement of settlements) {
    if (remainingOffset < ZERO_THRESHOLD) {
      // No more offset to apply
      break;
    }

    if (settlement.amount <= remainingOffset + ZERO_THRESHOLD) {
      // This settlement is FULLY offset - close it
      const { error } = await supabase
        .from('group_settlements')
        .update({
          status: 'closed',
          closed_at: new Date().toISOString(),
          reconciliation_method: 'auto_offset',
        })
        .eq('id', settlement.id)
        .eq('status', 'open'); // Safety: only update if still open

      if (!error) {
        modifiedCount++;
        remainingOffset = clamp2(remainingOffset - settlement.amount);
      }
    } else {
      // This settlement is PARTIALLY offset - reduce its amount
      const newAmount = clamp2(settlement.amount - remainingOffset);

      const { error } = await supabase
        .from('group_settlements')
        .update({
          amount: newAmount,
        })
        .eq('id', settlement.id)
        .eq('status', 'open'); // Safety: only update if still open

      if (!error) {
        modifiedCount++;
        remainingOffset = 0; // All offset has been applied
      }
      break; // No more offset to apply
    }
  }

  return modifiedCount;
}

/**
 * Auto-reconciles offsetting settlements between members
 * This detects when debts cancel out (A owes B, B owes A) and automatically
 * marks them as reconciled via offset
 *
 * Algorithm:
 * 1. Group all open settlements by person-pairs
 * 2. Calculate net debt for each pair
 * 3. If net ≈ 0: Close ALL settlements between them (fully offset)
 * 4. If net > 0: Close all settlements in smaller direction AND reduce larger direction (partial offset)
 *
 * Edge cases handled:
 * - Circular debts (A→B, B→C, C→A)
 * - Multiple expenses same direction
 * - Floating point precision (uses 0.01 threshold)
 * - Partial offsets (FIFO ordering - oldest settlements offset first)
 */
export async function autoReconcileOffsetSettlements(groupId: string): Promise<{
  reconciledCount: number;
  success: boolean;
}> {
  try {
    // Fetch all open settlements for this group
    const { data: openSettlements, error: fetchError } = await supabase
      .from('group_settlements')
      .select('*')
      .eq('group_id', groupId)
      .eq('status', 'open')
      .order('created_at', { ascending: true }); // FIFO ordering

    if (fetchError) throw fetchError;
    if (!openSettlements || openSettlements.length === 0) {
      return { reconciledCount: 0, success: true };
    }

    // Build a map of debts grouped by person-pairs (bidirectional)
    type PairData = {
      forward: GroupSettlement[];  // Person A → Person B
      backward: GroupSettlement[]; // Person B → Person A
      forwardTotal: number;
      backwardTotal: number;
    };

    const pairMap: Record<string, PairData> = {};

    openSettlements.forEach(settlement => {
      // Create a canonical key (alphabetically sorted) for this pair
      const [person1, person2] = [settlement.from_member, settlement.to_member].sort();
      const key = `${person1}|${person2}`;

      if (!pairMap[key]) {
        pairMap[key] = {
          forward: [],
          backward: [],
          forwardTotal: 0,
          backwardTotal: 0,
        };
      }

      // Determine direction and add to appropriate array
      if (settlement.from_member === person1) {
        // person1 → person2
        pairMap[key].forward.push(settlement);
        pairMap[key].forwardTotal += settlement.amount;
      } else {
        // person2 → person1
        pairMap[key].backward.push(settlement);
        pairMap[key].backwardTotal += settlement.amount;
      }
    });

    // Process each pair and reconcile offsetting settlements
    let totalReconciled = 0;

    for (const [key, data] of Object.entries(pairMap)) {
      const { forward, backward, forwardTotal, backwardTotal } = data;
      const netAmount = clamp2(forwardTotal - backwardTotal);

      // Threshold for considering amounts "equal" (handles floating point issues)
      const ZERO_THRESHOLD = 0.01;

      if (Math.abs(netAmount) < ZERO_THRESHOLD) {
        // ===== FULLY OFFSET: Net ≈ 0 =====
        // Close ALL settlements between this pair
        const allSettlements = [...forward, ...backward];
        const settlementIds = allSettlements.map(s => s.id);

        if (settlementIds.length > 0) {
          const { error } = await supabase
            .from('group_settlements')
            .update({
              status: 'closed',
              closed_at: new Date().toISOString(),
              reconciliation_method: 'auto_offset',
            })
            .in('id', settlementIds);

          if (!error) {
            totalReconciled += settlementIds.length;
          }
        }
      } else {
        // ===== PARTIAL OFFSET: Net > 0 =====
        // Close all settlements in the SMALLER direction
        // Reduce settlements in the LARGER direction by the offset amount

        let settlementsToClose: GroupSettlement[] = [];
        let settlementsToReduce: GroupSettlement[] = [];
        let offsetAmount: number = 0;

        if (netAmount > 0) {
          // Forward > Backward: Close all backward settlements (fully offset)
          settlementsToClose = backward;
          settlementsToReduce = forward;
          offsetAmount = backwardTotal;
        } else {
          // Backward > Forward: Close all forward settlements (fully offset)
          settlementsToClose = forward;
          settlementsToReduce = backward;
          offsetAmount = forwardTotal;
        }

        // Close all settlements in smaller direction
        if (settlementsToClose.length > 0) {
          const settlementIds = settlementsToClose.map(s => s.id);

          const { error } = await supabase
            .from('group_settlements')
            .update({
              status: 'closed',
              closed_at: new Date().toISOString(),
              reconciliation_method: 'auto_offset',
            })
            .in('id', settlementIds);

          if (!error) {
            totalReconciled += settlementIds.length;
          }
        }

        // Reduce settlements in larger direction using FIFO (oldest first)
        // This is the KEY FIX: reduce the amounts of partially-offset settlements
        if (settlementsToReduce.length > 0 && offsetAmount > 0) {
          const reducedCount = await reduceSettlementsInFIFOOrder(
            settlementsToReduce,
            offsetAmount
          );
          totalReconciled += reducedCount;
        }
      }
    }

    return { reconciledCount: totalReconciled, success: true };
  } catch (error) {
    console.error('Error in auto-reconciliation:', error);
    return { reconciledCount: 0, success: false };
  }
}

// ============================================
// Helper Functions
// ============================================

/**
 * Formats a group code for display (adds hyphen for readability)
 * Example: A3X9K2 → A3X-9K2
 */
export function formatGroupCode(code: string): string {
  if (code.length !== 6) return code;
  return `${code.slice(0, 3)}-${code.slice(3)}`;
}

/**
 * Normalizes a group code (removes hyphens, converts to uppercase)
 */
export function normalizeGroupCode(code: string): string {
  return code.replace(/[^A-Z0-9]/gi, '').toUpperCase();
}

// ============================================
// Expense & Settlement Fetching
// ============================================

/**
 * Fetches all expenses for a group
 */
export async function getGroupExpenses(groupId: string) {
  const { data, error } = await supabase
    .from('group_expenses')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching group expenses:', error);
    return [];
  }

  return data || [];
}

/**
 * Fetches all settlements for a group
 */
export async function getGroupSettlements(groupId: string) {
  const { data, error } = await supabase
    .from('group_settlements')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching group settlements:', error);
    return [];
  }

  return data || [];
}

/**
 * Fetches settlements for a specific expense
 */
export async function getExpenseSettlements(expenseId: string) {
  const { data, error } = await supabase
    .from('group_settlements')
    .select('*')
    .eq('expense_id', expenseId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching expense settlements:', error);
    return [];
  }

  return data || [];
}

/**
 * Fetches all groups from the database
 */
export async function getAllGroups() {
  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching all groups:', error);
    return [];
  }

  return data || [];
}
