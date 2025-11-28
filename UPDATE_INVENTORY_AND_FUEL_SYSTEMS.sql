-- ============================================
-- تحديث شامل لنظام المخزون والحروقات
-- ============================================

-- ============================================
-- 1. تحديث جدول المنتجات (inventory_items)
-- ============================================
ALTER TABLE inventory_items
ADD COLUMN IF NOT EXISTS product_code TEXT UNIQUE, -- رمز المنتج (اختياري)
ADD COLUMN IF NOT EXISTS category TEXT, -- الفئة/القسم
ADD COLUMN IF NOT EXISTS changes_history JSONB DEFAULT '[]'::jsonb; -- سجل التغييرات

CREATE INDEX IF NOT EXISTS idx_inventory_items_code ON inventory_items(product_code);
CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON inventory_items(category);

-- ============================================
-- 2. تحديث جدول الفواتير الصادرة
-- ============================================
ALTER TABLE invoices_out
ADD COLUMN IF NOT EXISTS category TEXT, -- الفئة/القسم
ADD COLUMN IF NOT EXISTS changes_history JSONB DEFAULT '[]'::jsonb; -- سجل التغييرات

CREATE INDEX IF NOT EXISTS idx_invoices_out_category_date ON invoices_out(category, date DESC);

-- ============================================
-- 3. تحديث جدول المشتريات
-- ============================================
ALTER TABLE invoices_in
ADD COLUMN IF NOT EXISTS category TEXT, -- الفئة/القسم
ADD COLUMN IF NOT EXISTS changes_history JSONB DEFAULT '[]'::jsonb; -- سجل التغييرات

CREATE INDEX IF NOT EXISTS idx_invoices_in_category_date ON invoices_in(category, date DESC);

-- ============================================
-- 4. إنشاء جدول تنبيهات المخزون المتقدم
-- ============================================
CREATE TABLE IF NOT EXISTS inventory_low_stock_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE NOT NULL,
    alert_threshold NUMERIC(10, 2) NOT NULL, -- الحد الأدنى للتنبيه
    is_active BOOLEAN DEFAULT true,
    alert_enabled_date TIMESTAMPTZ DEFAULT NOW(),
    last_alert_sent TIMESTAMPTZ,
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, inventory_item_id)
);

CREATE INDEX IF NOT EXISTS idx_low_stock_alerts_tenant ON inventory_low_stock_alerts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_low_stock_alerts_active ON inventory_low_stock_alerts(is_active);
CREATE INDEX IF NOT EXISTS idx_low_stock_alerts_item ON inventory_low_stock_alerts(inventory_item_id);

-- ============================================
-- 5. إنشاء جدول عدادات المحروقات
-- مرتبط بالمتاجر التي تدعم المحروقات فقط
-- ============================================
CREATE TABLE IF NOT EXISTS fuel_counters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    counter_name TEXT NOT NULL, -- اسم العداد (قابل للتخصيص من قبل المتجر)
    counter_number INT NOT NULL, -- رقم العداد (1-6)
    selling_price_per_liter NUMERIC(10, 4) NOT NULL DEFAULT 0, -- سعر البيع للتر
    current_reading NUMERIC(12, 3) NOT NULL DEFAULT 0, -- القراءة الحالية
    initial_reading NUMERIC(12, 3) NOT NULL DEFAULT 0, -- القراءة الأولية
    total_sold NUMERIC(12, 3) NOT NULL DEFAULT 0, -- إجمالي المباع
    is_active BOOLEAN DEFAULT true,
    counter_unit TEXT DEFAULT 'liter', -- وحدة العداد
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, counter_number),
    -- التحقق من أن المتجر يدعم المحروقات
    CONSTRAINT fuel_counter_store_type_check CHECK (
        EXISTS (
            SELECT 1 FROM tenants t
            JOIN store_types st ON t.store_type = st.code
            WHERE t.id = tenant_id
            AND (st.code ILIKE '%fuel%' OR st.features @> '{"fuel_management": true}'::jsonb)
        )
    )
);

CREATE INDEX IF NOT EXISTS idx_fuel_counters_tenant ON fuel_counters(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fuel_counters_active ON fuel_counters(is_active);
CREATE INDEX IF NOT EXISTS idx_fuel_counters_number ON fuel_counters(tenant_id, counter_number);

-- ============================================
-- 6. إنشاء جدول حركات عدادات المحروقات
-- ============================================
CREATE TABLE IF NOT EXISTS fuel_counter_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    fuel_counter_id UUID REFERENCES fuel_counters(id) ON DELETE CASCADE NOT NULL,
    movement_type TEXT NOT NULL CHECK (movement_type IN ('sale', 'adjustment', 'initial_read')), -- نوع الحركة
    reading_before NUMERIC(12, 3) NOT NULL, -- القراءة قبل
    reading_after NUMERIC(12, 3) NOT NULL, -- القراءة بعد
    quantity_sold NUMERIC(12, 3) NOT NULL, -- الكمية المباعة
    price_per_liter NUMERIC(10, 4) NOT NULL, -- سعر البيع للتر
    total_amount NUMERIC(12, 2) NOT NULL, -- المبلغ الإجمالي (كمية * سعر)
    related_invoice_id UUID REFERENCES invoices_out(id) ON DELETE SET NULL, -- الفاتورة المرتبطة
    related_daily_transaction_id UUID, -- حركة يومية مرتبطة
    notes TEXT,
    recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fuel_movements_tenant ON fuel_counter_movements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fuel_movements_counter ON fuel_counter_movements(fuel_counter_id);
CREATE INDEX IF NOT EXISTS idx_fuel_movements_type ON fuel_counter_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_fuel_movements_date ON fuel_counter_movements(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_fuel_movements_invoice ON fuel_counter_movements(related_invoice_id);

-- ============================================
-- 7. إنشاء جدول السجلات اليومية للمحروقات
-- ============================================
CREATE TABLE IF NOT EXISTS fuel_daily_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    fuel_counter_id UUID REFERENCES fuel_counters(id) ON DELETE CASCADE NOT NULL,
    log_date DATE NOT NULL,
    opening_reading NUMERIC(12, 3) NOT NULL, -- القراءة الافتتاحية
    closing_reading NUMERIC(12, 3) NOT NULL, -- القراءة الختامية
    quantity_sold NUMERIC(12, 3) NOT NULL, -- الكمية المباعة في اليوم
    total_sales_amount NUMERIC(12, 2) NOT NULL DEFAULT 0, -- إجمالي المبيعات
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fuel_daily_log_tenant ON fuel_daily_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fuel_daily_log_counter ON fuel_daily_log(fuel_counter_id);
CREATE INDEX IF NOT EXISTS idx_fuel_daily_log_date ON fuel_daily_log(log_date DESC);

-- ============================================
-- 8. إنشاء دالة لتسجيل التغييرات في المخزون
-- ============================================
CREATE OR REPLACE FUNCTION track_inventory_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- تسجيل التغييرات في JSONB
    NEW.changes_history = COALESCE(NEW.changes_history, '[]'::jsonb) || jsonb_build_array(
        jsonb_build_object(
            'timestamp', NOW(),
            'changed_by', current_setting('app.user_id', true),
            'old_quantity', OLD.quantity,
            'new_quantity', NEW.quantity,
            'quantity_change', NEW.quantity - COALESCE(OLD.quantity, 0),
            'action', 'quantity_update'
        )
    );
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_track_inventory_changes ON inventory_items;
CREATE TRIGGER trigger_track_inventory_changes
    BEFORE UPDATE ON inventory_items
    FOR EACH ROW
    WHEN (OLD.quantity IS DISTINCT FROM NEW.quantity)
    EXECUTE FUNCTION track_inventory_changes();

-- ============================================
-- 9. إنشاء دالة لتسجيل التغييرات في الفواتير
-- ============================================
CREATE OR REPLACE FUNCTION track_invoice_changes()
RETURNS TRIGGER AS $$
BEGIN
    NEW.changes_history = COALESCE(NEW.changes_history, '[]'::jsonb) || jsonb_build_array(
        jsonb_build_object(
            'timestamp', NOW(),
            'changed_by', current_setting('app.user_id', true),
            'change_type', TG_ARGV[0]::text,
            'changes', jsonb_object_agg(key, value)
        )
    );
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_track_invoice_out_changes ON invoices_out;
CREATE TRIGGER trigger_track_invoice_out_changes
    BEFORE UPDATE ON invoices_out
    FOR EACH ROW
    EXECUTE FUNCTION track_invoice_changes('invoice_out');

DROP TRIGGER IF EXISTS trigger_track_invoice_in_changes ON invoices_in;
CREATE TRIGGER trigger_track_invoice_in_changes
    BEFORE UPDATE ON invoices_in
    FOR EACH ROW
    EXECUTE FUNCTION track_invoice_changes('invoice_in');

-- ============================================
-- 10. دالة لخصم المخزون تلقائياً عند التصدير
-- ============================================
CREATE OR REPLACE FUNCTION auto_deduct_inventory_on_export()
RETURNS TRIGGER AS $$
DECLARE
    v_inventory_id UUID;
    v_current_quantity NUMERIC;
BEGIN
    -- الحصول على معرف المخزون من الفاتورة
    IF TG_TABLE_NAME = 'invoices_out' THEN
        -- تحديث كل عناصر الفاتورة
        FOR v_inventory_id IN
            SELECT DISTINCT inventory_item_id 
            FROM invoices_out_items 
            WHERE invoice_id = NEW.id
        LOOP
            UPDATE inventory_items
            SET quantity = quantity - (
                SELECT COALESCE(SUM(quantity), 0)
                FROM invoices_out_items
                WHERE invoice_id = NEW.id AND inventory_item_id = v_inventory_id
            ),
            updated_at = NOW()
            WHERE id = v_inventory_id;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_deduct_inventory ON invoices_out;
CREATE TRIGGER trigger_auto_deduct_inventory
    AFTER INSERT ON invoices_out
    FOR EACH ROW
    EXECUTE FUNCTION auto_deduct_inventory_on_export();

-- ============================================
-- 11. دالة للتحقق من التنبيهات المنخفضة
-- ============================================
CREATE OR REPLACE FUNCTION check_low_stock_alerts()
RETURNS TABLE(
    alert_id UUID,
    tenant_id UUID,
    inventory_item_id UUID,
    item_name TEXT,
    current_quantity NUMERIC,
    alert_threshold NUMERIC,
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ila.id,
        ila.tenant_id,
        ila.inventory_item_id,
        ii.name,
        ii.quantity,
        ila.alert_threshold,
        CASE 
            WHEN ii.quantity <= ila.alert_threshold THEN 'ALERT'
            WHEN ii.quantity <= (ila.alert_threshold * 1.5) THEN 'WARNING'
            ELSE 'OK'
        END as status
    FROM inventory_low_stock_alerts ila
    JOIN inventory_items ii ON ila.inventory_item_id = ii.id
    WHERE ila.is_active = true
    ORDER BY ii.quantity ASC;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 12. دالة لحساب عدادات الحروقات تلقائياً
-- ============================================
CREATE OR REPLACE FUNCTION calculate_fuel_counter_totals(
    p_counter_id UUID
)
RETURNS TABLE(
    total_sold NUMERIC,
    current_reading NUMERIC,
    remaining_calculated NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(SUM(fcm.quantity_sold), 0)::NUMERIC,
        fc.current_reading,
        fc.initial_reading - COALESCE(SUM(fcm.quantity_sold), 0)::NUMERIC
    FROM fuel_counters fc
    LEFT JOIN fuel_counter_movements fcm ON fc.id = fcm.fuel_counter_id
    WHERE fc.id = p_counter_id
    GROUP BY fc.id, fc.current_reading, fc.initial_reading;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 13. دالة لتسجيل حركات عدادات الحروقات
-- ============================================
CREATE OR REPLACE FUNCTION record_fuel_counter_movement(
    p_tenant_id UUID,
    p_counter_id UUID,
    p_reading_after NUMERIC,
    p_price_per_liter NUMERIC,
    p_invoice_id UUID DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_counter fuel_counters%ROWTYPE;
    v_quantity_sold NUMERIC;
    v_total_amount NUMERIC;
    v_movement_id UUID;
BEGIN
    -- الحصول على بيانات العداد
    SELECT * INTO v_counter FROM fuel_counters
    WHERE id = p_counter_id AND tenant_id = p_tenant_id;
    
    IF v_counter.id IS NULL THEN
        RAISE EXCEPTION 'العداد غير موجود';
    END IF;
    
    -- حساب الكمية المباعة
    v_quantity_sold := v_counter.current_reading - p_reading_after;
    
    IF v_quantity_sold < 0 THEN
        RAISE EXCEPTION 'القراءة الجديدة يجب أن تكون أقل من القراءة الحالية';
    END IF;
    
    v_total_amount := v_quantity_sold * p_price_per_liter;
    
    -- تسجيل الحركة
    INSERT INTO fuel_counter_movements (
        tenant_id, fuel_counter_id, movement_type, reading_before,
        reading_after, quantity_sold, price_per_liter, total_amount,
        related_invoice_id, notes, recorded_by
    ) VALUES (
        p_tenant_id, p_counter_id, 'sale', v_counter.current_reading,
        p_reading_after, v_quantity_sold, p_price_per_liter, v_total_amount,
        p_invoice_id, p_notes, current_setting('app.user_id', true)::UUID
    ) RETURNING id INTO v_movement_id;
    
    -- تحديث العداد
    UPDATE fuel_counters
    SET current_reading = p_reading_after,
        total_sold = total_sold + v_quantity_sold,
        updated_at = NOW()
    WHERE id = p_counter_id;
    
    RETURN v_movement_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 14. دالة لإنشاء سجل يومي للحروقات
-- ============================================
CREATE OR REPLACE FUNCTION create_daily_fuel_log(
    p_tenant_id UUID,
    p_counter_id UUID,
    p_log_date DATE
)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
    v_opening_reading NUMERIC;
    v_closing_reading NUMERIC;
    v_total_sold NUMERIC;
    v_total_sales NUMERIC;
BEGIN
    -- الحصول على أول قراءة في اليوم (opening reading)
    SELECT current_reading INTO v_opening_reading
    FROM fuel_counter_movements
    WHERE fuel_counter_id = p_counter_id 
        AND DATE(recorded_at) = p_log_date
    ORDER BY recorded_at ASC
    LIMIT 1;
    
    -- إذا لم توجد حركة في اليوم، نستخدم القراءة السابقة
    IF v_opening_reading IS NULL THEN
        SELECT current_reading INTO v_opening_reading
        FROM fuel_counter_movements
        WHERE fuel_counter_id = p_counter_id
            AND DATE(recorded_at) < p_log_date
        ORDER BY recorded_at DESC
        LIMIT 1;
    END IF;
    
    -- الحصول على آخر قراءة في اليوم (closing reading)
    SELECT reading_after INTO v_closing_reading
    FROM fuel_counter_movements
    WHERE fuel_counter_id = p_counter_id
        AND DATE(recorded_at) = p_log_date
    ORDER BY recorded_at DESC
    LIMIT 1;
    
    -- إذا لم توجد قراءة ختامية، نستخدم القراءة الحالية
    IF v_closing_reading IS NULL THEN
        SELECT current_reading INTO v_closing_reading
        FROM fuel_counters WHERE id = p_counter_id;
    END IF;
    
    -- حساب الكمية المباعة
    v_total_sold := COALESCE(v_opening_reading, 0) - COALESCE(v_closing_reading, 0);
    
    -- حساب إجمالي المبيعات
    SELECT COALESCE(SUM(total_amount), 0) INTO v_total_sales
    FROM fuel_counter_movements
    WHERE fuel_counter_id = p_counter_id
        AND DATE(recorded_at) = p_log_date;
    
    -- إنشاء السجل اليومي
    INSERT INTO fuel_daily_log (
        tenant_id, fuel_counter_id, log_date, opening_reading,
        closing_reading, quantity_sold, total_sales_amount, created_by
    ) VALUES (
        p_tenant_id, p_counter_id, p_log_date,
        COALESCE(v_opening_reading, 0),
        COALESCE(v_closing_reading, 0),
        v_total_sold,
        v_total_sales,
        current_setting('app.user_id', true)::UUID
    ) RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 15. دالة للتحقق من دعم المتجر للمحروقات
-- ============================================
CREATE OR REPLACE FUNCTION check_store_supports_fuel(p_tenant_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_has_fuel BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM tenants t
        JOIN store_types st ON t.store_type = st.code
        WHERE t.id = p_tenant_id
        AND (st.code ILIKE '%fuel%' 
             OR st.features @> '{"fuel_management": true}'::jsonb)
    ) INTO v_has_fuel;
    
    RETURN COALESCE(v_has_fuel, false);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 16. تعليقات على الجداول والأعمدة
-- ============================================
COMMENT ON TABLE inventory_low_stock_alerts IS 'إدارة تنبيهات المخزون المنخفض بحسب متطلبات كل متجر';
COMMENT ON COLUMN inventory_low_stock_alerts.alert_threshold IS 'الحد الأدنى لتفعيل التنبيه';
COMMENT ON TABLE fuel_counters IS 'إدارة عدادات المحروقات القابلة للتخصيص (عادة 6 عدادات) - متاح فقط للمتاجر التي تدعم المحروقات';
COMMENT ON COLUMN fuel_counters.counter_name IS 'اسم العداد يحدده المتجر (مثل: البنزين 95، البنزين 98، الديزل إلخ)';
COMMENT ON COLUMN fuel_counters.selling_price_per_liter IS 'سعر البيع للتر الواحد';
COMMENT ON TABLE fuel_counter_movements IS 'سجل حركات عدادات المحروقات (بيع، تعديل، قراءة أولية)';
COMMENT ON TABLE fuel_daily_log IS 'السجل اليومي لعدادات المحروقات';
COMMENT ON FUNCTION check_store_supports_fuel IS 'تحقق من ما إذا كان المتجر يدعم نظام المحروقات';

-- ============================================
-- اكتمل التحديث بنجاح
-- ============================================
