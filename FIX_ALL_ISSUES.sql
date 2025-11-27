-- ============================================
-- إصلاح جميع المشاكل المتبقية
-- ============================================

-- ========== 1. إنشاء current_fuel_inventory view (اسم صحيح) ==========
DROP VIEW IF EXISTS current_fuel_inventory CASCADE;
CREATE OR REPLACE VIEW current_fuel_inventory AS
SELECT 
    ft.tenant_id,
    ft.fuel_type_id,
    ftp.name_ar as fuel_name,
    ftp.name_en as fuel_name_en,
    ftp.code as fuel_code,
    ftp.unit,
    ftp.min_stock_level,
    COALESCE(
        SUM(CASE 
            WHEN ft.transaction_type = 'purchase' THEN ft.quantity
            WHEN ft.transaction_type = 'sale' THEN -ft.quantity
            WHEN ft.transaction_type = 'adjustment' THEN ft.quantity
            WHEN ft.transaction_type = 'loss' THEN -ft.quantity
            ELSE 0
        END), 
        0
    ) as quantity,
    CASE 
        WHEN COALESCE(
            SUM(CASE 
                WHEN ft.transaction_type = 'purchase' THEN ft.quantity
                WHEN ft.transaction_type = 'sale' THEN -ft.quantity
                WHEN ft.transaction_type = 'adjustment' THEN ft.quantity
                WHEN ft.transaction_type = 'loss' THEN -ft.quantity
                ELSE 0
            END), 
            0
        ) <= ftp.min_stock_level THEN 'low_stock'
        WHEN COALESCE(
            SUM(CASE 
                WHEN ft.transaction_type = 'purchase' THEN ft.quantity
                WHEN ft.transaction_type = 'sale' THEN -ft.quantity
                WHEN ft.transaction_type = 'adjustment' THEN ft.quantity
                WHEN ft.transaction_type = 'loss' THEN -ft.quantity
                ELSE 0
            END), 
            0
        ) >= (ftp.min_stock_level * 3) THEN 'high_stock'
        ELSE 'normal'
    END as stock_status,
    MAX(CASE WHEN ft.transaction_type = 'purchase' THEN ft.transaction_date END) as last_purchase_date,
    MAX(CASE WHEN ft.transaction_type = 'sale' THEN ft.transaction_date END) as last_sale_date
FROM fuel_types ftp
LEFT JOIN fuel_transactions ft ON ft.fuel_type_id = ftp.id AND ftp.tenant_id = ft.tenant_id
WHERE ftp.is_active = true
GROUP BY ft.tenant_id, ft.fuel_type_id, ftp.id, ftp.name_ar, ftp.name_en, ftp.code, ftp.unit, ftp.min_stock_level;

-- ========== 2. إنشاء debts_report_view ==========
DROP VIEW IF EXISTS debts_report_view CASCADE;
CREATE OR REPLACE VIEW debts_report_view AS
SELECT 
    d.tenant_id,
    d.id as debt_id,
    d.entity_type, -- 'customer', 'supplier', 'employee'
    d.entity_id,
    CASE 
        WHEN d.entity_type = 'customer' THEN p.name
        WHEN d.entity_type = 'supplier' THEN p.name
        WHEN d.entity_type = 'employee' THEN e.name
        ELSE 'غير محدد'
    END as entity_name,
    d.amount as original_amount,
    d.amount - COALESCE(SUM(pay.amount), 0) as remaining_amount,
    COALESCE(SUM(pay.amount), 0) as paid_amount,
    d.status,
    d.created_at,
    d.due_date,
    CASE 
        WHEN d.amount - COALESCE(SUM(pay.amount), 0) <= 0 THEN 'paid'
        WHEN d.due_date < CURRENT_DATE AND d.amount - COALESCE(SUM(pay.amount), 0) > 0 THEN 'overdue'
        ELSE 'pending'
    END as payment_status
FROM debts d
LEFT JOIN payments pay ON pay.debt_id = d.id
LEFT JOIN partners p ON (d.entity_type IN ('customer', 'supplier') AND p.id = d.entity_id)
LEFT JOIN employees e ON (d.entity_type = 'employee' AND e.id = d.entity_id)
GROUP BY d.id, d.tenant_id, d.entity_type, d.entity_id, d.amount, d.status, d.created_at, d.due_date, p.name, e.name;

-- ========== 3. إنشاء جدول support_tickets إذا لم يكن موجوداً ==========
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    admin_response TEXT,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_support_tickets_tenant_id ON support_tickets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);

-- RLS Policy
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS support_tickets_tenant_isolation_policy ON support_tickets;
CREATE POLICY support_tickets_tenant_isolation_policy ON support_tickets
    USING (tenant_id = (SELECT tenant_id FROM users WHERE id = current_setting('app.user_id', TRUE)::UUID))
    WITH CHECK (tenant_id = (SELECT tenant_id FROM users WHERE id = current_setting('app.user_id', TRUE)::UUID));

-- Allow super admin to see all tickets
DROP POLICY IF EXISTS support_tickets_super_admin_policy ON support_tickets;
CREATE POLICY support_tickets_super_admin_policy ON support_tickets
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = current_setting('app.user_id', TRUE)::UUID 
            AND role = 'Super Admin'
        )
    );

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_support_tickets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_support_tickets_updated_at ON support_tickets;
CREATE TRIGGER trigger_update_support_tickets_updated_at
    BEFORE UPDATE ON support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_support_tickets_updated_at();

-- ========== 4. تحديث العملة الافتراضية في الجداول ==========
-- تحديث العملة الافتراضية من TRY إلى USD في الجداول الرئيسية
ALTER TABLE invoices_in ALTER COLUMN currency SET DEFAULT 'USD';
ALTER TABLE invoices_out ALTER COLUMN currency SET DEFAULT 'USD';
ALTER TABLE inventory_items ALTER COLUMN currency SET DEFAULT 'USD';
ALTER TABLE employees ALTER COLUMN currency SET DEFAULT 'USD';
ALTER TABLE partners ALTER COLUMN currency SET DEFAULT 'USD';
ALTER TABLE products ALTER COLUMN currency SET DEFAULT 'USD';
ALTER TABLE sales_invoices ALTER COLUMN currency SET DEFAULT 'USD';
ALTER TABLE purchase_invoices ALTER COLUMN currency SET DEFAULT 'USD';
ALTER TABLE daily_expenses ALTER COLUMN currency SET DEFAULT 'USD';
ALTER TABLE fuel_transactions ALTER COLUMN currency SET DEFAULT 'USD';
ALTER TABLE fuel_daily_prices ALTER COLUMN currency SET DEFAULT 'USD';

-- ========== 5. إضافة عملات إضافية (إذا لم تكن موجودة في constants) ==========
-- العملات موجودة في constants.js: TRY, USD, SYP, SAR, EUR

-- ========== 6. تحديث دالة get_fuel_inventory لاستخدام current_fuel_inventory ==========
CREATE OR REPLACE FUNCTION get_fuel_inventory(p_tenant_id UUID)
RETURNS TABLE(
    tenant_id UUID,
    fuel_type_id UUID,
    fuel_name TEXT,
    fuel_name_en TEXT,
    fuel_code TEXT,
    unit TEXT,
    min_stock_level DECIMAL,
    quantity DECIMAL,
    stock_status TEXT,
    last_purchase_date DATE,
    last_sale_date DATE
) AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM current_fuel_inventory
    WHERE current_fuel_inventory.tenant_id = p_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

