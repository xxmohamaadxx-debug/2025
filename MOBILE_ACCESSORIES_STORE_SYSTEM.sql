-- ============================================
-- نظام متجر إكسسوارات الجوال - قاعدة البيانات
-- Mobile Accessories Store System Database
-- ============================================

-- ============================================
-- القسم 1: إنشاء جدول المنتجات
-- ============================================

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    sku TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL, -- شواحن، كفرات، سماعات، إلخ
    brand TEXT,
    specifications JSONB, -- المواصفات
    selling_price NUMERIC(15, 2) NOT NULL DEFAULT 0,
    cost_price NUMERIC(15, 2) NOT NULL DEFAULT 0,
    currency TEXT DEFAULT 'TRY',
    tax_rate NUMERIC(5, 2) DEFAULT 0, -- نسبة الضريبة
    discount_allowed NUMERIC(5, 2) DEFAULT 0, -- نسبة الخصم المسموح
    reorder_level INTEGER DEFAULT 0, -- حد إعادة الطلب
    shelf_location TEXT, -- الموقع على الرف
    images JSONB, -- صور المنتج
    availability_status TEXT DEFAULT 'available', -- available, out_of_stock, discontinued
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, sku)
);

-- ============================================
-- القسم 2: تحديث جدول inventory_items ليتوافق مع products
-- ============================================

-- إضافة relation بين inventory_items و products إذا لم تكن موجودة
ALTER TABLE inventory_items
ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS branch_id UUID, -- للفروع
ADD COLUMN IF NOT EXISTS expiry_date DATE; -- تاريخ الانتهاء (إن وجد)

-- ============================================
-- القسم 3: إنشاء جدول حركات المستودع
-- ============================================

CREATE TABLE IF NOT EXISTS inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    movement_number TEXT NOT NULL,
    movement_type TEXT NOT NULL, -- receive, transfer, inventory, return
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    branch_id UUID, -- الفرع
    vendor_id UUID REFERENCES partners(id) ON DELETE SET NULL, -- المورد
    from_branch_id UUID, -- للتحويلات
    to_branch_id UUID, -- للتحويلات
    responsible_user_id UUID REFERENCES users(id),
    total_cost NUMERIC(15, 2) DEFAULT 0,
    currency TEXT DEFAULT 'TRY',
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, movement_number)
);

-- ============================================
-- القسم 4: إنشاء جدول عناصر حركات المستودع
-- ============================================

CREATE TABLE IF NOT EXISTS inventory_movement_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    movement_id UUID NOT NULL REFERENCES inventory_movements(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE SET NULL,
    sku TEXT,
    name TEXT,
    quantity NUMERIC(10, 2) NOT NULL,
    unit_price NUMERIC(15, 2) DEFAULT 0,
    total_price NUMERIC(15, 2) DEFAULT 0,
    currency TEXT DEFAULT 'TRY',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- القسم 5: إنشاء جدول فواتير المبيعات
-- ============================================

CREATE TABLE IF NOT EXISTS sales_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    invoice_number TEXT NOT NULL,
    date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    customer_id UUID REFERENCES partners(id) ON DELETE SET NULL, -- العميل (اختياري)
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    tax_amount NUMERIC(15, 2) DEFAULT 0,
    discount_amount NUMERIC(15, 2) DEFAULT 0,
    final_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    paid_amount NUMERIC(15, 2) DEFAULT 0,
    remaining_amount NUMERIC(15, 2) DEFAULT 0,
    currency TEXT DEFAULT 'TRY',
    payment_method TEXT DEFAULT 'cash',
    is_credit BOOLEAN DEFAULT false,
    credit_amount NUMERIC(15, 2) DEFAULT 0,
    attachments JSONB, -- المرفقات
    cashier_id UUID REFERENCES users(id), -- المستخدم
    branch_id UUID,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, invoice_number)
);

-- ============================================
-- القسم 6: إنشاء جدول عناصر فواتير المبيعات
-- ============================================

CREATE TABLE IF NOT EXISTS sales_invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES sales_invoices(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE SET NULL,
    sku TEXT,
    name TEXT,
    quantity NUMERIC(10, 2) NOT NULL,
    unit_price NUMERIC(15, 2) NOT NULL,
    tax_rate NUMERIC(5, 2) DEFAULT 0,
    tax_amount NUMERIC(15, 2) DEFAULT 0,
    discount_rate NUMERIC(5, 2) DEFAULT 0,
    discount_amount NUMERIC(15, 2) DEFAULT 0,
    total_price NUMERIC(15, 2) NOT NULL,
    currency TEXT DEFAULT 'TRY',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- القسم 7: إنشاء جدول فواتير المشتريات
-- ============================================

CREATE TABLE IF NOT EXISTS purchase_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    invoice_number TEXT NOT NULL,
    vendor_id UUID NOT NULL REFERENCES partners(id) ON DELETE RESTRICT, -- المورد
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_terms TEXT, -- شروط الدفع
    subtotal NUMERIC(15, 2) DEFAULT 0,
    shipping_cost NUMERIC(15, 2) DEFAULT 0,
    tax_amount NUMERIC(15, 2) DEFAULT 0,
    discount_amount NUMERIC(15, 2) DEFAULT 0,
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    currency TEXT DEFAULT 'TRY',
    payment_method TEXT DEFAULT 'cash',
    is_credit BOOLEAN DEFAULT false,
    due_date DATE, -- تاريخ الاستحقاق
    status TEXT DEFAULT 'pending', -- pending, paid, partial, cancelled
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, invoice_number)
);

-- ============================================
-- القسم 8: إنشاء جدول عناصر فواتير المشتريات
-- ============================================

CREATE TABLE IF NOT EXISTS purchase_invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES purchase_invoices(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    sku TEXT,
    name TEXT,
    quantity NUMERIC(10, 2) NOT NULL,
    unit_cost NUMERIC(15, 2) NOT NULL,
    total_cost NUMERIC(15, 2) NOT NULL,
    currency TEXT DEFAULT 'TRY',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- القسم 9: إنشاء جدول الحزم مع خدمة الإنترنت
-- ============================================

CREATE TABLE IF NOT EXISTS product_bundles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- اسم الحزمة
    description TEXT,
    bundle_price NUMERIC(15, 2) NOT NULL DEFAULT 0,
    currency TEXT DEFAULT 'TRY',
    included_internet_hours NUMERIC(10, 2) DEFAULT 0, -- ساعات الإنترنت المرفقة
    subscription_type_id UUID REFERENCES subscription_types(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    valid_from DATE,
    valid_until DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, name)
);

-- ============================================
-- القسم 10: إنشاء جدول عناصر الحزم
-- ============================================

CREATE TABLE IF NOT EXISTS bundle_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bundle_id UUID NOT NULL REFERENCES product_bundles(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    quantity NUMERIC(10, 2) DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- القسم 11: إنشاء جدول المرتجعات
-- ============================================

CREATE TABLE IF NOT EXISTS returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    return_number TEXT NOT NULL,
    return_type TEXT NOT NULL, -- sales_return, purchase_return
    reference_invoice_id UUID, -- فاتورة المرجع
    reference_invoice_type TEXT, -- sales_invoice, purchase_invoice
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    customer_id UUID REFERENCES partners(id) ON DELETE SET NULL,
    vendor_id UUID REFERENCES partners(id) ON DELETE SET NULL,
    reason TEXT,
    total_amount NUMERIC(15, 2) DEFAULT 0,
    currency TEXT DEFAULT 'TRY',
    status TEXT DEFAULT 'pending', -- pending, approved, rejected, processed
    processed_by UUID REFERENCES users(id),
    processed_at TIMESTAMPTZ,
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, return_number)
);

-- ============================================
-- القسم 12: إنشاء جدول عناصر المرتجعات
-- ============================================

CREATE TABLE IF NOT EXISTS return_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_id UUID NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    quantity NUMERIC(10, 2) NOT NULL,
    unit_price NUMERIC(15, 2) DEFAULT 0,
    total_price NUMERIC(15, 2) DEFAULT 0,
    condition TEXT, -- new, used, damaged
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- القسم 13: إنشاء الفهارس
-- ============================================

CREATE INDEX IF NOT EXISTS idx_products_tenant ON products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(availability_status);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_tenant ON inventory_movements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_type ON inventory_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_date ON inventory_movements(date DESC);

CREATE INDEX IF NOT EXISTS idx_sales_invoices_tenant ON sales_invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_number ON sales_invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_date ON sales_invoices(date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_customer ON sales_invoices(customer_id);

CREATE INDEX IF NOT EXISTS idx_purchase_invoices_tenant ON purchase_invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_number ON purchase_invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_vendor ON purchase_invoices(vendor_id);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_date ON purchase_invoices(date DESC);

CREATE INDEX IF NOT EXISTS idx_product_bundles_tenant ON product_bundles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_product_bundles_active ON product_bundles(is_active);

CREATE INDEX IF NOT EXISTS idx_returns_tenant ON returns(tenant_id);
CREATE INDEX IF NOT EXISTS idx_returns_number ON returns(return_number);
CREATE INDEX IF NOT EXISTS idx_returns_date ON returns(date DESC);

-- ============================================
-- القسم 14: Functions لتحديث المخزون تلقائياً
-- ============================================

-- Function لتحديث المخزون عند بيع
CREATE OR REPLACE FUNCTION update_inventory_on_sale()
RETURNS TRIGGER AS $$
BEGIN
    -- تحديث كمية المنتج في المستودع
    IF NEW.quantity IS NOT NULL AND NEW.inventory_item_id IS NOT NULL THEN
        UPDATE inventory_items
        SET quantity = quantity - NEW.quantity,
            updated_at = NOW()
        WHERE id = NEW.inventory_item_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger لتحديث المخزون عند البيع
DROP TRIGGER IF EXISTS trigger_update_inventory_on_sale ON sales_invoice_items;
CREATE TRIGGER trigger_update_inventory_on_sale
    AFTER INSERT ON sales_invoice_items
    FOR EACH ROW
    EXECUTE FUNCTION update_inventory_on_sale();

-- Function لتحديث المخزون عند الشراء
CREATE OR REPLACE FUNCTION update_inventory_on_purchase()
RETURNS TRIGGER AS $$
BEGIN
    -- إضافة كمية المنتج للمستودع
    IF NEW.quantity IS NOT NULL AND NEW.product_id IS NOT NULL THEN
        INSERT INTO inventory_items (tenant_id, product_id, name, quantity, price, currency, created_at)
        SELECT 
            (SELECT tenant_id FROM purchase_invoices WHERE id = NEW.invoice_id),
            NEW.product_id,
            NEW.name,
            NEW.quantity,
            NEW.unit_cost,
            NEW.currency,
            NOW()
        ON CONFLICT (tenant_id, product_id) DO UPDATE SET
            quantity = inventory_items.quantity + NEW.quantity,
            updated_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger لتحديث المخزون عند الشراء
DROP TRIGGER IF EXISTS trigger_update_inventory_on_purchase ON purchase_invoice_items;
CREATE TRIGGER trigger_update_inventory_on_purchase
    AFTER INSERT ON purchase_invoice_items
    FOR EACH ROW
    EXECUTE FUNCTION update_inventory_on_purchase();

-- Function لتحديث المخزون عند المرتجع
CREATE OR REPLACE FUNCTION update_inventory_on_return()
RETURNS TRIGGER AS $$
DECLARE
    return_type_val TEXT;
BEGIN
    SELECT r.return_type INTO return_type_val
    FROM returns r
    WHERE r.id = NEW.return_id;
    
    IF return_type_val = 'sales_return' THEN
        -- مرتجع مبيعات - إضافة للمخزون
        IF NEW.product_id IS NOT NULL THEN
            UPDATE inventory_items
            SET quantity = quantity + NEW.quantity,
                updated_at = NOW()
            WHERE product_id = NEW.product_id;
        END IF;
    ELSIF return_type_val = 'purchase_return' THEN
        -- مرتجع مشتريات - خصم من المخزون
        IF NEW.product_id IS NOT NULL THEN
            UPDATE inventory_items
            SET quantity = quantity - NEW.quantity,
                updated_at = NOW()
            WHERE product_id = NEW.product_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger لتحديث المخزون عند المرتجع
DROP TRIGGER IF EXISTS trigger_update_inventory_on_return ON return_items;
CREATE TRIGGER trigger_update_inventory_on_return
    AFTER INSERT ON return_items
    FOR EACH ROW
    EXECUTE FUNCTION update_inventory_on_return();

-- Function للتحقق من الكمية قبل البيع
CREATE OR REPLACE FUNCTION check_quantity_before_sale()
RETURNS TRIGGER AS $$
DECLARE
    available_qty NUMERIC;
BEGIN
    SELECT COALESCE(quantity, 0) INTO available_qty
    FROM inventory_items
    WHERE id = NEW.inventory_item_id;
    
    IF available_qty < NEW.quantity THEN
        RAISE EXCEPTION 'الكمية المتاحة غير كافية. المتاح: %, المطلوب: %', available_qty, NEW.quantity;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger للتحقق من الكمية قبل البيع
DROP TRIGGER IF EXISTS trigger_check_quantity_before_sale ON sales_invoice_items;
CREATE TRIGGER trigger_check_quantity_before_sale
    BEFORE INSERT ON sales_invoice_items
    FOR EACH ROW
    EXECUTE FUNCTION check_quantity_before_sale();

-- ============================================
-- القسم 15: Views للتقارير
-- ============================================

-- View لأكثر المنتجات مبيعاً
CREATE OR REPLACE VIEW top_selling_products_view AS
SELECT 
    p.tenant_id,
    p.id as product_id,
    p.sku,
    p.name,
    p.category,
    p.brand,
    COALESCE(SUM(sii.quantity), 0) as total_sold_quantity,
    COALESCE(SUM(sii.total_price), 0) as total_revenue,
    COALESCE(SUM(sii.total_price) - SUM(sii.quantity * p.cost_price), 0) as total_profit,
    COALESCE(SUM(sii.total_price) - SUM(sii.quantity * p.cost_price), 0) / NULLIF(SUM(sii.total_price), 0) * 100 as profit_margin_percent
FROM products p
LEFT JOIN sales_invoice_items sii ON p.id = sii.product_id
LEFT JOIN sales_invoices si ON sii.invoice_id = si.id
GROUP BY p.tenant_id, p.id, p.sku, p.name, p.category, p.brand;

-- View لأعمار المخزون
CREATE OR REPLACE VIEW inventory_age_view AS
SELECT 
    ii.tenant_id,
    ii.id,
    p.sku,
    p.name,
    p.category,
    ii.quantity,
    ii.created_at as first_received_date,
    CURRENT_DATE - ii.created_at::DATE as days_in_stock,
    p.reorder_level,
    CASE 
        WHEN ii.quantity <= p.reorder_level THEN 'low_stock'
        WHEN CURRENT_DATE - ii.created_at::DATE > 90 THEN 'slow_moving'
        WHEN ii.expiry_date IS NOT NULL AND ii.expiry_date < CURRENT_DATE + 30 THEN 'expiring_soon'
        ELSE 'normal'
    END as status
FROM inventory_items ii
LEFT JOIN products p ON ii.product_id = p.id
WHERE ii.quantity > 0;

-- ============================================
-- القسم 16: Function لإنشاء حركة دائن/مدين من فاتورة بيع
-- ============================================

CREATE OR REPLACE FUNCTION create_credit_debit_from_sales_invoice()
RETURNS TRIGGER AS $$
BEGIN
    -- إذا كانت الفاتورة ذمة (credit)
    IF NEW.is_credit = true AND NEW.credit_amount > 0 AND NEW.customer_id IS NOT NULL THEN
        INSERT INTO credit_debit_transactions (
            tenant_id,
            partner_id,
            transaction_type,
            amount,
            currency,
            reference_type,
            reference_id,
            description,
            payment_method,
            due_date,
            is_paid,
            created_by
        ) VALUES (
            NEW.tenant_id,
            NEW.customer_id,
            'credit', -- دائن (دين لنا من العميل)
            NEW.credit_amount,
            NEW.currency,
            'sales_invoice',
            NEW.id,
            'فاتورة بيع رقم: ' || NEW.invoice_number,
            NEW.payment_method,
            CURRENT_DATE + INTERVAL '30 days', -- افتراضي 30 يوم
            false,
            NEW.cashier_id
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger لإنشاء حركة دائن/مدين من فاتورة بيع
DROP TRIGGER IF EXISTS trigger_create_credit_debit_from_sales ON sales_invoices;
CREATE TRIGGER trigger_create_credit_debit_from_sales
    AFTER INSERT OR UPDATE ON sales_invoices
    FOR EACH ROW
    WHEN (NEW.is_credit = true)
    EXECUTE FUNCTION create_credit_debit_from_sales_invoice();

-- Function لإنشاء حركة دائن/مدين من فاتورة شراء
CREATE OR REPLACE FUNCTION create_credit_debit_from_purchase_invoice()
RETURNS TRIGGER AS $$
BEGIN
    -- إذا كانت الفاتورة ذمة (credit)
    IF NEW.is_credit = true AND NEW.total_amount > 0 THEN
        INSERT INTO credit_debit_transactions (
            tenant_id,
            partner_id,
            transaction_type,
            amount,
            currency,
            reference_type,
            reference_id,
            description,
            payment_method,
            due_date,
            is_paid,
            created_by
        ) VALUES (
            NEW.tenant_id,
            NEW.vendor_id,
            'debit', -- مدين (دين علينا للمورد)
            NEW.total_amount,
            NEW.currency,
            'purchase_invoice',
            NEW.id,
            'فاتورة شراء رقم: ' || NEW.invoice_number,
            NEW.payment_method,
            NEW.due_date,
            false,
            NEW.created_by
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger لإنشاء حركة دائن/مدين من فاتورة شراء
DROP TRIGGER IF EXISTS trigger_create_credit_debit_from_purchase ON purchase_invoices;
CREATE TRIGGER trigger_create_credit_debit_from_purchase
    AFTER INSERT OR UPDATE ON purchase_invoices
    FOR EACH ROW
    WHEN (NEW.is_credit = true)
    EXECUTE FUNCTION create_credit_debit_from_purchase_invoice();

-- ============================================
-- القسم 17: Function لتسجيل جلسة الإنترنت من الحزمة
-- ============================================

CREATE OR REPLACE FUNCTION create_internet_session_from_bundle(
    bundle_id_uuid UUID,
    subscriber_id_uuid UUID,
    device_id_uuid UUID,
    tenant_id_uuid UUID,
    user_id_uuid UUID
)
RETURNS UUID AS $$
DECLARE
    bundle_record RECORD;
    session_id UUID;
    session_number TEXT;
BEGIN
    -- الحصول على بيانات الحزمة
    SELECT * INTO bundle_record
    FROM product_bundles
    WHERE id = bundle_id_uuid AND tenant_id = tenant_id_uuid;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'الحزمة غير موجودة';
    END IF;
    
    -- إنشاء رقم جلسة
    SELECT COUNT(*) + 1 INTO session_number
    FROM internet_sessions
    WHERE tenant_id = tenant_id_uuid AND DATE(created_at) = CURRENT_DATE;
    
    session_number := 'SES-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(session_number::TEXT, 4, '0');
    
    -- إنشاء الجلسة
    INSERT INTO internet_sessions (
        tenant_id,
        session_number,
        subscriber_id,
        device_id,
        start_time,
        price_per_hour,
        base_price,
        total_amount,
        currency,
        employee_id,
        created_at
    ) VALUES (
        tenant_id_uuid,
        session_number,
        subscriber_id_uuid,
        device_id_uuid,
        NOW(),
        bundle_record.bundle_price / NULLIF(bundle_record.included_internet_hours, 0),
        bundle_record.bundle_price,
        bundle_record.bundle_price,
        bundle_record.currency,
        user_id_uuid,
        NOW()
    ) RETURNING id INTO session_id;
    
    RETURN session_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- تأكيد نجاح التحديث
-- ============================================

SELECT '✅ تم إنشاء نظام متجر إكسسوارات الجوال بنجاح!' as status;

