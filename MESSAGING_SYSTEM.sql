-- نظام المراسلة بين مدير المتجر والمستخدمين
-- يتم حذف الرسائل تلقائياً بعد 15 يوم

-- جدول الرسائل
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
    
    -- التأكد من أن المرسل والمستقبل من نفس المتجر
    CONSTRAINT same_tenant_check CHECK (
        (SELECT tenant_id FROM users WHERE id = sender_id) = tenant_id AND
        (SELECT tenant_id FROM users WHERE id = receiver_id) = tenant_id
    )
);

-- فهرس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_messages_tenant_id ON messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read);

-- دالة لحذف الرسائل القديمة (أكثر من 15 يوم)
CREATE OR REPLACE FUNCTION delete_old_messages()
RETURNS void AS $$
BEGIN
    DELETE FROM messages
    WHERE created_at < NOW() - INTERVAL '15 days';
END;
$$ LANGUAGE plpgsql;

-- دالة لحذف الرسائل تلقائياً (يمكن استدعاؤها من cron job)
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
$$ LANGUAGE plpgsql;

-- Trigger لتحديث updated_at
CREATE OR REPLACE FUNCTION update_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_messages_updated_at
    BEFORE UPDATE ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_messages_updated_at();

-- دالة للحصول على المحادثات (conversations)
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
$$ LANGUAGE plpgsql;

-- دالة للحصول على رسائل محادثة معينة
CREATE OR REPLACE FUNCTION get_conversation_messages(
    p_user_id UUID,
    p_other_user_id UUID,
    p_tenant_id UUID,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
    id UUID,
    sender_id UUID,
    receiver_id UUID,
    message_text TEXT,
    is_read BOOLEAN,
    created_at TIMESTAMPTZ,
    is_sender BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.sender_id,
        m.receiver_id,
        m.message_text,
        m.is_read,
        m.created_at,
        (m.sender_id = p_user_id)::BOOLEAN as is_sender
    FROM messages m
    WHERE m.tenant_id = p_tenant_id
    AND (
        (m.sender_id = p_user_id AND m.receiver_id = p_other_user_id) OR
        (m.sender_id = p_other_user_id AND m.receiver_id = p_user_id)
    )
    ORDER BY m.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- دالة لتحديد الرسائل كمقروءة
CREATE OR REPLACE FUNCTION mark_messages_as_read(
    p_user_id UUID,
    p_other_user_id UUID,
    p_tenant_id UUID
)
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE messages
    SET is_read = true,
        read_at = NOW()
    WHERE tenant_id = p_tenant_id
    AND receiver_id = p_user_id
    AND sender_id = p_other_user_id
    AND is_read = false;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Policy: المستخدمون يمكنهم رؤية رسائلهم فقط
CREATE POLICY messages_tenant_isolation ON messages
    FOR ALL
    USING (
        tenant_id IN (
            SELECT tenant_id FROM users WHERE id = current_setting('app.current_user_id', true)::UUID
        )
    );

-- Policy: المستخدمون يمكنهم إرسال رسائل فقط للمستخدمين في نفس المتجر
CREATE POLICY messages_send_policy ON messages
    FOR INSERT
    WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM users WHERE id = current_setting('app.current_user_id', true)::UUID
        )
        AND sender_id = current_setting('app.current_user_id', true)::UUID
    );

-- Policy: المستخدمون يمكنهم تحديث رسائلهم المستقبلة فقط (تحديد كمقروءة)
CREATE POLICY messages_update_policy ON messages
    FOR UPDATE
    USING (
        receiver_id = current_setting('app.current_user_id', true)::UUID
    );

-- تعليق على الجدول
COMMENT ON TABLE messages IS 'جدول الرسائل بين مدير المتجر والمستخدمين - يتم حذف الرسائل تلقائياً بعد 15 يوم';
COMMENT ON COLUMN messages.message_text IS 'نص الرسالة فقط - لا وسائط';
COMMENT ON COLUMN messages.is_read IS 'هل تم قراءة الرسالة';
COMMENT ON FUNCTION delete_old_messages() IS 'حذف الرسائل الأقدم من 15 يوم';
COMMENT ON FUNCTION auto_delete_old_messages() IS 'حذف تلقائي للرسائل القديمة وإرجاع عدد المحذوفة';

