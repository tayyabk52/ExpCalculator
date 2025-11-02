# Auto-Reconciliation Migration Guide

This guide explains how to apply the auto-reconciliation feature to your Supabase database.

## Overview

The auto-reconciliation feature automatically detects when group expenses offset each other (e.g., A owes B $500, then B owes A $500) and marks them as "auto-settled" instead of showing them as outstanding.

## Migration Steps

### 1. Run the SQL Migration

1. Open your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Open the file `add_reconciliation_tracking.sql` from this directory
4. Copy the entire contents
5. Paste into the SQL Editor
6. Click **Run** to execute the migration

### 2. Verify Migration Success

After running the migration, verify it was successful by running these queries in the SQL Editor:

```sql
-- Check that the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'group_settlements'
AND column_name = 'reconciliation_method';

-- Expected result: Should return 1 row showing the new column

-- Check indexes were created
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'group_settlements'
AND indexname LIKE '%reconciliation%';

-- Expected result: Should return 2 rows (the two new indexes)
```

### 3. Verify Existing Data

Check that existing closed settlements were backfilled:

```sql
-- Count settlements by reconciliation method
SELECT
  status,
  reconciliation_method,
  COUNT(*) as count
FROM group_settlements
GROUP BY status, reconciliation_method
ORDER BY status, reconciliation_method;

-- Expected result:
-- - All previously closed settlements should show 'manual_payment'
-- - All open settlements should show NULL
```

## What Changed

### Database Schema
- **New Column**: `reconciliation_method` on `group_settlements` table
  - Values: `'manual_payment'` or `'auto_offset'` or `NULL`
  - Tracks HOW a settlement was closed

### New Indexes
- `idx_group_settlements_reconciliation_method` - For querying by reconciliation type
- `idx_group_settlements_status_reconciliation` - For combined queries

### Backfilled Data
- All existing closed settlements marked as `'manual_payment'`

## How Auto-Reconciliation Works

### Algorithm
1. When viewing group history, auto-reconciliation runs automatically
2. System groups all open settlements by person-pairs
3. Calculates net debt for each pair
4. **If net ≈ 0**: Closes ALL settlements between them (marked as 'auto_offset')
5. **If net > 0**: Closes all settlements in smaller direction (partial offset)

### Example Scenarios

#### Scenario 1: Full Offset
```
Before:
- Expense A: Tayyab owes Musa 500 PKR [OPEN]
- Expense B: Musa owes Tayyab 500 PKR [OPEN]
Net: 0

After auto-reconciliation:
- Expense A: Tayyab owes Musa 500 PKR [CLOSED - auto_offset]
- Expense B: Musa owes Tayyab 500 PKR [CLOSED - auto_offset]
Net: 0 (both show as "Auto-settled")
```

#### Scenario 2: Partial Offset
```
Before:
- Expense A: Tayyab owes Musa 500 PKR [OPEN]
- Expense B: Musa owes Tayyab 300 PKR [OPEN]
Net: Tayyab owes Musa 200 PKR

After auto-reconciliation:
- Expense A: Tayyab owes Musa 500 PKR [OPEN]
- Expense B: Musa owes Tayyab 300 PKR [CLOSED - auto_offset]
Net: Tayyab owes Musa 200 PKR
```

#### Scenario 3: Multiple Expenses Same Direction
```
Before:
- Expense A: Ali owes Bob 300 PKR [OPEN]
- Expense B: Ali owes Bob 200 PKR [OPEN]
- Expense C: Bob owes Ali 400 PKR [OPEN]
Net: Ali owes Bob 100 PKR

After auto-reconciliation:
- Expense A: Ali owes Bob 300 PKR [OPEN]
- Expense B: Ali owes Bob 200 PKR [OPEN]
- Expense C: Bob owes Ali 400 PKR [CLOSED - auto_offset]
Net: Ali owes Bob 100 PKR
```

## UI Changes

### Expense Cards
Now show clear visual distinction:
- **✓ Paid** (green badge) - Manually marked as paid by user
- **⚖️ Auto-settled** (teal badge) - Automatically reconciled via offset
- **⏳ Pending** (gray badge) - Still outstanding

### Settlement Progress
Shows breakdown:
- "2 paid, 1 auto-settled, 1 pending"
- Color-coded progress bar
- Green background for manually paid settlements
- Teal background for auto-settled settlements

### Status Badges
Expense-level status now includes:
- "Fully Settled" - All settlements closed (manual + auto)
- "Partially Settled" - Some settlements closed
- "Outstanding" - No settlements closed

## Edge Cases Handled

✅ **Circular debts** (A→B, B→C, C→A)
✅ **Multiple expenses between same pair**
✅ **Floating point precision** (uses 0.01 threshold)
✅ **Partial offsets with FIFO ordering**
✅ **Manual payment after auto-offset** (can override)
✅ **New expense changes net** (old settlements stay closed)

## Testing the Feature

### Test 1: Basic Offset
1. Create a group with 2 members (A and B)
2. Add expense where A pays 500, split equally → B owes A 250
3. Add expense where B pays 500, split equally → A owes B 250
4. Go to History page
5. **Expected**: Both expenses show "Fully Settled" with "⚖️ Auto-settled" badge

### Test 2: Partial Offset
1. Create a group with 2 members
2. Add expense where A owes B 500
3. Add expense where B owes A 300
4. Go to History page
5. **Expected**:
   - Second expense shows "Fully Settled (auto)"
   - First expense shows "Outstanding" with 500 still owed
   - Net Settlements shows: A owes B 200

### Test 3: Manual Payment
1. Following Test 2 setup
2. Click "Mark Paid" on the net settlement (A pays B 200)
3. **Expected**:
   - First expense now shows "Partially Settled"
   - Badge shows "⚖️ 1 auto-settled, ✓ 1 paid" (if it had 2 settlements)

## Rollback (If Needed)

If you need to rollback this migration:

```sql
DROP INDEX IF EXISTS idx_group_settlements_reconciliation_method;
DROP INDEX IF EXISTS idx_group_settlements_status_reconciliation;
ALTER TABLE group_settlements DROP COLUMN IF EXISTS reconciliation_method;
```

⚠️ **Warning**: Rollback will remove all reconciliation tracking data.

## Performance Considerations

- Auto-reconciliation runs on every history page load
- Optimized with indexes for fast queries
- Uses FIFO ordering for consistent results
- Threshold of 0.01 for floating point comparisons

## Troubleshooting

### Issue: Auto-reconciliation not working
**Solution**:
1. Check that migration was applied successfully
2. Verify `reconciliation_method` column exists
3. Check browser console for errors
4. Try refreshing the history page

### Issue: Settlements showing wrong status
**Solution**:
1. Check the `reconciliation_method` value in database
2. Verify settlements are marked as 'closed' with proper method
3. Clear browser cache and refresh

### Issue: Performance slow with many settlements
**Solution**:
1. Verify indexes are created correctly
2. Check Supabase query performance in dashboard
3. Consider archiving old groups if you have thousands

## Support

For issues or questions about this migration, check:
1. Supabase logs in dashboard
2. Browser console for client-side errors
3. Network tab for API errors

## Next Steps

After successful migration:
1. Test with your existing data
2. Verify auto-reconciliation works correctly
3. Monitor performance with real usage
4. Gather user feedback on the feature

---

**Migration Version**: 1.0
**Date**: November 2, 2025
**Requires**: Supabase PostgreSQL 14+
