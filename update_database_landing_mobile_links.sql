-- ============================================
-- تحديثات قاعدة البيانات: صفحة Landing Page وروابط تطبيق الجوال
-- ============================================
-- تاريخ الإنشاء: 2024
-- الوصف: إضافة إعدادات روابط تحميل تطبيق الجوال
-- ============================================

-- تفعيل الامتدادات المطلوبة
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- إضافة إعدادات روابط تطبيق الجوال
-- ============================================

-- رابط تحميل تطبيق أندرويد
INSERT INTO system_settings (key, value, description, updated_by)
VALUES (
    'mobile_app_android_url',
    '',
    'رابط تحميل تطبيق الأندرويد',
    NULL
)
ON CONFLICT (key) DO UPDATE SET
    description = EXCLUDED.description,
    updated_at = NOW();

-- رابط تحميل تطبيق ويندوز
INSERT INTO system_settings (key, value, description, updated_by)
VALUES (
    'mobile_app_windows_url',
    '',
    'رابط تحميل تطبيق الويندوز',
    NULL
)
ON CONFLICT (key) DO UPDATE SET
    description = EXCLUDED.description,
    updated_at = NOW();

-- ============================================
-- إضافة تعليقات على الجداول
-- ============================================

COMMENT ON TABLE system_settings IS 'إعدادات النظام العامة بما فيها روابط تطبيق الجوال';
COMMENT ON COLUMN system_settings.key IS 'مفتاح الإعداد (مثال: mobile_app_android_url)';
COMMENT ON COLUMN system_settings.value IS 'قيمة الإعداد (مثال: رابط التحميل)';
COMMENT ON COLUMN system_settings.description IS 'وصف الإعداد';
COMMENT ON COLUMN system_settings.updated_by IS 'معرف المستخدم الذي قام بالتحديث';

-- ============================================
-- إنشاء فهارس للأداء
-- ============================================

CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);
CREATE INDEX IF NOT EXISTS idx_system_settings_updated_at ON system_settings(updated_at);

-- ============================================
-- إنشاء دالة للتحقق من صحة الروابط
-- ============================================

CREATE OR REPLACE FUNCTION validate_app_url(url TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    IF url IS NULL OR url = '' THEN
        RETURN TRUE; -- السماح بالقيم الفارغة
    END IF;
    
    -- التحقق من أن الرابط يبدأ بـ http:// أو https://
    RETURN url ~ '^https?://';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- إضافة تعليق على الدالة
COMMENT ON FUNCTION validate_app_url IS 'التحقق من صحة رابط تطبيق الجوال';

-- ============================================
-- إنشاء Trigger للتحقق من صحة الروابط عند الإدخال/التحديث
-- ============================================

CREATE OR REPLACE FUNCTION check_app_urls()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.key IN ('mobile_app_android_url', 'mobile_app_windows_url') THEN
        IF NOT validate_app_url(NEW.value) THEN
            RAISE EXCEPTION 'الرابط غير صحيح. يجب أن يبدأ بـ http:// أو https://';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إزالة Trigger القديم إن وجد
DROP TRIGGER IF EXISTS trigger_check_app_urls ON system_settings;

-- إنشاء Trigger جديد
CREATE TRIGGER trigger_check_app_urls
    BEFORE INSERT OR UPDATE ON system_settings
    FOR EACH ROW
    EXECUTE FUNCTION check_app_urls();

-- ============================================
-- إنشاء View لعرض إعدادات تطبيق الجوال
-- ============================================

CREATE OR REPLACE VIEW mobile_app_settings AS
SELECT 
    key,
    value,
    description,
    updated_at,
    updated_by
FROM system_settings
WHERE key IN ('mobile_app_android_url', 'mobile_app_windows_url')
ORDER BY key;

-- إضافة تعليق على View
COMMENT ON VIEW mobile_app_settings IS 'عرض إعدادات روابط تطبيق الجوال فقط';

-- ============================================
-- إنشاء دالة للحصول على جميع إعدادات تطبيق الجوال
-- ============================================

CREATE OR REPLACE FUNCTION get_mobile_app_settings()
RETURNS TABLE (
    android_url TEXT,
    windows_url TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        MAX(CASE WHEN key = 'mobile_app_android_url' THEN value ELSE NULL END)::TEXT AS android_url,
        MAX(CASE WHEN key = 'mobile_app_windows_url' THEN value ELSE NULL END)::TEXT AS windows_url
    FROM system_settings
    WHERE key IN ('mobile_app_android_url', 'mobile_app_windows_url');
END;
$$ LANGUAGE plpgsql STABLE;

-- إضافة تعليق على الدالة
COMMENT ON FUNCTION get_mobile_app_settings IS 'الحصول على جميع روابط تطبيق الجوال';

-- ============================================
-- إنشاء دالة لتحديث رابط تطبيق الجوال
-- ============================================

CREATE OR REPLACE FUNCTION update_mobile_app_url(
    p_key TEXT,
    p_value TEXT,
    p_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    IF p_key NOT IN ('mobile_app_android_url', 'mobile_app_windows_url') THEN
        RAISE EXCEPTION 'المفتاح غير صحيح. يجب أن يكون mobile_app_android_url أو mobile_app_windows_url';
    END IF;
    
    IF NOT validate_app_url(p_value) THEN
        RAISE EXCEPTION 'الرابط غير صحيح. يجب أن يبدأ بـ http:// أو https://';
    END IF;
    
    INSERT INTO system_settings (key, value, updated_by)
    VALUES (p_key, p_value, p_user_id)
    ON CONFLICT (key) DO UPDATE SET
        value = EXCLUDED.value,
        updated_by = EXCLUDED.updated_by,
        updated_at = NOW();
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- إضافة تعليق على الدالة
COMMENT ON FUNCTION update_mobile_app_url IS 'تحديث رابط تطبيق الجوال';

-- ============================================
-- إنشاء دالة للحصول على جميع إعدادات النظام مع التصنيف
-- ============================================

CREATE OR REPLACE VIEW system_settings_categorized AS
SELECT 
    key,
    value,
    description,
    CASE 
        WHEN key LIKE 'mobile_app_%' THEN 'Mobile App'
        WHEN key LIKE 'support_%' THEN 'Support'
        ELSE 'General'
    END AS category,
    updated_at,
    updated_by
FROM system_settings
ORDER BY category, key;

-- إضافة تعليق على View
COMMENT ON VIEW system_settings_categorized IS 'عرض إعدادات النظام مصنفة حسب النوع';

-- ============================================
-- إنشاء جدول لتسجيل تحديثات روابط تطبيق الجوال
-- ============================================

CREATE TABLE IF NOT EXISTS mobile_app_url_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL CHECK (key IN ('mobile_app_android_url', 'mobile_app_windows_url')),
    old_value TEXT,
    new_value TEXT,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- إضافة تعليق على الجدول
COMMENT ON TABLE mobile_app_url_history IS 'سجل تحديثات روابط تطبيق الجوال';

-- إنشاء فهارس
CREATE INDEX IF NOT EXISTS idx_mobile_app_url_history_key ON mobile_app_url_history(key);
CREATE INDEX IF NOT EXISTS idx_mobile_app_url_history_updated_at ON mobile_app_url_history(updated_at);

-- ============================================
-- إنشاء Trigger لتسجيل تحديثات روابط تطبيق الجوال
-- ============================================

CREATE OR REPLACE FUNCTION log_mobile_app_url_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.key IN ('mobile_app_android_url', 'mobile_app_windows_url') THEN
        IF OLD.value IS DISTINCT FROM NEW.value THEN
            INSERT INTO mobile_app_url_history (key, old_value, new_value, updated_by)
            VALUES (NEW.key, OLD.value, NEW.value, NEW.updated_by);
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إزالة Trigger القديم إن وجد
DROP TRIGGER IF EXISTS trigger_log_mobile_app_url_changes ON system_settings;

-- إنشاء Trigger جديد
CREATE TRIGGER trigger_log_mobile_app_url_changes
    AFTER UPDATE ON system_settings
    FOR EACH ROW
    WHEN (OLD.key IN ('mobile_app_android_url', 'mobile_app_windows_url'))
    EXECUTE FUNCTION log_mobile_app_url_changes();

-- ============================================
-- إنشاء دالة للحصول على تاريخ تحديثات رابط تطبيق الجوال
-- ============================================

CREATE OR REPLACE FUNCTION get_mobile_app_url_history(
    p_key TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    key TEXT,
    old_value TEXT,
    new_value TEXT,
    updated_by UUID,
    updated_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        h.id,
        h.key,
        h.old_value,
        h.new_value,
        h.updated_by,
        h.updated_at
    FROM mobile_app_url_history h
    WHERE (p_key IS NULL OR h.key = p_key)
    ORDER BY h.updated_at DESC
    LIMIT 50;
END;
$$ LANGUAGE plpgsql STABLE;

-- إضافة تعليق على الدالة
COMMENT ON FUNCTION get_mobile_app_url_history IS 'الحصول على تاريخ تحديثات روابط تطبيق الجوال';

-- ============================================
-- إنهاء السكريبت
-- ============================================

SELECT 'تم تنفيذ تحديثات قاعدة البيانات بنجاح!' AS result;

