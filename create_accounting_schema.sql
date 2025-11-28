-- ============================================
-- Create Accounting Schema: Debts, Payments, Employees, Deductions, Journal Entries
-- Created: 2025-11-28
-- Description: Basic accounting tables and helper functions to support debts/payments,
--              employee payroll deductions, and double-entry journal records.
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Employees table
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  national_id TEXT,
  position TEXT,
  salary_amount NUMERIC(14,2) DEFAULT 0,
  salary_currency TEXT DEFAULT 'SYP',
  pay_frequency TEXT DEFAULT 'monthly', -- monthly, weekly, biweekly
  is_active BOOLEAN DEFAULT TRUE,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_employees_tenant ON employees(tenant_id);

-- Deductions (employee-specific recurring or one-off deductions)
CREATE TABLE IF NOT EXISTS deductions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  deduction_type TEXT NOT NULL, -- 'tax', 'loan', 'advance', 'social', etc.
  amount NUMERIC(14,2) NOT NULL,
  currency TEXT DEFAULT 'SYP',
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_rule JSONB, -- {'cron': '0 0 1 * *'} or {interval_days: 30}
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_deductions_employee ON deductions(employee_id);
CREATE INDEX IF NOT EXISTS idx_deductions_tenant ON deductions(tenant_id);

-- Debts table (customers or suppliers debts)
CREATE TABLE IF NOT EXISTS debts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  partner_id UUID NULL, -- optional customer or supplier reference
  related_invoice_id UUID NULL,
  description TEXT,
  amount NUMERIC(14,2) NOT NULL,
  currency TEXT DEFAULT 'SYP',
  due_date DATE,
  status TEXT DEFAULT 'open', -- open, partial, paid, overdue
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_debts_tenant ON debts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_debts_partner ON debts(partner_id);

-- Payments table (payments against debts or general receipts/payments)
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  debt_id UUID REFERENCES debts(id) ON DELETE SET NULL,
  partner_id UUID NULL,
  amount NUMERIC(14,2) NOT NULL,
  currency TEXT DEFAULT 'SYP',
  payment_method TEXT DEFAULT 'cash', -- cash, card, bank, transfer
  reference TEXT,
  recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_payments_tenant ON payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_debt ON payments(debt_id);

-- Journal entries (double-entry)
CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  code TEXT, -- optional reference code
  date DATE DEFAULT CURRENT_DATE,
  description TEXT,
  posted BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS journal_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_code TEXT NOT NULL,
  debit NUMERIC(14,2) DEFAULT 0,
  credit NUMERIC(14,2) DEFAULT 0,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_journal_entries_tenant ON journal_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_entry ON journal_lines(journal_entry_id);

-- Helper function to create a journal entry with lines (atomic)
CREATE OR REPLACE FUNCTION create_journal_entry(
  p_tenant_id UUID,
  p_code TEXT,
  p_date DATE,
  p_description TEXT,
  p_created_by UUID,
  p_lines JSONB -- array of { account_code, debit, credit, description }
) RETURNS UUID AS $$
DECLARE
  v_entry_id UUID;
  v_line JSONB;
BEGIN
  INSERT INTO journal_entries (tenant_id, code, date, description, created_by)
  VALUES (p_tenant_id, p_code, p_date, p_description, p_created_by)
  RETURNING id INTO v_entry_id;

  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    INSERT INTO journal_lines (journal_entry_id, account_code, debit, credit, description, metadata)
    VALUES (
      v_entry_id,
      (v_line->>'account_code')::text,
      COALESCE((v_line->>'debit')::numeric, 0),
      COALESCE((v_line->>'credit')::numeric, 0),
      (v_line->>'description')::text,
      v_line->'metadata'
    );
  END LOOP;

  RETURN v_entry_id;
END;
$$ LANGUAGE plpgsql;

-- Create payment -> journal trigger helper: when a payment is recorded, optionally create a journal entry
CREATE OR REPLACE FUNCTION on_payment_create_create_journal()
RETURNS TRIGGER AS $$
DECLARE
  v_entry_id UUID;
  v_lines JSONB;
  v_desc TEXT;
BEGIN
  -- build lines: debit cash/bank account, credit receivable (customer) or payable
  v_desc := COALESCE(NEW.reference, 'Payment received');
  v_lines := jsonb_build_array(
    jsonb_build_object('account_code', '1010', 'debit', NEW.amount::TEXT, 'description', v_desc),
    jsonb_build_object('account_code', '2000', 'credit', NEW.amount::TEXT, 'description', v_desc)
  );

  PERFORM create_journal_entry(NEW.tenant_id, 'PAY-' || substr(NEW.id::text,1,8), CURRENT_DATE, v_desc, NEW.recorded_by, v_lines);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to payments
DROP TRIGGER IF EXISTS trigger_payment_create_journal ON payments;
CREATE TRIGGER trigger_payment_create_journal
  AFTER INSERT ON payments
  FOR EACH ROW
  EXECUTE FUNCTION on_payment_create_create_journal();

-- Payroll helper: create salary payment and deductions processing
CREATE OR REPLACE FUNCTION process_payroll_for_employee(p_employee_id UUID, p_period_date DATE, p_processed_by UUID)
RETURNS JSONB AS $$
DECLARE
  emp RECORD;
  total_deductions NUMERIC := 0;
  ded RECORD;
  payment_amount NUMERIC := 0;
  journal_lines JSONB := '[]'::jsonb;
  entry_id UUID;
BEGIN
  SELECT * INTO emp FROM employees WHERE id = p_employee_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Employee not found';
  END IF;

  -- sum deductions (recurring or one-off within period)
  FOR ded IN SELECT * FROM deductions WHERE employee_id = p_employee_id
  LOOP
    total_deductions := total_deductions + ded.amount;
    journal_lines := journal_lines || jsonb_build_array(
      jsonb_build_object('account_code', '6000', 'debit', ded.amount::text, 'description', 'Deduction: ' || ded.deduction_type)
    );
  END LOOP;

  payment_amount := emp.salary_amount - total_deductions;
  IF payment_amount < 0 THEN
    payment_amount := 0;
  END IF;

  -- create a journal entry for payroll (expense and bank/cash)
  journal_lines := journal_lines || jsonb_build_array(
    jsonb_build_object('account_code', '5000', 'debit', emp.salary_amount::text, 'description', 'Salary expense'),
    jsonb_build_object('account_code', '1010', 'credit', payment_amount::text, 'description', 'Net salary payable')
  );

  entry_id := create_journal_entry(emp.tenant_id, 'PR-' || substr(gen_random_uuid()::text,1,8), p_period_date, 'Payroll for ' || emp.name, p_processed_by, journal_lines);

  RETURN jsonb_build_object('entry_id', entry_id, 'employee_id', emp.id, 'gross', emp.salary_amount, 'deductions', total_deductions, 'net', payment_amount);
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE employees IS 'Employees list with salary settings per tenant';
COMMENT ON TABLE deductions IS 'Employee deductions (taxes, loans, advances)';
COMMENT ON TABLE debts IS 'Customer/Supplier debts ledger';
COMMENT ON TABLE payments IS 'Payments against debts or general receipts/payments';
COMMENT ON TABLE journal_entries IS 'Double-entry journal entries';
COMMENT ON TABLE journal_lines IS 'Lines for each journal entry (debits/credits)';

-- End of accounting schema migration

SELECT 'Accounting schema file created (no changes applied until executed).' AS result;
