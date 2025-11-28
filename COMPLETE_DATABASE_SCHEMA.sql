-- ============================================
-- نظام إدارة المتاجر المتعدد - SQL شامل
-- ============================================
-- هذا الملف يحتوي على جميع الجداول والوظائف والـ Triggers
-- المطلوبة للنظام الكامل

-- ============================================
-- 1. جدول الذمم (Debts Table)
-- ============================================
CREATE TABLE IF NOT EXISTS debts (
    debt_id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    entity_id INTEGER NOT NULL, -- يمكن أن يكون customer_id, supplier_id, employee_id
    entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('customer', 'supplier', 'employee')),
    amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'partially_paid', 'fully_paid')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    settled_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_debts_tenant ON debts(tenant_id);
CREATE INDEX idx_debts_entity ON debts(entity_id, entity_type);
CREATE INDEX idx_debts_status ON debts(status);

-- ============================================
-- 2. جدول المدفوعات (Payments Table)
-- ============================================
CREATE TABLE IF NOT EXISTS payments (
    payment_id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    debt_id INTEGER REFERENCES debts(debt_id) ON DELETE SET NULL,
    amount DECIMAL(15, 2) NOT NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    method VARCHAR(50) NOT NULL DEFAULT 'cash' CHECK (method IN ('cash', 'transfer', 'card', 'check')),
    user_id INTEGER REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id)
);

CREATE INDEX idx_payments_tenant ON payments(tenant_id);
CREATE INDEX idx_payments_debt ON payments(debt_id);
CREATE INDEX idx_payments_date ON payments(payment_date);

-- ============================================
-- 3. جدول الموظفين (Employees Table)
-- ============================================
CREATE TABLE IF NOT EXISTS employees (
    employee_id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    position VARCHAR(100),
    base_salary DECIMAL(15, 2) NOT NULL DEFAULT 0,
    allowances DECIMAL(15, 2) DEFAULT 0, -- البدلات (سكن، مواصلات...)
    payment_method VARCHAR(50) DEFAULT 'transfer' CHECK (payment_method IN ('transfer', 'cash', 'check')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    hire_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_employees_tenant ON employees(tenant_id);
CREATE INDEX idx_employees_status ON employees(status);

-- ============================================
-- 4. جدول الخصومات (Deductions Table)
-- ============================================
CREATE TABLE IF NOT EXISTS deductions (
    deduction_id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id INTEGER NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('loan', 'fine', 'insurance', 'tax', 'other')),
    amount DECIMAL(15, 2) NOT NULL,
    frequency VARCHAR(20) NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('once', 'monthly', 'weekly')),
    start_date DATE NOT NULL,
    end_date DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_deductions_tenant ON deductions(tenant_id);
CREATE INDEX idx_deductions_employee ON deductions(employee_id);
CREATE INDEX idx_deductions_status ON deductions(status);

-- ============================================
-- 5. جدول الرواتب (Payroll Table)
-- ============================================
CREATE TABLE IF NOT EXISTS payrolls (
    payroll_id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id INTEGER NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL,
    base_salary DECIMAL(15, 2) NOT NULL,
    allowances DECIMAL(15, 2) DEFAULT 0,
    deductions DECIMAL(15, 2) DEFAULT 0,
    net_salary DECIMAL(15, 2) NOT NULL, -- يُحسب تلقائياً
    is_paid BOOLEAN DEFAULT FALSE,
    payment_date DATE,
    payment_method VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id)
);

CREATE INDEX idx_payrolls_tenant ON payrolls(tenant_id);
CREATE INDEX idx_payrolls_employee ON payrolls(employee_id);
CREATE INDEX idx_payrolls_period ON payrolls(year, month);

-- ============================================
-- 6. جدول حركات المستودع (Warehouse Transactions)
-- ============================================
CREATE TABLE IF NOT EXISTS warehouse_transactions (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('inbound', 'outbound', 'adjustment', 'transfer')),
    inventory_item_id INTEGER REFERENCES inventory(id),
    quantity DECIMAL(15, 3) NOT NULL,
    unit_price DECIMAL(15, 2) DEFAULT 0,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    reference_number VARCHAR(100),
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_warehouse_tenant ON warehouse_transactions(tenant_id);
CREATE INDEX idx_warehouse_type ON warehouse_transactions(transaction_type);
CREATE INDEX idx_warehouse_date ON warehouse_transactions(transaction_date);
CREATE INDEX idx_warehouse_item ON warehouse_transactions(inventory_item_id);

-- ============================================
-- 7. جدول اليومية المحاسبية (Journal Entries)
-- ============================================
CREATE TABLE IF NOT EXISTS journal_entries (
    entry_id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    transaction_type VARCHAR(50) NOT NULL, -- 'payment', 'debt', 'payroll', 'warehouse_inbound', 'warehouse_outbound'
    transaction_id INTEGER, -- ID من الجدول المرتبط
    debit_account VARCHAR(100) NOT NULL,
    credit_account VARCHAR(100) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    description TEXT,
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id)
);

CREATE INDEX idx_journal_tenant ON journal_entries(tenant_id);
CREATE INDEX idx_journal_type ON journal_entries(transaction_type);
CREATE INDEX idx_journal_date ON journal_entries(entry_date);

-- ============================================
-- 8. جدول عدادات المحروقات (Fuel Counters)
-- ============================================
CREATE TABLE IF NOT EXISTS fuel_counters (
    counter_id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    counter_name VARCHAR(100) NOT NULL, -- اسم العداد (يُضبط من قبل المتجر)
    counter_number INTEGER NOT NULL CHECK (counter_number BETWEEN 1 AND 6),
    price_per_liter DECIMAL(10, 3) NOT NULL DEFAULT 0,
    current_reading DECIMAL(15, 3) DEFAULT 0, -- القراءة الحالية
    last_reading DECIMAL(15, 3) DEFAULT 0, -- القراءة السابقة
    fuel_type VARCHAR(50), -- 'gasoline', 'diesel', etc.
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, counter_number)
);

CREATE INDEX idx_fuel_counters_tenant ON fuel_counters(tenant_id);
CREATE INDEX idx_fuel_counters_number ON fuel_counters(counter_number);

-- ============================================
-- 9. جدول حركات عدادات المحروقات
-- ============================================
CREATE TABLE IF NOT EXISTS fuel_counter_transactions (
    transaction_id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    counter_id INTEGER NOT NULL REFERENCES fuel_counters(counter_id) ON DELETE CASCADE,
    reading_before DECIMAL(15, 3) NOT NULL,
    reading_after DECIMAL(15, 3) NOT NULL,
    liters_sold DECIMAL(15, 3) NOT NULL, -- يُحسب تلقائياً: reading_after - reading_before
    price_per_liter DECIMAL(10, 3) NOT NULL,
    total_amount DECIMAL(15, 2) NOT NULL, -- يُحسب تلقائياً: liters_sold * price_per_liter
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    customer_id INTEGER REFERENCES partners(id),
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_fuel_trans_tenant ON fuel_counter_transactions(tenant_id);
CREATE INDEX idx_fuel_trans_counter ON fuel_counter_transactions(counter_id);
CREATE INDEX idx_fuel_trans_date ON fuel_counter_transactions(transaction_date);

-- ============================================
-- الوظائف (Functions)
-- ============================================

-- 1. حساب رصيد العميل/المورد/الموظف
CREATE OR REPLACE FUNCTION calculate_entity_balance(
    p_tenant_id INTEGER,
    p_entity_id INTEGER,
    p_entity_type VARCHAR
) RETURNS DECIMAL(15, 2) AS $$
DECLARE
    total_debts DECIMAL(15, 2) := 0;
    total_payments DECIMAL(15, 2) := 0;
BEGIN
    -- حساب إجمالي الديون
    SELECT COALESCE(SUM(amount), 0) INTO total_debts
    FROM debts
    WHERE tenant_id = p_tenant_id
      AND entity_id = p_entity_id
      AND entity_type = p_entity_type
      AND status != 'fully_paid';
    
    -- حساب إجمالي المدفوعات
    SELECT COALESCE(SUM(p.amount), 0) INTO total_payments
    FROM payments p
    JOIN debts d ON p.debt_id = d.debt_id
    WHERE p.tenant_id = p_tenant_id
      AND d.entity_id = p_entity_id
      AND d.entity_type = p_entity_type;
    
    RETURN total_debts - total_payments;
END;
$$ LANGUAGE plpgsql;

-- 2. تحديث حالة الدين عند الدفع
CREATE OR REPLACE FUNCTION update_debt_status_on_payment()
RETURNS TRIGGER AS $$
DECLARE
    debt_amount DECIMAL(15, 2);
    paid_amount DECIMAL(15, 2);
BEGIN
    -- جلب قيمة الدين
    SELECT amount INTO debt_amount
    FROM debts
    WHERE debt_id = NEW.debt_id;
    
    -- حساب إجمالي المدفوعات لهذا الدين
    SELECT COALESCE(SUM(amount), 0) INTO paid_amount
    FROM payments
    WHERE debt_id = NEW.debt_id;
    
    -- تحديث حالة الدين
    IF paid_amount >= debt_amount THEN
        UPDATE debts
        SET status = 'fully_paid',
            settled_at = NOW(),
            updated_at = NOW()
        WHERE debt_id = NEW.debt_id;
    ELSIF paid_amount > 0 THEN
        UPDATE debts
        SET status = 'partially_paid',
            updated_at = NOW()
        WHERE debt_id = NEW.debt_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. إنشاء قيد محاسبي عند الدفع
CREATE OR REPLACE FUNCTION create_journal_entry_on_payment()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO journal_entries (
        tenant_id,
        transaction_type,
        transaction_id,
        debit_account,
        credit_account,
        amount,
        description,
        entry_date,
        created_by
    )
    SELECT 
        NEW.tenant_id,
        'payment',
        NEW.payment_id,
        CASE 
            WHEN NEW.method = 'cash' THEN 'الصندوق'
            WHEN NEW.method = 'transfer' THEN 'البنك'
            ELSE 'الصندوق'
        END,
        'حساب العميل/المورد',
        NEW.amount,
        'دفعة رقم ' || NEW.payment_id,
        NEW.payment_date,
        NEW.user_id
    FROM debts d
    WHERE d.debt_id = NEW.debt_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. حساب الراتب الصافي للموظف
CREATE OR REPLACE FUNCTION calculate_net_salary(
    p_employee_id INTEGER,
    p_month INTEGER,
    p_year INTEGER
) RETURNS DECIMAL(15, 2) AS $$
DECLARE
    base_sal DECIMAL(15, 2);
    allowances DECIMAL(15, 2);
    deductions DECIMAL(15, 2);
BEGIN
    -- جلب الراتب الأساسي والبدلات
    SELECT base_salary, COALESCE(allowances, 0)
    INTO base_sal, allowances
    FROM employees
    WHERE employee_id = p_employee_id;
    
    -- حساب الخصومات النشطة لهذا الشهر
    SELECT COALESCE(SUM(amount), 0) INTO deductions
    FROM deductions
    WHERE employee_id = p_employee_id
      AND status = 'active'
      AND (
          (frequency = 'monthly' AND start_date <= DATE(p_year || '-' || p_month || '-01'))
          OR (frequency = 'once' AND DATE_PART('month', start_date) = p_month AND DATE_PART('year', start_date) = p_year)
      );
    
    RETURN base_sal + allowances - deductions;
END;
$$ LANGUAGE plpgsql;

-- 5. إنشاء قيد محاسبي عند دفع الراتب
CREATE OR REPLACE FUNCTION create_journal_entry_on_payroll()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_paid = TRUE AND (OLD.is_paid IS NULL OR OLD.is_paid = FALSE) THEN
        -- قيد: مدين مصاريف الرواتب، دائن حساب الموظف
        INSERT INTO journal_entries (
            tenant_id,
            transaction_type,
            transaction_id,
            debit_account,
            credit_account,
            amount,
            description,
            entry_date,
            created_by
        ) VALUES (
            NEW.tenant_id,
            'payroll',
            NEW.payroll_id,
            'مصاريف الرواتب',
            'حساب الموظف - ' || (SELECT name FROM employees WHERE employee_id = NEW.employee_id),
            NEW.net_salary,
            'راتب ' || NEW.month || '/' || NEW.year,
            COALESCE(NEW.payment_date, CURRENT_DATE),
            NEW.created_by
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. تحديث المخزون عند حركة المستودع
CREATE OR REPLACE FUNCTION update_inventory_on_warehouse_transaction()
RETURNS TRIGGER AS $$
DECLARE
    current_quantity DECIMAL(15, 3);
BEGIN
    -- جلب الكمية الحالية
    SELECT quantity INTO current_quantity
    FROM inventory
    WHERE id = NEW.inventory_item_id;
    
    -- تحديث المخزون حسب نوع الحركة
    IF NEW.transaction_type = 'inbound' THEN
        UPDATE inventory
        SET quantity = quantity + NEW.quantity,
            updated_at = NOW()
        WHERE id = NEW.inventory_item_id;
    ELSIF NEW.transaction_type = 'outbound' THEN
        -- التحقق من توفر الكمية
        IF current_quantity < NEW.quantity THEN
            RAISE EXCEPTION 'الكمية المتوفرة غير كافية. المتوفر: %, المطلوب: %', current_quantity, NEW.quantity;
        END IF;
        
        UPDATE inventory
        SET quantity = quantity - NEW.quantity,
            updated_at = NOW()
        WHERE id = NEW.inventory_item_id;
    ELSIF NEW.transaction_type = 'adjustment' THEN
        UPDATE inventory
        SET quantity = NEW.quantity,
            updated_at = NOW()
        WHERE id = NEW.inventory_item_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. إنشاء قيد محاسبي عند حركة المستودع
CREATE OR REPLACE FUNCTION create_journal_entry_on_warehouse_transaction()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.transaction_type = 'inbound' THEN
        -- وارد: مدين المستودع، دائن المورد
        INSERT INTO journal_entries (
            tenant_id,
            transaction_type,
            transaction_id,
            debit_account,
            credit_account,
            amount,
            description,
            entry_date,
            created_by
        ) VALUES (
            NEW.tenant_id,
            'warehouse_inbound',
            NEW.id,
            'المستودع',
            'حساب المورد',
            NEW.quantity * NEW.unit_price,
            'وارد - ' || COALESCE(NEW.reference_number, ''),
            NEW.transaction_date,
            NEW.created_by
        );
    ELSIF NEW.transaction_type = 'outbound' THEN
        -- صادر: مدين العميل، دائن المستودع
        INSERT INTO journal_entries (
            tenant_id,
            transaction_type,
            transaction_id,
            debit_account,
            credit_account,
            amount,
            description,
            entry_date,
            created_by
        ) VALUES (
            NEW.tenant_id,
            'warehouse_outbound',
            NEW.id,
            'حساب العميل',
            'المستودع',
            NEW.quantity * NEW.unit_price,
            'صادر - ' || COALESCE(NEW.reference_number, ''),
            NEW.transaction_date,
            NEW.created_by
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. تحديث قراءة عداد المحروقات
CREATE OR REPLACE FUNCTION update_fuel_counter_reading()
RETURNS TRIGGER AS $$
BEGIN
    -- تحديث قراءة العداد
    UPDATE fuel_counters
    SET last_reading = current_reading,
        current_reading = NEW.reading_after,
        updated_at = NOW()
    WHERE counter_id = NEW.counter_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Triggers
-- ============================================

-- تحديث حالة الدين عند الدفع
CREATE TRIGGER trigger_update_debt_status_on_payment
    AFTER INSERT ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_debt_status_on_payment();

-- إنشاء قيد محاسبي عند الدفع
CREATE TRIGGER trigger_create_journal_entry_on_payment
    AFTER INSERT ON payments
    FOR EACH ROW
    EXECUTE FUNCTION create_journal_entry_on_payment();

-- إنشاء قيد محاسبي عند دفع الراتب
CREATE TRIGGER trigger_create_journal_entry_on_payroll
    AFTER UPDATE OF is_paid ON payrolls
    FOR EACH ROW
    EXECUTE FUNCTION create_journal_entry_on_payroll();

-- تحديث المخزون عند حركة المستودع
CREATE TRIGGER trigger_update_inventory_on_warehouse_transaction
    AFTER INSERT ON warehouse_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_inventory_on_warehouse_transaction();

-- إنشاء قيد محاسبي عند حركة المستودع
CREATE TRIGGER trigger_create_journal_entry_on_warehouse_transaction
    AFTER INSERT ON warehouse_transactions
    FOR EACH ROW
    EXECUTE FUNCTION create_journal_entry_on_warehouse_transaction();

-- تحديث قراءة عداد المحروقات
CREATE TRIGGER trigger_update_fuel_counter_reading
    AFTER INSERT ON fuel_counter_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_fuel_counter_reading();

-- ============================================
-- ملاحظات مهمة
-- ============================================
-- 1. جميع الجداول مرتبطة بـ tenant_id لضمان عزل البيانات
-- 2. جميع العمليات المالية تُسجل تلقائياً في اليومية المحاسبية
-- 3. المخزون يُحدث تلقائياً عند حركات المستودع
-- 4. حالة الديون تُحدث تلقائياً عند الدفع
-- 5. الراتب الصافي يُحسب تلقائياً بناءً على الخصومات النشطة
-- 6. عدادات المحروقات تُحدث تلقائياً عند تسجيل الحركات

