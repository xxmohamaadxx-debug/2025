-- ============================================
-- تحديث قاعدة البيانات: عناصر الفواتير وربطها بالمستودع
-- تاريخ التحديث: 2025
-- ============================================

-- ============================================
-- القسم 1: إنشاء جدول عناصر الفواتير
-- ============================================

CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL,
    invoice_type TEXT NOT NULL CHECK (invoice_type IN ('invoice_in', 'invoice_out')),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE SET NULL,
    item_name TEXT NOT NULL,
    item_code TEXT,
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 1,
    unit TEXT DEFAULT 'piece',
    unit_price NUMERIC(15, 2) NOT NULL DEFAULT 0,
    total_price NUMERIC(15, 2) NOT NULL DEFAULT 0,
    currency TEXT DEFAULT 'TRY',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id, invoice_type);
CREATE INDEX IF NOT EXISTS idx_invoice_items_tenant ON invoice_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_inventory ON invoice_items(inventory_item_id);

-- ============================================
-- القسم 2: تحديث جداول الفواتير لدعم العناصر
-- ============================================

-- إضافة حقل items (JSONB) كنسخة احتياطية
ALTER TABLE invoices_in
ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;

ALTER TABLE invoices_out
ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;

-- إضافة حقل warehouse_updated للتحقق من تحديث المستودع
ALTER TABLE invoices_in
ADD COLUMN IF NOT EXISTS warehouse_updated BOOLEAN DEFAULT false;

ALTER TABLE invoices_out
ADD COLUMN IF NOT EXISTS warehouse_updated BOOLEAN DEFAULT false;

-- ============================================
-- القسم 3: تحديث جدول inventory_transactions
-- ============================================

-- إضافة حقل invoice_item_id لربط الحركة بعنصر الفاتورة
ALTER TABLE inventory_transactions
ADD COLUMN IF NOT EXISTS invoice_item_id UUID REFERENCES invoice_items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_invoice_item ON inventory_transactions(invoice_item_id);

-- ============================================
-- القسم 4: تحديث Function لحساب المخزون
-- ============================================

CREATE OR REPLACE FUNCTION update_inventory_from_invoice()
RETURNS TRIGGER AS $$
DECLARE
    invoice_record RECORD;
    item_record RECORD;
    current_quantity NUMERIC;
BEGIN
    -- الحصول على معلومات الفاتورة
    IF NEW.invoice_type = 'invoice_in' THEN
        SELECT * INTO invoice_record FROM invoices_in WHERE id = NEW.invoice_id;
    ELSE
        SELECT * INTO invoice_record FROM invoices_out WHERE id = NEW.invoice_id;
    END IF;
    
    IF NOT FOUND THEN
        RETURN NEW;
    END IF;
    
    -- إذا كانت الفاتورة مرتبطة بمستودع وتحتوي على عنصر موجود في المستودع
    IF NEW.inventory_item_id IS NOT NULL THEN
        SELECT * INTO item_record FROM inventory_items WHERE id = NEW.inventory_item_id;
        
        IF FOUND THEN
            -- تحديث كمية المستودع حسب نوع الفاتورة
            IF NEW.invoice_type = 'invoice_in' THEN
                -- وارد: زيادة الكمية
                UPDATE inventory_items
                SET quantity = quantity + NEW.quantity
                WHERE id = NEW.inventory_item_id;
                
                -- إضافة حركة مخزون
                INSERT INTO inventory_transactions (
                    tenant_id,
                    inventory_item_id,
                    transaction_type,
                    quantity,
                    unit,
                    related_invoice_id,
                    related_invoice_type,
                    invoice_item_id,
                    notes
                ) VALUES (
                    NEW.tenant_id,
                    NEW.inventory_item_id,
                    'in',
                    NEW.quantity,
                    NEW.unit,
                    NEW.invoice_id,
                    NEW.invoice_type,
                    NEW.id,
                    'إضافة من فاتورة وارد'
                );
            ELSE
                -- صادر: تقليل الكمية
                SELECT quantity INTO current_quantity FROM inventory_items WHERE id = NEW.inventory_item_id;
                
                IF current_quantity >= NEW.quantity THEN
                    UPDATE inventory_items
                    SET quantity = quantity - NEW.quantity
                    WHERE id = NEW.inventory_item_id;
                    
                    -- إضافة حركة مخزون
                    INSERT INTO inventory_transactions (
                        tenant_id,
                        inventory_item_id,
                        transaction_type,
                        quantity,
                        unit,
                        related_invoice_id,
                        related_invoice_type,
                        invoice_item_id,
                        notes
                    ) VALUES (
                        NEW.tenant_id,
                        NEW.inventory_item_id,
                        'out',
                        NEW.quantity,
                        NEW.unit,
                        NEW.invoice_id,
                        NEW.invoice_type,
                        NEW.id,
                        'إخراج من فاتورة صادر'
                    );
                ELSE
                    RAISE EXCEPTION 'الكمية غير كافية في المستودع. الكمية المتوفرة: %, المطلوبة: %', current_quantity, NEW.quantity;
                END IF;
            END IF;
        END IF;
    END IF;
    
    -- تحديث حالة الفاتورة
    IF NEW.invoice_type = 'invoice_in' THEN
        UPDATE invoices_in SET warehouse_updated = true WHERE id = NEW.invoice_id;
    ELSE
        UPDATE invoices_out SET warehouse_updated = true WHERE id = NEW.invoice_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger لإضافة/تحديث العناصر في الفاتورة
DROP TRIGGER IF EXISTS trigger_update_warehouse_from_invoice_item ON invoice_items;
CREATE TRIGGER trigger_update_warehouse_from_invoice_item
    AFTER INSERT ON invoice_items
    FOR EACH ROW
    EXECUTE FUNCTION update_inventory_from_invoice();

-- ============================================
-- القسم 5: Function لحذف عنصر من الفاتورة واسترجاع الكمية
-- ============================================

CREATE OR REPLACE FUNCTION restore_inventory_on_item_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- إذا كان العنصر المحذوف مرتبط بمستودع
    IF OLD.inventory_item_id IS NOT NULL THEN
        IF OLD.invoice_type = 'invoice_in' THEN
            -- إذا كانت فاتورة وارد، نقوم بتقليل الكمية
            UPDATE inventory_items
            SET quantity = GREATEST(0, quantity - OLD.quantity)
            WHERE id = OLD.inventory_item_id;
        ELSE
            -- إذا كانت فاتورة صادر، نستعيد الكمية
            UPDATE inventory_items
            SET quantity = quantity + OLD.quantity
            WHERE id = OLD.inventory_item_id;
        END IF;
    END IF;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_restore_inventory_on_item_delete ON invoice_items;
CREATE TRIGGER trigger_restore_inventory_on_item_delete
    AFTER DELETE ON invoice_items
    FOR EACH ROW
    EXECUTE FUNCTION restore_inventory_on_item_delete();

-- ============================================
-- القسم 6: Function لحساب المبلغ الإجمالي للفاتورة
-- ============================================

CREATE OR REPLACE FUNCTION calculate_invoice_total()
RETURNS TRIGGER AS $$
DECLARE
    total_amount NUMERIC := 0;
BEGIN
    -- حساب المبلغ الإجمالي من عناصر الفاتورة
    SELECT COALESCE(SUM(total_price), 0) INTO total_amount
    FROM invoice_items
    WHERE invoice_id = NEW.invoice_id
    AND invoice_type = NEW.invoice_type
    AND currency = NEW.currency;
    
    -- تحديث المبلغ في الفاتورة
    IF NEW.invoice_type = 'invoice_in' THEN
        UPDATE invoices_in
        SET amount = total_amount
        WHERE id = NEW.invoice_id;
    ELSE
        UPDATE invoices_out
        SET amount = total_amount
        WHERE id = NEW.invoice_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calculate_invoice_total ON invoice_items;
CREATE TRIGGER trigger_calculate_invoice_total
    AFTER INSERT OR UPDATE OR DELETE ON invoice_items
    FOR EACH ROW
    EXECUTE FUNCTION calculate_invoice_total();

-- ============================================
-- القسم 7: إنشاء جدول النسخ الاحتياطي
-- ============================================

CREATE TABLE IF NOT EXISTS backups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    backup_type TEXT NOT NULL DEFAULT 'full', -- 'full', 'incremental'
    backup_data JSONB NOT NULL,
    file_name TEXT,
    file_size NUMERIC(10, 2), -- بالكيلوبايت
    created_by UUID REFERENCES public_users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_backups_tenant ON backups(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_backups_type ON backups(backup_type);

-- ============================================
-- القسم 8: إنشاء Function للنسخ الاحتياطي
-- ============================================

CREATE OR REPLACE FUNCTION create_tenant_backup(tenant_uuid UUID)
RETURNS JSONB AS $$
DECLARE
    backup_data JSONB;
BEGIN
    SELECT jsonb_build_object(
        'tenant', (SELECT row_to_json(t.*) FROM tenants t WHERE id = tenant_uuid),
        'users', (SELECT jsonb_agg(row_to_json(u.*)) FROM users u WHERE tenant_id = tenant_uuid),
        'partners', (SELECT jsonb_agg(row_to_json(p.*)) FROM partners p WHERE tenant_id = tenant_uuid),
        'inventory_items', (SELECT jsonb_agg(row_to_json(i.*)) FROM inventory_items i WHERE tenant_id = tenant_uuid),
        'invoices_in', (SELECT jsonb_agg(row_to_json(inv.*)) FROM invoices_in inv WHERE tenant_id = tenant_uuid),
        'invoices_out', (SELECT jsonb_agg(row_to_json(inv.*)) FROM invoices_out inv WHERE tenant_id = tenant_uuid),
        'invoice_items', (
            SELECT jsonb_agg(row_to_json(item.*))
            FROM invoice_items item
            WHERE item.tenant_id = tenant_uuid
        ),
        'employees', (SELECT jsonb_agg(row_to_json(e.*)) FROM employees e WHERE tenant_id = tenant_uuid),
        'payroll', (SELECT jsonb_agg(row_to_json(p.*)) FROM payroll p WHERE tenant_id = tenant_uuid),
        'inventory_transactions', (
            SELECT jsonb_agg(row_to_json(t.*))
            FROM inventory_transactions t
            WHERE t.tenant_id = tenant_uuid
        ),
        'created_at', NOW()
    ) INTO backup_data;
    
    RETURN backup_data;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- القسم 9: إنشاء Function لاستعادة النسخة الاحتياطية
-- ============================================

CREATE OR REPLACE FUNCTION restore_tenant_backup(backup_uuid UUID, target_tenant_uuid UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
    backup_record RECORD;
    new_tenant_id UUID;
    backup_data JSONB;
BEGIN
    -- الحصول على النسخة الاحتياطية
    SELECT * INTO backup_record FROM backups WHERE id = backup_uuid;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'النسخة الاحتياطية غير موجودة';
    END IF;
    
    backup_data := backup_record.backup_data;
    
    -- إذا لم يتم تحديد مستأجر، نستخدم نفس المستأجر
    IF target_tenant_uuid IS NULL THEN
        new_tenant_id := backup_record.tenant_id;
    ELSE
        new_tenant_id := target_tenant_uuid;
    END IF;
    
    -- ملاحظة: استعادة البيانات يجب أن تتم بعناية في التطبيق
    -- هذه Function فقط لتوفير البيانات، الاستعادة الفعلية ستكون في الكود
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- القسم 10: إنشاء View لعرض عناصر الفواتير مع تفاصيل المستودع
-- ============================================

CREATE OR REPLACE VIEW invoice_items_view AS
SELECT 
    ii.*,
    inv.name as inventory_item_name,
    inv.sku as inventory_item_sku,
    inv.quantity as current_stock
FROM invoice_items ii
LEFT JOIN inventory_items inv ON ii.inventory_item_id = inv.id;

-- ============================================
-- القسم 11: تحديثات إضافية للدعم متعدد اللغات
-- ============================================

-- إضافة حقل language للفواتير
ALTER TABLE invoices_in
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'ar'; -- 'ar', 'en', 'tr'

ALTER TABLE invoices_out
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'ar';

-- إضافة حقل language للتقارير
CREATE TABLE IF NOT EXISTS report_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    report_type TEXT NOT NULL,
    language TEXT DEFAULT 'ar',
    format TEXT DEFAULT 'pdf', -- 'pdf', 'excel'
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_settings_tenant ON report_settings(tenant_id, report_type);

-- ============================================
-- تأكيد نجاح التحديث
-- ============================================

SELECT 'تم تحديث قاعدة البيانات بنجاح! جميع الجداول والوظائف جاهزة.' as status;

