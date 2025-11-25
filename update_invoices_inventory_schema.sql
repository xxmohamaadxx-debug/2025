-- SQL Script لتحديث قاعدة البيانات لتتوافق مع المتطلبات الجديدة
-- تاريخ التحديث: 2025

-- ============================================
-- 1. تحديث جداول الواردات والصادرات
-- ============================================

-- إضافة حقل partner_id للواردات
ALTER TABLE invoices_in
ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES partners(id) ON DELETE SET NULL;

-- إضافة حقل partner_id للصادرات
ALTER TABLE invoices_out
ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES partners(id) ON DELETE SET NULL;

-- إضافة حقل attachments للواردات (JSONB لحفظ روابط الملفات)
ALTER TABLE invoices_in
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- إضافة حقل attachments للصادرات
ALTER TABLE invoices_out
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- إضافة فهارس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_invoices_in_partner_id ON invoices_in(partner_id);
CREATE INDEX IF NOT EXISTS idx_invoices_in_category ON invoices_in(category);
CREATE INDEX IF NOT EXISTS idx_invoices_in_currency ON invoices_in(currency);
CREATE INDEX IF NOT EXISTS idx_invoices_in_date ON invoices_in(date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_out_partner_id ON invoices_out(partner_id);
CREATE INDEX IF NOT EXISTS idx_invoices_out_category ON invoices_out(category);
CREATE INDEX IF NOT EXISTS idx_invoices_out_currency ON invoices_out(currency);
CREATE INDEX IF NOT EXISTS idx_invoices_out_date ON invoices_out(date DESC);

-- ============================================
-- 2. تحديث جدول المنتجات (inventory_items)
-- ============================================

-- التأكد من وجود جميع الحقول المطلوبة
ALTER TABLE inventory_items
ADD COLUMN IF NOT EXISTS code TEXT, -- كود المنتج (مشابه لـ sku)
ADD COLUMN IF NOT EXISTS alert_sent BOOLEAN DEFAULT false; -- لتتبع إرسال التنبيه

-- إضافة فهرس للبحث السريع بالكود
CREATE INDEX IF NOT EXISTS idx_inventory_items_code ON inventory_items(code);
CREATE INDEX IF NOT EXISTS idx_inventory_items_tenant_code ON inventory_items(tenant_id, code);
CREATE INDEX IF NOT EXISTS idx_inventory_items_sku ON inventory_items(sku);

-- ============================================
-- 3. إنشاء جدول حركات المخزون
-- ============================================

CREATE TABLE IF NOT EXISTS inventory_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('in', 'out', 'adjustment')),
    quantity NUMERIC(10, 2) NOT NULL,
    unit TEXT DEFAULT 'piece',
    related_invoice_id UUID, -- يمكن أن يكون invoices_in أو invoices_out
    related_invoice_type TEXT CHECK (related_invoice_type IN ('invoice_in', 'invoice_out', NULL)),
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- فهارس لحركات المخزون
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_tenant_id ON inventory_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_item_id ON inventory_transactions(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_type ON inventory_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_date ON inventory_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_invoice ON inventory_transactions(related_invoice_id, related_invoice_type);

-- ============================================
-- 4. إنشاء جدول إعدادات التنبيهات
-- ============================================

CREATE TABLE IF NOT EXISTS inventory_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE NOT NULL,
    alert_type TEXT NOT NULL DEFAULT 'low_stock',
    threshold_quantity NUMERIC(10, 2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_alert_sent TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_alerts_tenant_id ON inventory_alerts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_item_id ON inventory_alerts(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_active ON inventory_alerts(is_active) WHERE is_active = true;

-- ============================================
-- 5. إنشاء جدول ملفات المرفقات (اختياري)
-- ============================================

CREATE TABLE IF NOT EXISTS invoice_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    invoice_id UUID NOT NULL, -- يمكن أن يكون invoices_in أو invoices_out
    invoice_type TEXT NOT NULL CHECK (invoice_type IN ('invoice_in', 'invoice_out')),
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL, -- رابط الملف (يمكن أن يكون في Storage Service)
    file_size NUMERIC(10, 2), -- حجم الملف بالكيلوبايت
    file_type TEXT, -- نوع الملف (pdf, jpg, png, etc)
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_attachments_tenant_id ON invoice_attachments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoice_attachments_invoice ON invoice_attachments(invoice_id, invoice_type);

-- ============================================
-- 6. إنشاء Function لحساب المخزون الحالي
-- ============================================

CREATE OR REPLACE FUNCTION get_current_stock(inventory_item_uuid UUID)
RETURNS NUMERIC AS $$
DECLARE
    base_quantity NUMERIC;
    total_in NUMERIC;
    total_out NUMERIC;
BEGIN
    -- الحصول على الكمية الأساسية
    SELECT COALESCE(quantity, 0) INTO base_quantity
    FROM inventory_items
    WHERE id = inventory_item_uuid;
    
    -- حساب إجمالي الإدخال
    SELECT COALESCE(SUM(quantity), 0) INTO total_in
    FROM inventory_transactions
    WHERE inventory_item_id = inventory_item_uuid
    AND transaction_type IN ('in', 'adjustment')
    AND (transaction_type != 'adjustment' OR quantity > 0);
    
    -- حساب إجمالي الإخراج
    SELECT COALESCE(SUM(ABS(quantity)), 0) INTO total_out
    FROM inventory_transactions
    WHERE inventory_item_id = inventory_item_uuid
    AND transaction_type IN ('out', 'adjustment')
    AND (transaction_type != 'adjustment' OR quantity < 0);
    
    RETURN base_quantity + total_in - total_out;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 7. إنشاء Trigger للتنبيه التلقائي عند انخفاض المخزون
-- ============================================

CREATE OR REPLACE FUNCTION check_inventory_low_stock()
RETURNS TRIGGER AS $$
DECLARE
    current_stock NUMERIC;
    min_stock_level NUMERIC;
    item_record RECORD;
BEGIN
    -- الحصول على معلومات المنتج
    SELECT * INTO item_record
    FROM inventory_items
    WHERE id = NEW.inventory_item_id;
    
    IF NOT FOUND THEN
        RETURN NEW;
    END IF;
    
    -- حساب المخزون الحالي
    current_stock := get_current_stock(NEW.inventory_item_id);
    min_stock_level := item_record.min_stock;
    
    -- التحقق من انخفاض المخزون
    IF current_stock <= min_stock_level AND NOT item_record.alert_sent THEN
        -- تحديث حالة التنبيه
        UPDATE inventory_items
        SET alert_sent = true
        WHERE id = NEW.inventory_item_id;
        
        -- إدراج سجل تنبيه
        INSERT INTO inventory_alerts (
            tenant_id,
            inventory_item_id,
            alert_type,
            threshold_quantity,
            last_alert_sent
        ) VALUES (
            item_record.tenant_id,
            item_record.id,
            'low_stock',
            min_stock_level,
            NOW()
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء Trigger
DROP TRIGGER IF EXISTS trigger_check_low_stock ON inventory_transactions;
CREATE TRIGGER trigger_check_low_stock
AFTER INSERT ON inventory_transactions
FOR EACH ROW
EXECUTE FUNCTION check_inventory_low_stock();

-- ============================================
-- 8. إنشاء Function لإعادة تعيين حالة التنبيه
-- ============================================

CREATE OR REPLACE FUNCTION reset_alert_sent(inventory_item_uuid UUID)
RETURNS VOID AS $$
DECLARE
    current_stock NUMERIC;
    min_stock_level NUMERIC;
BEGIN
    -- حساب المخزون الحالي
    current_stock := get_current_stock(inventory_item_uuid);
    
    -- الحصول على الحد الأدنى
    SELECT min_stock INTO min_stock_level
    FROM inventory_items
    WHERE id = inventory_item_uuid;
    
    -- إذا كان المخزون أعلى من الحد الأدنى، إعادة تعيين التنبيه
    IF current_stock > min_stock_level THEN
        UPDATE inventory_items
        SET alert_sent = false
        WHERE id = inventory_item_uuid;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 9. تحديث جدول partners
-- ============================================

-- التأكد من وجود جميع الحقول
ALTER TABLE partners
ADD COLUMN IF NOT EXISTS tax_number TEXT, -- الرقم الضريبي
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- ============================================
-- 10. إنشاء View لتقارير الواردات والصادرات
-- ============================================

CREATE OR REPLACE VIEW invoices_summary_view AS
SELECT 
    'invoice_in' as invoice_type,
    i.id,
    i.tenant_id,
    i.amount,
    i.currency,
    i.description,
    i.date,
    i.category,
    i.status,
    p.name as partner_name,
    p.type as partner_type,
    i.created_at
FROM invoices_in i
LEFT JOIN partners p ON i.partner_id = p.id
UNION ALL
SELECT 
    'invoice_out' as invoice_type,
    o.id,
    o.tenant_id,
    o.amount,
    o.currency,
    o.description,
    o.date,
    o.category,
    o.status,
    p.name as partner_name,
    p.type as partner_type,
    o.created_at
FROM invoices_out o
LEFT JOIN partners p ON o.partner_id = p.id;

-- ============================================
-- ملاحظات:
-- 1. يجب رفع الملفات إلى خدمة تخزين (مثل Supabase Storage أو S3)
-- 2. يمكن استخدام جدول invoice_attachments لحفظ معلومات الملفات
-- 3. يتم حساب المخزون الحالي ديناميكياً باستخدام Function
-- 4. يتم إرسال التنبيهات تلقائياً عند انخفاض المخزون
-- 5. يتم استخدام حقل code أو sku لكود المنتج
-- ============================================

