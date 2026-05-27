-- Fix RLS for finance tables: invoices, expenses, purchase_invoices, bank_accounts
-- Requires: get_owner_id() function from 20260526_team_rls.sql

-- ── invoices ──────────────────────────────────────────────────────────────────
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view all invoices"   ON invoices;
DROP POLICY IF EXISTS "Staff can manage all invoices" ON invoices;
DROP POLICY IF EXISTS "auth_only"                     ON invoices;
DROP POLICY IF EXISTS "tenant_isolation"              ON invoices;

CREATE POLICY "tenant_isolation" ON invoices
  FOR ALL TO authenticated
  USING (user_id = public.get_owner_id())
  WITH CHECK (user_id = public.get_owner_id());

-- ── expenses ──────────────────────────────────────────────────────────────────
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_only"        ON expenses;
DROP POLICY IF EXISTS "tenant_isolation" ON expenses;

CREATE POLICY "tenant_isolation" ON expenses
  FOR ALL TO authenticated
  USING (user_id = public.get_owner_id())
  WITH CHECK (user_id = public.get_owner_id());

-- ── purchase_invoices ─────────────────────────────────────────────────────────
ALTER TABLE purchase_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_only"        ON purchase_invoices;
DROP POLICY IF EXISTS "tenant_isolation" ON purchase_invoices;

CREATE POLICY "tenant_isolation" ON purchase_invoices
  FOR ALL TO authenticated
  USING (user_id = public.get_owner_id())
  WITH CHECK (user_id = public.get_owner_id());

-- ── bank_accounts ─────────────────────────────────────────────────────────────
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_only"        ON bank_accounts;
DROP POLICY IF EXISTS "tenant_isolation" ON bank_accounts;

CREATE POLICY "tenant_isolation" ON bank_accounts
  FOR ALL TO authenticated
  USING (user_id = public.get_owner_id())
  WITH CHECK (user_id = public.get_owner_id());