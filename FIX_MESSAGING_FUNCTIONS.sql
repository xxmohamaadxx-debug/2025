-- إصلاح دوال نظام المراسلة المفقودة

-- ============================================
-- 1. إصلاح دالة get_user_conversations
-- ============================================
CREATE OR REPLACE FUNCTION get_user_conversations(p_user_id UUID, p_tenant_id UUID)
RETURNS TABLE(
    other_user_id UUID,
    other_user_name TEXT,
    other_user_email TEXT,
    last_message_text TEXT,
    last_message_time TIMESTAMPTZ,
    unread_count BIGINT,
    is_store_owner BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    WITH conversation_partners AS (
        SELECT DISTINCT
            CASE 
                WHEN sender_id = p_user_id THEN receiver_id
                ELSE sender_id
            END as partner_id
        FROM messages
        WHERE tenant_id = p_tenant_id
        AND (sender_id = p_user_id OR receiver_id = p_user_id)
    ),
    last_messages AS (
        SELECT DISTINCT ON (cp.partner_id)
            cp.partner_id,
            m.message_text,
            m.created_at,
            m.is_read,
            m.receiver_id = p_user_id as is_received
        FROM conversation_partners cp
        JOIN messages m ON (
            (m.sender_id = p_user_id AND m.receiver_id = cp.partner_id) OR
            (m.sender_id = cp.partner_id AND m.receiver_id = p_user_id)
        )
        WHERE m.tenant_id = p_tenant_id
        ORDER BY cp.partner_id, m.created_at DESC
    ),
    unread_counts AS (
        SELECT 
            CASE 
                WHEN sender_id = p_user_id THEN receiver_id
                ELSE sender_id
            END as partner_id,
            COUNT(*) as unread
        FROM messages
        WHERE tenant_id = p_tenant_id
        AND receiver_id = p_user_id
        AND is_read = false
        GROUP BY partner_id
    )
    SELECT 
        u.id,
        u.name,
        u.email,
        lm.message_text,
        lm.created_at,
        COALESCE(uc.unread, 0)::BIGINT,
        (u.role = 'Store Owner' OR u.role = 'store_owner')::BOOLEAN
    FROM conversation_partners cp
    JOIN users u ON u.id = cp.partner_id
    LEFT JOIN last_messages lm ON lm.partner_id = cp.partner_id
    LEFT JOIN unread_counts uc ON uc.partner_id = cp.partner_id
    WHERE u.tenant_id = p_tenant_id
    ORDER BY lm.created_at DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. إصلاح دالة auto_delete_old_messages
-- ============================================
CREATE OR REPLACE FUNCTION auto_delete_old_messages()
RETURNS TABLE(deleted_count INTEGER) AS $$
DECLARE
    deleted_rows INTEGER;
BEGIN
    DELETE FROM messages
    WHERE created_at < NOW() - INTERVAL '15 days';
    
    GET DIAGNOSTICS deleted_rows = ROW_COUNT;
    
    RETURN QUERY SELECT deleted_rows;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. دالة للحصول على جميع المستخدمين في نفس المتجر (للمحادثة)
-- ============================================
CREATE OR REPLACE FUNCTION get_tenant_users_for_messaging(p_tenant_id UUID, p_current_user_id UUID)
RETURNS TABLE(
    user_id UUID,
    user_name TEXT,
    user_email TEXT,
    user_role TEXT,
    is_store_owner BOOLEAN,
    has_conversation BOOLEAN,
    last_message_text TEXT,
    last_message_time TIMESTAMPTZ,
    unread_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH user_conversations AS (
        SELECT DISTINCT
            CASE 
                WHEN m.sender_id = p_current_user_id THEN m.receiver_id
                ELSE m.sender_id
            END as partner_id,
            MAX(m.created_at) as last_msg_time
        FROM messages m
        WHERE m.tenant_id = p_tenant_id
        AND (m.sender_id = p_current_user_id OR m.receiver_id = p_current_user_id)
        GROUP BY partner_id
    ),
    last_messages AS (
        SELECT DISTINCT ON (uc.partner_id)
            uc.partner_id,
            m.message_text,
            m.created_at
        FROM user_conversations uc
        JOIN messages m ON (
            (m.sender_id = p_current_user_id AND m.receiver_id = uc.partner_id) OR
            (m.sender_id = uc.partner_id AND m.receiver_id = p_current_user_id)
        )
        WHERE m.tenant_id = p_tenant_id
        ORDER BY uc.partner_id, m.created_at DESC
    ),
    unread_counts AS (
        SELECT 
            sender_id as partner_id,
            COUNT(*) as unread
        FROM messages
        WHERE tenant_id = p_tenant_id
        AND receiver_id = p_current_user_id
        AND is_read = false
        GROUP BY sender_id
    )
    SELECT 
        u.id,
        u.name,
        u.email,
        u.role,
        (u.role = 'Store Owner' OR u.role = 'store_owner')::BOOLEAN,
        (uc.partner_id IS NOT NULL)::BOOLEAN,
        lm.message_text,
        lm.created_at,
        COALESCE(unc.unread, 0)::BIGINT
    FROM users u
    LEFT JOIN user_conversations uc ON uc.partner_id = u.id
    LEFT JOIN last_messages lm ON lm.partner_id = u.id
    LEFT JOIN unread_counts unc ON unc.partner_id = u.id
    WHERE u.tenant_id = p_tenant_id
    AND u.id != p_current_user_id
    AND u.is_active = true
    ORDER BY 
        CASE WHEN uc.partner_id IS NOT NULL THEN 0 ELSE 1 END,
        lm.created_at DESC NULLS LAST,
        u.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. تحديث جدول messages إذا كان غير موجود
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message_text TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT same_tenant_check CHECK (
        (SELECT tenant_id FROM users WHERE id = sender_id) = tenant_id AND
        (SELECT tenant_id FROM users WHERE id = receiver_id) = tenant_id
    )
);

-- فهارس
CREATE INDEX IF NOT EXISTS idx_messages_tenant_id ON messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read);

-- RLS Policies
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS messages_tenant_isolation ON messages;
CREATE POLICY messages_tenant_isolation ON messages
    FOR ALL
    USING (
        tenant_id IN (
            SELECT tenant_id FROM users WHERE id = current_setting('app.current_user_id', true)::UUID
        )
    );

DROP POLICY IF EXISTS messages_send_policy ON messages;
CREATE POLICY messages_send_policy ON messages
    FOR INSERT
    WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM users WHERE id = current_setting('app.current_user_id', true)::UUID
        )
        AND sender_id = current_setting('app.current_user_id', true)::UUID
    );

DROP POLICY IF EXISTS messages_update_policy ON messages;
CREATE POLICY messages_update_policy ON messages
    FOR UPDATE
    USING (
        receiver_id = current_setting('app.current_user_id', true)::UUID
    );

-- تعليقات
COMMENT ON FUNCTION get_user_conversations(UUID, UUID) IS 'الحصول على جميع المحادثات للمستخدم في متجر معين';
COMMENT ON FUNCTION auto_delete_old_messages() IS 'حذف تلقائي للرسائل الأقدم من 15 يوم وإرجاع العدد';
COMMENT ON FUNCTION get_tenant_users_for_messaging(UUID, UUID) IS 'الحصول على جميع المستخدمين في المتجر للمحادثة مع معلومات المحادثات';

