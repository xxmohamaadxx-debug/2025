-- ============================================
-- ملف تحديث شامل: التكامل بين الأقسام + نظام تحويل العملات
-- ============================================
-- تاريخ الإنشاء: 2024
-- الوصف: 
-- 1. إضافة جداول لتحويل العملات
-- 2. تحسين التكامل بين الأقسام
-- 3. تحديث نظام محاسبة العملاء
-- ============================================

-- ============================================
-- القسم 1: إنشاء جدول أسعار الصرف
-- ============================================
CREATE TABLE IF NOT EXISTS exchange_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_currency TEXT NOT NULL,
    to_currency TEXT NOT NULL,
    rate NUMERIC(15, 6) NOT NULL,
    source TEXT DEFAULT 'manual', -- 'manual', 'api', 'auto'
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(from_currency, to_currency)
);

COMMENT ON TABLE exchange_rates IS 'أسعار صرف العملات (SYP, TRY إلى USD وغيرها)';

-- إنشاء فهارس
CREATE INDEX IF NOT EXISTS idx_exchange_rates_currencies ON exchange_rates(from_currency, to_currency);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_active ON exchange_rates(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_exchange_rates_updated ON exchange_rates(last_updated DESC);

-- إدراج أسعار افتراضية
INSERT INTO exchange_rates (from_currency, to_currency, rate, source, notes)
VALUES 
    ('SYP', 'USD', 15000, 'manual', 'سعر افتراضي - يجب تحديثه'),
    ('TRY', 'USD', 32, 'manual', 'سعر افتراضي - يجب تحديثه'),
    ('USD', 'SYP', 0.0000667, 'manual', 'معكوس SYP_TO_USD'),
    ('USD', 'TRY', 0.03125, 'manual', 'معكوس TRY_TO_USD')
ON CONFLICT (from_currency, to_currency) DO NOTHING;

-- ============================================
-- القسم 2: دوال تحويل العملات
-- ============================================

-- دالة للحصول على سعر الصرف
CREATE OR REPLACE FUNCTION get_exchange_rate(
    p_from_currency TEXT,
    p_to_currency TEXT
)
RETURNS NUMERIC AS $$
DECLARE
    v_rate NUMERIC;
BEGIN
    -- إذا كانت نفس العملة
    IF p_from_currency = p_to_currency THEN
        RETURN 1;
    END IF;
    
    -- البحث عن السعر المباشر
    SELECT rate INTO v_rate
    FROM exchange_rates
    WHERE from_currency = p_from_currency
        AND to_currency = p_to_currency
        AND is_active = true
    ORDER BY last_updated DESC
    LIMIT 1;
    
    -- إذا وُجد السعر
    IF v_rate IS NOT NULL THEN
        RETURN v_rate;
    END IF;
    
    -- محاولة البحث العكسي
    SELECT 1 / rate INTO v_rate
    FROM exchange_rates
    WHERE from_currency = p_to_currency
        AND to_currency = p_from_currency
        AND is_active = true
    ORDER BY last_updated DESC
    LIMIT 1;
    
    -- إذا وُجد السعر العكسي
    IF v_rate IS NOT NULL THEN
        RETURN v_rate;
    END IF;
    
    -- إذا لم يُوجد، إرجاع 1
    RETURN 1;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_exchange_rate IS 'الحصول على سعر صرف بين عملتين';

-- دالة لتحويل العملة
CREATE OR REPLACE FUNCTION convert_currency(
    p_amount NUMERIC,
    p_from_currency TEXT,
    p_to_currency TEXT
)
RETURNS NUMERIC AS $$
DECLARE
    v_rate NUMERIC;
    v_result NUMERIC;
BEGIN
    -- إذا كانت نفس العملة
    IF p_from_currency = p_to_currency THEN
        RETURN p_amount;
    END IF;
    
    -- الحصول على سعر الصرف
    v_rate := get_exchange_rate(p_from_currency, p_to_currency);
    
    -- التحويل
    v_result := p_amount * v_rate;
    
    RETURN ROUND(v_result, 2);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION convert_currency IS 'تحويل مبلغ من عملة إلى أخرى';

-- ============================================
-- القسم 3: تحسين التكامل بين الأقسام
-- ============================================

-- إضافة عمود currency في daily_movements إذا لم يكن موجوداً
ALTER TABLE daily_movements 
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'TRY';

-- إضافة عمود partner_id في invoices_out و invoices_in للربط مع العملاء
ALTER TABLE invoices_out 
ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES partners(id) ON DELETE SET NULL;

ALTER TABLE invoices_in 
ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES partners(id) ON DELETE SET NULL;

-- إضافة عمود invoice_id في customer_transactions للربط مع الفواتير
ALTER TABLE customer_transactions 
ADD COLUMN IF NOT EXISTS invoice_id UUID,
ADD COLUMN IF NOT EXISTS invoice_type TEXT; -- 'in' or 'out'

-- إضافة عمود inventory_item_id في invoices_out للربط مع المخزون
ALTER TABLE invoices_out 
ADD COLUMN IF NOT EXISTS inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS quantity NUMERIC(10, 2) DEFAULT 0;

-- ============================================
-- القسم 4: View لتكامل البيانات
-- ============================================

-- View لتكامل الفواتير مع العملاء والمخزون
CREATE OR REPLACE VIEW invoice_integration_view AS
SELECT 
    io.id AS invoice_id,
    io.tenant_id,
    io.amount,
    io.currency,
    io.date,
    io.description,
    io.status,
    io.partner_id,
    p.name AS partner_name,
    p.type AS partner_type,
    io.inventory_item_id,
    inv.name AS inventory_item_name,
    io.quantity,
    io.created_at
FROM invoices_out io
LEFT JOIN partners p ON io.partner_id = p.id
LEFT JOIN inventory_items inv ON io.inventory_item_id = inv.id;

COMMENT ON VIEW invoice_integration_view IS 'عرض تكامل الفواتير مع العملاء والمخزون';

-- View لتكامل العميل مع الفواتير والمعاملات
CREATE OR REPLACE VIEW customer_integration_view AS
SELECT 
    p.id AS customer_id,
    p.tenant_id,
    p.name AS customer_name,
    p.phone,
    p.email,
    p.current_balance,
    p.total_debt,
    p.total_credit,
    p.currency,
    COUNT(DISTINCT io.id) AS total_invoices,
    COUNT(DISTINCT ct.id) AS total_transactions,
    COALESCE(SUM(io.amount), 0) AS total_invoice_amount,
    COALESCE(SUM(CASE WHEN ct.transaction_type = 'payment' THEN ct.amount ELSE 0 END), 0) AS total_payments
FROM partners p
LEFT JOIN invoices_out io ON p.id = io.partner_id
LEFT JOIN customer_transactions ct ON p.id = ct.partner_id
WHERE p.type = 'Customer'
GROUP BY p.id, p.tenant_id, p.name, p.phone, p.email, p.current_balance, p.total_debt, p.total_credit, p.currency;

COMMENT ON VIEW customer_integration_view IS 'عرض تكامل بيانات العميل مع الفواتير والمعاملات';

-- ============================================
-- القسم 5: Triggers للتكامل التلقائي
-- ============================================

-- Trigger: تحديث رصيد العميل عند إنشاء فاتورة صادر
CREATE OR REPLACE FUNCTION update_customer_balance_on_invoice()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.partner_id IS NOT NULL THEN
        -- إضافة معاملة دين للعميل
        INSERT INTO customer_transactions (
            tenant_id,
            partner_id,
            transaction_type,
            amount,
            currency,
            description,
            transaction_date,
            invoice_id,
            invoice_type,
            created_at
        )
        VALUES (
            NEW.tenant_id,
            NEW.partner_id,
            'debt',
            NEW.amount,
            NEW.currency,
            COALESCE(NEW.description, 'فاتورة صادر #' || COALESCE(NEW.invoice_number, NEW.id::TEXT)),
            NEW.date,
            NEW.id,
            'out',
            NOW()
        )
        ON CONFLICT DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_customer_balance_on_invoice ON invoices_out;
CREATE TRIGGER trigger_update_customer_balance_on_invoice
    AFTER INSERT ON invoices_out
    FOR EACH ROW
    WHEN (NEW.partner_id IS NOT NULL)
    EXECUTE FUNCTION update_customer_balance_on_invoice();

-- Trigger: تحديث المخزون عند إنشاء فاتورة صادر
CREATE OR REPLACE FUNCTION update_inventory_on_invoice()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.inventory_item_id IS NOT NULL AND NEW.quantity > 0 THEN
        -- تقليل الكمية من المخزون
        UPDATE inventory_items
        SET quantity = GREATEST(0, quantity - NEW.quantity),
            updated_at = NOW()
        WHERE id = NEW.inventory_item_id
            AND tenant_id = NEW.tenant_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_inventory_on_invoice ON invoices_out;
CREATE TRIGGER trigger_update_inventory_on_invoice
    AFTER INSERT ON invoices_out
    FOR EACH ROW
    WHEN (NEW.inventory_item_id IS NOT NULL AND NEW.quantity > 0)
    EXECUTE FUNCTION update_inventory_on_invoice();

-- ============================================
-- القسم 6: إحصائيات متكاملة
-- ============================================

-- Function: الحصول على إحصائيات متكاملة للمتجر
CREATE OR REPLACE FUNCTION get_tenant_integrated_stats(p_tenant_id UUID)
RETURNS TABLE (
    total_income NUMERIC,
    total_expenses NUMERIC,
    total_profit NUMERIC,
    total_customers INTEGER,
    total_products INTEGER,
    low_stock_count INTEGER,
    pending_invoices INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(CASE WHEN io.amount IS NOT NULL THEN io.amount ELSE 0 END), 0) AS total_income,
        COALESCE(SUM(CASE WHEN ii.amount IS NOT NULL THEN ii.amount ELSE 0 END), 0) AS total_expenses,
        COALESCE(SUM(CASE WHEN io.amount IS NOT NULL THEN io.amount ELSE 0 END), 0) - 
        COALESCE(SUM(CASE WHEN ii.amount IS NOT NULL THEN ii.amount ELSE 0 END), 0) AS total_profit,
        COUNT(DISTINCT p.id) FILTER (WHERE p.type = 'Customer') AS total_customers,
        COUNT(DISTINCT inv.id) AS total_products,
        COUNT(*) FILTER (WHERE inv.quantity < inv.min_stock) AS low_stock_count,
        COUNT(*) FILTER (WHERE io.status = 'pending' OR ii.status = 'pending') AS pending_invoices
    FROM tenants t
    LEFT JOIN invoices_out io ON t.id = io.tenant_id
    LEFT JOIN invoices_in ii ON t.id = ii.tenant_id
    LEFT JOIN partners p ON t.id = p.tenant_id
    LEFT JOIN inventory_items inv ON t.id = inv.tenant_id
    WHERE t.id = p_tenant_id
    GROUP BY t.id;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_tenant_integrated_stats IS 'الحصول على إحصائيات متكاملة للمتجر';

-- ============================================
-- إنهاء السكريبت
-- ============================================

SELECT 'تم تحديث نظام التكامل ونظام تحويل العملات بنجاح!' AS result;

