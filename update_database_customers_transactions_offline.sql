-- ============================================
-- تحديث قاعدة البيانات: العملاء والديون والحركة اليومية و Offline Mode
-- تاريخ التحديث: 2025
-- ============================================

-- ============================================
-- القسم 1: تحديث جدول partners لدعم الديون والرصيد
-- ============================================

ALTER TABLE partners
ADD COLUMN IF NOT EXISTS balance NUMERIC(15, 2) DEFAULT 0, -- رصيد إيجابي (له)
ADD COLUMN IF NOT EXISTS debt NUMERIC(15, 2) DEFAULT 0, -- دين (عليه)
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'TRY',
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash', -- 'cash', 'transfer', 'credit'
ADD COLUMN IF NOT EXISTS total_paid NUMERIC(15, 2) DEFAULT 0, -- إجمالي المدفوع
ADD COLUMN IF NOT EXISTS total_received NUMERIC(15, 2) DEFAULT 0; -- إجمالي المستلم

CREATE INDEX IF NOT EXISTS idx_partners_balance ON partners(tenant_id, balance);
CREATE INDEX IF NOT EXISTS idx_partners_debt ON partners(tenant_id, debt);

-- ============================================
-- القسم 2: إنشاء جدول معاملات العملاء (الدفعات)
-- ============================================

CREATE TABLE IF NOT EXISTS customer_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    partner_id UUID REFERENCES partners(id) ON DELETE CASCADE NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('payment', 'receipt', 'debt', 'credit')), 
    -- payment: دفعة من عميل, receipt: استلام من عميل, debt: إضافة دين, credit: إضافة رصيد
    amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    currency TEXT DEFAULT 'TRY',
    payment_method TEXT DEFAULT 'cash', -- 'cash', 'transfer', 'credit'
    description TEXT,
    invoice_id UUID, -- ربط بفاتورة إذا كانت موجودة
    invoice_type TEXT CHECK (invoice_type IN ('invoice_in', 'invoice_out')),
    transaction_date TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_customer_transactions_partner ON customer_transactions(partner_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_customer_transactions_tenant ON customer_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customer_transactions_type ON customer_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_customer_transactions_date ON customer_transactions(transaction_date DESC);

-- ============================================
-- القسم 3: إنشاء جدول الحركة اليومية
-- ============================================

CREATE TABLE IF NOT EXISTS daily_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('income', 'expense', 'payment', 'receipt')),
    category TEXT,
    amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    currency TEXT DEFAULT 'TRY',
    description TEXT,
    reference_id UUID, -- ربط بفاتورة أو معاملة
    reference_type TEXT, -- 'invoice_in', 'invoice_out', 'customer_transaction', 'expense'
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method TEXT DEFAULT 'cash', -- 'cash', 'transfer', 'credit'
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_daily_transactions_date ON daily_transactions(tenant_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_transactions_type ON daily_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_daily_transactions_category ON daily_transactions(category);

-- ============================================
-- القسم 4: إنشاء جدول البيانات المؤقتة (Offline)
-- ============================================

CREATE TABLE IF NOT EXISTS offline_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id),
    operation_type TEXT NOT NULL, -- 'create', 'update', 'delete'
    table_name TEXT NOT NULL, -- اسم الجدول
    record_data JSONB NOT NULL, -- البيانات
    record_id UUID, -- معرف السجل (لل update/delete)
    sync_status TEXT DEFAULT 'pending', -- 'pending', 'syncing', 'synced', 'failed'
    error_message TEXT,
    retry_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    synced_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_offline_queue_status ON offline_queue(tenant_id, sync_status, created_at);
CREATE INDEX IF NOT EXISTS idx_offline_queue_user ON offline_queue(user_id);

-- ============================================
-- القسم 5: Function لتحديث رصيد/دين العميل تلقائياً
-- ============================================

CREATE OR REPLACE FUNCTION update_customer_balance()
RETURNS TRIGGER AS $$
DECLARE
    current_debt NUMERIC := 0;
    current_balance NUMERIC := 0;
    current_paid NUMERIC := 0;
    current_received NUMERIC := 0;
BEGIN
    -- حساب الدين والرصيد الحالي
    SELECT 
        COALESCE(SUM(CASE WHEN transaction_type IN ('debt', 'invoice_out') THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN transaction_type IN ('credit', 'payment') THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN transaction_type = 'payment' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN transaction_type = 'receipt' THEN amount ELSE 0 END), 0)
    INTO current_debt, current_balance, current_paid, current_received
    FROM customer_transactions
    WHERE partner_id = NEW.partner_id;
    
    -- حساب الفواتير غير المدفوعة
    SELECT 
        COALESCE(SUM(amount), 0) - COALESCE(SUM(total_paid), 0)
    INTO current_debt
    FROM (
        SELECT amount, 0 as total_paid FROM invoices_out 
        WHERE partner_id = NEW.partner_id AND status != 'paid'
        UNION ALL
        SELECT -amount, 0 as total_paid FROM invoices_in 
        WHERE partner_id = NEW.partner_id AND status != 'paid'
    ) invoices;
    
    -- تحديث رصيد العميل
    UPDATE partners
    SET 
        debt = GREATEST(0, current_debt - current_balance),
        balance = GREATEST(0, current_balance - current_debt),
        total_paid = current_paid,
        total_received = current_received
    WHERE id = NEW.partner_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_customer_balance ON customer_transactions;
CREATE TRIGGER trigger_update_customer_balance
    AFTER INSERT OR UPDATE OR DELETE ON customer_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_balance();

-- ============================================
-- القسم 6: Function لإضافة حركة يومية تلقائياً
-- ============================================

CREATE OR REPLACE FUNCTION add_daily_transaction()
RETURNS TRIGGER AS $$
BEGIN
    -- إضافة حركة يومية عند إنشاء فاتورة صادر (دخل)
    IF TG_TABLE_NAME = 'invoices_out' AND TG_OP = 'INSERT' THEN
        INSERT INTO daily_transactions (
            tenant_id, transaction_type, amount, currency, description,
            reference_id, reference_type, transaction_date, payment_method, created_by
        ) VALUES (
            NEW.tenant_id, 'income', NEW.amount, NEW.currency, NEW.description,
            NEW.id, 'invoice_out', NEW.date, COALESCE((SELECT payment_method FROM partners WHERE id = NEW.partner_id), 'cash'),
            (SELECT id FROM users WHERE tenant_id = NEW.tenant_id LIMIT 1)
        );
    END IF;
    
    -- إضافة حركة يومية عند إنشاء فاتورة وارد (مصروف)
    IF TG_TABLE_NAME = 'invoices_in' AND TG_OP = 'INSERT' THEN
        INSERT INTO daily_transactions (
            tenant_id, transaction_type, amount, currency, description,
            reference_id, reference_type, transaction_date, payment_method, created_by
        ) VALUES (
            NEW.tenant_id, 'expense', NEW.amount, NEW.currency, NEW.description,
            NEW.id, 'invoice_in', NEW.date, COALESCE((SELECT payment_method FROM partners WHERE id = NEW.partner_id), 'cash'),
            (SELECT id FROM users WHERE tenant_id = NEW.tenant_id LIMIT 1)
        );
    END IF;
    
    -- إضافة حركة يومية عند إضافة معاملة عميل
    IF TG_TABLE_NAME = 'customer_transactions' AND TG_OP = 'INSERT' THEN
        INSERT INTO daily_transactions (
            tenant_id, transaction_type, amount, currency, description,
            reference_id, reference_type, transaction_date, payment_method, created_by
        ) VALUES (
            NEW.tenant_id, 
            CASE 
                WHEN NEW.transaction_type IN ('payment', 'receipt') THEN NEW.transaction_type
                WHEN NEW.transaction_type = 'debt' THEN 'expense'
                ELSE 'income'
            END,
            NEW.amount, NEW.currency, NEW.description,
            NEW.id, 'customer_transaction', NEW.transaction_date, NEW.payment_method, NEW.created_by
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_add_daily_from_invoice_out ON invoices_out;
CREATE TRIGGER trigger_add_daily_from_invoice_out
    AFTER INSERT ON invoices_out
    FOR EACH ROW
    EXECUTE FUNCTION add_daily_transaction();

DROP TRIGGER IF EXISTS trigger_add_daily_from_invoice_in ON invoices_in;
CREATE TRIGGER trigger_add_daily_from_invoice_in
    AFTER INSERT ON invoices_in
    FOR EACH ROW
    EXECUTE FUNCTION add_daily_transaction();

DROP TRIGGER IF EXISTS trigger_add_daily_from_customer_transaction ON customer_transactions;
CREATE TRIGGER trigger_add_daily_from_customer_transaction
    AFTER INSERT ON customer_transactions
    FOR EACH ROW
    EXECUTE FUNCTION add_daily_transaction();

-- ============================================
-- القسم 7: View للربح والخسارة اليومي
-- ============================================

CREATE OR REPLACE VIEW daily_profit_loss AS
SELECT 
    tenant_id,
    transaction_date,
    currency,
    SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END) as total_income,
    SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END) as total_expenses,
    SUM(CASE WHEN transaction_type = 'payment' THEN amount ELSE 0 END) as total_payments,
    SUM(CASE WHEN transaction_type = 'receipt' THEN amount ELSE 0 END) as total_receipts,
    SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END) - 
    SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END) as net_profit
FROM daily_transactions
GROUP BY tenant_id, transaction_date, currency;

-- ============================================
-- القسم 8: View لتقرير العملاء والديون
-- ============================================

CREATE OR REPLACE VIEW customer_summary AS
SELECT 
    p.id,
    p.tenant_id,
    p.name,
    p.type,
    p.phone,
    p.email,
    p.balance,
    p.debt,
    p.currency,
    p.payment_method,
    p.total_paid,
    p.total_received,
    COUNT(ct.id) as transaction_count,
    MAX(ct.transaction_date) as last_transaction_date
FROM partners p
LEFT JOIN customer_transactions ct ON p.id = ct.partner_id
WHERE p.type = 'Customer'
GROUP BY p.id, p.tenant_id, p.name, p.type, p.phone, p.email, 
         p.balance, p.debt, p.currency, p.payment_method, p.total_paid, p.total_received;

-- ============================================
-- القسم 9: تحديث جداول الفواتير لدعم طريقة الدفع
-- ============================================

ALTER TABLE invoices_in
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash';

ALTER TABLE invoices_out
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash';

-- ============================================
-- تأكيد نجاح التحديث
-- ============================================

SELECT 'تم تحديث قاعدة البيانات بنجاح! جميع الجداول والوظائف للعملاء والحركة اليومية و Offline Mode جاهزة.' as status;

