-- ============================================
-- تحديث شامل للنظام: الصندوق المالي، سجل التغييرات المحسن، معلومات المستخدم
-- ============================================
-- تاريخ الإنشاء: 2024
-- الوصف: يتضمن جميع التحديثات المطلوبة للنظام الحديث
-- ============================================

-- تفعيل الامتدادات المطلوبة
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================
-- القسم 1: جدول الصندوق المالي (Cash Register/Cash Flow)
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

-- جدول حركات الصندوق المالي
CREATE TABLE IF NOT EXISTS cash_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    cash_register_id UUID REFERENCES cash_register(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('income', 'expense', 'payroll', 'transfer', 'adjustment')),
    amount NUMERIC(15, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'TRY',
    description TEXT,
    reference_type TEXT, -- 'invoice_in', 'invoice_out', 'payroll', 'manual', etc.
    reference_id UUID, -- ID of the related invoice, payroll, etc.
    user_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    
    CONSTRAINT positive_amount CHECK (amount > 0)
);

-- إنشاء Indexes للصندوق المالي
CREATE INDEX IF NOT EXISTS idx_cash_register_tenant ON cash_register(tenant_id, currency);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_tenant ON cash_transactions(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_reference ON cash_transactions(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_type ON cash_transactions(tenant_id, transaction_type, created_at DESC);

-- ============================================
-- القسم 2: تحسين جدول audit_logs مع معلومات تفصيلية
-- ============================================

-- إضافة أعمدة جديدة لجدول audit_logs إذا لم تكن موجودة
ALTER TABLE audit_logs 
ADD COLUMN IF NOT EXISTS table_name TEXT,
ADD COLUMN IF NOT EXISTS record_id UUID,
ADD COLUMN IF NOT EXISTS action_type TEXT CHECK (action_type IN ('CREATE', 'UPDATE', 'DELETE', 'VIEW', 'EXPORT', 'LOGIN', 'LOGOUT')),
ADD COLUMN IF NOT EXISTS old_values JSONB,
ADD COLUMN IF NOT EXISTS new_values JSONB,
ADD COLUMN IF NOT EXISTS ip_address TEXT,
ADD COLUMN IF NOT EXISTS user_agent TEXT,
ADD COLUMN IF NOT EXISTS change_summary TEXT;

-- إنشاء Index محسن
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_user ON audit_logs(tenant_id, user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON audit_logs(tenant_id, action_type, created_at DESC);

-- ============================================
-- القسم 3: إضافة معلومات المستخدم في جميع الجداول
-- ============================================

-- تحديث جدول inventory_items
ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS last_modified_at TIMESTAMPTZ DEFAULT NOW();

-- تحديث جدول invoices_in
ALTER TABLE invoices_in 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS last_modified_at TIMESTAMPTZ DEFAULT NOW();

-- تحديث جدول invoices_out
ALTER TABLE invoices_out 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS last_modified_at TIMESTAMPTZ DEFAULT NOW();

-- تحديث جدول partners
ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS last_modified_at TIMESTAMPTZ DEFAULT NOW();

-- تحديث جدول employees
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS last_modified_at TIMESTAMPTZ DEFAULT NOW();

-- تحديث جدول payroll
ALTER TABLE payroll 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS last_modified_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS cash_register_id UUID REFERENCES cash_register(id);

-- ============================================
-- القسم 4: Functions لتحديث الصندوق المالي تلقائياً
-- ============================================

-- Function لتحديث رصيد الصندوق
CREATE OR REPLACE FUNCTION update_cash_balance(
    p_tenant_id UUID,
    p_currency TEXT,
    p_amount NUMERIC,
    p_type TEXT
) RETURNS UUID AS $$
DECLARE
    v_cash_register_id UUID;
    v_new_balance NUMERIC;
BEGIN
    -- البحث عن أو إنشاء صندوق مالي للمتجر والعملة
    SELECT id INTO v_cash_register_id
    FROM cash_register
    WHERE tenant_id = p_tenant_id AND currency = p_currency;
    
    IF v_cash_register_id IS NULL THEN
        INSERT INTO cash_register (tenant_id, currency, balance)
        VALUES (p_tenant_id, p_currency, 0)
        RETURNING id INTO v_cash_register_id;
    END IF;
    
    -- تحديث الرصيد حسب نوع الحركة
    IF p_type = 'income' OR p_type = 'transfer' THEN
        UPDATE cash_register
        SET balance = balance + p_amount,
            last_transaction_date = NOW(),
            updated_at = NOW()
        WHERE id = v_cash_register_id;
    ELSIF p_type = 'expense' OR p_type = 'payroll' THEN
        UPDATE cash_register
        SET balance = balance - p_amount,
            last_transaction_date = NOW(),
            updated_at = NOW()
        WHERE id = v_cash_register_id;
    END IF;
    
    RETURN v_cash_register_id;
END;
$$ LANGUAGE plpgsql;

-- Function لإنشاء حركة صندوق مالي
CREATE OR REPLACE FUNCTION create_cash_transaction(
    p_tenant_id UUID,
    p_currency TEXT,
    p_amount NUMERIC,
    p_type TEXT,
    p_description TEXT,
    p_reference_type TEXT DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_cash_register_id UUID;
    v_transaction_id UUID;
BEGIN
    -- تحديث الرصيد والحصول على ID الصندوق
    v_cash_register_id := update_cash_balance(p_tenant_id, p_currency, p_amount, p_type);
    
    -- إنشاء الحركة
    INSERT INTO cash_transactions (
        tenant_id, cash_register_id, transaction_type, amount, currency,
        description, reference_type, reference_id, user_id, created_by
    ) VALUES (
        p_tenant_id, v_cash_register_id, p_type, p_amount, p_currency,
        p_description, p_reference_type, p_reference_id, p_user_id, p_user_id
    ) RETURNING id INTO v_transaction_id;
    
    RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- القسم 5: Triggers لتحديث الصندوق المالي تلقائياً
-- ============================================

-- Trigger لتحديث الصندوق عند إنشاء/تحديث فاتورة واردة
CREATE OR REPLACE FUNCTION trigger_invoice_in_cash_update()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.amount != OLD.amount) THEN
        PERFORM create_cash_transaction(
            NEW.tenant_id,
            NEW.currency,
            NEW.amount,
            'expense',
            'فاتورة واردة: ' || COALESCE(NEW.description, ''),
            'invoice_in',
            NEW.id,
            NEW.created_by
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER invoice_in_cash_update_trigger
AFTER INSERT OR UPDATE OF amount, currency ON invoices_in
FOR EACH ROW
WHEN (NEW.amount > 0)
EXECUTE FUNCTION trigger_invoice_in_cash_update();

-- Trigger لتحديث الصندوق عند إنشاء/تحديث فاتورة صادرة
CREATE OR REPLACE FUNCTION trigger_invoice_out_cash_update()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.amount != OLD.amount) THEN
        PERFORM create_cash_transaction(
            NEW.tenant_id,
            NEW.currency,
            NEW.amount,
            'income',
            'فاتورة صادرة: ' || COALESCE(NEW.description, ''),
            'invoice_out',
            NEW.id,
            NEW.created_by
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER invoice_out_cash_update_trigger
AFTER INSERT OR UPDATE OF amount, currency ON invoices_out
FOR EACH ROW
WHEN (NEW.amount > 0)
EXECUTE FUNCTION trigger_invoice_out_cash_update();

-- Trigger لتحديث الصندوق عند تسليم راتب
CREATE OR REPLACE FUNCTION trigger_payroll_cash_update()
RETURNS TRIGGER AS $$
DECLARE
    v_cash_register_id UUID;
BEGIN
    -- عند تسليم الراتب (is_paid = true)
    IF NEW.is_paid = true AND (OLD.is_paid IS NULL OR OLD.is_paid = false) THEN
        v_cash_register_id := update_cash_balance(
            NEW.tenant_id,
            NEW.currency,
            NEW.net_salary,
            'payroll'
        );
        
        -- إنشاء حركة صندوق
        INSERT INTO cash_transactions (
            tenant_id, cash_register_id, transaction_type, amount, currency,
            description, reference_type, reference_id, user_id, created_by
        ) VALUES (
            NEW.tenant_id, v_cash_register_id, 'payroll', NEW.net_salary, NEW.currency,
            'راتب موظف: ' || NEW.employee_name,
            'payroll',
            NEW.id,
            NEW.created_by,
            NEW.created_by
        ) RETURNING id INTO NEW.cash_register_id;
        
        -- تحديث paid_at
        NEW.paid_at := NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payroll_cash_update_trigger
BEFORE INSERT OR UPDATE OF is_paid, net_salary ON payroll
FOR EACH ROW
EXECUTE FUNCTION trigger_payroll_cash_update();

-- ============================================
-- القسم 6: Triggers لتسجيل التغييرات في audit_logs
-- ============================================

-- Function عامة لتسجيل التغييرات
CREATE OR REPLACE FUNCTION log_audit_changes()
RETURNS TRIGGER AS $$
DECLARE
    v_action_type TEXT;
    v_old_values JSONB;
    v_new_values JSONB;
    v_change_summary TEXT;
BEGIN
    -- تحديد نوع العملية
    IF TG_OP = 'INSERT' THEN
        v_action_type := 'CREATE';
        v_new_values := to_jsonb(NEW);
        v_change_summary := 'تم إنشاء سجل جديد';
    ELSIF TG_OP = 'UPDATE' THEN
        v_action_type := 'UPDATE';
        v_old_values := to_jsonb(OLD);
        v_new_values := to_jsonb(NEW);
        v_change_summary := 'تم تحديث السجل';
    ELSIF TG_OP = 'DELETE' THEN
        v_action_type := 'DELETE';
        v_old_values := to_jsonb(OLD);
        v_change_summary := 'تم حذف السجل';
    END IF;
    
    -- تسجيل في audit_logs
    INSERT INTO audit_logs (
        tenant_id, user_id, action, action_type, table_name, record_id,
        old_values, new_values, change_summary, details
    ) VALUES (
        COALESCE(NEW.tenant_id, OLD.tenant_id),
        COALESCE(NEW.created_by, NEW.updated_by, OLD.created_by, OLD.updated_by),
        TG_OP || ' on ' || TG_TABLE_NAME,
        v_action_type,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        v_old_values,
        v_new_values,
        v_change_summary,
        jsonb_build_object('table', TG_TABLE_NAME, 'operation', TG_OP)
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- تطبيق Triggers على الجداول الرئيسية
DROP TRIGGER IF EXISTS audit_inventory_items_trigger ON inventory_items;
CREATE TRIGGER audit_inventory_items_trigger
AFTER INSERT OR UPDATE OR DELETE ON inventory_items
FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

DROP TRIGGER IF EXISTS audit_invoices_in_trigger ON invoices_in;
CREATE TRIGGER audit_invoices_in_trigger
AFTER INSERT OR UPDATE OR DELETE ON invoices_in
FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

DROP TRIGGER IF EXISTS audit_invoices_out_trigger ON invoices_out;
CREATE TRIGGER audit_invoices_out_trigger
AFTER INSERT OR UPDATE OR DELETE ON invoices_out
FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

DROP TRIGGER IF EXISTS audit_partners_trigger ON partners;
CREATE TRIGGER audit_partners_trigger
AFTER INSERT OR UPDATE OR DELETE ON partners
FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

DROP TRIGGER IF EXISTS audit_employees_trigger ON employees;
CREATE TRIGGER audit_employees_trigger
AFTER INSERT OR UPDATE OR DELETE ON employees
FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

DROP TRIGGER IF EXISTS audit_payroll_trigger ON payroll;
CREATE TRIGGER audit_payroll_trigger
AFTER INSERT OR UPDATE OR DELETE ON payroll
FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

-- ============================================
-- القسم 7: Views للإحصائيات والتقارير
-- ============================================

-- View لإجمالي الصندوق المالي لكل متجر
CREATE OR REPLACE VIEW cash_register_summary AS
SELECT 
    cr.tenant_id,
    t.name as tenant_name,
    cr.currency,
    cr.balance,
    cr.last_transaction_date,
    COUNT(ct.id) as transaction_count,
    SUM(CASE WHEN ct.transaction_type = 'income' THEN ct.amount ELSE 0 END) as total_income,
    SUM(CASE WHEN ct.transaction_type = 'expense' THEN ct.amount ELSE 0 END) as total_expenses
FROM cash_register cr
LEFT JOIN tenants t ON cr.tenant_id = t.id
LEFT JOIN cash_transactions ct ON cr.id = ct.cash_register_id
GROUP BY cr.id, cr.tenant_id, t.name, cr.currency, cr.balance, cr.last_transaction_date;

-- View لسجل التغييرات المحسن
CREATE OR REPLACE VIEW enhanced_audit_logs AS
SELECT 
    al.id,
    al.tenant_id,
    al.user_id,
    u.name as user_name,
    u.email as user_email,
    u.role as user_role,
    al.action,
    al.action_type,
    al.table_name,
    al.record_id,
    al.old_values,
    al.new_values,
    al.change_summary,
    al.details,
    al.created_at
FROM audit_logs al
LEFT JOIN users u ON al.user_id = u.id
ORDER BY al.created_at DESC;

-- ============================================
-- القسم 8: Function لتصدير بيانات المتجر (لصفحة Admin)
-- ============================================

CREATE OR REPLACE FUNCTION export_tenant_data(p_tenant_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'tenant', (SELECT row_to_json(t.*) FROM tenants t WHERE t.id = p_tenant_id),
        'users', (SELECT jsonb_agg(row_to_json(u.*)) FROM users u WHERE u.tenant_id = p_tenant_id),
        'invoices_in', (SELECT jsonb_agg(row_to_json(i.*)) FROM invoices_in i WHERE i.tenant_id = p_tenant_id),
        'invoices_out', (SELECT jsonb_agg(row_to_json(o.*)) FROM invoices_out o WHERE o.tenant_id = p_tenant_id),
        'inventory_items', (SELECT jsonb_agg(row_to_json(inv.*)) FROM inventory_items inv WHERE inv.tenant_id = p_tenant_id),
        'partners', (SELECT jsonb_agg(row_to_json(p.*)) FROM partners p WHERE p.tenant_id = p_tenant_id),
        'employees', (SELECT jsonb_agg(row_to_json(e.*)) FROM employees e WHERE e.tenant_id = p_tenant_id),
        'payroll', (SELECT jsonb_agg(row_to_json(pay.*)) FROM payroll pay WHERE pay.tenant_id = p_tenant_id),
        'cash_register', (SELECT jsonb_agg(row_to_json(cr.*)) FROM cash_register cr WHERE cr.tenant_id = p_tenant_id),
        'cash_transactions', (SELECT jsonb_agg(row_to_json(ct.*)) FROM cash_transactions ct WHERE ct.tenant_id = p_tenant_id),
        'export_date', NOW()
    ) INTO v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- القسم 9: تحديث جدول offline_queue لدعم Sync أفضل
-- ============================================

ALTER TABLE offline_queue
ADD COLUMN IF NOT EXISTS sync_attempts INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_sync_attempt TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS priority INT DEFAULT 0; -- 0=normal, 1=high

CREATE INDEX IF NOT EXISTS idx_offline_queue_priority ON offline_queue(tenant_id, priority DESC, created_at ASC);

-- ============================================
-- القسم 10: تحديث جدول notifications لدعم Sync Notifications
-- ============================================

ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS notification_data JSONB,
ADD COLUMN IF NOT EXISTS related_table TEXT,
ADD COLUMN IF NOT EXISTS related_id UUID;

-- ============================================
-- القسم 11: Function لتحديث last_modified_at تلقائياً
-- ============================================

CREATE OR REPLACE FUNCTION update_last_modified_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_modified_at = NOW();
    IF TG_OP = 'INSERT' THEN
        NEW.created_at = COALESCE(NEW.created_at, NOW());
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- تطبيق على الجداول
CREATE TRIGGER update_inventory_modified_at
BEFORE UPDATE ON inventory_items
FOR EACH ROW EXECUTE FUNCTION update_last_modified_at();

CREATE TRIGGER update_invoices_in_modified_at
BEFORE UPDATE ON invoices_in
FOR EACH ROW EXECUTE FUNCTION update_last_modified_at();

CREATE TRIGGER update_invoices_out_modified_at
BEFORE UPDATE ON invoices_out
FOR EACH ROW EXECUTE FUNCTION update_last_modified_at();

CREATE TRIGGER update_partners_modified_at
BEFORE UPDATE ON partners
FOR EACH ROW EXECUTE FUNCTION update_last_modified_at();

CREATE TRIGGER update_employees_modified_at
BEFORE UPDATE ON employees
FOR EACH ROW EXECUTE FUNCTION update_last_modified_at();

-- ============================================
-- تأكيد نجاح التحديث
-- ============================================

SELECT 'تم تحديث قاعدة البيانات بنجاح! النظام الآن يدعم الصندوق المالي، سجل التغييرات المحسن، ومعلومات المستخدم في جميع الجداول.' as status;

