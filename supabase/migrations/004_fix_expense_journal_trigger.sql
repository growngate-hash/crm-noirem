-- ============================================================
-- MIGRATION 004: Fix expense → journal_entry trigger
-- Gastos ahora generan asientos contables correctos usando
-- account_id seleccionado por el usuario (o 5200 por defecto).
-- ============================================================

-- 1. Recrear la función del trigger con lógica corregida
CREATE OR REPLACE FUNCTION generate_journal_entry_for_expense()
RETURNS TRIGGER AS $$
DECLARE
  v_period_id      uuid;
  v_entry_id       uuid;
  v_entry_number   text;
  v_expense_account uuid;
  v_bank_account   uuid;
  v_seq            int;
BEGIN
  -- Período fiscal abierto
  SELECT id INTO v_period_id
  FROM fiscal_periods
  WHERE status = 'open'
    AND now()::date BETWEEN start_date AND end_date
  LIMIT 1;

  -- Usar la cuenta seleccionada por el usuario, si no → 5200 Gastos Generales
  IF NEW.account_id IS NOT NULL THEN
    v_expense_account := NEW.account_id;
  ELSE
    SELECT id INTO v_expense_account
    FROM chart_of_accounts WHERE code = '5200';
  END IF;

  -- Cuenta bancaria (contrapartida)
  SELECT id INTO v_bank_account
  FROM chart_of_accounts WHERE code = '1120';

  -- Abortar si faltan cuentas para no romper el INSERT de gasto
  IF v_expense_account IS NULL OR v_bank_account IS NULL THEN
    RETURN NEW;
  END IF;

  -- Número de asiento único
  SELECT COUNT(*) + 1 INTO v_seq FROM journal_entries;
  v_entry_number := 'JE-' || TO_CHAR(now(), 'YYYYMM')
                  || '-' || LPAD(v_seq::text, 4, '0');

  -- Cabecera del asiento
  INSERT INTO journal_entries (
    entry_number, entry_date, description,
    reference_type, reference_id,
    fiscal_period_id, status,
    total_debit, total_credit
  ) VALUES (
    v_entry_number,
    COALESCE(NEW.date::date, now()::date),
    'Gasto: ' || COALESCE(NEW.description, ''),
    'expense', NEW.id,
    v_period_id, 'posted',
    NEW.amount, NEW.amount
  ) RETURNING id INTO v_entry_id;

  -- Línea débito: cuenta de gasto
  INSERT INTO journal_lines (
    journal_entry_id, account_id,
    debit, credit, description, currency
  ) VALUES (
    v_entry_id, v_expense_account,
    NEW.amount, 0,
    COALESCE(NEW.description, ''),
    'AED'
  );

  -- Línea crédito: banco / caja
  INSERT INTO journal_lines (
    journal_entry_id, account_id,
    debit, credit, currency
  ) VALUES (
    v_entry_id, v_bank_account,
    0, NEW.amount, 'AED'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Recrear el trigger (AFTER INSERT)
DROP TRIGGER IF EXISTS trg_expense_journal ON expenses;
CREATE TRIGGER trg_expense_journal
  AFTER INSERT ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION generate_journal_entry_for_expense();

SELECT 'Trigger de gastos corregido' AS resultado;
