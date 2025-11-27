-- ============================================
-- تحديث نظام محاسبة العملاء: تحديث الرصيد تلقائياً
-- ============================================
-- تاريخ الإنشاء: 2024ش
-- الوصف: تحديث رصيد العميل تلقائياً عند إضافة دين/سداد
-- ============================================

-- التحقق من وجود جدول customer_transactions
CREATE TABLE IF NOT EXISTS customer_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    partner_id UUID REFERENCES partners(id) ON DELETE CASCADE NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('payment', 'receipt', 'debt', 'credit')),
    amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    currency TEXT DEFAULT 'TRY',
    payment_method TEXT DEFAULT 'cash',
    description TEXT,
    transaction_date DATE DEFAULT CURRENT_DATE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT
);

-- إنشاء فهارس
CREATE INDEX IF NOT EXISTS idx_customer_transactions_tenant ON customer_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customer_transactions_partner ON customer_transactions(partner_id);
CREATE INDEX IF NOT EXISTS idx_customer_transactions_date ON customer_transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_customer_transactions_type ON customer_transactions(transaction_type);

-- إضافة عمود balance للعملاء إذا لم يكن موجوداً
ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS current_balance NUMERIC(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_debt NUMERIC(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_credit NUMERIC(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'TRY';

-- دالة لحساب رصيد العميل تلقائياً
CREATE OR REPLACE FUNCTION calculate_customer_balance(p_partner_id UUID, p_tenant_id UUID)
RETURNS TABLE (
    balance NUMERIC,
    debt NUMERIC,
    credit NUMERIC,
    currency TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(
            CASE 
                WHEN transaction_type IN ('credit', 'payment') AND transaction_type = 'payment' THEN amount
                WHEN transaction_type = 'credit' THEN amount
                WHEN transaction_type IN ('debt', 'receipt') THEN -amount
                ELSE 0
            END
        ), 0)::NUMERIC AS balance,
        COALESCE(SUM(
            CASE WHEN transaction_type IN ('debt', 'receipt') THEN amount ELSE 0 END
        ), 0)::NUMERIC AS debt,
        COALESCE(SUM(
            CASE WHEN transaction_type IN ('credit', 'payment') THEN amount ELSE 0 END
        ), 0)::NUMERIC AS credit,
        COALESCE((SELECT currency FROM customer_transactions WHERE partner_id = p_partner_id AND tenant_id = p_tenant_id LIMIT 1), 'TRY') AS currency
    FROM customer_transactions
    WHERE partner_id = p_partner_id AND tenant_id = p_tenant_id;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION calculate_customer_balance IS 'حساب رصيد العميل من المعاملات';

-- Trigger لتحديث رصيد العميل تلقائياً عند إضافة/تعديل/حذف معاملة
CREATE OR REPLACE FUNCTION update_customer_balance_trigger()
RETURNS TRIGGER AS $$
DECLARE
    v_balance NUMERIC;
    v_debt NUMERIC;
    v_credit NUMERIC;
    v_currency TEXT;
BEGIN
    -- حساب الرصيد الجديد
    SELECT balance, debt, credit, currency INTO v_balance, v_debt, v_credit, v_currency
    FROM calculate_customer_balance(
        COALESCE(NEW.partner_id, OLD.partner_id),
        COALESCE(NEW.tenant_id, OLD.tenant_id)
    );
    
    -- تحديث رصيد العميل
    UPDATE partners
    SET 
        current_balance = v_balance,
        total_debt = v_debt,
        total_credit = v_credit,
        currency = COALESCE(v_currency, currency, 'TRY')
    WHERE id = COALESCE(NEW.partner_id, OLD.partner_id)
        AND tenant_id = COALESCE(NEW.tenant_id, OLD.tenant_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if any
DROP TRIGGER IF EXISTS trigger_update_customer_balance_insert ON customer_transactions;
DROP TRIGGER IF EXISTS trigger_update_customer_balance_update ON customer_transactions;
DROP TRIGGER IF EXISTS trigger_update_customer_balance_delete ON customer_transactions;

-- Create triggers
CREATE TRIGGER trigger_update_customer_balance_insert
    AFTER INSERT ON customer_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_balance_trigger();

CREATE TRIGGER trigger_update_customer_balance_update
    AFTER UPDATE ON customer_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_balance_trigger();

CREATE TRIGGER trigger_update_customer_balance_delete
    AFTER DELETE ON customer_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_balance_trigger();

-- تحديث الأرصدة الحالية للعملاء الموجودين
DO $$
DECLARE
    partner_rec RECORD;
    balance_rec RECORD;
BEGIN
    FOR partner_rec IN 
        SELECT DISTINCT p.id, p.tenant_id 
        FROM partners p
        WHERE p.type = 'Customer'
    LOOP
        SELECT * INTO balance_rec 
        FROM calculate_customer_balance(partner_rec.id, partner_rec.tenant_id);
        
        UPDATE partners
        SET 
            current_balance = COALESCE(balance_rec.balance, 0),
            total_debt = COALESCE(balance_rec.debt, 0),
            total_credit = COALESCE(balance_rec.credit, 0),
            currency = COALESCE(balance_rec.currency, 'TRY')
        WHERE id = partner_rec.id AND tenant_id = partner_rec.tenant_id;
    END LOOP;
END $$;

-- تحديث view customer_summary إذا كان موجوداً
CREATE OR REPLACE VIEW customer_summary AS
SELECT 
    p.id,
    p.tenant_id,
    p.name,
    p.phone,
    p.email,
    p.address,
    p.notes,
    p.currency,
    p.created_at,
    -- الأرصدة من الجدول
    COALESCE(p.current_balance, 0) AS balance,
    COALESCE(p.total_debt, 0) AS debt,
    COALESCE(p.total_credit, 0) AS credit,
    -- إجمالي المدفوع والمستلم
    COALESCE(SUM(
        CASE WHEN ct.transaction_type = 'payment' THEN ct.amount ELSE 0 END
    ), 0) AS total_paid,
    COALESCE(SUM(
        CASE WHEN ct.transaction_type = 'receipt' THEN ct.amount ELSE 0 END
    ), 0) AS total_received
FROM partners p
LEFT JOIN customer_transactions ct ON p.id = ct.partner_id AND p.tenant_id = ct.tenant_id
WHERE p.type = 'Customer'
GROUP BY p.id, p.tenant_id, p.name, p.phone, p.email, p.address, p.notes, p.currency, p.created_at, 
         p.current_balance, p.total_debt, p.total_credit;

COMMENT ON VIEW customer_summary IS 'ملخص العملاء مع الأرصدة والديون';

-- ============================================
-- إنهاء السكريبت
-- ============================================

SELECT 'تم تحديث نظام محاسبة العملاء بنجاح!' AS result;

