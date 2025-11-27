-- تقارير متقدمة (المشاريع، العملاء، الموردين)

-- ============================================
-- 1. تقرير المشاريع الشامل
-- ============================================
CREATE OR REPLACE FUNCTION get_project_comprehensive_report(
    p_tenant_id UUID,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL,
    p_status TEXT DEFAULT NULL
)
RETURNS TABLE(
    project_id UUID,
    project_name TEXT,
    project_status TEXT,
    start_date DATE,
    end_date DATE,
    total_budget NUMERIC(15, 2),
    total_spent NUMERIC(15, 2),
    total_remaining NUMERIC(15, 2),
    completion_percentage NUMERIC(5, 2),
    items_count BIGINT,
    materials_delivered_count BIGINT,
    materials_delivered_value NUMERIC(15, 2),
    currency TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cp.id as project_id,
        cp.name_ar as project_name,
        cp.status as project_status,
        cp.start_date,
        cp.end_date,
        COALESCE(SUM(pi.quantity * pi.unit_price), 0) as total_budget,
        COALESCE(SUM(md.quantity * md.unit_price), 0) as total_spent,
        (COALESCE(SUM(pi.quantity * pi.unit_price), 0) - COALESCE(SUM(md.quantity * md.unit_price), 0)) as total_remaining,
        CASE 
            WHEN COALESCE(SUM(pi.quantity * pi.unit_price), 0) > 0 THEN
                (COALESCE(SUM(md.quantity * md.unit_price), 0) / COALESCE(SUM(pi.quantity * pi.unit_price), 1)) * 100
            ELSE 0
        END as completion_percentage,
        COUNT(DISTINCT pi.id) as items_count,
        COUNT(DISTINCT md.id) as materials_delivered_count,
        COALESCE(SUM(md.quantity * md.unit_price), 0) as materials_delivered_value,
        COALESCE(MAX(cp.currency), 'TRY') as currency
    FROM contractor_projects cp
    LEFT JOIN project_items pi ON pi.project_id = cp.id AND pi.tenant_id = cp.tenant_id
    LEFT JOIN material_deliveries md ON md.project_id = cp.id AND md.tenant_id = cp.tenant_id
    WHERE cp.tenant_id = p_tenant_id
    AND (p_start_date IS NULL OR cp.start_date >= p_start_date)
    AND (p_end_date IS NULL OR cp.end_date <= p_end_date)
    AND (p_status IS NULL OR cp.status = p_status)
    GROUP BY cp.id, cp.name_ar, cp.status, cp.start_date, cp.end_date
    ORDER BY cp.start_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. تقرير العملاء الشامل
-- ============================================
CREATE OR REPLACE FUNCTION get_customer_comprehensive_report(
    p_tenant_id UUID,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS TABLE(
    partner_id UUID,
    partner_name TEXT,
    partner_type TEXT,
    total_invoices BIGINT,
    total_invoice_amount NUMERIC(15, 2),
    total_paid NUMERIC(15, 2),
    total_balance NUMERIC(15, 2),
    currency TEXT,
    last_transaction_date TIMESTAMPTZ,
    account_balance NUMERIC(15, 2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as partner_id,
        p.name as partner_name,
        p.type as partner_type,
        COUNT(DISTINCT io.id) as total_invoices,
        COALESCE(SUM(io.amount), 0) as total_invoice_amount,
        COALESCE(SUM(
            CASE 
                WHEN io.status = 'Paid' THEN io.amount
                ELSE 0
            END
        ), 0) as total_paid,
        COALESCE(SUM(
            CASE 
                WHEN io.status != 'Paid' THEN io.amount
                ELSE 0
            END
        ), 0) as total_balance,
        COALESCE(MAX(io.currency), 'TRY') as currency,
        MAX(io.created_at) as last_transaction_date,
        COALESCE(ab.balance, 0) as account_balance
    FROM partners p
    LEFT JOIN invoices_out io ON io.partner_id = p.id AND io.tenant_id = p.tenant_id
    LEFT JOIN account_balances ab ON ab.partner_id = p.id 
        AND ab.tenant_id = p.tenant_id 
        AND ab.account_type = 'receivable'
    WHERE p.tenant_id = p_tenant_id
    AND p.type = 'Customer'
    AND (p_start_date IS NULL OR io.date >= p_start_date)
    AND (p_end_date IS NULL OR io.date <= p_end_date)
    GROUP BY p.id, p.name, p.type, ab.balance
    ORDER BY total_invoice_amount DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. تقرير الموردين الشامل
-- ============================================
CREATE OR REPLACE FUNCTION get_vendor_comprehensive_report(
    p_tenant_id UUID,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS TABLE(
    partner_id UUID,
    partner_name TEXT,
    partner_type TEXT,
    total_invoices BIGINT,
    total_invoice_amount NUMERIC(15, 2),
    total_paid NUMERIC(15, 2),
    total_balance NUMERIC(15, 2),
    currency TEXT,
    last_transaction_date TIMESTAMPTZ,
    account_balance NUMERIC(15, 2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as partner_id,
        p.name as partner_name,
        p.type as partner_type,
        COUNT(DISTINCT ii.id) as total_invoices,
        COALESCE(SUM(ii.amount), 0) as total_invoice_amount,
        COALESCE(SUM(
            CASE 
                WHEN ii.status = 'Paid' THEN ii.amount
                ELSE 0
            END
        ), 0) as total_paid,
        COALESCE(SUM(
            CASE 
                WHEN ii.status != 'Paid' THEN ii.amount
                ELSE 0
            END
        ), 0) as total_balance,
        COALESCE(MAX(ii.currency), 'TRY') as currency,
        MAX(ii.created_at) as last_transaction_date,
        COALESCE(ab.balance, 0) as account_balance
    FROM partners p
    LEFT JOIN invoices_in ii ON ii.partner_id = p.id AND ii.tenant_id = p.tenant_id
    LEFT JOIN account_balances ab ON ab.partner_id = p.id 
        AND ab.tenant_id = p.tenant_id 
        AND ab.account_type = 'payable'
    WHERE p.tenant_id = p_tenant_id
    AND p.type = 'Vendor'
    AND (p_start_date IS NULL OR ii.date >= p_start_date)
    AND (p_end_date IS NULL OR ii.date <= p_end_date)
    GROUP BY p.id, p.name, p.type, ab.balance
    ORDER BY total_invoice_amount DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. تقرير المبيعات الشهري
-- ============================================
CREATE OR REPLACE FUNCTION get_monthly_sales_report(
    p_tenant_id UUID,
    p_year INTEGER,
    p_month INTEGER DEFAULT NULL
)
RETURNS TABLE(
    month_number INTEGER,
    month_name TEXT,
    total_invoices BIGINT,
    total_amount NUMERIC(15, 2),
    paid_amount NUMERIC(15, 2),
    pending_amount NUMERIC(15, 2),
    currency TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        EXTRACT(MONTH FROM io.date)::INTEGER as month_number,
        TO_CHAR(io.date, 'Month') as month_name,
        COUNT(*) as total_invoices,
        COALESCE(SUM(io.amount), 0) as total_amount,
        COALESCE(SUM(
            CASE WHEN io.status = 'Paid' THEN io.amount ELSE 0 END
        ), 0) as paid_amount,
        COALESCE(SUM(
            CASE WHEN io.status != 'Paid' THEN io.amount ELSE 0 END
        ), 0) as pending_amount,
        COALESCE(MAX(io.currency), 'TRY') as currency
    FROM invoices_out io
    WHERE io.tenant_id = p_tenant_id
    AND EXTRACT(YEAR FROM io.date) = p_year
    AND (p_month IS NULL OR EXTRACT(MONTH FROM io.date) = p_month)
    GROUP BY EXTRACT(MONTH FROM io.date), TO_CHAR(io.date, 'Month')
    ORDER BY month_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. تقرير المشتريات الشهري
-- ============================================
CREATE OR REPLACE FUNCTION get_monthly_purchases_report(
    p_tenant_id UUID,
    p_year INTEGER,
    p_month INTEGER DEFAULT NULL
)
RETURNS TABLE(
    month_number INTEGER,
    month_name TEXT,
    total_invoices BIGINT,
    total_amount NUMERIC(15, 2),
    paid_amount NUMERIC(15, 2),
    pending_amount NUMERIC(15, 2),
    currency TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        EXTRACT(MONTH FROM ii.date)::INTEGER as month_number,
        TO_CHAR(ii.date, 'Month') as month_name,
        COUNT(*) as total_invoices,
        COALESCE(SUM(ii.amount), 0) as total_amount,
        COALESCE(SUM(
            CASE WHEN ii.status = 'Paid' THEN ii.amount ELSE 0 END
        ), 0) as paid_amount,
        COALESCE(SUM(
            CASE WHEN ii.status != 'Paid' THEN ii.amount ELSE 0 END
        ), 0) as pending_amount,
        COALESCE(MAX(ii.currency), 'TRY') as currency
    FROM invoices_in ii
    WHERE ii.tenant_id = p_tenant_id
    AND EXTRACT(YEAR FROM ii.date) = p_year
    AND (p_month IS NULL OR EXTRACT(MONTH FROM ii.date) = p_month)
    GROUP BY EXTRACT(MONTH FROM ii.date), TO_CHAR(ii.date, 'Month')
    ORDER BY month_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. تقرير المخزون الشامل
-- ============================================
CREATE OR REPLACE FUNCTION get_inventory_comprehensive_report(
    p_tenant_id UUID
)
RETURNS TABLE(
    item_id UUID,
    item_name TEXT,
    item_code TEXT,
    current_quantity NUMERIC(10, 2),
    min_stock NUMERIC(10, 2),
    unit_price NUMERIC(15, 2),
    total_value NUMERIC(15, 2),
    currency TEXT,
    is_low_stock BOOLEAN,
    inbound_transactions BIGINT,
    outbound_transactions BIGINT,
    last_transaction_date TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ii.id as item_id,
        ii.name as item_name,
        ii.sku as item_code,
        ii.quantity as current_quantity,
        ii.min_stock,
        ii.price as unit_price,
        (ii.quantity * ii.price) as total_value,
        COALESCE(ii.currency, 'TRY') as currency,
        (ii.quantity <= ii.min_stock) as is_low_stock,
        COUNT(DISTINCT CASE WHEN it.transaction_type = 'inbound' THEN it.id END) as inbound_transactions,
        COUNT(DISTINCT CASE WHEN it.transaction_type = 'outbound' THEN it.id END) as outbound_transactions,
        MAX(it.transaction_date) as last_transaction_date
    FROM inventory_items ii
    LEFT JOIN inventory_transactions it ON it.inventory_item_id = ii.id AND it.tenant_id = ii.tenant_id
    WHERE ii.tenant_id = p_tenant_id
    GROUP BY ii.id, ii.name, ii.sku, ii.quantity, ii.min_stock, ii.price, ii.currency
    ORDER BY total_value DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- تعليقات
COMMENT ON FUNCTION get_project_comprehensive_report(UUID, DATE, DATE, TEXT) IS 'تقرير شامل للمشاريع';
COMMENT ON FUNCTION get_customer_comprehensive_report(UUID, DATE, DATE) IS 'تقرير شامل للعملاء';
COMMENT ON FUNCTION get_vendor_comprehensive_report(UUID, DATE, DATE) IS 'تقرير شامل للموردين';
COMMENT ON FUNCTION get_monthly_sales_report(UUID, INTEGER, INTEGER) IS 'تقرير المبيعات الشهري';
COMMENT ON FUNCTION get_monthly_purchases_report(UUID, INTEGER, INTEGER) IS 'تقرير المشتريات الشهري';
COMMENT ON FUNCTION get_inventory_comprehensive_report(UUID) IS 'تقرير شامل للمخزون';

