-- Expense Calculator Group Management Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Groups Table
-- ============================================
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast code lookups
CREATE INDEX IF NOT EXISTS idx_groups_code ON groups(code);

-- ============================================
-- Group Members Table
-- ============================================
CREATE TABLE IF NOT EXISTS group_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_id, name)
);

-- Index for fast member lookups by group
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);

-- ============================================
-- Group Expenses Table
-- ============================================
CREATE TABLE IF NOT EXISTS group_expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  currency TEXT NOT NULL,
  total_amount DECIMAL(12, 2) NOT NULL,
  expense_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast expense lookups by group
CREATE INDEX IF NOT EXISTS idx_group_expenses_group_id ON group_expenses(group_id);
CREATE INDEX IF NOT EXISTS idx_group_expenses_created_at ON group_expenses(created_at DESC);

-- ============================================
-- Group Settlements Table
-- ============================================
CREATE TABLE IF NOT EXISTS group_settlements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expense_id UUID NOT NULL REFERENCES group_expenses(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  from_member TEXT NOT NULL,
  to_member TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  closed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for fast settlement queries
CREATE INDEX IF NOT EXISTS idx_group_settlements_expense_id ON group_settlements(expense_id);
CREATE INDEX IF NOT EXISTS idx_group_settlements_group_id ON group_settlements(group_id);
CREATE INDEX IF NOT EXISTS idx_group_settlements_status ON group_settlements(status);

-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================
-- Enable RLS on all tables
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_settlements ENABLE ROW LEVEL SECURITY;

-- Allow anonymous access for all operations (since this is a public app)
-- You can customize these policies based on your security requirements

-- Groups policies
CREATE POLICY "Allow anonymous read access on groups" ON groups
  FOR SELECT USING (true);

CREATE POLICY "Allow anonymous insert access on groups" ON groups
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous update access on groups" ON groups
  FOR UPDATE USING (true);

-- Group members policies
CREATE POLICY "Allow anonymous read access on group_members" ON group_members
  FOR SELECT USING (true);

CREATE POLICY "Allow anonymous insert access on group_members" ON group_members
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous update access on group_members" ON group_members
  FOR UPDATE USING (true);

-- Group expenses policies
CREATE POLICY "Allow anonymous read access on group_expenses" ON group_expenses
  FOR SELECT USING (true);

CREATE POLICY "Allow anonymous insert access on group_expenses" ON group_expenses
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous update access on group_expenses" ON group_expenses
  FOR UPDATE USING (true);

-- Group settlements policies
CREATE POLICY "Allow anonymous read access on group_settlements" ON group_settlements
  FOR SELECT USING (true);

CREATE POLICY "Allow anonymous insert access on group_settlements" ON group_settlements
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous update access on group_settlements" ON group_settlements
  FOR UPDATE USING (true);

-- ============================================
-- Helper Functions
-- ============================================

-- Function to get all open settlements for a group (used for netting)
CREATE OR REPLACE FUNCTION get_open_settlements(p_group_id UUID)
RETURNS TABLE (
  from_member TEXT,
  to_member TEXT,
  amount DECIMAL(12, 2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    gs.from_member,
    gs.to_member,
    gs.amount
  FROM group_settlements gs
  WHERE gs.group_id = p_group_id
    AND gs.status = 'open'
  ORDER BY gs.created_at;
END;
$$ LANGUAGE plpgsql;

-- Function to get group summary stats
CREATE OR REPLACE FUNCTION get_group_stats(p_group_id UUID)
RETURNS TABLE (
  total_expenses BIGINT,
  total_amount DECIMAL(12, 2),
  member_count BIGINT,
  open_settlements BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT ge.id) as total_expenses,
    COALESCE(SUM(ge.total_amount), 0) as total_amount,
    COUNT(DISTINCT gm.name) as member_count,
    COUNT(DISTINCT gs.id) FILTER (WHERE gs.status = 'open') as open_settlements
  FROM groups g
  LEFT JOIN group_expenses ge ON g.id = ge.group_id
  LEFT JOIN group_members gm ON g.id = gm.group_id
  LEFT JOIN group_settlements gs ON g.id = gs.group_id
  WHERE g.id = p_group_id
  GROUP BY g.id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Sample Data (Optional - for testing)
-- ============================================
-- Uncomment below to insert sample data

-- INSERT INTO groups (code, name) VALUES
--   ('A3X9K2', 'Weekend Trip'),
--   ('B7Y4M1', 'Roommates'),
--   ('C2Z8N5', 'Office Lunch');

-- INSERT INTO group_members (group_id, name) VALUES
--   ((SELECT id FROM groups WHERE code = 'A3X9K2'), 'Ali'),
--   ((SELECT id FROM groups WHERE code = 'A3X9K2'), 'Musa'),
--   ((SELECT id FROM groups WHERE code = 'A3X9K2'), 'Bob');
