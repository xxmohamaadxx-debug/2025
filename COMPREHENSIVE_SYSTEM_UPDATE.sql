-- ============================================
-- ملف SQL شامل لتحديث النظام المحاسبي - جميع التحسينات المطلوبة
-- تاريخ التحديث: 2025
-- قم بتشغيل هذا الملف في Neon SQL Editor
-- ============================================

-- التحقق من وجود Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- القسم 1: ربط صلاحيات المستخدمين بمدة صلاحية المتجر
-- ============================================

-- إضافة حقل subscription_expires_at للتحقق من صلاحية الحساب
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS account_expires_at TIMESTAMPTZ;

-- Function للتحقق من صلاحية حساب المستخدم بناءً على صلاحية المتجر
CREATE OR REPLACE FUNCTION check_user_account_validity()
RETURNS TRIGGER AS $$
DECLARE
    tenant_expires_at TIMESTAMPTZ;
BEGIN
    -- إذا كان للمستخدم tenant_id، ربطه بصلاحية المتجر
    IF NEW.tenant_id IS NOT NULL THEN
        SELECT subscription_expires_at INTO tenant_expires_at
        FROM tenants
        WHERE id = NEW.tenant_id;
        
        -- ربط صلاحية الحساب بصلاحية المتجر
        IF tenant_expires_at IS NOT NULL THEN
            NEW.account_expires_at = tenant_expires_at;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_check_user_account_validity ON users;
CREATE TRIGGER trigger_check_user_account_validity
    BEFORE INSERT OR UPDATE ON users
    FOR EACH ROW
    WHEN (NEW.tenant_id IS NOT NULL)
    EXECUTE FUNCTION check_user_account_validity();

-- Function لتحديث صلاحيات جميع مستخدمي المتجر عند تحديث صلاحية المتجر
CREATE OR REPLACE FUNCTION update_users_expiry_on_tenant_update()
RETURNS TRIGGER AS $$
BEGIN
    -- تحديث صلاحيات جميع مستخدمي المتجر
    IF NEW.subscription_expires_at IS DISTINCT FROM OLD.subscription_expires_at THEN
        UPDATE users
        SET account_expires_at = NEW.subscription_expires_at,
            updated_at = NOW()
        WHERE tenant_id = NEW.id
            AND (account_expires_at IS NULL OR account_expires_at != NEW.subscription_expires_at);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_users_expiry_on_tenant_update ON tenants;
CREATE TRIGGER trigger_update_users_expiry_on_tenant_update
    AFTER UPDATE OF subscription_expires_at ON tenants
    FOR EACH ROW
    WHEN (NEW.subscription_expires_at IS DISTINCT FROM OLD.subscription_expires_at)
    EXECUTE FUNCTION update_users_expiry_on_tenant_update();

-- ============================================
-- القسم 2: التكامل التلقائي للمستودع (تحسين Triggers الموجودة)
-- ============================================

-- تحسين Function لتحديث المستودع من الفاتورة (الوارد يضيف، الصادر ينقص)
CREATE OR REPLACE FUNCTION update_inventory_from_invoice()
RETURNS TRIGGER AS $$
DECLARE
    item_record RECORD;
    current_quantity NUMERIC;
BEGIN
    IF NEW.inventory_item_id IS NOT NULL THEN
        -- التأكد من أن العنصر ينتمي لنفس المتجر
        SELECT * INTO item_record 
        FROM inventory_items 
        WHERE id = NEW.inventory_item_id 
            AND tenant_id = NEW.tenant_id;
        
        IF FOUND THEN
            -- الوارد يضيف للمستودع
            IF NEW.invoice_type = 'invoice_in' THEN
                UPDATE inventory_items 
                SET quantity = quantity + NEW.quantity,
                    updated_at = NOW()
                WHERE id = NEW.inventory_item_id
                    AND tenant_id = NEW.tenant_id;
                    
                -- تسجيل العملية في inventory_transactions
                INSERT INTO inventory_transactions (
                    tenant_id, inventory_item_id, transaction_type, quantity, unit,
                    related_invoice_id, related_invoice_type, invoice_item_id, notes, created_by
                ) VALUES (
                    NEW.tenant_id, NEW.inventory_item_id, 'in', NEW.quantity, NEW.unit,
                    NEW.invoice_id, NEW.invoice_type, NEW.id, 'إضافة من فاتورة وارد', NEW.created_by
                );
            -- الصادر ينقص من المستودع
            ELSEIF NEW.invoice_type = 'invoice_out' THEN
                SELECT quantity INTO current_quantity 
                FROM inventory_items 
                WHERE id = NEW.inventory_item_id
                    AND tenant_id = NEW.tenant_id;
                    
                -- التحقق من توفر الكمية
                IF current_quantity >= NEW.quantity THEN
                    UPDATE inventory_items 
                    SET quantity = GREATEST(0, quantity - NEW.quantity),
                        updated_at = NOW()
                    WHERE id = NEW.inventory_item_id
                        AND tenant_id = NEW.tenant_id;
                        
                    -- تسجيل العملية
                    INSERT INTO inventory_transactions (
                        tenant_id, inventory_item_id, transaction_type, quantity, unit,
                        related_invoice_id, related_invoice_type, invoice_item_id, notes, created_by
                    ) VALUES (
                        NEW.tenant_id, NEW.inventory_item_id, 'out', NEW.quantity, NEW.unit,
                        NEW.invoice_id, NEW.invoice_type, NEW.id, 'إخراج من فاتورة صادر', NEW.created_by
                    );
                ELSE
                    RAISE EXCEPTION 'الكمية غير كافية في المستودع. المتوفرة: %, المطلوبة: %', 
                        current_quantity, NEW.quantity;
                END IF;
            END IF;
            
            -- تحديث علامة warehouse_updated
            IF NEW.invoice_type = 'invoice_in' THEN
                UPDATE invoices_in 
                SET warehouse_updated = true,
                    updated_at = NOW()
                WHERE id = NEW.invoice_id;
            ELSE
                UPDATE invoices_out 
                SET warehouse_updated = true,
                    updated_at = NOW()
                WHERE id = NEW.invoice_id;
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- تحديث Trigger
DROP TRIGGER IF EXISTS trigger_update_warehouse_from_invoice_item ON invoice_items;
CREATE TRIGGER trigger_update_warehouse_from_invoice_item
    AFTER INSERT ON invoice_items
    FOR EACH ROW
    WHEN (NEW.inventory_item_id IS NOT NULL)
    EXECUTE FUNCTION update_inventory_from_invoice();

-- Function محسنة لاسترجاع الكمية عند الحذف
CREATE OR REPLACE FUNCTION restore_inventory_on_item_delete()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.inventory_item_id IS NOT NULL THEN
        -- الوارد: استرجاع (طرح) الكمية
        IF OLD.invoice_type = 'invoice_in' THEN
            UPDATE inventory_items 
            SET quantity = GREATEST(0, quantity - OLD.quantity),
                updated_at = NOW()
            WHERE id = OLD.inventory_item_id
                AND tenant_id = OLD.tenant_id;
        -- الصادر: استرجاع (إضافة) الكمية
        ELSEIF OLD.invoice_type = 'invoice_out' THEN
            UPDATE inventory_items 
            SET quantity = quantity + OLD.quantity,
                updated_at = NOW()
            WHERE id = OLD.inventory_item_id
                AND tenant_id = OLD.tenant_id;
        END IF;
        
        -- تحديث علامة warehouse_updated
        IF OLD.invoice_type = 'invoice_in' THEN
            UPDATE invoices_in 
            SET warehouse_updated = false,
                updated_at = NOW()
            WHERE id = OLD.invoice_id;
        ELSE
            UPDATE invoices_out 
            SET warehouse_updated = false,
                updated_at = NOW()
            WHERE id = OLD.invoice_id;
        END IF;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- تحديث Trigger
DROP TRIGGER IF EXISTS trigger_restore_inventory_on_item_delete ON invoice_items;
CREATE TRIGGER trigger_restore_inventory_on_item_delete
    AFTER DELETE ON invoice_items
    FOR EACH ROW
    WHEN (OLD.inventory_item_id IS NOT NULL)
    EXECUTE FUNCTION restore_inventory_on_item_delete();

-- ============================================
-- القسم 3: تحسين صلاحيات المحاسب
-- ============================================

-- إضافة حقول صلاحيات محسنة للمستخدمين
ALTER TABLE users
ADD COLUMN IF NOT EXISTS can_delete_data BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS can_edit_data BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS can_create_users BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS can_view_reports BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS can_export_data BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS can_print_invoices BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}'::jsonb;

-- إنشاء جدول لسجل الصلاحيات
CREATE TABLE IF NOT EXISTS user_permission_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    granted_by UUID REFERENCES users(id),
    permission_type TEXT NOT NULL,
    permission_value BOOLEAN,
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_user_permission_logs_user ON user_permission_logs(user_id, granted_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_permission_logs_tenant ON user_permission_logs(tenant_id);

-- ============================================
-- القسم 4: إضافة/تحسين جدول tenant_section_settings
-- ============================================

CREATE TABLE IF NOT EXISTS tenant_section_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    section_code VARCHAR(100) NOT NULL,
    is_visible BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, section_code)
);

CREATE INDEX IF NOT EXISTS idx_tenant_section_settings_tenant ON tenant_section_settings(tenant_id, display_order);

-- ============================================
-- القسم 5: التأكد من عزل بيانات كل متجر (RLS أو Constraints)
-- ============================================

-- Function للتحقق من أن السجل ينتمي للمتجر الصحيح
CREATE OR REPLACE FUNCTION check_tenant_access(
    p_tenant_id UUID,
    p_table_name TEXT,
    p_record_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    record_tenant_id UUID;
    query_text TEXT;
BEGIN
    IF p_tenant_id IS NULL OR p_record_id IS NULL THEN
        RETURN false;
    END IF;
    
    -- بناء query ديناميكي للتحقق
    query_text := format('SELECT tenant_id FROM %I WHERE id = $1', p_table_name);
    EXECUTE query_text INTO record_tenant_id USING p_record_id;
    
    RETURN record_tenant_id = p_tenant_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- القسم 6: التأكد من وجود جدول inventory_transactions
-- ============================================

CREATE TABLE IF NOT EXISTS inventory_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('in', 'out', 'adjustment')),
    quantity NUMERIC(10, 2) NOT NULL,
    unit TEXT DEFAULT 'piece',
    related_invoice_id UUID,
    related_invoice_type TEXT CHECK (related_invoice_type IN ('invoice_in', 'invoice_out', NULL)),
    invoice_item_id UUID REFERENCES invoice_items(id) ON DELETE SET NULL,
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_tenant ON inventory_transactions(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_item ON inventory_transactions(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_invoice ON inventory_transactions(related_invoice_id, related_invoice_type);

-- ============================================
-- القسم 7: التأكد من وجود جميع الحقول المطلوبة في الفواتير
-- ============================================

-- تحديث invoices_in
ALTER TABLE invoices_in
ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS warehouse_updated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'ar',
ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES partners(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS invoice_number TEXT,
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash';

-- تحديث invoices_out
ALTER TABLE invoices_out
ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS warehouse_updated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'ar',
ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES partners(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS invoice_number TEXT,
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash';

-- ============================================
-- القسم 8: التأكد من وجود جدول invoice_items
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
-- القسم 9: التأكد من وجود جدول financial_box
-- ============================================

CREATE TABLE IF NOT EXISTS financial_box (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL UNIQUE,
    try_balance NUMERIC(15, 2) DEFAULT 0,
    usd_balance NUMERIC(15, 2) DEFAULT 0,
    syp_balance NUMERIC(15, 2) DEFAULT 0,
    sar_balance NUMERIC(15, 2) DEFAULT 0,
    eur_balance NUMERIC(15, 2) DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_financial_box_tenant ON financial_box(tenant_id);

-- Function لإنشاء سجل financial_box تلقائياً لكل متجر جديد
CREATE OR REPLACE FUNCTION create_financial_box_for_tenant()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO financial_box (tenant_id)
    VALUES (NEW.id)
    ON CONFLICT (tenant_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_financial_box_for_tenant ON tenants;
CREATE TRIGGER trigger_create_financial_box_for_tenant
    AFTER INSERT ON tenants
    FOR EACH ROW
    EXECUTE FUNCTION create_financial_box_for_tenant();

-- ============================================
-- القسم 10: Function لتحديث financial_box تلقائياً
-- ============================================

CREATE OR REPLACE FUNCTION update_financial_box_on_invoice()
RETURNS TRIGGER AS $$
DECLARE
    invoice_amount NUMERIC(15, 2);
    invoice_currency TEXT;
    is_invoice_in BOOLEAN;
BEGIN
    -- تحديد نوع الفاتورة
    IF TG_TABLE_NAME = 'invoices_in' THEN
        invoice_amount := COALESCE(NEW.amount, 0);
        invoice_currency := COALESCE(NEW.currency, 'TRY');
        is_invoice_in := true;
    ELSIF TG_TABLE_NAME = 'invoices_out' THEN
        invoice_amount := COALESCE(NEW.amount, 0);
        invoice_currency := COALESCE(NEW.currency, 'TRY');
        is_invoice_in := false;
    ELSE
        RETURN NEW;
    END IF;

    -- تحديث الصندوق المالي
    IF TG_OP = 'INSERT' THEN
        -- التأكد من وجود سجل financial_box
        INSERT INTO financial_box (tenant_id)
        VALUES (NEW.tenant_id)
        ON CONFLICT (tenant_id) DO NOTHING;
        
        -- تحديث الرصيد حسب العملة والنوع
        IF is_invoice_in THEN
            -- الوارد يضيف للصندوق
            CASE invoice_currency
                WHEN 'TRY' THEN
                    UPDATE financial_box SET try_balance = try_balance + invoice_amount WHERE tenant_id = NEW.tenant_id;
                WHEN 'USD' THEN
                    UPDATE financial_box SET usd_balance = usd_balance + invoice_amount WHERE tenant_id = NEW.tenant_id;
                WHEN 'SYP' THEN
                    UPDATE financial_box SET syp_balance = syp_balance + invoice_amount WHERE tenant_id = NEW.tenant_id;
                WHEN 'SAR' THEN
                    UPDATE financial_box SET sar_balance = sar_balance + invoice_amount WHERE tenant_id = NEW.tenant_id;
                WHEN 'EUR' THEN
                    UPDATE financial_box SET eur_balance = eur_balance + invoice_amount WHERE tenant_id = NEW.tenant_id;
            END CASE;
        ELSE
            -- الصادر ينقص من الصندوق
            CASE invoice_currency
                WHEN 'TRY' THEN
                    UPDATE financial_box SET try_balance = GREATEST(0, try_balance - invoice_amount) WHERE tenant_id = NEW.tenant_id;
                WHEN 'USD' THEN
                    UPDATE financial_box SET usd_balance = GREATEST(0, usd_balance - invoice_amount) WHERE tenant_id = NEW.tenant_id;
                WHEN 'SYP' THEN
                    UPDATE financial_box SET syp_balance = GREATEST(0, syp_balance - invoice_amount) WHERE tenant_id = NEW.tenant_id;
                WHEN 'SAR' THEN
                    UPDATE financial_box SET sar_balance = GREATEST(0, sar_balance - invoice_amount) WHERE tenant_id = NEW.tenant_id;
                WHEN 'EUR' THEN
                    UPDATE financial_box SET eur_balance = GREATEST(0, eur_balance - invoice_amount) WHERE tenant_id = NEW.tenant_id;
            END CASE;
        END IF;
        
        UPDATE financial_box SET updated_at = NOW() WHERE tenant_id = NEW.tenant_id;
        
    ELSIF TG_OP = 'DELETE' THEN
        -- عند الحذف، استرجاع المبلغ
        IF is_invoice_in THEN
            -- الوارد: طرح المبلغ (استرجاع)
            CASE invoice_currency
                WHEN 'TRY' THEN
                    UPDATE financial_box SET try_balance = GREATEST(0, try_balance - OLD.amount) WHERE tenant_id = OLD.tenant_id;
                WHEN 'USD' THEN
                    UPDATE financial_box SET usd_balance = GREATEST(0, usd_balance - OLD.amount) WHERE tenant_id = OLD.tenant_id;
                WHEN 'SYP' THEN
                    UPDATE financial_box SET syp_balance = GREATEST(0, syp_balance - OLD.amount) WHERE tenant_id = OLD.tenant_id;
                WHEN 'SAR' THEN
                    UPDATE financial_box SET sar_balance = GREATEST(0, sar_balance - OLD.amount) WHERE tenant_id = OLD.tenant_id;
                WHEN 'EUR' THEN
                    UPDATE financial_box SET eur_balance = GREATEST(0, eur_balance - OLD.amount) WHERE tenant_id = OLD.tenant_id;
            END CASE;
        ELSE
            -- الصادر: إضافة المبلغ (استرجاع)
            CASE invoice_currency
                WHEN 'TRY' THEN
                    UPDATE financial_box SET try_balance = try_balance + OLD.amount WHERE tenant_id = OLD.tenant_id;
                WHEN 'USD' THEN
                    UPDATE financial_box SET usd_balance = usd_balance + OLD.amount WHERE tenant_id = OLD.tenant_id;
                WHEN 'SYP' THEN
                    UPDATE financial_box SET syp_balance = syp_balance + OLD.amount WHERE tenant_id = OLD.tenant_id;
                WHEN 'SAR' THEN
                    UPDATE financial_box SET sar_balance = sar_balance + OLD.amount WHERE tenant_id = OLD.tenant_id;
                WHEN 'EUR' THEN
                    UPDATE financial_box SET eur_balance = eur_balance + OLD.amount WHERE tenant_id = OLD.tenant_id;
            END CASE;
        END IF;
        
        UPDATE financial_box SET updated_at = NOW() WHERE tenant_id = OLD.tenant_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers لتحديث الصندوق المالي
DROP TRIGGER IF EXISTS trigger_update_financial_box_in ON invoices_in;
CREATE TRIGGER trigger_update_financial_box_in
    AFTER INSERT OR DELETE ON invoices_in
    FOR EACH ROW
    EXECUTE FUNCTION update_financial_box_on_invoice();

DROP TRIGGER IF EXISTS trigger_update_financial_box_out ON invoices_out;
CREATE TRIGGER trigger_update_financial_box_out
    AFTER INSERT OR DELETE ON invoices_out
    FOR EACH ROW
    EXECUTE FUNCTION update_financial_box_on_invoice();

-- ============================================
-- القسم 11: تحسين جدول users - إضافة حقول مطلوبة
-- ============================================

ALTER TABLE users
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;

-- ============================================
-- القسم 12: تحسين جدول tenants - إضافة حقول مطلوبة
-- ============================================

ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- ============================================
-- القسم 13: التأكد من وجود جدول daily_transactions
-- ============================================

CREATE TABLE IF NOT EXISTS daily_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('income', 'expense', 'payment', 'receipt', 'fuel')),
    category TEXT,
    amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    currency TEXT DEFAULT 'TRY',
    description TEXT,
    reference_id UUID,
    reference_type TEXT,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method TEXT DEFAULT 'cash',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_daily_transactions_date ON daily_transactions(tenant_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_transactions_type ON daily_transactions(transaction_type);

-- ============================================
-- القسم 14: التأكد من وجود جدول customer_transactions
-- ============================================

CREATE TABLE IF NOT EXISTS customer_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    partner_id UUID REFERENCES partners(id) ON DELETE CASCADE NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('payment', 'receipt', 'debt', 'credit')),
    amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    currency TEXT DEFAULT 'TRY',
    payment_method TEXT DEFAULT 'cash',
    description TEXT,
    invoice_id UUID,
    invoice_type TEXT CHECK (invoice_type IN ('invoice_in', 'invoice_out')),
    transaction_date TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_customer_transactions_partner ON customer_transactions(partner_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_customer_transactions_tenant ON customer_transactions(tenant_id);

-- ============================================
-- القسم 15: تحسين جدول partners
-- ============================================

ALTER TABLE partners
ADD COLUMN IF NOT EXISTS balance NUMERIC(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS debt NUMERIC(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'TRY',
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash',
ADD COLUMN IF NOT EXISTS total_paid NUMERIC(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_received NUMERIC(15, 2) DEFAULT 0;

-- ============================================
-- القسم 16: Function لحساب المبلغ الإجمالي للفاتورة
-- ============================================

CREATE OR REPLACE FUNCTION calculate_invoice_total()
RETURNS TRIGGER AS $$
DECLARE
    total_amount NUMERIC := 0;
BEGIN
    -- حساب المبلغ الإجمالي من عناصر الفاتورة
    SELECT COALESCE(SUM(total_price), 0) INTO total_amount
    FROM invoice_items
    WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id)
        AND invoice_type = COALESCE(NEW.invoice_type, OLD.invoice_type);
    
    -- تحديث المبلغ في جدول الفاتورة
    IF COALESCE(NEW.invoice_type, OLD.invoice_type) = 'invoice_in' THEN
        UPDATE invoices_in 
        SET amount = total_amount,
            updated_at = NOW()
        WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
    ELSE
        UPDATE invoices_out 
        SET amount = total_amount,
            updated_at = NOW()
        WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calculate_invoice_total ON invoice_items;
CREATE TRIGGER trigger_calculate_invoice_total
    AFTER INSERT OR UPDATE OR DELETE ON invoice_items
    FOR EACH ROW
    EXECUTE FUNCTION calculate_invoice_total();

-- ============================================
-- القسم 17: إنشاء/تحديث جدول BOQ (project_items) إن كان موجوداً
-- ============================================

-- التحقق من وجود جدول contractor_projects أولاً
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contractor_projects') THEN
        -- إنشاء جدول project_items إذا لم يكن موجوداً
        CREATE TABLE IF NOT EXISTS project_items (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
            project_id UUID REFERENCES contractor_projects(id) ON DELETE CASCADE NOT NULL,
            item_code TEXT NOT NULL,
            item_name TEXT NOT NULL,
            item_description TEXT,
            quantity NUMERIC(15, 3) NOT NULL DEFAULT 0,
            unit_code TEXT DEFAULT 'piece',
            unit_price NUMERIC(15, 2) NOT NULL DEFAULT 0,
            total_price NUMERIC(15, 2) NOT NULL DEFAULT 0,
            currency TEXT DEFAULT 'TRY',
            item_category TEXT,
            notes TEXT,
            sort_order INTEGER DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            created_by UUID REFERENCES users(id),
            updated_by UUID REFERENCES users(id)
        );
        
        CREATE INDEX IF NOT EXISTS idx_project_items_project ON project_items(tenant_id, project_id);
        CREATE INDEX IF NOT EXISTS idx_project_items_category ON project_items(tenant_id, item_category);
    END IF;
END $$;

-- ============================================
-- القسم 18: Function للتحقق من صلاحية الحساب عند تسجيل الدخول
-- ============================================

CREATE OR REPLACE FUNCTION check_user_account_status(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    user_record RECORD;
    tenant_record RECORD;
    account_status JSONB;
BEGIN
    SELECT * INTO user_record FROM users WHERE id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('is_valid' => false, 'reason' => 'user_not_found');
    END IF;
    
    -- Super Admin دائماً صالح
    IF user_record.is_super_admin = true THEN
        RETURN jsonb_build_object('is_valid' => true, 'reason' => 'super_admin');
    END IF;
    
    -- التحقق من صلاحية المتجر
    IF user_record.tenant_id IS NOT NULL THEN
        SELECT * INTO tenant_record FROM tenants WHERE id = user_record.tenant_id;
        
        IF FOUND AND tenant_record.subscription_expires_at IS NOT NULL THEN
            IF tenant_record.subscription_expires_at < NOW() THEN
                RETURN jsonb_build_object(
                    'is_valid' => false,
                    'reason' => 'subscription_expired',
                    'expires_at' => tenant_record.subscription_expires_at
                );
            END IF;
        END IF;
    END IF;
    
    -- التحقق من حالة الحساب
    IF user_record.is_active = false THEN
        RETURN jsonb_build_object('is_valid' => false, 'reason' => 'account_inactive');
    END IF;
    
    RETURN jsonb_build_object('is_valid' => true, 'reason' => 'valid');
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- القسم 19: إنشاء/تحديث فهارس للأداء
-- ============================================

CREATE INDEX IF NOT EXISTS idx_users_tenant_expires ON users(tenant_id, account_expires_at);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_tenants_subscription_expires ON tenants(subscription_expires_at);
CREATE INDEX IF NOT EXISTS idx_invoices_in_warehouse_updated ON invoices_in(warehouse_updated);
CREATE INDEX IF NOT EXISTS idx_invoices_out_warehouse_updated ON invoices_out(warehouse_updated);

-- ============================================
-- القسم 20: Function للتحقق من عزل البيانات
-- ============================================

CREATE OR REPLACE FUNCTION ensure_tenant_isolation()
RETURNS TRIGGER AS $$
BEGIN
    -- التأكد من وجود tenant_id في جميع السجلات
    IF NEW.tenant_id IS NULL THEN
        RAISE EXCEPTION 'tenant_id is required for data isolation';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- تطبيق على الجداول الرئيسية
DROP TRIGGER IF EXISTS trigger_ensure_invoices_in_tenant_isolation ON invoices_in;
CREATE TRIGGER trigger_ensure_invoices_in_tenant_isolation
    BEFORE INSERT OR UPDATE ON invoices_in
    FOR EACH ROW
    EXECUTE FUNCTION ensure_tenant_isolation();

DROP TRIGGER IF EXISTS trigger_ensure_invoices_out_tenant_isolation ON invoices_out;
CREATE TRIGGER trigger_ensure_invoices_out_tenant_isolation
    BEFORE INSERT OR UPDATE ON invoices_out
    FOR EACH ROW
    EXECUTE FUNCTION ensure_tenant_isolation();

DROP TRIGGER IF EXISTS trigger_ensure_inventory_tenant_isolation ON inventory_items;
CREATE TRIGGER trigger_ensure_inventory_tenant_isolation
    BEFORE INSERT OR UPDATE ON inventory_items
    FOR EACH ROW
    EXECUTE FUNCTION ensure_tenant_isolation();

-- ============================================
-- تأكيد نجاح التحديث
-- ============================================

SELECT 'تم تحديث قاعدة البيانات بنجاح! جميع الجداول والوظائف والـ Triggers جاهزة.' as status;

