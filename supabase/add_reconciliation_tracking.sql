-- Auto-Reconciliation Tracking Migration
-- Run this in your Supabase SQL Editor to add reconciliation tracking
-- This enables automatic settlement offsetting with full audit trail

-- ============================================
-- Add Reconciliation Method Column
-- ============================================

-- Add reconciliation_method to track HOW a settlement was closed
ALTER TABLE group_settlements
ADD COLUMN IF NOT EXISTS reconciliation_method TEXT
CHECK (reconciliation_method IN ('manual_payment', 'auto_offset'));

-- Add comment for documentation
COMMENT ON COLUMN group_settlements.reconciliation_method IS
  'Tracks how a settlement was closed: manual_payment (user marked as paid) or auto_offset (automatically reconciled via offsetting debt)';

-- ============================================
-- Create Index for Performance
-- ============================================

-- Index for querying by reconciliation method
CREATE INDEX IF NOT EXISTS idx_group_settlements_reconciliation_method
ON group_settlements(reconciliation_method)
WHERE reconciliation_method IS NOT NULL;

-- Composite index for common queries (group + status + reconciliation)
CREATE INDEX IF NOT EXISTS idx_group_settlements_status_reconciliation
ON group_settlements(group_id, status, reconciliation_method);

-- ============================================
-- Backfill Existing Data
-- ============================================

-- Mark all existing closed settlements as manual payments
-- (This assumes any previously closed settlement was done manually)
UPDATE group_settlements
SET reconciliation_method = 'manual_payment'
WHERE status = 'closed'
  AND reconciliation_method IS NULL;

-- ============================================
-- Update RLS Policies (if needed)
-- ============================================

-- The existing RLS policies should cover the new column
-- No changes needed as we're using the same anonymous access pattern

-- ============================================
-- Verification Queries (Optional - for testing)
-- ============================================

-- Uncomment these to verify the migration:

-- Check column was added
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'group_settlements'
-- AND column_name = 'reconciliation_method';

-- Check indexes were created
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'group_settlements'
-- AND indexname LIKE '%reconciliation%';

-- Count settlements by reconciliation method
-- SELECT
--   status,
--   reconciliation_method,
--   COUNT(*) as count
-- FROM group_settlements
-- GROUP BY status, reconciliation_method
-- ORDER BY status, reconciliation_method;

-- ============================================
-- Rollback Script (if needed)
-- ============================================

-- To rollback this migration, run:
-- DROP INDEX IF EXISTS idx_group_settlements_reconciliation_method;
-- DROP INDEX IF EXISTS idx_group_settlements_status_reconciliation;
-- ALTER TABLE group_settlements DROP COLUMN IF EXISTS reconciliation_method;
