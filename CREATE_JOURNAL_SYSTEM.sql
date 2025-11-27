-- نظام اليومية المحاسبية (Journal System)
-- إنشاء جدول اليومية المحاسبية

CREATE TABLE IF NOT EXISTS journal_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    entry_number TEXT,
    description TEXT NOT NULL,
    reference_type TEXT, -- 'invoice_in', 'invoice_out', 'payment', 'expense', 'payroll', etc.
    reference_id UUID,
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    currency TEXT DEFAULT 'TRY',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول قيود اليومية (Debit/Credit)
CREATE TABLE IF NOT EXISTS journal_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    account_type TEXT NOT NULL, -- 'asset', 'liability', 'equity', 'revenue', 'expense', 'inventory', 'cash', 'partner_debt', 'partner_receivable'
    account_name TEXT NOT NULL,
    account_id UUID, -- ID of related entity (partner_id, inventory_item_id, etc.)
    debit_amount NUMERIC(15, 2) DEFAULT 0,
    credit_amount NUMERIC(15, 2) DEFAULT 0,
    currency TEXT DEFAULT 'TRY',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول تتبع الذمم
CREATE TABLE IF NOT EXISTS account_balances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
    account_type TEXT NOT NULL, -- 'receivable' (دائن علينا), 'payable' (مدين لنا)
    balance NUMERIC(15, 2) NOT NULL DEFAULT 0,
    currency TEXT DEFAULT 'TRY',
    last_transaction_date TIMESTAMPTZ,
    last_transaction_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, partner_id, account_type, currency)
);

-- جدول معاملات الذمم
CREATE TABLE IF NOT EXISTS account_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL, -- 'invoice', 'payment', 'credit', 'debit'
    reference_type TEXT, -- 'invoice_in', 'invoice_out', 'payment', etc.
    reference_id UUID,
    amount NUMERIC(15, 2) NOT NULL,
    currency TEXT DEFAULT 'TRY',
    balance_before NUMERIC(15, 2) DEFAULT 0,
    balance_after NUMERIC(15, 2) DEFAULT 0,
    description TEXT,
    transaction_date TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول تحديثات المخزون
CREATE TABLE IF NOT EXISTS inventory_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL, -- 'inbound', 'outbound', 'adjustment', 'return'
    reference_type TEXT, -- 'invoice_in', 'invoice_out', 'project', 'adjustment'
    reference_id UUID,
    quantity_change NUMERIC(10, 2) NOT NULL, -- positive for inbound, negative for outbound
    quantity_before NUMERIC(10, 2) DEFAULT 0,
    quantity_after NUMERIC(10, 2) DEFAULT 0,
    unit_price NUMERIC(15, 2) DEFAULT 0,
    currency TEXT DEFAULT 'TRY',
    description TEXT,
    transaction_date TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول خصومات دورية للموظفين
CREATE TABLE IF NOT EXISTS employee_deductions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    deduction_type TEXT NOT NULL, -- 'loan', 'insurance', 'advance', 'other'
    description TEXT NOT NULL,
    total_amount NUMERIC(15, 2) NOT NULL,
    remaining_amount NUMERIC(15, 2) NOT NULL,
    monthly_deduction NUMERIC(15, 2) NOT NULL,
    currency TEXT DEFAULT 'TRY',
    start_date DATE NOT NULL,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- إضافة حقول للبدلات والخصومات في جدول الموظفين
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS allowances NUMERIC(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS deductions NUMERIC(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS net_salary NUMERIC(15, 2) DEFAULT 0;

-- إنشاء الفهارس
CREATE INDEX IF NOT EXISTS idx_journal_entries_tenant_id ON journal_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_journal_lines_entry_id ON journal_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_tenant_id ON journal_lines(tenant_id);
CREATE INDEX IF NOT EXISTS idx_account_balances_tenant_id ON account_balances(tenant_id);
CREATE INDEX IF NOT EXISTS idx_account_balances_partner_id ON account_balances(partner_id);
CREATE INDEX IF NOT EXISTS idx_account_transactions_tenant_id ON account_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_account_transactions_partner_id ON account_transactions(partner_id);
CREATE INDEX IF NOT EXISTS idx_account_transactions_date ON account_transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_tenant_id ON inventory_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_item_id ON inventory_transactions(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_date ON inventory_transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_employee_deductions_tenant_id ON employee_deductions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_employee_deductions_employee_id ON employee_deductions(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_deductions_active ON employee_deductions(is_active) WHERE is_active = true;

-- دالة لتحديث رصيد الذمم تلقائياً
CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO account_balances (tenant_id, partner_id, account_type, balance, currency, last_transaction_date, last_transaction_id, updated_at)
    VALUES (
        NEW.tenant_id,
        NEW.partner_id,
        CASE 
            WHEN NEW.transaction_type IN ('invoice_out', 'credit') THEN 'receivable'
            WHEN NEW.transaction_type IN ('invoice_in', 'debit') THEN 'payable'
            ELSE 'receivable'
        END,
        NEW.amount,
        NEW.currency,
        NEW.transaction_date,
        NEW.id,
        NOW()
    )
    ON CONFLICT (tenant_id, partner_id, account_type, currency)
    DO UPDATE SET
        balance = account_balances.balance + 
            CASE 
                WHEN NEW.transaction_type IN ('invoice_out', 'credit') THEN NEW.amount
                WHEN NEW.transaction_type IN ('payment', 'debit') THEN -NEW.amount
                WHEN NEW.transaction_type IN ('invoice_in') THEN NEW.amount
                ELSE 0
            END,
        last_transaction_date = NEW.transaction_date,
        last_transaction_id = NEW.id,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger لتحديث رصيد الذمم تلقائياً
DROP TRIGGER IF EXISTS trigger_update_account_balance ON account_transactions;
CREATE TRIGGER trigger_update_account_balance
    AFTER INSERT ON account_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_account_balance();

-- دالة لتحديث المخزون تلقائياً
CREATE OR REPLACE FUNCTION update_inventory_quantity()
RETURNS TRIGGER AS $$
DECLARE
    current_quantity NUMERIC(10, 2);
BEGIN
    -- الحصول على الكمية الحالية
    SELECT quantity INTO current_quantity
    FROM inventory_items
    WHERE id = NEW.inventory_item_id;
    
    -- تحديث الكمية
    UPDATE inventory_items
    SET quantity = current_quantity + NEW.quantity_change,
        updated_at = NOW()
    WHERE id = NEW.inventory_item_id;
    
    -- تحديث quantity_after في السجل
    NEW.quantity_before := current_quantity;
    NEW.quantity_after := current_quantity + NEW.quantity_change;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger لتحديث المخزون تلقائياً
DROP TRIGGER IF EXISTS trigger_update_inventory_quantity ON inventory_transactions;
CREATE TRIGGER trigger_update_inventory_quantity
    BEFORE INSERT ON inventory_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_inventory_quantity();

