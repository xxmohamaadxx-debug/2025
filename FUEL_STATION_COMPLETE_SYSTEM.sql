-- نظام متجر المحروقات الكامل
-- يشمل: أنواع المحروقات، المعاملات، المخزون، العملاء، الأسعار اليومية

-- ========== 1. أنواع المحروقات ==========
CREATE TABLE IF NOT EXISTS fuel_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name_ar TEXT NOT NULL,
    name_en TEXT,
    code TEXT NOT NULL,
    unit TEXT DEFAULT 'liter',
    description_ar TEXT,
    description_en TEXT,
    is_active BOOLEAN DEFAULT true,
    min_stock_level DECIMAL(10, 3) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, code)
);

-- ========== 2. الأسعار اليومية ==========
CREATE TABLE IF NOT EXISTS fuel_daily_prices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    fuel_type_id UUID NOT NULL REFERENCES fuel_types(id) ON DELETE CASCADE,
    price_date DATE NOT NULL,
    unit_price DECIMAL(10, 3) NOT NULL,
    currency TEXT DEFAULT 'TRY',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, fuel_type_id, price_date)
);

-- ========== 3. المعاملات (المشتريات والمبيعات) ==========
CREATE TABLE IF NOT EXISTS fuel_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    fuel_type_id UUID NOT NULL REFERENCES fuel_types(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase', 'sale', 'adjustment', 'loss')),
    quantity DECIMAL(10, 3) NOT NULL,
    unit_price DECIMAL(10, 3) NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'TRY',
    transaction_date DATE NOT NULL,
    supplier_id UUID REFERENCES partners(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES partners(id) ON DELETE SET NULL,
    vehicle_number TEXT,
    invoice_number TEXT,
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========== 4. عملاء المحروقات ==========
CREATE TABLE IF NOT EXISTS fuel_customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_type TEXT NOT NULL CHECK (customer_type IN ('individual', 'company')),
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    tax_number TEXT,
    commercial_license TEXT,
    credit_limit DECIMAL(10, 2) DEFAULT 0,
    current_balance DECIMAL(10, 2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    contract_start_date DATE,
    contract_end_date DATE,
    monthly_quota DECIMAL(10, 3),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========== 5. المخزون (يتم حسابه تلقائياً من المعاملات) ==========
-- يمكن إنشاء view أو جدول محسوب

-- ========== Indexes ==========
CREATE INDEX IF NOT EXISTS idx_fuel_types_tenant ON fuel_types(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fuel_types_code ON fuel_types(tenant_id, code);
CREATE INDEX IF NOT EXISTS idx_fuel_daily_prices_tenant ON fuel_daily_prices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fuel_daily_prices_fuel_type ON fuel_daily_prices(fuel_type_id);
CREATE INDEX IF NOT EXISTS idx_fuel_daily_prices_date ON fuel_daily_prices(price_date);
CREATE INDEX IF NOT EXISTS idx_fuel_transactions_tenant ON fuel_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fuel_transactions_fuel_type ON fuel_transactions(fuel_type_id);
CREATE INDEX IF NOT EXISTS idx_fuel_transactions_type ON fuel_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_fuel_transactions_date ON fuel_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_fuel_customers_tenant ON fuel_customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fuel_customers_type ON fuel_customers(customer_type);

-- ========== Triggers لتحديث updated_at ==========
CREATE OR REPLACE FUNCTION update_fuel_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_fuel_types_updated_at
    BEFORE UPDATE ON fuel_types
    FOR EACH ROW
    EXECUTE FUNCTION update_fuel_updated_at();

CREATE TRIGGER trigger_update_fuel_daily_prices_updated_at
    BEFORE UPDATE ON fuel_daily_prices
    FOR EACH ROW
    EXECUTE FUNCTION update_fuel_updated_at();

CREATE TRIGGER trigger_update_fuel_transactions_updated_at
    BEFORE UPDATE ON fuel_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_fuel_updated_at();

CREATE TRIGGER trigger_update_fuel_customers_updated_at
    BEFORE UPDATE ON fuel_customers
    FOR EACH ROW
    EXECUTE FUNCTION update_fuel_updated_at();

-- ========== View لحساب المخزون الحالي ==========
CREATE OR REPLACE VIEW fuel_inventory AS
SELECT 
    ft.tenant_id,
    ft.fuel_type_id,
    ftp.name_ar as fuel_name,
    ftp.name_en as fuel_name_en,
    ftp.code as fuel_code,
    ftp.unit,
    ftp.min_stock_level,
    COALESCE(
        SUM(CASE 
            WHEN ft.transaction_type = 'purchase' THEN ft.quantity
            WHEN ft.transaction_type = 'sale' THEN -ft.quantity
            WHEN ft.transaction_type = 'adjustment' THEN ft.quantity
            WHEN ft.transaction_type = 'loss' THEN -ft.quantity
            ELSE 0
        END), 
        0
    ) as quantity,
    CASE 
        WHEN COALESCE(
            SUM(CASE 
                WHEN ft.transaction_type = 'purchase' THEN ft.quantity
                WHEN ft.transaction_type = 'sale' THEN -ft.quantity
                WHEN ft.transaction_type = 'adjustment' THEN ft.quantity
                WHEN ft.transaction_type = 'loss' THEN -ft.quantity
                ELSE 0
            END), 
            0
        ) <= ftp.min_stock_level THEN 'low_stock'
        WHEN COALESCE(
            SUM(CASE 
                WHEN ft.transaction_type = 'purchase' THEN ft.quantity
                WHEN ft.transaction_type = 'sale' THEN -ft.quantity
                WHEN ft.transaction_type = 'adjustment' THEN ft.quantity
                WHEN ft.transaction_type = 'loss' THEN -ft.quantity
                ELSE 0
            END), 
            0
        ) >= (ftp.min_stock_level * 3) THEN 'high_stock'
        ELSE 'normal'
    END as stock_status,
    MAX(CASE WHEN ft.transaction_type = 'purchase' THEN ft.transaction_date END) as last_purchase_date,
    MAX(CASE WHEN ft.transaction_type = 'sale' THEN ft.transaction_date END) as last_sale_date
FROM fuel_types ftp
LEFT JOIN fuel_transactions ft ON ft.fuel_type_id = ftp.id
WHERE ftp.is_active = true
GROUP BY ft.tenant_id, ft.fuel_type_id, ftp.id, ftp.name_ar, ftp.name_en, ftp.code, ftp.unit, ftp.min_stock_level;

-- ========== دالة للحصول على المخزون ==========
CREATE OR REPLACE FUNCTION get_fuel_inventory(p_tenant_id UUID)
RETURNS TABLE(
    tenant_id UUID,
    fuel_type_id UUID,
    fuel_name TEXT,
    fuel_name_en TEXT,
    fuel_code TEXT,
    unit TEXT,
    min_stock_level DECIMAL,
    quantity DECIMAL,
    stock_status TEXT,
    last_purchase_date DATE,
    last_sale_date DATE
) AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM fuel_inventory
    WHERE fuel_inventory.tenant_id = p_tenant_id;
END;
$$ LANGUAGE plpgsql;

-- ========== RLS Policies ==========
ALTER TABLE fuel_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_daily_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_customers ENABLE ROW LEVEL SECURITY;

-- Policy: عزل البيانات حسب tenant_id
CREATE POLICY fuel_types_tenant_isolation ON fuel_types
    FOR ALL
    USING (tenant_id IN (
        SELECT tenant_id FROM users WHERE id = current_setting('app.current_user_id', true)::UUID
    ));

CREATE POLICY fuel_daily_prices_tenant_isolation ON fuel_daily_prices
    FOR ALL
    USING (tenant_id IN (
        SELECT tenant_id FROM users WHERE id = current_setting('app.current_user_id', true)::UUID
    ));

CREATE POLICY fuel_transactions_tenant_isolation ON fuel_transactions
    FOR ALL
    USING (tenant_id IN (
        SELECT tenant_id FROM users WHERE id = current_setting('app.current_user_id', true)::UUID
    ));

CREATE POLICY fuel_customers_tenant_isolation ON fuel_customers
    FOR ALL
    USING (tenant_id IN (
        SELECT tenant_id FROM users WHERE id = current_setting('app.current_user_id', true)::UUID
    ));

-- ========== Trigger للتحقق من صلاحية المتجر ==========
CREATE OR REPLACE FUNCTION ensure_tenant_active_fuel()
RETURNS TRIGGER AS $$
DECLARE
    v_tenant_data_suspended BOOLEAN;
BEGIN
    SELECT data_suspended INTO v_tenant_data_suspended
    FROM tenants
    WHERE id = NEW.tenant_id;
    
    IF v_tenant_data_suspended = true THEN
        RAISE EXCEPTION 'تم تعليق بيانات المتجر. يرجى التواصل مع المدير للتجديد.';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ensure_tenant_active_fuel_types
    BEFORE INSERT OR UPDATE ON fuel_types
    FOR EACH ROW
    EXECUTE FUNCTION ensure_tenant_active_fuel();

CREATE TRIGGER trigger_ensure_tenant_active_fuel_daily_prices
    BEFORE INSERT OR UPDATE ON fuel_daily_prices
    FOR EACH ROW
    EXECUTE FUNCTION ensure_tenant_active_fuel();

CREATE TRIGGER trigger_ensure_tenant_active_fuel_transactions
    BEFORE INSERT OR UPDATE ON fuel_transactions
    FOR EACH ROW
    EXECUTE FUNCTION ensure_tenant_active_fuel();

CREATE TRIGGER trigger_ensure_tenant_active_fuel_customers
    BEFORE INSERT OR UPDATE ON fuel_customers
    FOR EACH ROW
    EXECUTE FUNCTION ensure_tenant_active_fuel();

-- ========== تعليقات ==========
COMMENT ON TABLE fuel_types IS 'أنواع المحروقات (بنزين، ديزل، غاز)';
COMMENT ON TABLE fuel_daily_prices IS 'الأسعار اليومية لأنواع المحروقات';
COMMENT ON TABLE fuel_transactions IS 'معاملات المحروقات (مشتريات، مبيعات، تعديلات، فقد)';
COMMENT ON TABLE fuel_customers IS 'عملاء المحروقات (أفراد وشركات)';
COMMENT ON VIEW fuel_inventory IS 'مخزون المحروقات الحالي (محسوب من المعاملات)';

