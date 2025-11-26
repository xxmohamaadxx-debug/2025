-- ============================================
-- تحديث شامل ومحدث لقاعدة البيانات - النسخة النهائية
-- ============================================
-- تاريخ الإنشاء: 2024
-- الوصف: يتضمن جميع التحديثات المطلوبة للنظام الحديث
-- ============================================

-- تفعيل الامتدادات المطلوبة
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================
-- القسم 1: التحقق من الجداول الأساسية
-- ============================================

-- جدول المستخدمين (إذا لم يكن موجوداً)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'store_owner',
    tenant_id UUID,
    is_active BOOLEAN DEFAULT true,
    is_super_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول المتاجر (إذا لم يكن موجوداً)
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    subscription_plan TEXT DEFAULT 'trial',
    subscription_expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- القسم 2: الصندوق المالي (Cash Register)
-- ============================================

CREATE TABLE IF NOT EXISTS cash_register (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    currency TEXT NOT NULL DEFAULT 'TRY',
    balance NUMERIC(15, 2) DEFAULT 0 NOT NULL,
    last_transaction_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, currency)
);

CREATE TABLE IF NOT EXISTS cash_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    cash_register_id UUID REFERENCES cash_register(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('income', 'expense', 'payroll', 'transfer', 'adjustment')),
    amount NUMERIC(15, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'TRY',
    description TEXT,
    reference_type TEXT,
    reference_id UUID,
    user_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    CONSTRAINT positive_amount CHECK (amount > 0)
);

CREATE INDEX IF NOT EXISTS idx_cash_register_tenant ON cash_register(tenant_id, currency);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_tenant ON cash_transactions(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_reference ON cash_transactions(reference_type, reference_id);

-- ============================================
-- القسم 3: العملاء والديون (Customers & Debts)
-- ============================================

-- جدول المعاملات مع العملاء
CREATE TABLE IF NOT EXISTS customer_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('payment', 'receipt', 'debt', 'credit')),
    amount NUMERIC(15, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'TRY',
    payment_method TEXT DEFAULT 'cash' CHECK (payment_method IN ('cash', 'transfer', 'credit')),
    description TEXT,
    transaction_date TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    CONSTRAINT positive_amount CHECK (amount > 0)
);

CREATE INDEX IF NOT EXISTS idx_customer_transactions_tenant ON customer_transactions(tenant_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_customer_transactions_partner ON customer_transactions(partner_id, transaction_date DESC);

-- View لحساب ملخص العملاء
CREATE OR REPLACE VIEW customer_summary AS
SELECT 
    p.id,
    p.tenant_id,
    p.name,
    p.phone,
    p.email,
    p.address,
    p.currency,
    COALESCE(SUM(CASE WHEN ct.transaction_type IN ('debt', 'receipt') THEN ct.amount ELSE 0 END), 0) as debt,
    COALESCE(SUM(CASE WHEN ct.transaction_type IN ('payment', 'credit') THEN ct.amount ELSE 0 END), 0) as balance,
    COALESCE(SUM(CASE WHEN ct.transaction_type = 'payment' THEN ct.amount ELSE 0 END), 0) as total_paid,
    COALESCE(SUM(CASE WHEN ct.transaction_type = 'receipt' THEN ct.amount ELSE 0 END), 0) as total_received,
    COUNT(ct.id) as transaction_count
FROM partners p
LEFT JOIN customer_transactions ct ON p.id = ct.partner_id AND p.tenant_id = ct.tenant_id
WHERE p.type = 'Customer'
GROUP BY p.id, p.tenant_id, p.name, p.phone, p.email, p.address, p.currency;

-- ============================================
-- القسم 4: الحركة اليومية (Daily Transactions)
-- ============================================

CREATE TABLE IF NOT EXISTS daily_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('income', 'expense', 'payment', 'receipt')),
    amount NUMERIC(15, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'TRY',
    payment_method TEXT DEFAULT 'cash' CHECK (payment_method IN ('cash', 'transfer', 'credit')),
    description TEXT,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT positive_amount CHECK (amount > 0)
);

CREATE INDEX IF NOT EXISTS idx_daily_transactions_tenant_date ON daily_transactions(tenant_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_transactions_type ON daily_transactions(tenant_id, transaction_type, transaction_date DESC);

-- ============================================
-- القسم 5: Offline Queue (طابور البيانات بدون إنترنت)
-- ============================================

CREATE TABLE IF NOT EXISTS offline_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    table_name TEXT NOT NULL,
    operation_type TEXT NOT NULL CHECK (operation_type IN ('create', 'update', 'delete')),
    record_id UUID,
    record_data JSONB,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'synced', 'failed')),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    synced_at TIMESTAMPTZ,
    retry_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_offline_queue_tenant_status ON offline_queue(tenant_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_offline_queue_table ON offline_queue(table_name, operation_type);

-- ============================================
-- القسم 6: Functions و Triggers
-- ============================================

-- Function لتحديث الصندوق المالي تلقائياً
CREATE OR REPLACE FUNCTION update_cash_register()
RETURNS TRIGGER AS $$
BEGIN
    -- تحديث الرصيد حسب نوع المعاملة
    IF NEW.transaction_type = 'income' THEN
        UPDATE cash_register
        SET balance = balance + NEW.amount,
            last_transaction_date = NEW.created_at,
            updated_at = NOW()
        WHERE tenant_id = NEW.tenant_id AND currency = NEW.currency;
    ELSIF NEW.transaction_type IN ('expense', 'payroll') THEN
        UPDATE cash_register
        SET balance = balance - NEW.amount,
            last_transaction_date = NEW.created_at,
            updated_at = NOW()
        WHERE tenant_id = NEW.tenant_id AND currency = NEW.currency;
    END IF;

    -- إنشاء صندوق مالي جديد إذا لم يكن موجوداً
    INSERT INTO cash_register (tenant_id, currency, balance, last_transaction_date)
    SELECT NEW.tenant_id, NEW.currency, 
           CASE WHEN NEW.transaction_type = 'income' THEN NEW.amount ELSE -NEW.amount END,
           NEW.created_at
    WHERE NOT EXISTS (
        SELECT 1 FROM cash_register 
        WHERE tenant_id = NEW.tenant_id AND currency = NEW.currency
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger لتحديث الصندوق المالي عند إضافة معاملة نقدية
DROP TRIGGER IF EXISTS trigger_update_cash_register ON cash_transactions;
CREATE TRIGGER trigger_update_cash_register
    AFTER INSERT ON cash_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_cash_register();

-- Function لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- تطبيق trigger updated_at على جميع الجداول
DO $$ 
DECLARE
    table_name TEXT;
BEGIN
    FOR table_name IN 
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN (
            'users', 'tenants', 'partners', 'invoices_in', 'invoices_out',
            'inventory', 'invoice_items', 'employees', 'payroll',
            'customer_transactions', 'daily_transactions', 'cash_register'
        )
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS update_%s_updated_at ON %I;
            CREATE TRIGGER update_%s_updated_at
                BEFORE UPDATE ON %I
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();
        ', table_name, table_name, table_name, table_name);
    END LOOP;
END $$;

-- ============================================
-- القسم 7: تحسينات الأداء
-- ============================================

-- Indexes إضافية للبحث السريع
CREATE INDEX IF NOT EXISTS idx_partners_type ON partners(tenant_id, type);
CREATE INDEX IF NOT EXISTS idx_invoices_in_date ON invoices_in(tenant_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_out_date ON invoices_out(tenant_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_tenant ON inventory(tenant_id, created_at DESC);

-- ============================================
-- القسم 8: Permissions
-- ============================================

-- منح الصلاحيات (يتم تنفيذها حسب الحاجة)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;

-- ============================================
-- انتهاء التحديث
-- ============================================

COMMENT ON TABLE cash_register IS 'صندوق مالي لكل متجر وعملة';
COMMENT ON TABLE cash_transactions IS 'حركات الصندوق المالي';
COMMENT ON TABLE customer_transactions IS 'معاملات العملاء (دفعات، ديون، رصيد)';
COMMENT ON TABLE daily_transactions IS 'الحركة اليومية للمتجر';
COMMENT ON TABLE offline_queue IS 'طابور البيانات للعمل بدون إنترنت';

-- ============================================
-- ملاحظات:
-- 1. تأكد من وجود جدول partners قبل تنفيذ هذا السكريبت
-- 2. تأكد من وجود جدول invoices_in و invoices_out
-- 3. تأكد من وجود جدول inventory
-- 4. تأكد من وجود جدول employees و payroll
-- ============================================

