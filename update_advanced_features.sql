-- =====================================================
-- تحديثات متقدمة للنظام
-- نظام إبراهيم للمحاسبة
-- =====================================================

-- 1. إضافة عمود last_seen للمستخدمين
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'last_seen'
    ) THEN
        ALTER TABLE users ADD COLUMN last_seen TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- 2. تحديث last_seen عند تسجيل الدخول
CREATE OR REPLACE FUNCTION update_user_last_seen()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users 
    SET last_seen = NOW() 
    WHERE id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger لتحديث last_seen عند تسجيل الدخول
DROP TRIGGER IF EXISTS trigger_update_last_seen ON users;
CREATE TRIGGER trigger_update_last_seen
    AFTER UPDATE OF last_login ON users
    FOR EACH ROW
    WHEN (OLD.last_login IS DISTINCT FROM NEW.last_login)
    EXECUTE FUNCTION update_user_last_seen();

-- 3. إضافة عمود avatar_url للمستخدمين
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'avatar_url'
    ) THEN
        ALTER TABLE users ADD COLUMN avatar_url TEXT;
    END IF;
END $$;

-- 4. إضافة عمود logo_url للمتاجر (tenants)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tenants' AND column_name = 'logo_url'
    ) THEN
        ALTER TABLE tenants ADD COLUMN logo_url TEXT;
    END IF;
END $$;

-- 5. تحديث جدول exchange_rates لدعم العملات الجديدة
DO $$ 
BEGIN
    -- إضافة SAR (الريال السعودي)
    IF NOT EXISTS (
        SELECT 1 FROM exchange_rates 
        WHERE from_currency = 'SAR' AND to_currency = 'USD'
    ) THEN
        INSERT INTO exchange_rates (from_currency, to_currency, rate, updated_at)
        VALUES ('SAR', 'USD', 0.2667, NOW());
    END IF;

    -- إضافة EUR (اليورو)
    IF NOT EXISTS (
        SELECT 1 FROM exchange_rates 
        WHERE from_currency = 'EUR' AND to_currency = 'USD'
    ) THEN
        INSERT INTO exchange_rates (from_currency, to_currency, rate, updated_at)
        VALUES ('EUR', 'USD', 1.08, NOW());
    END IF;

    -- تحديث العملات الموجودة إذا لم تكن موجودة
    IF NOT EXISTS (
        SELECT 1 FROM exchange_rates 
        WHERE from_currency = 'TRY' AND to_currency = 'USD'
    ) THEN
        INSERT INTO exchange_rates (from_currency, to_currency, rate, updated_at)
        VALUES ('TRY', 'USD', 0.03125, NOW());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM exchange_rates 
        WHERE from_currency = 'SYP' AND to_currency = 'USD'
    ) THEN
        INSERT INTO exchange_rates (from_currency, to_currency, rate, updated_at)
        VALUES ('SYP', 'USD', 0.0000667, NOW());
    END IF;
END $$;

-- 6. إنشاء جدول لتخزين الصور المرفوعة
CREATE TABLE IF NOT EXISTS uploaded_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    file_type VARCHAR(50) NOT NULL, -- 'user_avatar', 'tenant_logo', 'invoice_attachment', etc.
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- فهرس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_uploaded_files_tenant ON uploaded_files(tenant_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_user ON uploaded_files(user_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_type ON uploaded_files(file_type);

-- 7. تحديث جدول notifications لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- 8. دالة للحصول على المستخدمين النشطين
CREATE OR REPLACE FUNCTION get_active_users(tenant_id_param UUID, minutes_threshold INTEGER DEFAULT 5)
RETURNS TABLE (
    id UUID,
    name TEXT,
    email TEXT,
    role TEXT,
    last_seen TIMESTAMP WITH TIME ZONE,
    last_login TIMESTAMP WITH TIME ZONE,
    avatar_url TEXT,
    is_online BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.name,
        u.email,
        u.role,
        u.last_seen,
        u.last_login,
        u.avatar_url,
        CASE 
            WHEN u.last_seen IS NOT NULL AND u.last_seen > NOW() - (minutes_threshold || ' minutes')::INTERVAL THEN true
            WHEN u.last_seen IS NULL AND u.last_login IS NOT NULL AND u.last_login > NOW() - (minutes_threshold || ' minutes')::INTERVAL THEN true
            ELSE false
        END as is_online
    FROM users u
    WHERE u.tenant_id = tenant_id_param
        AND u.is_active = true
        AND (
            (u.last_seen IS NOT NULL AND u.last_seen > NOW() - (minutes_threshold || ' minutes')::INTERVAL)
            OR (u.last_seen IS NULL AND u.last_login IS NOT NULL AND u.last_login > NOW() - (minutes_threshold || ' minutes')::INTERVAL)
        )
    ORDER BY 
        CASE 
            WHEN u.last_seen IS NOT NULL THEN u.last_seen
            ELSE u.last_login
        END DESC;
END;
$$ LANGUAGE plpgsql;

-- 9. دالة لتحديث last_seen للمستخدم
CREATE OR REPLACE FUNCTION update_user_activity(user_id_param UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE users 
    SET last_seen = NOW() 
    WHERE id = user_id_param;
END;
$$ LANGUAGE plpgsql;

-- 10. تحديث جدول store_types لإضافة إعدادات العرض
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'store_types' AND column_name = 'is_enabled'
    ) THEN
        ALTER TABLE store_types ADD COLUMN is_enabled BOOLEAN DEFAULT true;
    END IF;
END $$;

-- 11. جدول لتتبع إعدادات عرض الأقسام لكل متجر
CREATE TABLE IF NOT EXISTS tenant_section_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    section_code VARCHAR(100) NOT NULL, -- 'invoices_in', 'invoices_out', 'inventory', etc.
    is_visible BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, section_code)
);

CREATE INDEX IF NOT EXISTS idx_tenant_section_settings_tenant ON tenant_section_settings(tenant_id);

-- 12. دالة للحصول على الأقسام المرئية للمتجر
CREATE OR REPLACE FUNCTION get_tenant_visible_sections(tenant_id_param UUID)
RETURNS TABLE (
    section_code VARCHAR(100),
    is_visible BOOLEAN,
    display_order INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tss.section_code,
        tss.is_visible,
        tss.display_order
    FROM tenant_section_settings tss
    WHERE tss.tenant_id = tenant_id_param
        AND tss.is_visible = true
    ORDER BY tss.display_order;
END;
$$ LANGUAGE plpgsql;

-- 13. تحديث جدول financial_box لدعم العملات الجديدة
DO $$ 
BEGIN
    -- إضافة أعمدة للعملات الجديدة إذا لم تكن موجودة
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'financial_box' AND column_name = 'sar_balance'
    ) THEN
        ALTER TABLE financial_box ADD COLUMN sar_balance DECIMAL(15, 2) DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'financial_box' AND column_name = 'eur_balance'
    ) THEN
        ALTER TABLE financial_box ADD COLUMN eur_balance DECIMAL(15, 2) DEFAULT 0;
    END IF;
END $$;

-- 14. تحديث دالة تحديث الصندوق المالي لدعم العملات الجديدة
CREATE OR REPLACE FUNCTION update_financial_box_balance()
RETURNS TRIGGER AS $$
DECLARE
    invoice_currency TEXT;
    invoice_amount DECIMAL(15, 2);
    is_invoice_in BOOLEAN;
BEGIN
    -- تحديد نوع الفاتورة والعملة والمبلغ
    IF TG_TABLE_NAME = 'invoices_in' THEN
        invoice_currency := COALESCE(NEW.currency, 'TRY');
        invoice_amount := COALESCE(NEW.amount, 0);
        is_invoice_in := true;
    ELSIF TG_TABLE_NAME = 'invoices_out' THEN
        invoice_currency := COALESCE(NEW.currency, 'TRY');
        invoice_amount := COALESCE(NEW.amount, 0);
        is_invoice_in := false;
    ELSE
        RETURN NEW;
    END IF;

    -- تحديث الرصيد حسب العملة
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        IF is_invoice_in THEN
            -- فاتورة وارد (ناقص من الصندوق)
            CASE invoice_currency
                WHEN 'TRY' THEN
                    UPDATE financial_box 
                    SET try_balance = try_balance - invoice_amount,
                        updated_at = NOW()
                    WHERE tenant_id = NEW.tenant_id;
                WHEN 'USD' THEN
                    UPDATE financial_box 
                    SET usd_balance = usd_balance - invoice_amount,
                        updated_at = NOW()
                    WHERE tenant_id = NEW.tenant_id;
                WHEN 'SYP' THEN
                    UPDATE financial_box 
                    SET syp_balance = syp_balance - invoice_amount,
                        updated_at = NOW()
                    WHERE tenant_id = NEW.tenant_id;
                WHEN 'SAR' THEN
                    UPDATE financial_box 
                    SET sar_balance = sar_balance - invoice_amount,
                        updated_at = NOW()
                    WHERE tenant_id = NEW.tenant_id;
                WHEN 'EUR' THEN
                    UPDATE financial_box 
                    SET eur_balance = eur_balance - invoice_amount,
                        updated_at = NOW()
                    WHERE tenant_id = NEW.tenant_id;
            END CASE;
        ELSE
            -- فاتورة صادر (زائد للصندوق)
            CASE invoice_currency
                WHEN 'TRY' THEN
                    UPDATE financial_box 
                    SET try_balance = try_balance + invoice_amount,
                        updated_at = NOW()
                    WHERE tenant_id = NEW.tenant_id;
                WHEN 'USD' THEN
                    UPDATE financial_box 
                    SET usd_balance = usd_balance + invoice_amount,
                        updated_at = NOW()
                    WHERE tenant_id = NEW.tenant_id;
                WHEN 'SYP' THEN
                    UPDATE financial_box 
                    SET syp_balance = syp_balance + invoice_amount,
                        updated_at = NOW()
                    WHERE tenant_id = NEW.tenant_id;
                WHEN 'SAR' THEN
                    UPDATE financial_box 
                    SET sar_balance = sar_balance + invoice_amount,
                        updated_at = NOW()
                    WHERE tenant_id = NEW.tenant_id;
                WHEN 'EUR' THEN
                    UPDATE financial_box 
                    SET eur_balance = eur_balance + invoice_amount,
                        updated_at = NOW()
                    WHERE tenant_id = NEW.tenant_id;
            END CASE;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        -- عند الحذف، نعكس العملية
        IF is_invoice_in THEN
            CASE OLD.currency
                WHEN 'TRY' THEN
                    UPDATE financial_box 
                    SET try_balance = try_balance + OLD.amount,
                        updated_at = NOW()
                    WHERE tenant_id = OLD.tenant_id;
                WHEN 'USD' THEN
                    UPDATE financial_box 
                    SET usd_balance = usd_balance + OLD.amount,
                        updated_at = NOW()
                    WHERE tenant_id = OLD.tenant_id;
                WHEN 'SYP' THEN
                    UPDATE financial_box 
                    SET syp_balance = syp_balance + OLD.amount,
                        updated_at = NOW()
                    WHERE tenant_id = OLD.tenant_id;
                WHEN 'SAR' THEN
                    UPDATE financial_box 
                    SET sar_balance = sar_balance + OLD.amount,
                        updated_at = NOW()
                    WHERE tenant_id = OLD.tenant_id;
                WHEN 'EUR' THEN
                    UPDATE financial_box 
                    SET eur_balance = eur_balance + OLD.amount,
                        updated_at = NOW()
                    WHERE tenant_id = OLD.tenant_id;
            END CASE;
        ELSE
            CASE OLD.currency
                WHEN 'TRY' THEN
                    UPDATE financial_box 
                    SET try_balance = try_balance - OLD.amount,
                        updated_at = NOW()
                    WHERE tenant_id = OLD.tenant_id;
                WHEN 'USD' THEN
                    UPDATE financial_box 
                    SET usd_balance = usd_balance - OLD.amount,
                        updated_at = NOW()
                    WHERE tenant_id = OLD.tenant_id;
                WHEN 'SYP' THEN
                    UPDATE financial_box 
                    SET syp_balance = syp_balance - OLD.amount,
                        updated_at = NOW()
                    WHERE tenant_id = OLD.tenant_id;
                WHEN 'SAR' THEN
                    UPDATE financial_box 
                    SET sar_balance = sar_balance - OLD.amount,
                        updated_at = NOW()
                    WHERE tenant_id = OLD.tenant_id;
                WHEN 'EUR' THEN
                    UPDATE financial_box 
                    SET eur_balance = eur_balance - OLD.amount,
                        updated_at = NOW()
                    WHERE tenant_id = OLD.tenant_id;
            END CASE;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 15. تحديث Triggers للفواتير
DROP TRIGGER IF EXISTS trigger_update_financial_box_in ON invoices_in;
CREATE TRIGGER trigger_update_financial_box_in
    AFTER INSERT OR UPDATE OR DELETE ON invoices_in
    FOR EACH ROW
    EXECUTE FUNCTION update_financial_box_balance();

DROP TRIGGER IF EXISTS trigger_update_financial_box_out ON invoices_out;
CREATE TRIGGER trigger_update_financial_box_out
    AFTER INSERT OR UPDATE OR DELETE ON invoices_out
    FOR EACH ROW
    EXECUTE FUNCTION update_financial_box_balance();

-- 16. إنشاء View للإحصائيات المالية المتقدمة
CREATE OR REPLACE VIEW financial_statistics_view AS
SELECT 
    fb.tenant_id,
    t.name as tenant_name,
    COALESCE(fb.try_balance, 0) as try_balance,
    COALESCE(fb.usd_balance, 0) as usd_balance,
    COALESCE(fb.syp_balance, 0) as syp_balance,
    COALESCE(fb.sar_balance, 0) as sar_balance,
    COALESCE(fb.eur_balance, 0) as eur_balance,
    -- تحويل كل العملات إلى USD
    COALESCE(fb.try_balance, 0) * COALESCE(er_try.rate, 0.03125) +
    COALESCE(fb.usd_balance, 0) +
    COALESCE(fb.syp_balance, 0) * COALESCE(er_syp.rate, 0.0000667) +
    COALESCE(fb.sar_balance, 0) * COALESCE(er_sar.rate, 0.2667) +
    COALESCE(fb.eur_balance, 0) * COALESCE(er_eur.rate, 1.08) as total_usd_value,
    fb.updated_at
FROM financial_box fb
JOIN tenants t ON fb.tenant_id = t.id
LEFT JOIN exchange_rates er_try ON er_try.from_currency = 'TRY' AND er_try.to_currency = 'USD'
LEFT JOIN exchange_rates er_syp ON er_syp.from_currency = 'SYP' AND er_syp.to_currency = 'USD'
LEFT JOIN exchange_rates er_sar ON er_sar.from_currency = 'SAR' AND er_sar.to_currency = 'USD'
LEFT JOIN exchange_rates er_eur ON er_eur.from_currency = 'EUR' AND er_eur.to_currency = 'USD';

-- 17. تحديث جدول daily_movements لدعم العملات الجديدة
DO $$ 
BEGIN
    -- العملات موجودة بالفعل في حقل currency، لا حاجة لتعديل
    -- فقط نضيف فهرس لتحسين الأداء
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_daily_movements_currency'
    ) THEN
        CREATE INDEX idx_daily_movements_currency ON daily_movements(currency);
    END IF;
END $$;

-- =====================================================
-- ملاحظات:
-- 1. قم بتشغيل هذا الملف في Neon SQL Editor
-- 2. تأكد من وجود الجداول الأساسية أولاً
-- 3. يمكن تشغيل الأوامر بشكل منفصل إذا واجهت مشاكل
-- =====================================================

