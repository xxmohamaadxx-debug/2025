-- ============================================
-- تحديثات قاعدة البيانات: أنواع متاجر متعددة + إشعارات خارجية
-- ============================================
-- تاريخ الإنشاء: 2024
-- الوصف: دعم أنواع متاجر متعددة لكل متجر + نظام إشعارات خارجية متطور
-- ============================================

-- تفعيل الامتدادات المطلوبة
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================
-- القسم 1: إضافة أنواع متاجر جديدة
-- ============================================

-- إضافة نوع "صالة إنترنت واكسسوارات جوال"
INSERT INTO store_types (code, name_ar, name_en, name_tr, description_ar, features, sort_order, is_active) VALUES
('internet_cafe_accessories', 
 'صالة إنترنت واكسسوارات جوال', 
 'Internet Café & Mobile Accessories', 
 'İnternet Cafe ve Mobil Aksesuar', 
 'متجر متكامل يجمع بين صالة إنترنت ومتجر إكسسوارات جوال - يدعم الاشتراكات وإدارة المخزون والمبيعات', 
 '{"internet_subscriptions": true, "hourly_rates": true, "user_management": true, "speed_control": true, "inventory_management": true, "sales": true, "warehouse": true, "mobile_accessories": true}'::jsonb, 
 5, 
 true)
ON CONFLICT (code) DO UPDATE SET 
    name_ar = EXCLUDED.name_ar,
    description_ar = EXCLUDED.description_ar,
    features = EXCLUDED.features,
    updated_at = NOW();

-- إضافة نوع "متجر عادي مع محروقات"
INSERT INTO store_types (code, name_ar, name_en, name_tr, description_ar, features, sort_order, is_active) VALUES
('general_with_fuel', 
 'متجر عادي مع محروقات', 
 'General Store with Fuel Station', 
 'Genel Mağaza ve Benzin İstasyonu', 
 'متجر عادي متكامل مع إدارة محروقات - يدعم المبيعات والمشتريات وإدارة المخزون وإدارة المحروقات', 
 '{"inventory_management": true, "sales": true, "purchases": true, "fuel_management": true, "price_management": true, "reports": true}'::jsonb, 
 6, 
 true)
ON CONFLICT (code) DO UPDATE SET 
    name_ar = EXCLUDED.name_ar,
    description_ar = EXCLUDED.description_ar,
    features = EXCLUDED.features,
    updated_at = NOW();

-- ============================================
-- القسم 2: دعم أنواع متعددة للمتجر الواحد (Many-to-Many)
-- ============================================

-- إنشاء جدول العلاقة بين المتاجر وأنواع المتاجر (Many-to-Many)
CREATE TABLE IF NOT EXISTS tenant_store_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    store_type_id UUID REFERENCES store_types(id) ON DELETE CASCADE NOT NULL,
    is_primary BOOLEAN DEFAULT false, -- نوع المتجر الرئيسي
    priority INTEGER DEFAULT 0, -- الأولوية في العرض
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, store_type_id)
);

-- إنشاء فهارس
CREATE INDEX IF NOT EXISTS idx_tenant_store_types_tenant ON tenant_store_types(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_store_types_type ON tenant_store_types(store_type_id);
CREATE INDEX IF NOT EXISTS idx_tenant_store_types_primary ON tenant_store_types(tenant_id, is_primary);

-- نقل البيانات القديمة من store_type_id إلى tenant_store_types
INSERT INTO tenant_store_types (tenant_id, store_type_id, is_primary, priority)
SELECT 
    t.id,
    t.store_type_id,
    true,
    0
FROM tenants t
WHERE t.store_type_id IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM tenant_store_types tst 
        WHERE tst.tenant_id = t.id AND tst.store_type_id = t.store_type_id
    )
ON CONFLICT (tenant_id, store_type_id) DO NOTHING;

-- ============================================
-- القسم 3: نظام الإشعارات الخارجية (Push Notifications)
-- ============================================

-- جدول إعدادات الإشعارات لكل متجر
CREATE TABLE IF NOT EXISTS notification_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    notification_type TEXT NOT NULL, -- 'create', 'update', 'delete', 'upload_success', 'upload_failed', 'sync_success', 'sync_failed', 'alert', 'system'
    enabled BOOLEAN DEFAULT true, -- تفعيل/تعطيل نوع الإشعار
    show_in_app BOOLEAN DEFAULT true, -- إظهار في التطبيق
    show_push BOOLEAN DEFAULT true, -- إشعار خارجي (Push)
    show_sound BOOLEAN DEFAULT true, -- صوت التنبيه
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, notification_type)
);

-- إنشاء فهارس
CREATE INDEX IF NOT EXISTS idx_notification_settings_tenant ON notification_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notification_settings_type ON notification_settings(notification_type);
CREATE INDEX IF NOT EXISTS idx_notification_settings_enabled ON notification_settings(tenant_id, enabled, show_push);

-- إدراج الإعدادات الافتراضية لكل نوع إشعار لكل متجر
INSERT INTO notification_settings (tenant_id, notification_type, enabled, show_in_app, show_push, show_sound, priority)
SELECT 
    t.id,
    nt.type,
    CASE 
        WHEN nt.type IN ('alert', 'system', 'upload_failed', 'sync_failed') THEN true
        ELSE true
    END,
    true,
    CASE 
        WHEN nt.type IN ('alert', 'system', 'upload_failed', 'sync_failed') THEN true
        ELSE false
    END,
    CASE 
        WHEN nt.type IN ('alert', 'upload_failed', 'sync_failed') THEN true
        ELSE false
    END,
    CASE 
        WHEN nt.type IN ('alert', 'system') THEN 'high'
        WHEN nt.type IN ('upload_failed', 'sync_failed') THEN 'urgent'
        ELSE 'normal'
    END
FROM tenants t
CROSS JOIN (
    VALUES 
        ('create', 'إضافة'),
        ('update', 'تعديل'),
        ('delete', 'حذف'),
        ('upload_success', 'رفع ناجح'),
        ('upload_failed', 'رفع فاشل'),
        ('sync_success', 'مزامنة ناجحة'),
        ('sync_failed', 'مزامنة فاشلة'),
        ('alert', 'تنبيه'),
        ('system', 'نظام'),
        ('backup_success', 'نسخ احتياطي ناجح'),
        ('backup_failed', 'نسخ احتياطي فاشل'),
        ('subscription_expiring', 'انتهاء اشتراك قريب'),
        ('subscription_expired', 'انتهاء اشتراك'),
        ('low_stock', 'مخزون منخفض'),
        ('payment_received', 'استلام دفعة')
) AS nt(type, name_ar)
WHERE NOT EXISTS (
    SELECT 1 FROM notification_settings ns 
    WHERE ns.tenant_id = t.id AND ns.notification_type = nt.type
);

-- جدول اشتراكات Push Notifications (للتطبيق)
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    endpoint TEXT NOT NULL, -- Push service endpoint
    p256dh TEXT NOT NULL, -- Public key
    auth TEXT NOT NULL, -- Authentication secret
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, user_id, endpoint)
);

-- إنشاء فهارس
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_tenant ON push_subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON push_subscriptions(tenant_id, is_active);

-- جدول سجل الإشعارات الخارجية المرسلة
CREATE TABLE IF NOT EXISTS push_notifications_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    subscription_id UUID REFERENCES push_subscriptions(id) ON DELETE SET NULL,
    notification_type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT,
    icon TEXT,
    badge TEXT,
    data JSONB,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    delivered BOOLEAN DEFAULT false,
    clicked BOOLEAN DEFAULT false,
    error_message TEXT
);

-- إنشاء فهارس
CREATE INDEX IF NOT EXISTS idx_push_notifications_log_tenant ON push_notifications_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_push_notifications_log_user ON push_notifications_log(user_id);
CREATE INDEX IF NOT EXISTS idx_push_notifications_log_sent ON push_notifications_log(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_push_notifications_log_type ON push_notifications_log(notification_type);

-- ============================================
-- القسم 4: تحديث جدول notifications الموجود
-- ============================================

-- إضافة أعمدة جديدة لجدول notifications إذا لم تكن موجودة
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS notification_type TEXT DEFAULT 'system',
ADD COLUMN IF NOT EXISTS show_push BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS push_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS push_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
ADD COLUMN IF NOT EXISTS icon TEXT,
ADD COLUMN IF NOT EXISTS badge TEXT,
ADD COLUMN IF NOT EXISTS data JSONB;

-- إنشاء فهارس جديدة
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_notifications_push ON notifications(tenant_id, show_push, push_sent);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(tenant_id, priority, created_at DESC);

-- ============================================
-- القسم 5: دوال مساعدة
-- ============================================

-- دالة للحصول على أنواع المتاجر لمتجر معين
CREATE OR REPLACE FUNCTION get_tenant_store_types(p_tenant_id UUID)
RETURNS TABLE (
    store_type_id UUID,
    store_type_code TEXT,
    store_type_name_ar TEXT,
    store_type_name_en TEXT,
    is_primary BOOLEAN,
    priority INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        st.id,
        st.code,
        st.name_ar,
        st.name_en,
        tst.is_primary,
        tst.priority
    FROM tenant_store_types tst
    INNER JOIN store_types st ON tst.store_type_id = st.id
    WHERE tst.tenant_id = p_tenant_id
    ORDER BY tst.is_primary DESC, tst.priority ASC, st.name_ar;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_tenant_store_types IS 'الحصول على جميع أنواع المتاجر لمتجر معين';

-- دالة لإضافة نوع متجر لمتجر معين
CREATE OR REPLACE FUNCTION add_store_type_to_tenant(
    p_tenant_id UUID,
    p_store_type_id UUID,
    p_is_primary BOOLEAN DEFAULT false,
    p_priority INTEGER DEFAULT 0
)
RETURNS BOOLEAN AS $$
DECLARE
    v_exists BOOLEAN;
BEGIN
    -- التحقق من وجود العلاقة
    SELECT EXISTS(
        SELECT 1 FROM tenant_store_types 
        WHERE tenant_id = p_tenant_id AND store_type_id = p_store_type_id
    ) INTO v_exists;
    
    IF v_exists THEN
        -- تحديث العلاقة الموجودة
        UPDATE tenant_store_types
        SET 
            is_primary = p_is_primary,
            priority = p_priority,
            updated_at = NOW()
        WHERE tenant_id = p_tenant_id AND store_type_id = p_store_type_id;
    ELSE
        -- إضافة علاقة جديدة
        INSERT INTO tenant_store_types (tenant_id, store_type_id, is_primary, priority)
        VALUES (p_tenant_id, p_store_type_id, p_is_primary, p_priority);
    END IF;
    
    -- إذا تم تعيين نوع كرئيسي، إلغاء تعيين الأنواع الأخرى
    IF p_is_primary THEN
        UPDATE tenant_store_types
        SET is_primary = false
        WHERE tenant_id = p_tenant_id 
            AND store_type_id != p_store_type_id
            AND is_primary = true;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION add_store_type_to_tenant IS 'إضافة نوع متجر لمتجر معين';

-- دالة للحصول على إعدادات الإشعارات لمتجر معين
CREATE OR REPLACE FUNCTION get_tenant_notification_settings(p_tenant_id UUID)
RETURNS TABLE (
    notification_type TEXT,
    enabled BOOLEAN,
    show_in_app BOOLEAN,
    show_push BOOLEAN,
    show_sound BOOLEAN,
    priority TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ns.notification_type,
        ns.enabled,
        ns.show_in_app,
        ns.show_push,
        ns.show_sound,
        ns.priority
    FROM notification_settings ns
    WHERE ns.tenant_id = p_tenant_id
    ORDER BY ns.notification_type;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_tenant_notification_settings IS 'الحصول على إعدادات الإشعارات لمتجر معين';

-- دالة للتحقق من إمكانية إرسال إشعار خارجي
CREATE OR REPLACE FUNCTION can_send_push_notification(
    p_tenant_id UUID,
    p_notification_type TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_setting RECORD;
BEGIN
    SELECT * INTO v_setting
    FROM notification_settings
    WHERE tenant_id = p_tenant_id 
        AND notification_type = p_notification_type
    LIMIT 1;
    
    -- إذا لم توجد إعدادات، إرجاع false (افتراضي)
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- التحقق من تفعيل الإشعارات والإشعارات الخارجية
    RETURN v_setting.enabled AND v_setting.show_push;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION can_send_push_notification IS 'التحقق من إمكانية إرسال إشعار خارجي';

-- ============================================
-- القسم 6: Triggers
-- ============================================

-- Trigger لتحديث updated_at في tenant_store_types
CREATE OR REPLACE FUNCTION update_tenant_store_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_tenant_store_types_updated_at ON tenant_store_types;
CREATE TRIGGER trigger_tenant_store_types_updated_at
    BEFORE UPDATE ON tenant_store_types
    FOR EACH ROW
    EXECUTE FUNCTION update_tenant_store_types_updated_at();

-- Trigger لتحديث updated_at في notification_settings
CREATE OR REPLACE FUNCTION update_notification_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notification_settings_updated_at ON notification_settings;
CREATE TRIGGER trigger_notification_settings_updated_at
    BEFORE UPDATE ON notification_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_settings_updated_at();

-- ============================================
-- القسم 7: Views
-- ============================================

-- View لعرض المتاجر مع أنواعها
CREATE OR REPLACE VIEW tenants_with_store_types AS
SELECT 
    t.id,
    t.name,
    t.subscription_plan,
    t.subscription_status,
    t.subscription_expires_at,
    array_agg(
        json_build_object(
            'id', st.id,
            'code', st.code,
            'name_ar', st.name_ar,
            'name_en', st.name_en,
            'is_primary', tst.is_primary,
            'priority', tst.priority
        ) ORDER BY tst.is_primary DESC, tst.priority ASC
    ) AS store_types,
    COUNT(tst.id) AS store_types_count
FROM tenants t
LEFT JOIN tenant_store_types tst ON t.id = tst.tenant_id
LEFT JOIN store_types st ON tst.store_type_id = st.id
GROUP BY t.id, t.name, t.subscription_plan, t.subscription_status, t.subscription_expires_at;

COMMENT ON VIEW tenants_with_store_types IS 'عرض المتاجر مع جميع أنواعها';

-- View لعرض إعدادات الإشعارات مع أسماء الأنواع
CREATE OR REPLACE VIEW notification_settings_with_labels AS
SELECT 
    ns.*,
    CASE ns.notification_type
        WHEN 'create' THEN 'إضافة'
        WHEN 'update' THEN 'تعديل'
        WHEN 'delete' THEN 'حذف'
        WHEN 'upload_success' THEN 'رفع ناجح'
        WHEN 'upload_failed' THEN 'رفع فاشل'
        WHEN 'sync_success' THEN 'مزامنة ناجحة'
        WHEN 'sync_failed' THEN 'مزامنة فاشلة'
        WHEN 'alert' THEN 'تنبيه'
        WHEN 'system' THEN 'نظام'
        WHEN 'backup_success' THEN 'نسخ احتياطي ناجح'
        WHEN 'backup_failed' THEN 'نسخ احتياطي فاشل'
        WHEN 'subscription_expiring' THEN 'انتهاء اشتراك قريب'
        WHEN 'subscription_expired' THEN 'انتهاء اشتراك'
        WHEN 'low_stock' THEN 'مخزون منخفض'
        WHEN 'payment_received' THEN 'استلام دفعة'
        ELSE ns.notification_type
    END AS notification_type_label_ar
FROM notification_settings ns;

COMMENT ON VIEW notification_settings_with_labels IS 'عرض إعدادات الإشعارات مع الأسماء العربية';

-- ============================================
-- القسم 8: تعليقات الجداول
-- ============================================

COMMENT ON TABLE tenant_store_types IS 'العلاقة بين المتاجر وأنواع المتاجر (Many-to-Many)';
COMMENT ON TABLE notification_settings IS 'إعدادات الإشعارات لكل متجر';
COMMENT ON TABLE push_subscriptions IS 'اشتراكات Push Notifications للمستخدمين';
COMMENT ON TABLE push_notifications_log IS 'سجل الإشعارات الخارجية المرسلة';

COMMENT ON COLUMN tenant_store_types.is_primary IS 'نوع المتجر الرئيسي (يظهر في لوحة التحكم)';
COMMENT ON COLUMN tenant_store_types.priority IS 'الأولوية في العرض (الأقل أولوية أعلى)';
COMMENT ON COLUMN notification_settings.notification_type IS 'نوع الإشعار: create, update, delete, upload_success, upload_failed, sync_success, sync_failed, alert, system, etc.';
COMMENT ON COLUMN notification_settings.show_push IS 'تفعيل الإشعارات الخارجية (Push Notifications)';

-- ============================================
-- إنهاء السكريبت
-- ============================================

SELECT 'تم تنفيذ تحديثات قاعدة البيانات بنجاح!' AS result;

