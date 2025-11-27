-- نظام المصاريف اليومية الخارجية
-- يمكن استخدامه في جميع المتاجر لتسجيل المصاريف الخارجية

-- ========== جدول المصاريف اليومية ==========
CREATE TABLE IF NOT EXISTS daily_expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount DECIMAL(15, 2) NOT NULL,
    currency TEXT DEFAULT 'TRY',
    category TEXT NOT NULL, -- مثل: كهرباء، ماء، إيجار، صيانة، مواصلات، إعلانات، إلخ
    description TEXT,
    payment_method TEXT DEFAULT 'cash', -- cash, transfer, credit_card
    receipt_number TEXT,
    supplier_name TEXT,
    employee_id UUID REFERENCES users(id) ON DELETE SET NULL, -- الموظف المسؤول عن المصروف
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========== Indexes ==========
CREATE INDEX IF NOT EXISTS idx_daily_expenses_tenant_id ON daily_expenses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_daily_expenses_date ON daily_expenses(expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_expenses_category ON daily_expenses(category);
CREATE INDEX IF NOT EXISTS idx_daily_expenses_currency ON daily_expenses(currency);

-- ========== Trigger لتحديث updated_at ==========
CREATE TRIGGER trigger_update_daily_expenses_updated_at
    BEFORE UPDATE ON daily_expenses
    FOR EACH ROW
    EXECUTE FUNCTION update_fuel_updated_at();

-- ========== RLS Policy ==========
ALTER TABLE daily_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY daily_expenses_tenant_isolation ON daily_expenses
    FOR ALL
    USING (tenant_id IN (
        SELECT tenant_id FROM users WHERE id = current_setting('app.current_user_id', true)::UUID
    ));

-- ========== Trigger للتحقق من صلاحية المتجر ==========
CREATE TRIGGER trigger_ensure_tenant_active_daily_expenses
    BEFORE INSERT OR UPDATE ON daily_expenses
    FOR EACH ROW
    EXECUTE FUNCTION ensure_tenant_active_fuel();

-- ========== View لتجميع المصاريف حسب الفئة ==========
CREATE OR REPLACE VIEW daily_expenses_summary AS
SELECT 
    tenant_id,
    expense_date,
    category,
    currency,
    COUNT(*) as expense_count,
    SUM(amount) as total_amount
FROM daily_expenses
GROUP BY tenant_id, expense_date, category, currency;

-- ========== دالة للحصول على إجمالي المصاريف لفترة معينة ==========
CREATE OR REPLACE FUNCTION get_expenses_total(
    p_tenant_id UUID,
    p_start_date DATE,
    p_end_date DATE,
    p_currency TEXT DEFAULT NULL
)
RETURNS TABLE(
    category TEXT,
    currency TEXT,
    total_amount DECIMAL,
    expense_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        de.category,
        de.currency,
        SUM(de.amount) as total_amount,
        COUNT(*) as expense_count
    FROM daily_expenses de
    WHERE de.tenant_id = p_tenant_id
      AND de.expense_date BETWEEN p_start_date AND p_end_date
      AND (p_currency IS NULL OR de.currency = p_currency)
    GROUP BY de.category, de.currency
    ORDER BY total_amount DESC;
END;
$$ LANGUAGE plpgsql;

-- ========== تعليقات ==========
COMMENT ON TABLE daily_expenses IS 'المصاريف اليومية الخارجية لجميع المتاجر';
COMMENT ON COLUMN daily_expenses.category IS 'فئة المصروف (كهرباء، ماء، إيجار، صيانة، مواصلات، إعلانات، إلخ)';
COMMENT ON COLUMN daily_expenses.payment_method IS 'طريقة الدفع (كاش، حوالة، بطاقة)';
COMMENT ON COLUMN daily_expenses.employee_id IS 'الموظف المسؤول عن المصروف';

