-- ============================================================
-- MIGRATION 005: Backfill journal entries for existing expenses
-- Genera asientos contables retroactivos para todos los gastos
-- que aún no tienen un asiento asociado en journal_entries.
-- Ejecutar UNA SOLA VEZ después de la migración 004.
-- ============================================================

DO $$
DECLARE
  v_expense        RECORD;
  v_period_id      uuid;
  v_entry_id       uuid;
  v_entry_number   text;
  v_expense_account uuid;
  v_bank_account   uuid;
  v_seq            int;
  v_count          int := 0;
BEGIN
  -- Período fiscal abierto
  SELECT id INTO v_period_id
  FROM fiscal_periods
  WHERE status = 'open'
    AND now()::date BETWEEN start_date AND end_date
  LIMIT 1;

  -- Cuenta bancaria (contrapartida fija)
  SELECT id INTO v_bank_account
  FROM chart_of_accounts WHERE code = '1120';

  -- Procesar cada gasto sin asiento
  FOR v_expense IN
    SELECT e.*
    FROM expenses e
    WHERE NOT EXISTS (
      SELECT 1 FROM journal_entries je
      WHERE je.reference_id = e.id
        AND je.reference_type = 'expense'
    )
    ORDER BY e.date ASC
  LOOP
    -- Cuenta de gasto: la asignada o la genérica 5200
    IF v_expense.account_id IS NOT NULL THEN
      v_expense_account := v_expense.account_id;
    ELSE
      SELECT id INTO v_expense_account
      FROM chart_of_accounts WHERE code = '5200';
    END IF;

    IF v_expense_account IS NULL OR v_bank_account IS NULL THEN
      RAISE NOTICE 'Sin cuentas para gasto id=%, saltando.', v_expense.id;
      CONTINUE;
    END IF;

    -- Número secuencial único
    SELECT COUNT(*) + 1 INTO v_seq FROM journal_entries;
    v_entry_number := 'JE-' || TO_CHAR(now(), 'YYYYMM')
                    || '-' || LPAD(v_seq::text, 4, '0');

    -- Cabecera
    INSERT INTO journal_entries (
      entry_number, entry_date, description,
      reference_type, reference_id,
      fiscal_period_id, status,
      total_debit, total_credit
    ) VALUES (
      v_entry_number,
      COALESCE(v_expense.date::date, now()::date),
      'Gasto: ' || COALESCE(v_expense.description, ''),
      'expense', v_expense.id,
      v_period_id, 'posted',
      v_expense.amount, v_expense.amount
    ) RETURNING id INTO v_entry_id;

    -- Débito: cuenta de gasto
    INSERT INTO journal_lines (
      journal_entry_id, account_id,
      debit, credit, description, currency
    ) VALUES (
      v_entry_id, v_expense_account,
      v_expense.amount, 0,
      COALESCE(v_expense.description, ''),
      'AED'
    );

    -- Crédito: banco
    INSERT INTO journal_lines (
      journal_entry_id, account_id,
      debit, credit, currency
    ) VALUES (
      v_entry_id, v_bank_account,
      0, v_expense.amount, 'AED'
    );

    v_count := v_count + 1;
    RAISE NOTICE 'Asiento % generado para: % (AED %)',
      v_entry_number, v_expense.description, v_expense.amount;
  END LOOP;

  RAISE NOTICE '=== Backfill completado: % asientos generados ===', v_count;
END;
$$;

-- Verificar resultado
SELECT
  je.entry_number,
  je.description,
  je.total_debit,
  je.entry_date,
  je.reference_type
FROM journal_entries
WHERE reference_type = 'expense'
ORDER BY created_at DESC
LIMIT 20;
