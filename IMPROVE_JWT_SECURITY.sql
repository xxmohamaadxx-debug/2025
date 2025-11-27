-- تحسين نظام الأمان (JWT + Refresh Tokens)

-- ============================================
-- 1. جدول Refresh Tokens
-- ============================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    device_info TEXT,
    ip_address TEXT,
    is_revoked BOOLEAN DEFAULT false,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. جدول Access Tokens (اختياري - للتتبع)
-- ============================================
CREATE TABLE IF NOT EXISTS access_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    refresh_token_id UUID REFERENCES refresh_tokens(id) ON DELETE CASCADE,
    token_jti TEXT UNIQUE, -- JWT ID
    expires_at TIMESTAMPTZ NOT NULL,
    is_revoked BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. جدول محاولات تسجيل الدخول الفاشلة
-- ============================================
CREATE TABLE IF NOT EXISTS failed_login_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    attempted_at TIMESTAMPTZ DEFAULT NOW(),
    is_blocked BOOLEAN DEFAULT false
);

-- ============================================
-- 4. دالة لإنشاء Refresh Token
-- ============================================
CREATE OR REPLACE FUNCTION create_refresh_token(
    p_user_id UUID,
    p_tenant_id UUID,
    p_token_hash TEXT,
    p_device_info TEXT DEFAULT NULL,
    p_ip_address TEXT DEFAULT NULL,
    p_expires_in_days INTEGER DEFAULT 30
)
RETURNS UUID AS $$
DECLARE
    v_token_id UUID;
BEGIN
    -- حذف الـ tokens المنتهية الصلاحية
    DELETE FROM refresh_tokens
    WHERE expires_at < NOW() OR is_revoked = true;
    
    -- إنشاء token جديد
    INSERT INTO refresh_tokens (
        user_id,
        tenant_id,
        token_hash,
        expires_at,
        device_info,
        ip_address
    ) VALUES (
        p_user_id,
        p_tenant_id,
        p_token_hash,
        NOW() + (p_expires_in_days || ' days')::INTERVAL,
        p_device_info,
        p_ip_address
    )
    RETURNING id INTO v_token_id;
    
    RETURN v_token_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. دالة للتحقق من Refresh Token
-- ============================================
CREATE OR REPLACE FUNCTION verify_refresh_token(
    p_token_hash TEXT
)
RETURNS TABLE(
    user_id UUID,
    tenant_id UUID,
    token_id UUID,
    is_valid BOOLEAN
) AS $$
DECLARE
    v_token RECORD;
BEGIN
    SELECT * INTO v_token
    FROM refresh_tokens
    WHERE token_hash = p_token_hash
    AND is_revoked = false
    AND expires_at > NOW();
    
    IF FOUND THEN
        -- تحديث last_used_at
        UPDATE refresh_tokens
        SET last_used_at = NOW()
        WHERE id = v_token.id;
        
        RETURN QUERY SELECT
            v_token.user_id,
            v_token.tenant_id,
            v_token.id,
            true;
    ELSE
        RETURN QUERY SELECT
            NULL::UUID,
            NULL::UUID,
            NULL::UUID,
            false;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. دالة لإلغاء Refresh Token
-- ============================================
CREATE OR REPLACE FUNCTION revoke_refresh_token(
    p_token_hash TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE refresh_tokens
    SET is_revoked = true,
        revoked_at = NOW()
    WHERE token_hash = p_token_hash
    AND is_revoked = false;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. دالة لإلغاء جميع Refresh Tokens لمستخدم
-- ============================================
CREATE OR REPLACE FUNCTION revoke_all_user_tokens(
    p_user_id UUID
)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE refresh_tokens
    SET is_revoked = true,
        revoked_at = NOW()
    WHERE user_id = p_user_id
    AND is_revoked = false;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 8. دالة لتسجيل محاولة تسجيل دخول فاشلة
-- ============================================
CREATE OR REPLACE FUNCTION log_failed_login(
    p_email TEXT,
    p_ip_address TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    v_attempt_count INTEGER;
BEGIN
    -- تسجيل المحاولة
    INSERT INTO failed_login_attempts (email, ip_address, user_agent)
    VALUES (p_email, p_ip_address, p_user_agent);
    
    -- التحقق من عدد المحاولات (آخر 15 دقيقة)
    SELECT COUNT(*) INTO v_attempt_count
    FROM failed_login_attempts
    WHERE email = p_email
    AND attempted_at > NOW() - INTERVAL '15 minutes'
    AND is_blocked = false;
    
    -- إذا كانت المحاولات أكثر من 5، قم بتعطيل الحساب مؤقتاً
    IF v_attempt_count >= 5 THEN
        UPDATE failed_login_attempts
        SET is_blocked = true
        WHERE email = p_email
        AND attempted_at > NOW() - INTERVAL '15 minutes'
        AND is_blocked = false;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 9. دالة للتحقق من حظر الحساب
-- ============================================
CREATE OR REPLACE FUNCTION is_account_blocked(
    p_email TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_blocked_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_blocked_count
    FROM failed_login_attempts
    WHERE email = p_email
    AND is_blocked = true
    AND attempted_at > NOW() - INTERVAL '15 minutes';
    
    RETURN v_blocked_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 10. دالة لتنظيف البيانات القديمة
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_old_auth_data()
RETURNS TABLE(
    deleted_tokens INTEGER,
    deleted_attempts INTEGER
) AS $$
DECLARE
    v_tokens INTEGER;
    v_attempts INTEGER;
BEGIN
    -- حذف Refresh Tokens المنتهية منذ أكثر من 30 يوم
    DELETE FROM refresh_tokens
    WHERE expires_at < NOW() - INTERVAL '30 days'
    OR (is_revoked = true AND revoked_at < NOW() - INTERVAL '30 days');
    
    GET DIAGNOSTICS v_tokens = ROW_COUNT;
    
    -- حذف Access Tokens المنتهية منذ أكثر من 7 أيام
    DELETE FROM access_tokens
    WHERE expires_at < NOW() - INTERVAL '7 days';
    
    -- حذف محاولات تسجيل الدخول القديمة (أكثر من 30 يوم)
    DELETE FROM failed_login_attempts
    WHERE attempted_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS v_attempts = ROW_COUNT;
    
    RETURN QUERY SELECT v_tokens, v_attempts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 11. إنشاء الفهارس
-- ============================================
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_is_revoked ON refresh_tokens(is_revoked) WHERE is_revoked = false;

CREATE INDEX IF NOT EXISTS idx_access_tokens_user_id ON access_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_access_tokens_token_jti ON access_tokens(token_jti);
CREATE INDEX IF NOT EXISTS idx_access_tokens_expires_at ON access_tokens(expires_at);

CREATE INDEX IF NOT EXISTS idx_failed_login_email ON failed_login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_failed_login_attempted_at ON failed_login_attempts(attempted_at);
CREATE INDEX IF NOT EXISTS idx_failed_login_is_blocked ON failed_login_attempts(is_blocked) WHERE is_blocked = true;

-- ============================================
-- 12. جدول زمني لتنظيف البيانات القديمة
-- ============================================
-- يمكن إضافة هذا كـ cron job أو scheduled task
-- SELECT cron.schedule('cleanup-auth-data', '0 2 * * *', 'SELECT cleanup_old_auth_data()');

-- تعليقات
COMMENT ON TABLE refresh_tokens IS 'جدول Refresh Tokens للمستخدمين';
COMMENT ON TABLE access_tokens IS 'جدول Access Tokens (JWT) للمستخدمين';
COMMENT ON TABLE failed_login_attempts IS 'جدول محاولات تسجيل الدخول الفاشلة';
COMMENT ON FUNCTION create_refresh_token(UUID, UUID, TEXT, TEXT, TEXT, INTEGER) IS 'إنشاء Refresh Token جديد';
COMMENT ON FUNCTION verify_refresh_token(TEXT) IS 'التحقق من صحة Refresh Token';
COMMENT ON FUNCTION revoke_refresh_token(TEXT) IS 'إلغاء Refresh Token';
COMMENT ON FUNCTION revoke_all_user_tokens(UUID) IS 'إلغاء جميع Refresh Tokens لمستخدم';
COMMENT ON FUNCTION log_failed_login(TEXT, TEXT, TEXT) IS 'تسجيل محاولة تسجيل دخول فاشلة';
COMMENT ON FUNCTION is_account_blocked(TEXT) IS 'التحقق من حظر الحساب';
COMMENT ON FUNCTION cleanup_old_auth_data() IS 'تنظيف البيانات القديمة (Tokens والمحاولات)';

