-- ============================================
-- ملف SQL شامل لجميع التحسينات المطلوبة
-- تاريخ التحديث: 2025-01-XX
-- يشمل: المقاولين، المحروقات، المستودع، اليومية، الذمم، الرواتب
-- ============================================

-- التحقق من وجود Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- القسم 1: جداول متجر المقاولين
-- ============================================

-- جدول المشاريع
CREATE TABLE IF NOT EXISTS contractor_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    project_code TEXT NOT NULL,
    project_name TEXT NOT NULL,
    client_id UUID REFERENCES partners(id) ON DELETE SET NULL,
    start_date DATE,
    end_date DATE,
    estimated_cost NUMERIC(15, 2) DEFAULT 0,
    actual_cost NUMERIC(15, 2) DEFAULT 0,
    currency TEXT DEFAULT 'TRY',
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'on_hold', 'cancelled')),
    description TEXT,
    location TEXT,
    project_manager_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, project_code)
);

CREATE INDEX IF NOT EXISTS idx_contractor_projects_tenant ON contractor_projects(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_contractor_projects_client ON contractor_projects(client_id);

-- جدول بنود الكميات (BOQ)
CREATE TABLE IF NOT EXISTS project_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    project_id UUID REFERENCES contractor_projects(id) ON DELETE CASCADE NOT NULL,
    item_code TEXT NOT NULL,
    item_name TEXT NOT NULL,
    item_description TEXT,
    category TEXT, -- خرسانة، حديد، كهرباء، إلخ
    quantity NUMERIC(15, 3) NOT NULL DEFAULT 0,
    unit_code TEXT DEFAULT 'piece',
    unit_price NUMERIC(15, 2) NOT NULL DEFAULT 0,
    total_price NUMERIC(15, 2) NOT NULL DEFAULT 0,
    currency TEXT DEFAULT 'TRY',
    supplier_id UUID REFERENCES partners(id) ON DELETE SET NULL,
    inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE SET NULL,
    warehouse_linked BOOLEAN DEFAULT false,
    planned_quantity NUMERIC(15, 3) DEFAULT 0,
    executed_quantity NUMERIC(15, 3) DEFAULT 0,
    notes TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_project_items_project ON project_items(tenant_id, project_id);
CREATE INDEX IF NOT EXISTS idx_project_items_category ON project_items(tenant_id, category);
CREATE INDEX IF NOT EXISTS idx_project_items_inventory ON project_items(inventory_item_id);

-- جدول عقود المقاولين
CREATE TABLE IF NOT EXISTS contractor_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    project_id UUID REFERENCES contractor_projects(id) ON DELETE CASCADE NOT NULL,
    contract_number TEXT NOT NULL,
    contract_name TEXT NOT NULL,
    contractor_id UUID REFERENCES partners(id) ON DELETE SET NULL,
    contract_value NUMERIC(15, 2) NOT NULL DEFAULT 0,
    currency TEXT DEFAULT 'TRY',
    start_date DATE,
    end_date DATE,
    duration_days INTEGER,
    payment_terms TEXT, -- شروط الدفع
    conditions TEXT, -- شروط العقد
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'terminated', 'suspended')),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, contract_number)
);

CREATE INDEX IF NOT EXISTS idx_contractor_contracts_project ON contractor_contracts(tenant_id, project_id);
CREATE INDEX IF NOT EXISTS idx_contractor_contracts_contractor ON contractor_contracts(contractor_id);

-- جدول دفعات المقاولين
CREATE TABLE IF NOT EXISTS contractor_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    contract_id UUID REFERENCES contractor_contracts(id) ON DELETE CASCADE NOT NULL,
    project_id UUID REFERENCES contractor_projects(id) ON DELETE SET NULL,
    payment_type TEXT NOT NULL CHECK (payment_type IN ('advance', 'installment', 'final', 'penalty')),
    amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    currency TEXT DEFAULT 'TRY',
    payment_date DATE NOT NULL,
    payment_method TEXT DEFAULT 'cash',
    description TEXT,
    invoice_id UUID, -- ربط بفاتورة إذا كانت موجودة
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contractor_payments_contract ON contractor_payments(tenant_id, contract_id);
CREATE INDEX IF NOT EXISTS idx_contractor_payments_project ON contractor_payments(project_id);

-- جدول طلبات الشراء التلقائية من BOQ
CREATE TABLE IF NOT EXISTS purchase_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    project_id UUID REFERENCES contractor_projects(id) ON DELETE SET NULL,
    project_item_id UUID REFERENCES project_items(id) ON DELETE SET NULL,
    inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE SET NULL,
    requested_quantity NUMERIC(15, 3) NOT NULL,
    unit TEXT DEFAULT 'piece',
    supplier_id UUID REFERENCES partners(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'ordered', 'received', 'cancelled')),
    auto_generated BOOLEAN DEFAULT false, -- تم إنشاؤه تلقائياً من BOQ
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchase_requests_tenant ON purchase_requests(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_project ON purchase_requests(project_id);

-- ============================================
-- القسم 2: جداول متجر المحروقات
-- ============================================

-- جدول منتجات المحروقات
CREATE TABLE IF NOT EXISTS fuel_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    product_code TEXT NOT NULL,
    product_name TEXT NOT NULL,
    fuel_type TEXT NOT NULL CHECK (fuel_type IN ('gasoline', 'diesel', 'gas', 'other')),
    unit TEXT DEFAULT 'liter',
    current_price NUMERIC(15, 2) DEFAULT 0,
    currency TEXT DEFAULT 'TRY',
    linked_to_market BOOLEAN DEFAULT false, -- مرتبط بسوق عالمي
    market_price_source TEXT,
    inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, product_code)
);

CREATE INDEX IF NOT EXISTS idx_fuel_products_tenant ON fuel_products(tenant_id, fuel_type);
CREATE INDEX IF NOT EXISTS idx_fuel_products_inventory ON fuel_products(inventory_item_id);

-- جدول أسعار يومية للمحروقات
CREATE TABLE IF NOT EXISTS fuel_daily_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    fuel_product_id UUID REFERENCES fuel_products(id) ON DELETE CASCADE NOT NULL,
    price_date DATE NOT NULL,
    price NUMERIC(15, 2) NOT NULL DEFAULT 0,
    currency TEXT DEFAULT 'TRY',
    market_price NUMERIC(15, 2), -- السعر العالمي
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, fuel_product_id, price_date)
);

CREATE INDEX IF NOT EXISTS idx_fuel_daily_prices_product ON fuel_daily_prices(tenant_id, fuel_product_id, price_date DESC);

-- جدول عملاء المحروقات (أفراد وشركات)
CREATE TABLE IF NOT EXISTS fuel_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    partner_id UUID REFERENCES partners(id) ON DELETE CASCADE NOT NULL,
    customer_type TEXT NOT NULL CHECK (customer_type IN ('individual', 'company')),
    contract_type TEXT CHECK (contract_type IN ('direct_sale', 'monthly_contract', NULL)),
    monthly_quota NUMERIC(15, 3), -- الكمية الشهرية المتفق عليها
    contract_start_date DATE,
    contract_end_date DATE,
    discount_percentage NUMERIC(5, 2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, partner_id)
);

CREATE INDEX IF NOT EXISTS idx_fuel_customers_tenant ON fuel_customers(tenant_id, customer_type);

-- ============================================
-- القسم 3: تحسينات المستودع (الوارد/الصادر)
-- ============================================

-- جدول حركات المستودع (الوارد والصادر)
CREATE TABLE IF NOT EXISTS warehouse_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('inbound', 'outbound', 'adjustment', 'transfer')),
    inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE NOT NULL,
    quantity NUMERIC(15, 3) NOT NULL,
    unit TEXT DEFAULT 'piece',
    related_invoice_id UUID, -- فاتورة وارد أو صادر
    related_invoice_type TEXT CHECK (related_invoice_type IN ('invoice_in', 'invoice_out', NULL)),
    project_id UUID REFERENCES contractor_projects(id) ON DELETE SET NULL, -- للمشاريع
    project_item_id UUID REFERENCES project_items(id) ON DELETE SET NULL,
    supplier_id UUID REFERENCES partners(id) ON DELETE SET NULL, -- للوارد
    customer_id UUID REFERENCES partners(id) ON DELETE SET NULL, -- للصادر
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_warehouse_transactions_tenant ON warehouse_transactions(tenant_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_warehouse_transactions_item ON warehouse_transactions(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_transactions_type ON warehouse_transactions(transaction_type);

-- Function للتحقق من توفر الكمية قبل الصادر
CREATE OR REPLACE FUNCTION check_inventory_availability()
RETURNS TRIGGER AS $$
DECLARE
    current_quantity NUMERIC;
BEGIN
    IF NEW.transaction_type = 'outbound' THEN
        SELECT quantity INTO current_quantity
        FROM inventory_items
        WHERE id = NEW.inventory_item_id
            AND tenant_id = NEW.tenant_id;
        
        IF current_quantity < NEW.quantity THEN
            RAISE EXCEPTION 'الكمية غير كافية في المستودع. المتوفرة: %, المطلوبة: %', 
                current_quantity, NEW.quantity;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_check_inventory_availability ON warehouse_transactions;
CREATE TRIGGER trigger_check_inventory_availability
    BEFORE INSERT ON warehouse_transactions
    FOR EACH ROW
    WHEN (NEW.transaction_type = 'outbound')
    EXECUTE FUNCTION check_inventory_availability();

-- Function لتحديث المخزون تلقائياً
CREATE OR REPLACE FUNCTION update_inventory_from_warehouse_transaction()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.transaction_type = 'inbound' THEN
        -- الوارد: إضافة الكمية
        UPDATE inventory_items
        SET quantity = quantity + NEW.quantity,
            updated_at = NOW()
        WHERE id = NEW.inventory_item_id
            AND tenant_id = NEW.tenant_id;
            
    ELSIF NEW.transaction_type = 'outbound' THEN
        -- الصادر: خصم الكمية
        UPDATE inventory_items
        SET quantity = GREATEST(0, quantity - NEW.quantity),
            updated_at = NOW()
        WHERE id = NEW.inventory_item_id
            AND tenant_id = NEW.tenant_id;
            
        -- إذا كانت الكمية أقل من الحد الأدنى، إنشاء طلب شراء تلقائي
        DO $$
        DECLARE
            item_record RECORD;
        BEGIN
            SELECT * INTO item_record
            FROM inventory_items
            WHERE id = NEW.inventory_item_id
                AND tenant_id = NEW.tenant_id;
            
            IF item_record.quantity < item_record.min_stock THEN
                INSERT INTO purchase_requests (
                    tenant_id,
                    inventory_item_id,
                    requested_quantity,
                    unit,
                    status,
                    auto_generated,
                    notes
                ) VALUES (
                    NEW.tenant_id,
                    NEW.inventory_item_id,
                    item_record.min_stock * 2, -- طلب ضعف الحد الأدنى
                    item_record.unit,
                    'pending',
                    true,
                    'طلب شراء تلقائي - الكمية أقل من الحد الأدنى'
                )
                ON CONFLICT DO NOTHING;
            END IF;
        END $$;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_inventory_from_warehouse ON warehouse_transactions;
CREATE TRIGGER trigger_update_inventory_from_warehouse
    AFTER INSERT ON warehouse_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_inventory_from_warehouse_transaction();

-- ============================================
-- القسم 4: اليومية المحاسبية (المدين/الدائن)
-- ============================================

-- جدول اليومية المحاسبية
CREATE TABLE IF NOT EXISTS journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    entry_number TEXT NOT NULL,
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    entry_type TEXT NOT NULL CHECK (entry_type IN ('inbound', 'outbound', 'payment', 'receipt', 'debt', 'credit', 'salary', 'adjustment')),
    debit_account TEXT NOT NULL, -- الحساب المدين
    credit_account TEXT NOT NULL, -- الحساب الدائن
    amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    currency TEXT DEFAULT 'TRY',
    description TEXT,
    reference_id UUID, -- ربط بعملية أخرى
    reference_type TEXT, -- نوع المرجع (invoice, payment, debt, etc.)
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, entry_number)
);

CREATE INDEX IF NOT EXISTS idx_journal_entries_tenant ON journal_entries(tenant_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_journal_entries_type ON journal_entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_journal_entries_reference ON journal_entries(reference_id, reference_type);

-- Function لإنشاء قيود يومية تلقائية
CREATE OR REPLACE FUNCTION create_journal_entry(
    p_tenant_id UUID,
    p_entry_type TEXT,
    p_debit_account TEXT,
    p_credit_account TEXT,
    p_amount NUMERIC,
    p_currency TEXT DEFAULT 'TRY',
    p_description TEXT DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL,
    p_reference_type TEXT DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_entry_id UUID;
    v_entry_number TEXT;
BEGIN
    -- إنشاء رقم قيد تلقائي
    v_entry_number := 'JE-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(CAST(
        COALESCE((SELECT MAX(CAST(SUBSTRING(entry_number FROM '(\d+)$') AS INTEGER)) FROM journal_entries 
                  WHERE tenant_id = p_tenant_id AND entry_number LIKE 'JE-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-%'), 0) + 1
    AS TEXT), 4, '0');
    
    INSERT INTO journal_entries (
        tenant_id, entry_number, entry_date, entry_type,
        debit_account, credit_account, amount, currency,
        description, reference_id, reference_type, created_by
    ) VALUES (
        p_tenant_id, v_entry_number, CURRENT_DATE, p_entry_type,
        p_debit_account, p_credit_account, p_amount, p_currency,
        p_description, p_reference_id, p_reference_type, p_created_by
    ) RETURNING id INTO v_entry_id;
    
    RETURN v_entry_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- القسم 5: الذمم والمدفوعات مع تاريخ السداد
-- ============================================

-- جدول الذمم
CREATE TABLE IF NOT EXISTS debts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    entity_id UUID NOT NULL, -- العميل/المورد/الموظف
    entity_type TEXT NOT NULL CHECK (entity_type IN ('customer', 'supplier', 'employee', 'contractor')),
    amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    currency TEXT DEFAULT 'TRY',
    original_amount NUMERIC(15, 2) NOT NULL DEFAULT 0, -- المبلغ الأصلي
    paid_amount NUMERIC(15, 2) DEFAULT 0, -- المبلغ المدفوع
    remaining_amount NUMERIC(15, 2) GENERATED ALWAYS AS (original_amount - paid_amount) STORED,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'partially_paid', 'fully_paid', 'cancelled')),
    due_date DATE,
    created_date DATE NOT NULL DEFAULT CURRENT_DATE,
    settled_at TIMESTAMPTZ, -- تاريخ السداد الكامل
    description TEXT,
    reference_id UUID, -- ربط بفاتورة أو عملية أخرى
    reference_type TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_debts_tenant ON debts(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_debts_entity ON debts(entity_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_debts_status ON debts(status, due_date);

-- جدول المدفوعات
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    debt_id UUID REFERENCES debts(id) ON DELETE CASCADE NOT NULL,
    amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    currency TEXT DEFAULT 'TRY',
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method TEXT DEFAULT 'cash' CHECK (payment_method IN ('cash', 'transfer', 'card', 'check', 'other')),
    description TEXT,
    receipt_number TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_debt ON payments(tenant_id, debt_id, payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date DESC);

-- Function لتحديث حالة الدين عند الدفع
CREATE OR REPLACE FUNCTION update_debt_on_payment()
RETURNS TRIGGER AS $$
DECLARE
    debt_record RECORD;
    new_paid_amount NUMERIC;
    new_status TEXT;
BEGIN
    -- جلب معلومات الدين
    SELECT * INTO debt_record
    FROM debts
    WHERE id = NEW.debt_id;
    
    -- حساب المبلغ المدفوع الإجمالي
    SELECT COALESCE(SUM(amount), 0) INTO new_paid_amount
    FROM payments
    WHERE debt_id = NEW.debt_id;
    
    -- تحديث المبلغ المدفوع
    UPDATE debts
    SET paid_amount = new_paid_amount,
        updated_at = NOW()
    WHERE id = NEW.debt_id;
    
    -- تحديد الحالة الجديدة
    IF new_paid_amount >= debt_record.original_amount THEN
        new_status := 'fully_paid';
        -- تحديث تاريخ السداد
        UPDATE debts
        SET status = new_status,
            settled_at = NOW()
        WHERE id = NEW.debt_id;
    ELSIF new_paid_amount > 0 THEN
        new_status := 'partially_paid';
        UPDATE debts
        SET status = new_status
        WHERE id = NEW.debt_id;
    END IF;
    
    -- إنشاء قيد يومية للدفع
    PERFORM create_journal_entry(
        NEW.tenant_id,
        'payment',
        'cash_box', -- مدين: الصندوق
        'customer_account', -- دائن: حساب العميل
        NEW.amount,
        NEW.currency,
        'دفعة على الدين: ' || COALESCE(NEW.description, ''),
        NEW.debt_id,
        'debt',
        NEW.created_by
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_debt_on_payment ON payments;
CREATE TRIGGER trigger_update_debt_on_payment
    AFTER INSERT ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_debt_on_payment();

-- Function لإنشاء دين جديد
CREATE OR REPLACE FUNCTION create_debt(
    p_tenant_id UUID,
    p_entity_id UUID,
    p_entity_type TEXT,
    p_amount NUMERIC,
    p_currency TEXT DEFAULT 'TRY',
    p_description TEXT DEFAULT NULL,
    p_due_date DATE DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL,
    p_reference_type TEXT DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_debt_id UUID;
BEGIN
    INSERT INTO debts (
        tenant_id, entity_id, entity_type, amount, original_amount,
        currency, description, due_date, reference_id, reference_type, created_by
    ) VALUES (
        p_tenant_id, p_entity_id, p_entity_type, p_amount, p_amount,
        p_currency, p_description, p_due_date, p_reference_id, p_reference_type, p_created_by
    ) RETURNING id INTO v_debt_id;
    
    -- إنشاء قيد يومية للدين
    PERFORM create_journal_entry(
        p_tenant_id,
        'debt',
        CASE p_entity_type
            WHEN 'customer' THEN 'customer_account'
            WHEN 'supplier' THEN 'supplier_account'
            ELSE 'other_account'
        END,
        'revenue', -- أو 'expense' حسب السياق
        p_amount,
        p_currency,
        COALESCE(p_description, 'دين جديد'),
        v_debt_id,
        'debt',
        p_created_by
    );
    
    RETURN v_debt_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- القسم 6: رواتب الموظفين والخصومات
-- ============================================

-- تحديث جدول الموظفين
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS base_salary NUMERIC(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS allowances NUMERIC(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS deductions NUMERIC(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS net_salary NUMERIC(15, 2) GENERATED ALWAYS AS (
    GREATEST(0, base_salary + COALESCE(allowances, 0) - COALESCE(deductions, 0))
) STORED,
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'transfer' CHECK (payment_method IN ('transfer', 'cash', 'check')),
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'TRY';

-- جدول الخصومات
CREATE TABLE IF NOT EXISTS employee_deductions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
    deduction_type TEXT NOT NULL CHECK (deduction_type IN ('loan', 'fine', 'insurance', 'tax', 'other')),
    amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    currency TEXT DEFAULT 'TRY',
    frequency TEXT DEFAULT 'once' CHECK (frequency IN ('once', 'monthly', 'weekly', 'yearly')),
    start_date DATE NOT NULL,
    end_date DATE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    description TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employee_deductions_employee ON employee_deductions(tenant_id, employee_id, status);
CREATE INDEX IF NOT EXISTS idx_employee_deductions_active ON employee_deductions(employee_id, status) WHERE status = 'active';

-- جدول الرواتب
CREATE TABLE IF NOT EXISTS payroll (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    year INTEGER NOT NULL,
    base_salary NUMERIC(15, 2) NOT NULL DEFAULT 0,
    allowances NUMERIC(15, 2) DEFAULT 0,
    total_deductions NUMERIC(15, 2) DEFAULT 0,
    net_salary NUMERIC(15, 2) NOT NULL DEFAULT 0,
    currency TEXT DEFAULT 'TRY',
    payment_date DATE,
    payment_method TEXT DEFAULT 'transfer',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, employee_id, month, year)
);

CREATE INDEX IF NOT EXISTS idx_payroll_employee ON payroll(tenant_id, employee_id, year DESC, month DESC);
CREATE INDEX IF NOT EXISTS idx_payroll_status ON payroll(tenant_id, status);

-- Function لحساب الراتب الصافي تلقائياً
CREATE OR REPLACE FUNCTION calculate_net_salary(
    p_tenant_id UUID,
    p_employee_id UUID,
    p_month INTEGER,
    p_year INTEGER
) RETURNS NUMERIC AS $$
DECLARE
    v_base_salary NUMERIC;
    v_allowances NUMERIC;
    v_total_deductions NUMERIC;
    v_net_salary NUMERIC;
BEGIN
    -- جلب الراتب الأساسي والبدلات
    SELECT base_salary, COALESCE(allowances, 0)
    INTO v_base_salary, v_allowances
    FROM employees
    WHERE id = p_employee_id AND tenant_id = p_tenant_id;
    
    -- حساب إجمالي الخصومات النشطة لهذا الشهر
    SELECT COALESCE(SUM(amount), 0) INTO v_total_deductions
    FROM employee_deductions
    WHERE employee_id = p_employee_id
        AND tenant_id = p_tenant_id
        AND status = 'active'
        AND (
            frequency = 'once' OR
            frequency = 'monthly' OR
            (frequency = 'weekly' AND EXTRACT(MONTH FROM start_date) = p_month AND EXTRACT(YEAR FROM start_date) = p_year) OR
            (frequency = 'yearly' AND EXTRACT(YEAR FROM start_date) = p_year)
        )
        AND (end_date IS NULL OR end_date >= DATE_TRUNC('month', MAKE_DATE(p_year, p_month, 1))::DATE);
    
    -- حساب الراتب الصافي
    v_net_salary := GREATEST(0, v_base_salary + v_allowances - v_total_deductions);
    
    RETURN v_net_salary;
END;
$$ LANGUAGE plpgsql;

-- Function لإنشاء كشف راتب
CREATE OR REPLACE FUNCTION create_payroll_entry(
    p_tenant_id UUID,
    p_employee_id UUID,
    p_month INTEGER,
    p_year INTEGER,
    p_created_by UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_payroll_id UUID;
    v_employee_record RECORD;
    v_base_salary NUMERIC;
    v_allowances NUMERIC;
    v_total_deductions NUMERIC;
    v_net_salary NUMERIC;
BEGIN
    -- جلب بيانات الموظف
    SELECT * INTO v_employee_record
    FROM employees
    WHERE id = p_employee_id AND tenant_id = p_tenant_id;
    
    v_base_salary := v_employee_record.base_salary;
    v_allowances := COALESCE(v_employee_record.allowances, 0);
    
    -- حساب الخصومات
    v_total_deductions := calculate_net_salary(p_tenant_id, p_employee_id, p_month, p_year);
    v_total_deductions := v_base_salary + v_allowances - v_total_deductions;
    
    v_net_salary := GREATEST(0, v_base_salary + v_allowances - v_total_deductions);
    
    -- إنشاء كشف الراتب
    INSERT INTO payroll (
        tenant_id, employee_id, month, year,
        base_salary, allowances, total_deductions, net_salary,
        currency, created_by
    ) VALUES (
        p_tenant_id, p_employee_id, p_month, p_year,
        v_base_salary, v_allowances, v_total_deductions, v_net_salary,
        v_employee_record.currency, p_created_by
    )
    ON CONFLICT (tenant_id, employee_id, month, year)
    DO UPDATE SET
        base_salary = EXCLUDED.base_salary,
        allowances = EXCLUDED.allowances,
        total_deductions = EXCLUDED.total_deductions,
        net_salary = EXCLUDED.net_salary,
        updated_at = NOW()
    RETURNING id INTO v_payroll_id;
    
    RETURN v_payroll_id;
END;
$$ LANGUAGE plpgsql;

-- Function لتسجيل دفع الراتب في اليومية
CREATE OR REPLACE FUNCTION record_payroll_payment()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
        -- إنشاء قيد يومية لدفع الراتب
        PERFORM create_journal_entry(
            NEW.tenant_id,
            'salary',
            'salary_expense', -- مدين: مصاريف الرواتب
            'employee_account', -- دائن: حساب الموظف
            NEW.net_salary,
            NEW.currency,
            'راتب ' || TO_CHAR(MAKE_DATE(NEW.year, NEW.month, 1), 'Month YYYY'),
            NEW.id,
            'payroll',
            NEW.created_by
        );
        
        -- إذا كان هناك خصومات، تسجيلها أيضاً
        IF NEW.total_deductions > 0 THEN
            PERFORM create_journal_entry(
                NEW.tenant_id,
                'deduction',
                'employee_account', -- مدين: حساب الموظف
                'deduction_account', -- دائن: حساب الخصومات
                NEW.total_deductions,
                NEW.currency,
                'خصومات راتب ' || TO_CHAR(MAKE_DATE(NEW.year, NEW.month, 1), 'Month YYYY'),
                NEW.id,
                'payroll',
                NEW.created_by
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_record_payroll_payment ON payroll;
CREATE TRIGGER trigger_record_payroll_payment
    AFTER UPDATE OF status ON payroll
    FOR EACH ROW
    WHEN (NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid'))
    EXECUTE FUNCTION record_payroll_payment();

-- ============================================
-- القسم 7: ربط BOQ بالمستودع وطلبات الشراء
-- ============================================

-- Function للتحقق من توفر المواد في BOQ وإنشاء طلب شراء تلقائي
CREATE OR REPLACE FUNCTION check_boq_item_availability()
RETURNS TRIGGER AS $$
DECLARE
    item_record RECORD;
    available_quantity NUMERIC;
    required_quantity NUMERIC;
BEGIN
    -- إذا كان البند مربوطاً بالمستودع
    IF NEW.warehouse_linked = true AND NEW.inventory_item_id IS NOT NULL THEN
        -- جلب الكمية المتوفرة
        SELECT quantity INTO available_quantity
        FROM inventory_items
        WHERE id = NEW.inventory_item_id
            AND tenant_id = NEW.tenant_id;
        
        -- حساب الكمية المطلوبة (المخططة - المنفذة)
        required_quantity := NEW.planned_quantity - COALESCE(NEW.executed_quantity, 0);
        
        -- إذا كانت الكمية غير كافية، إنشاء طلب شراء
        IF available_quantity < required_quantity THEN
            INSERT INTO purchase_requests (
                tenant_id,
                project_id,
                project_item_id,
                inventory_item_id,
                requested_quantity,
                unit,
                supplier_id,
                status,
                auto_generated,
                notes
            ) VALUES (
                NEW.tenant_id,
                NEW.project_id,
                NEW.id,
                NEW.inventory_item_id,
                required_quantity - available_quantity,
                NEW.unit_code,
                NEW.supplier_id,
                'pending',
                true,
                'طلب شراء تلقائي من BOQ - الكمية غير كافية'
            )
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_check_boq_item_availability ON project_items;
CREATE TRIGGER trigger_check_boq_item_availability
    AFTER INSERT OR UPDATE ON project_items
    FOR EACH ROW
    WHEN (NEW.warehouse_linked = true AND NEW.inventory_item_id IS NOT NULL)
    EXECUTE FUNCTION check_boq_item_availability();

-- ============================================
-- القسم 8: تحديث Sidebar - التأكد من عزل المتاجر
-- ============================================

-- Function للتحقق من أنواع المتاجر المخصصة للمستأجر
CREATE OR REPLACE FUNCTION get_tenant_store_types(p_tenant_id UUID)
RETURNS TABLE(store_type_code TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT tst.store_type_code
    FROM tenant_store_types tst
    WHERE tst.tenant_id = p_tenant_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- القسم 9: الفهارس والأداء
-- ============================================

CREATE INDEX IF NOT EXISTS idx_contractor_projects_code ON contractor_projects(project_code);
CREATE INDEX IF NOT EXISTS idx_project_items_code ON project_items(item_code);
CREATE INDEX IF NOT EXISTS idx_contractor_contracts_number ON contractor_contracts(contract_number);
CREATE INDEX IF NOT EXISTS idx_fuel_products_code ON fuel_products(product_code);
CREATE INDEX IF NOT EXISTS idx_debts_settled ON debts(settled_at) WHERE settled_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_receipt ON payments(receipt_number) WHERE receipt_number IS NOT NULL;

-- ============================================
-- تأكيد نجاح التحديث
-- ============================================

SELECT 'تم تحديث قاعدة البيانات بنجاح! جميع الجداول والوظائف والـ Triggers جاهزة.' as status;

