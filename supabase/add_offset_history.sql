-- ============================================
-- Migration: Add Offset History Tracking
-- Purpose: Track partial settlement offsets with complete audit trail
-- Date: 2025-11-03
-- ============================================

-- Add offset_history column to group_settlements table
-- This column stores an array of offset events for complete transparency
ALTER TABLE group_settlements
ADD COLUMN IF NOT EXISTS offset_history JSONB DEFAULT '[]'::jsonb;

-- Add comment explaining the column structure
COMMENT ON COLUMN group_settlements.offset_history IS
'Array of offset events tracking when this settlement was partially or fully offset.
Structure: [{
  "offset_at": "ISO timestamp",
  "offset_amount": number,
  "offset_by_expense_id": "UUID of expense that caused the offset",
  "offset_by_expense_title": "Title of offsetting expense",
  "offset_settlement_id": "UUID of the opposing settlement that was used",
  "offset_from": "Member name who owed in offsetting settlement",
  "offset_to": "Member name who received in offsetting settlement",
  "previous_amount": "Settlement amount before this offset",
  "new_amount": "Settlement amount after this offset",
  "method": "auto_offset"
}]';

-- Add index for querying offset history
CREATE INDEX IF NOT EXISTS idx_settlements_with_offsets
ON group_settlements ((offset_history))
WHERE jsonb_array_length(offset_history) > 0;

-- ============================================
-- Verification Queries
-- ============================================

-- Check if column was added successfully
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'group_settlements'
-- AND column_name = 'offset_history';

-- View settlements with offset history
-- SELECT id, from_member, to_member, amount, status,
--        jsonb_array_length(offset_history) as offset_count,
--        offset_history
-- FROM group_settlements
-- WHERE jsonb_array_length(offset_history) > 0;

-- ============================================
-- Rollback (if needed)
-- ============================================
-- DROP INDEX IF EXISTS idx_settlements_with_offsets;
-- ALTER TABLE group_settlements DROP COLUMN IF EXISTS offset_history;
