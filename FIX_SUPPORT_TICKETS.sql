-- إصلاح جدول support_tickets - إضافة الأعمدة المفقودة

-- ============================================
-- 1. إنشاء جدول support_tickets إذا لم يكن موجوداً
-- ============================================
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    is_from_admin BOOLEAN DEFAULT false,
    admin_response TEXT,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. إضافة الأعمدة المفقودة إذا كان الجدول موجوداً
-- ============================================
ALTER TABLE support_tickets
ADD COLUMN IF NOT EXISTS admin_response TEXT,
ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_from_admin BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================
-- 3. إنشاء جدول support_messages إذا لم يكن موجوداً
-- ============================================
CREATE TABLE IF NOT EXISTS support_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    is_from_admin BOOLEAN DEFAULT false,
    attachments JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. إنشاء الفهارس
-- ============================================
CREATE INDEX IF NOT EXISTS idx_support_tickets_tenant_id ON support_tickets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_id ON support_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_user_id ON support_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_created_at ON support_messages(created_at DESC);

-- ============================================
-- 5. تحديث القيود (Constraints) إذا لزم الأمر
-- ============================================
-- إزالة القيود القديمة إذا كانت موجودة
DO $$ 
BEGIN
    -- إزالة constraint القديم إذا كان موجوداً
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'support_tickets_status_check' 
        AND conrelid = 'support_tickets'::regclass
    ) THEN
        ALTER TABLE support_tickets DROP CONSTRAINT support_tickets_status_check;
    END IF;
    
    -- إضافة constraint جديد
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'support_tickets_status_check' 
        AND conrelid = 'support_tickets'::regclass
    ) THEN
        ALTER TABLE support_tickets 
        ADD CONSTRAINT support_tickets_status_check 
        CHECK (status IN ('open', 'in_progress', 'resolved', 'closed'));
    END IF;
    
    -- إزالة constraint القديم للـ priority إذا كان موجوداً
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'support_tickets_priority_check' 
        AND conrelid = 'support_tickets'::regclass
    ) THEN
        ALTER TABLE support_tickets DROP CONSTRAINT support_tickets_priority_check;
    END IF;
    
    -- إضافة constraint جديد للـ priority
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'support_tickets_priority_check' 
        AND conrelid = 'support_tickets'::regclass
    ) THEN
        ALTER TABLE support_tickets 
        ADD CONSTRAINT support_tickets_priority_check 
        CHECK (priority IN ('low', 'medium', 'high', 'urgent'));
    END IF;
END $$;

-- ============================================
-- 6. RLS Policies (إذا لم تكن موجودة)
-- ============================================
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS support_tickets_tenant_isolation_policy ON support_tickets;
CREATE POLICY support_tickets_tenant_isolation_policy ON support_tickets
    FOR ALL
    USING (
        tenant_id IN (
            SELECT tenant_id FROM users 
            WHERE id = current_setting('app.user_id', true)::UUID
        )
    )
    WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM users 
            WHERE id = current_setting('app.user_id', true)::UUID
        )
    );

-- Allow super admin to see all tickets
DROP POLICY IF EXISTS support_tickets_super_admin_policy ON support_tickets;
CREATE POLICY support_tickets_super_admin_policy ON support_tickets
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = current_setting('app.user_id', true)::UUID 
            AND role = 'Super Admin'
        )
    );

-- RLS for support_messages
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS support_messages_tenant_isolation_policy ON support_messages;
CREATE POLICY support_messages_tenant_isolation_policy ON support_messages
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM support_tickets st
            JOIN users u ON u.tenant_id = st.tenant_id
            WHERE st.id = support_messages.ticket_id
            AND u.id = current_setting('app.user_id', true)::UUID
        )
    );

-- ============================================
-- 7. دالة لتحديث updated_at تلقائياً
-- ============================================
CREATE OR REPLACE FUNCTION update_support_ticket_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_support_ticket_updated_at ON support_tickets;
CREATE TRIGGER trigger_update_support_ticket_updated_at
    BEFORE UPDATE ON support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_support_ticket_updated_at();

-- تعليقات
COMMENT ON TABLE support_tickets IS 'جدول تذاكر الدعم الفني';
COMMENT ON TABLE support_messages IS 'جدول رسائل تذاكر الدعم';
COMMENT ON COLUMN support_tickets.admin_response IS 'رد المدير على التذكرة';
COMMENT ON COLUMN support_tickets.resolved_at IS 'تاريخ حل التذكرة';
COMMENT ON COLUMN support_tickets.resolved_by IS 'المستخدم الذي حل التذكرة';
COMMENT ON COLUMN support_tickets.assigned_to IS 'المستخدم المكلف بالتذكرة';

