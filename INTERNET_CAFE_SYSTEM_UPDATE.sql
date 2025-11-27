-- ============================================
-- نظام صالة الإنترنت - تحديث قاعدة البيانات
-- Internet Cafe System Database Update
-- ============================================

-- ============================================
-- القسم 1: إضافة حقول دائن/مدين إلى جدول partners
-- ============================================

ALTER TABLE partners
ADD COLUMN IF NOT EXISTS debit_balance NUMERIC(15, 2) DEFAULT 0, -- مدين (ديون علينا)
ADD COLUMN IF NOT EXISTS credit_balance NUMERIC(15, 2) DEFAULT 0, -- دائن (ديون لنا)
ADD COLUMN IF NOT EXISTS total_received NUMERIC(15, 2) DEFAULT 0, -- إجمالي المستلم
ADD COLUMN IF NOT EXISTS total_paid NUMERIC(15, 2) DEFAULT 0, -- إجمالي المدفوع
ADD COLUMN IF NOT EXISTS last_transaction_date TIMESTAMPTZ;

-- ============================================
-- القسم 2: إضافة حقول طريقة الدفع إلى invoices_in و invoices_out
-- ============================================

ALTER TABLE invoices_in
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash', -- cash, card, transfer, credit
ADD COLUMN IF NOT EXISTS is_credit BOOLEAN DEFAULT false, -- هل هي ذمة؟
ADD COLUMN IF NOT EXISTS credit_amount NUMERIC(15, 2) DEFAULT 0; -- مبلغ الذمة

ALTER TABLE invoices_out
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash',
ADD COLUMN IF NOT EXISTS is_credit BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS credit_amount NUMERIC(15, 2) DEFAULT 0;

-- ============================================
-- القسم 3: إنشاء جدول أنواع الاشتراكات
-- ============================================

CREATE TABLE IF NOT EXISTS subscription_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- اسم الباقة
    duration_days INTEGER, -- المدة بالأيام
    duration_hours INTEGER, -- المدة بالساعات
    speed_limit TEXT, -- حد السرعة
    data_limit_gb NUMERIC(10, 2), -- حد الاستخدام بالـ GB
    peak_hours_start TIME, -- ساعات الذروة - البداية
    peak_hours_end TIME, -- ساعات الذروة - النهاية
    price NUMERIC(15, 2) NOT NULL DEFAULT 0,
    currency TEXT DEFAULT 'TRY',
    renewal_policy TEXT, -- سياسات التجديد
    late_fee_percent NUMERIC(5, 2) DEFAULT 0, -- غرامات التأخير (نسبة)
    late_fee_amount NUMERIC(15, 2) DEFAULT 0, -- غرامات التأخير (مبلغ ثابت)
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, name)
);

-- ============================================
-- القسم 4: إنشاء جدول المشتركين
-- ============================================

CREATE TABLE IF NOT EXISTS internet_cafe_subscribers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    subscriber_number TEXT NOT NULL, -- رقم المشترك
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    identity_number TEXT, -- الهوية (اختياري)
    address TEXT,
    branch TEXT, -- المتجر/الفرع
    subscription_type_id UUID REFERENCES subscription_types(id) ON DELETE SET NULL,
    subscription_duration INTEGER, -- مدة الاشتراك بالأيام
    start_date DATE NOT NULL,
    end_date DATE,
    status TEXT DEFAULT 'active', -- active, expired, suspended, cancelled
    base_price NUMERIC(15, 2) DEFAULT 0,
    tax_amount NUMERIC(15, 2) DEFAULT 0,
    discount_amount NUMERIC(15, 2) DEFAULT 0,
    currency TEXT DEFAULT 'TRY',
    payment_method TEXT DEFAULT 'cash',
    attachments JSONB, -- المرفقات (وصلات)
    notes TEXT,
    partner_id UUID REFERENCES partners(id) ON DELETE SET NULL, -- ربط بالعميل/المورد
    debit_balance NUMERIC(15, 2) DEFAULT 0, -- مدين
    credit_balance NUMERIC(15, 2) DEFAULT 0, -- دائن
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, subscriber_number)
);

-- ============================================
-- القسم 5: إنشاء جدول جلسات الإنترنت
-- ============================================

CREATE TABLE IF NOT EXISTS internet_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    session_number TEXT NOT NULL, -- رقم الجلسة
    subscriber_id UUID REFERENCES internet_cafe_subscribers(id) ON DELETE SET NULL,
    is_guest BOOLEAN DEFAULT false, -- ضيف (غير مشترك)
    guest_name TEXT, -- اسم الضيف (إذا كان ضيف)
    device_id UUID REFERENCES internet_cafe_devices(id) ON DELETE SET NULL,
    start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_time TIMESTAMPTZ,
    duration_minutes INTEGER DEFAULT 0, -- المدة بالدقائق
    data_consumption_gb NUMERIC(10, 4) DEFAULT 0, -- الاستهلاك بالـ GB
    price_per_minute NUMERIC(10, 2) DEFAULT 0,
    price_per_hour NUMERIC(10, 2) DEFAULT 0,
    base_price NUMERIC(15, 2) DEFAULT 0,
    discount_amount NUMERIC(15, 2) DEFAULT 0,
    total_amount NUMERIC(15, 2) DEFAULT 0, -- الناتج المالي
    currency TEXT DEFAULT 'TRY',
    payment_method TEXT DEFAULT 'cash',
    is_credit BOOLEAN DEFAULT false, -- هل هي ذمة؟
    employee_id UUID REFERENCES users(id), -- الموظف المسؤول
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, session_number)
);

-- ============================================
-- القسم 6: إنشاء جدول الأجهزة والمقاعد
-- ============================================

CREATE TABLE IF NOT EXISTS internet_cafe_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    device_number TEXT NOT NULL, -- رقم الجهاز
    specifications TEXT, -- المواصفات
    status TEXT DEFAULT 'available', -- available, in_use, maintenance, offline
    location TEXT, -- الموقع (رقم المقعد)
    session_price NUMERIC(10, 2) DEFAULT 0, -- سعر الجلسة
    currency TEXT DEFAULT 'TRY',
    maintenance_notes TEXT, -- ملاحظات الصيانة
    last_maintenance_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, device_number)
);

-- ============================================
-- القسم 7: إنشاء جدول حركات الدائن/المدين
-- ============================================

CREATE TABLE IF NOT EXISTS credit_debit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    partner_id UUID REFERENCES partners(id) ON DELETE SET NULL,
    subscriber_id UUID REFERENCES internet_cafe_subscribers(id) ON DELETE SET NULL,
    transaction_type TEXT NOT NULL, -- debit (مدين), credit (دائن)
    amount NUMERIC(15, 2) NOT NULL,
    currency TEXT DEFAULT 'TRY',
    reference_type TEXT, -- invoice_in, invoice_out, subscription, session, other
    reference_id UUID, -- معرف المرجع
    description TEXT,
    payment_method TEXT DEFAULT 'cash',
    due_date DATE, -- تاريخ الاستحقاق
    paid_date DATE, -- تاريخ الدفع
    is_paid BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- القسم 8: إنشاء جدول الحركة اليومية المحسّن
-- ============================================

-- تحديث جدول daily_transactions إذا كان موجوداً
DO $$ 
BEGIN
    -- إضافة حقول إذا لم تكن موجودة
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'daily_transactions' AND column_name = 'payment_method') THEN
        ALTER TABLE daily_transactions
        ADD COLUMN payment_method TEXT DEFAULT 'cash',
        ADD COLUMN is_credit BOOLEAN DEFAULT false,
        ADD COLUMN credit_debit_type TEXT, -- debit, credit
        ADD COLUMN partner_id UUID REFERENCES partners(id) ON DELETE SET NULL;
    END IF;
END $$;

-- إنشاء الجدول إذا لم يكن موجوداً
CREATE TABLE IF NOT EXISTS daily_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    transaction_type TEXT NOT NULL, -- income, expense, credit, debit
    amount NUMERIC(15, 2) NOT NULL,
    currency TEXT DEFAULT 'TRY',
    category TEXT,
    description TEXT,
    reference_type TEXT, -- invoice_in, invoice_out, subscription, session, other
    reference_id UUID,
    payment_method TEXT DEFAULT 'cash',
    is_credit BOOLEAN DEFAULT false,
    credit_debit_type TEXT, -- debit, credit
    partner_id UUID REFERENCES partners(id) ON DELETE SET NULL,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- القسم 9: إنشاء الفهارس
-- ============================================

CREATE INDEX IF NOT EXISTS idx_subscription_types_tenant ON subscription_types(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscription_types_active ON subscription_types(is_active);

CREATE INDEX IF NOT EXISTS idx_subscribers_tenant ON internet_cafe_subscribers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscribers_number ON internet_cafe_subscribers(subscriber_number);
CREATE INDEX IF NOT EXISTS idx_subscribers_status ON internet_cafe_subscribers(status);
CREATE INDEX IF NOT EXISTS idx_subscribers_end_date ON internet_cafe_subscribers(end_date);
CREATE INDEX IF NOT EXISTS idx_subscribers_partner ON internet_cafe_subscribers(partner_id);

CREATE INDEX IF NOT EXISTS idx_sessions_tenant ON internet_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sessions_subscriber ON internet_sessions(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_sessions_device ON internet_sessions(device_id);
CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON internet_sessions(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_end_time ON internet_sessions(end_time);

CREATE INDEX IF NOT EXISTS idx_devices_tenant ON internet_cafe_devices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_devices_number ON internet_cafe_devices(device_number);
CREATE INDEX IF NOT EXISTS idx_devices_status ON internet_cafe_devices(status);

CREATE INDEX IF NOT EXISTS idx_credit_debit_tenant ON credit_debit_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_credit_debit_partner ON credit_debit_transactions(partner_id);
CREATE INDEX IF NOT EXISTS idx_credit_debit_subscriber ON credit_debit_transactions(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_credit_debit_paid ON credit_debit_transactions(is_paid);
CREATE INDEX IF NOT EXISTS idx_credit_debit_due_date ON credit_debit_transactions(due_date);

CREATE INDEX IF NOT EXISTS idx_daily_transactions_tenant ON daily_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_daily_transactions_date ON daily_transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_transactions_type ON daily_transactions(transaction_type);

-- ============================================
-- القسم 10: Functions لتحديث الأرصدة تلقائياً
-- ============================================

-- Function لتحديث أرصدة الشريك عند إضافة حركة دائن/مدين
CREATE OR REPLACE FUNCTION update_partner_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.partner_id IS NOT NULL THEN
        IF NEW.transaction_type = 'credit' THEN
            -- دائن (دين لنا)
            UPDATE partners
            SET 
                credit_balance = COALESCE(credit_balance, 0) + NEW.amount,
                total_received = COALESCE(total_received, 0) + CASE WHEN NEW.is_paid THEN NEW.amount ELSE 0 END,
                last_transaction_date = NOW()
            WHERE id = NEW.partner_id;
        ELSIF NEW.transaction_type = 'debit' THEN
            -- مدين (دين علينا)
            UPDATE partners
            SET 
                debit_balance = COALESCE(debit_balance, 0) + NEW.amount,
                total_paid = COALESCE(total_paid, 0) + CASE WHEN NEW.is_paid THEN NEW.amount ELSE 0 END,
                last_transaction_date = NOW()
            WHERE id = NEW.partner_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger لتحديث أرصدة الشريك
DROP TRIGGER IF EXISTS trigger_update_partner_balance ON credit_debit_transactions;
CREATE TRIGGER trigger_update_partner_balance
    AFTER INSERT OR UPDATE ON credit_debit_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_partner_balance();

-- Function لتحديث الصندوق المالي عند إضافة حركة يومية
CREATE OR REPLACE FUNCTION update_daily_transaction_financial()
RETURNS TRIGGER AS $$
BEGIN
    -- تحديث الصندوق المالي بناءً على نوع الحركة
    IF NEW.transaction_type = 'income' THEN
        -- إضافة للإيرادات
        INSERT INTO financial_box (tenant_id, try_balance, usd_balance, syp_balance, sar_balance, eur_balance, updated_at)
        VALUES (
            NEW.tenant_id,
            CASE WHEN NEW.currency = 'TRY' THEN NEW.amount ELSE 0 END,
            CASE WHEN NEW.currency = 'USD' THEN NEW.amount ELSE 0 END,
            CASE WHEN NEW.currency = 'SYP' THEN NEW.amount ELSE 0 END,
            CASE WHEN NEW.currency = 'SAR' THEN NEW.amount ELSE 0 END,
            CASE WHEN NEW.currency = 'EUR' THEN NEW.amount ELSE 0 END,
            NOW()
        )
        ON CONFLICT (tenant_id) DO UPDATE SET
            try_balance = financial_box.try_balance + CASE WHEN NEW.currency = 'TRY' THEN NEW.amount ELSE 0 END,
            usd_balance = financial_box.usd_balance + CASE WHEN NEW.currency = 'USD' THEN NEW.amount ELSE 0 END,
            syp_balance = financial_box.syp_balance + CASE WHEN NEW.currency = 'SYP' THEN NEW.amount ELSE 0 END,
            sar_balance = financial_box.sar_balance + CASE WHEN NEW.currency = 'SAR' THEN NEW.amount ELSE 0 END,
            eur_balance = financial_box.eur_balance + CASE WHEN NEW.currency = 'EUR' THEN NEW.amount ELSE 0 END,
            updated_at = NOW();
    ELSIF NEW.transaction_type = 'expense' THEN
        -- خصم من المصروفات
        INSERT INTO financial_box (tenant_id, try_balance, usd_balance, syp_balance, sar_balance, eur_balance, updated_at)
        VALUES (
            NEW.tenant_id,
            CASE WHEN NEW.currency = 'TRY' THEN -NEW.amount ELSE 0 END,
            CASE WHEN NEW.currency = 'USD' THEN -NEW.amount ELSE 0 END,
            CASE WHEN NEW.currency = 'SYP' THEN -NEW.amount ELSE 0 END,
            CASE WHEN NEW.currency = 'SAR' THEN -NEW.amount ELSE 0 END,
            CASE WHEN NEW.currency = 'EUR' THEN -NEW.amount ELSE 0 END,
            NOW()
        )
        ON CONFLICT (tenant_id) DO UPDATE SET
            try_balance = financial_box.try_balance - CASE WHEN NEW.currency = 'TRY' THEN NEW.amount ELSE 0 END,
            usd_balance = financial_box.usd_balance - CASE WHEN NEW.currency = 'USD' THEN NEW.amount ELSE 0 END,
            syp_balance = financial_box.syp_balance - CASE WHEN NEW.currency = 'SYP' THEN NEW.amount ELSE 0 END,
            sar_balance = financial_box.sar_balance - CASE WHEN NEW.currency = 'SAR' THEN NEW.amount ELSE 0 END,
            eur_balance = financial_box.eur_balance - CASE WHEN NEW.currency = 'EUR' THEN NEW.amount ELSE 0 END,
            updated_at = NOW();
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- إذا لم يكن جدول financial_box موجوداً، تجاهل الخطأ
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger لتحديث الصندوق المالي
DROP TRIGGER IF EXISTS trigger_update_daily_transaction_financial ON daily_transactions;
CREATE TRIGGER trigger_update_daily_transaction_financial
    AFTER INSERT OR UPDATE ON daily_transactions
    FOR EACH ROW
    WHEN (NEW.payment_method != 'credit' OR NEW.is_credit = false)
    EXECUTE FUNCTION update_daily_transaction_financial();

-- ============================================
-- القسم 11: Function للتحقق من صلاحية المشترك
-- ============================================

CREATE OR REPLACE FUNCTION check_subscriber_eligibility(subscriber_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    sub_status TEXT;
    sub_end_date DATE;
BEGIN
    SELECT status, end_date INTO sub_status, sub_end_date
    FROM internet_cafe_subscribers
    WHERE id = subscriber_uuid;
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- التحقق من الحالة
    IF sub_status != 'active' THEN
        RETURN false;
    END IF;
    
    -- التحقق من تاريخ الانتهاء
    IF sub_end_date IS NOT NULL AND sub_end_date < CURRENT_DATE THEN
        RETURN false;
    END IF;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- القسم 12: Function لتجديد الاشتراك
-- ============================================

CREATE OR REPLACE FUNCTION renew_subscription(
    subscriber_uuid UUID,
    additional_days INTEGER DEFAULT 30,
    start_from_today BOOLEAN DEFAULT true
)
RETURNS BOOLEAN AS $$
DECLARE
    current_end_date DATE;
    new_end_date DATE;
BEGIN
    SELECT end_date INTO current_end_date
    FROM internet_cafe_subscribers
    WHERE id = subscriber_uuid;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Subscriber not found';
    END IF;
    
    -- حساب تاريخ الانتهاء الجديد
    IF start_from_today THEN
        new_end_date := CURRENT_DATE + (additional_days || ' days')::INTERVAL;
    ELSE
        new_end_date := COALESCE(current_end_date, CURRENT_DATE) + (additional_days || ' days')::INTERVAL;
    END IF;
    
    -- تحديث الاشتراك
    UPDATE internet_cafe_subscribers
    SET 
        end_date = new_end_date,
        status = 'active',
        updated_at = NOW()
    WHERE id = subscriber_uuid;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- القسم 13: Views للتقارير
-- ============================================

-- View لتقرير المشتركين النشطين
CREATE OR REPLACE VIEW active_subscribers_view AS
SELECT 
    s.*,
    st.name as subscription_type_name,
    st.price as subscription_price,
    p.name as partner_name,
    CASE 
        WHEN s.end_date < CURRENT_DATE THEN 'expired'
        WHEN s.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 7 THEN 'expiring_soon'
        ELSE 'active'
    END as status_detail
FROM internet_cafe_subscribers s
LEFT JOIN subscription_types st ON s.subscription_type_id = st.id
LEFT JOIN partners p ON s.partner_id = p.id
WHERE s.status = 'active';

-- View لتقرير الديون
CREATE OR REPLACE VIEW debts_report_view AS
SELECT 
    t.tenant_id,
    p.id as partner_id,
    p.name as partner_name,
    p.type as partner_type,
    COALESCE(SUM(CASE WHEN t.transaction_type = 'credit' AND t.is_paid = false THEN t.amount ELSE 0 END), 0) as total_debts_owed, -- ديون علينا
    COALESCE(SUM(CASE WHEN t.transaction_type = 'debit' AND t.is_paid = false THEN t.amount ELSE 0 END), 0) as total_debts_due, -- ديون لنا
    COUNT(*) FILTER (WHERE t.is_paid = false AND t.due_date < CURRENT_DATE) as overdue_count,
    MAX(t.due_date) FILTER (WHERE t.is_paid = false) as oldest_due_date
FROM credit_debit_transactions t
LEFT JOIN partners p ON t.partner_id = p.id
WHERE t.is_paid = false
GROUP BY t.tenant_id, p.id, p.name, p.type;

-- ============================================
-- القسم 14: تأكيد نجاح التحديث
-- ============================================

SELECT '✅ تم تحديث قاعدة البيانات لنظام صالة الإنترنت بنجاح!' as status;

