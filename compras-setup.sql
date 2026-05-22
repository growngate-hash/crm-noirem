-- ═══════════════════════════════════════════════════════════════════
--  MÓDULO FACTURAS DE COMPRA — ejecutar en Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════

-- 1. TABLA purchase_invoices
CREATE TABLE IF NOT EXISTS public.purchase_invoices (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number    text NOT NULL,
  supplier_id       uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  supplier_name     text,
  issue_date        date NOT NULL,
  due_date          date,
  status            text NOT NULL DEFAULT 'pendiente'
                      CHECK (status IN ('pendiente','pagada','vencida','anulada')),
  subtotal          numeric(12,2) NOT NULL DEFAULT 0,
  discount          numeric(12,2) NOT NULL DEFAULT 0,
  discount_percent  numeric(5,2) NOT NULL DEFAULT 0,
  tax               numeric(12,2) NOT NULL DEFAULT 0,
  total             numeric(12,2) NOT NULL DEFAULT 0,
  notes             text,
  payment_date      date,
  payment_reference text,
  bank_account_id   uuid REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  void_reason       text,
  voided_at         timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- 2. TABLA purchase_invoice_lines
CREATE TABLE IF NOT EXISTS public.purchase_invoice_lines (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_invoice_id   uuid NOT NULL REFERENCES public.purchase_invoices(id) ON DELETE CASCADE,
  inventory_item_id     uuid REFERENCES public.inventory(id) ON DELETE SET NULL,
  account_id            uuid REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,
  description           text NOT NULL,
  quantity              numeric(10,3) NOT NULL DEFAULT 1,
  unit_price            numeric(12,2) NOT NULL DEFAULT 0,
  discount              numeric(5,2) NOT NULL DEFAULT 0,
  subtotal              numeric(12,2) NOT NULL DEFAULT 0,
  account_type          text NOT NULL DEFAULT 'expense'
                          CHECK (account_type IN ('inventory','expense')),
  created_at            timestamptz NOT NULL DEFAULT now()
);

-- 3. RLS
ALTER TABLE public.purchase_invoices      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_invoice_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow all purchase_invoices"      ON public.purchase_invoices;
DROP POLICY IF EXISTS "allow all purchase_invoice_lines" ON public.purchase_invoice_lines;

CREATE POLICY "allow all purchase_invoices"
  ON public.purchase_invoices FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "allow all purchase_invoice_lines"
  ON public.purchase_invoice_lines FOR ALL
  USING (true) WITH CHECK (true);

-- 4. updated_at trigger helper (skip if function already exists)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE OR REPLACE TRIGGER trg_purchase_invoices_updated_at
  BEFORE UPDATE ON public.purchase_invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. ALTER invoices — add bank_account_id if missing
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS bank_account_id uuid REFERENCES public.bank_accounts(id) ON DELETE SET NULL;

-- ═══════════════════════════════════════════════════════════════════
--  LISTO. Verifica que las tablas aparecen en Table Editor.
-- ═══════════════════════════════════════════════════════════════════
