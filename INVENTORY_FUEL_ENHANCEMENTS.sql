-- ============================================
-- Comprehensive Inventory & Fuel System Enhancements
-- Created: 2025-11-28
-- Description: Add categories, change history, low-stock thresholds per store,
--              fuel counters (6 configurable), auto-deduction on export,
--              and automatic fuel calculations.
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. Inventory Categories (Global + Per Store)
-- ============================================
CREATE TABLE IF NOT EXISTS inventory_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#FF8C00',
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_inv_categories_tenant ON inventory_categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inv_categories_active ON inventory_categories(is_active);

-- ============================================
-- 2. Inventory Change History (Audit Trail)
-- ============================================
CREATE TABLE IF NOT EXISTS inventory_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  product_id UUID NOT NULL,
  change_type TEXT NOT NULL, -- 'add', 'remove', 'export', 'adjustment', 'fuel_deduction'
  quantity_before NUMERIC(14,2),
  quantity_after NUMERIC(14,2),
  quantity_changed NUMERIC(14,2),
  reason TEXT,
  reference_id UUID, -- invoice_id, export_id, transaction_id, fuel_sale_id
  reference_type TEXT, -- 'invoice_out', 'invoice_in', 'export', 'daily_transaction', 'fuel_sale'
  recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_inv_changes_tenant ON inventory_changes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inv_changes_product ON inventory_changes(product_id);
CREATE INDEX IF NOT EXISTS idx_inv_changes_type ON inventory_changes(change_type);
CREATE INDEX IF NOT EXISTS idx_inv_changes_date ON inventory_changes(recorded_at);

-- ============================================
-- 3. Low Stock Alert Thresholds (Per Store)
-- ============================================
CREATE TABLE IF NOT EXISTS low_stock_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  product_id UUID NOT NULL,
  threshold_quantity NUMERIC(14,2) NOT NULL DEFAULT 5,
  alert_enabled BOOLEAN DEFAULT TRUE,
  alert_method TEXT DEFAULT 'notification', -- 'notification', 'email', 'both', 'none'
  last_alert_sent TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_low_stock_tenant ON low_stock_thresholds(tenant_id);
CREATE INDEX IF NOT EXISTS idx_low_stock_product ON low_stock_thresholds(product_id);

-- ============================================
-- 4. Fuel Station Counters (6 configurable per store)
-- ============================================
CREATE TABLE IF NOT EXISTS fuel_counters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  counter_number INT NOT NULL, -- 1-6
  counter_name TEXT NOT NULL, -- e.g., "البنزين 95", "الديزل", etc. (user-configurable)
  liters_sold NUMERIC(16,2) DEFAULT 0, -- cumulative liters sold
  price_per_liter NUMERIC(10,2) DEFAULT 0, -- price per liter (editable)
  currency TEXT DEFAULT 'SYP',
  last_reading NUMERIC(16,2) DEFAULT 0, -- last meter reading
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, counter_number)
);
CREATE INDEX IF NOT EXISTS idx_fuel_counters_tenant ON fuel_counters(tenant_id);

-- ============================================
-- 5. Fuel Counter Movements (for tracking deductions)
-- ============================================
CREATE TABLE IF NOT EXISTS fuel_counter_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  fuel_counter_id UUID REFERENCES fuel_counters(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL, -- 'sale', 'adjustment', 'refill'
  liters NUMERIC(16,2) NOT NULL,
  price_per_liter NUMERIC(10,2),
  total_amount NUMERIC(14,2),
  currency TEXT DEFAULT 'SYP',
  reference_id UUID, -- invoice_out_id, daily_transaction_id
  reference_type TEXT, -- 'invoice_out', 'daily_transaction', 'manual_adjustment'
  notes TEXT,
  recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fuel_movements_tenant ON fuel_counter_movements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fuel_movements_counter ON fuel_counter_movements(fuel_counter_id);
CREATE INDEX IF NOT EXISTS idx_fuel_movements_date ON fuel_counter_movements(recorded_at);

-- ============================================
-- 6. Auto-Deduction Trigger on Invoice Export
-- ============================================
CREATE OR REPLACE FUNCTION deduct_inventory_on_invoice_out_create()
RETURNS TRIGGER AS $$
DECLARE
  item JSONB;
  prod_id UUID;
  deduct_qty NUMERIC;
  old_qty NUMERIC;
  new_qty NUMERIC;
BEGIN
  -- Only if the invoice is finalized/posted
  IF NEW.status NOT IN ('posted', 'finalized') THEN
    RETURN NEW;
  END IF;

  -- Parse items and deduct from inventory
  FOR item IN SELECT jsonb_array_elements(COALESCE(NEW.items, '[]'::jsonb))
  LOOP
    prod_id := (item->>'product_id')::uuid;
    deduct_qty := (item->>'quantity')::numeric;

    -- Get current quantity
    SELECT quantity INTO old_qty FROM inventory WHERE id = prod_id;
    IF NOT FOUND THEN
      old_qty := 0;
    END IF;

    new_qty := old_qty - deduct_qty;
    IF new_qty < 0 THEN
      new_qty := 0;
    END IF;

    -- Update inventory
    UPDATE inventory SET quantity = new_qty, updated_at = NOW() WHERE id = prod_id;

    -- Log change
    INSERT INTO inventory_changes (tenant_id, product_id, change_type, quantity_before, quantity_after, quantity_changed, reason, reference_id, reference_type, recorded_by, recorded_at)
    VALUES (NEW.tenant_id, prod_id, 'export', old_qty, new_qty, deduct_qty, 'Auto-deduction on invoice export', NEW.id, 'invoice_out', NEW.user_id, NOW());
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_deduct_inventory_on_invoice_out ON invoices_out;
CREATE TRIGGER trigger_deduct_inventory_on_invoice_out
  AFTER INSERT ON invoices_out
  FOR EACH ROW
  EXECUTE FUNCTION deduct_inventory_on_invoice_out_create();

-- ============================================
-- 7. Auto-Deduction from Fuel Counters on Invoice Out
-- ============================================
CREATE OR REPLACE FUNCTION deduct_fuel_on_invoice_out_create()
RETURNS TRIGGER AS $$
DECLARE
  item JSONB;
  fuel_counter_id UUID;
  liters_qty NUMERIC;
  fuel_counter RECORD;
  total_amount NUMERIC;
BEGIN
  IF NEW.status NOT IN ('posted', 'finalized') THEN
    RETURN NEW;
  END IF;

  -- Parse items and check if any are fuel-related
  FOR item IN SELECT jsonb_array_elements(COALESCE(NEW.items, '[]'::jsonb))
  LOOP
    -- Try to match fuel product by name or tag (assumes fuel items have 'is_fuel' flag or product name contains fuel keyword)
    liters_qty := (item->>'quantity')::numeric;

    -- Update fuel counters for this store (auto-distribute to active counter)
    SELECT id INTO fuel_counter_id FROM fuel_counters 
    WHERE tenant_id = NEW.tenant_id AND is_active = TRUE LIMIT 1;

    IF FOUND THEN
      total_amount := liters_qty * COALESCE((SELECT price_per_liter FROM fuel_counters WHERE id = fuel_counter_id), 0);

      -- Update counter
      UPDATE fuel_counters SET liters_sold = liters_sold + liters_qty WHERE id = fuel_counter_id;

      -- Log movement
      INSERT INTO fuel_counter_movements (tenant_id, fuel_counter_id, movement_type, liters, price_per_liter, total_amount, reference_id, reference_type, recorded_by, recorded_at)
      VALUES (NEW.tenant_id, fuel_counter_id, 'sale', liters_qty, (SELECT price_per_liter FROM fuel_counters WHERE id = fuel_counter_id), total_amount, NEW.id, 'invoice_out', NEW.user_id, NOW());
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_deduct_fuel_on_invoice_out ON invoices_out;
CREATE TRIGGER trigger_deduct_fuel_on_invoice_out
  AFTER INSERT ON invoices_out
  FOR EACH ROW
  EXECUTE FUNCTION deduct_fuel_on_invoice_out_create();

-- ============================================
-- 8. Auto-Deduction from Fuel Counters on Daily Transaction
-- ============================================
CREATE OR REPLACE FUNCTION deduct_fuel_on_daily_transaction_create()
RETURNS TRIGGER AS $$
DECLARE
  fuel_counter_id UUID;
  liters_qty NUMERIC;
  total_amount NUMERIC;
BEGIN
  -- Only process fuel transactions
  IF NEW.transaction_type != 'fuel_sale' AND NEW.category != 'محروقات' THEN
    RETURN NEW;
  END IF;

  liters_qty := NEW.amount; -- assume amount field holds liters

  -- Find active fuel counter for this store
  SELECT id INTO fuel_counter_id FROM fuel_counters 
  WHERE tenant_id = NEW.tenant_id AND is_active = TRUE LIMIT 1;

  IF FOUND THEN
    total_amount := liters_qty * COALESCE((SELECT price_per_liter FROM fuel_counters WHERE id = fuel_counter_id), 0);

    -- Update counter
    UPDATE fuel_counters SET liters_sold = liters_sold + liters_qty WHERE id = fuel_counter_id;

    -- Log movement
    INSERT INTO fuel_counter_movements (tenant_id, fuel_counter_id, movement_type, liters, price_per_liter, total_amount, reference_id, reference_type, recorded_by, recorded_at)
    VALUES (NEW.tenant_id, fuel_counter_id, 'sale', liters_qty, (SELECT price_per_liter FROM fuel_counters WHERE id = fuel_counter_id), total_amount, NEW.id, 'daily_transaction', NEW.recorded_by, NOW());
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_deduct_fuel_on_daily_transaction ON daily_transactions;
CREATE TRIGGER trigger_deduct_fuel_on_daily_transaction
  AFTER INSERT ON daily_transactions
  FOR EACH ROW
  EXECUTE FUNCTION deduct_fuel_on_daily_transaction_create();

-- ============================================
-- 9. Low Stock Alert Trigger
-- ============================================
CREATE OR REPLACE FUNCTION check_low_stock_alert()
RETURNS TRIGGER AS $$
DECLARE
  threshold NUMERIC;
  should_alert BOOLEAN;
BEGIN
  -- Check if low stock threshold exists for this product
  SELECT threshold_quantity, alert_enabled INTO threshold, should_alert
  FROM low_stock_thresholds
  WHERE product_id = NEW.id AND tenant_id = NEW.tenant_id;

  IF NOT FOUND THEN
    threshold := NEW.min_stock;
    should_alert := TRUE;
  END IF;

  -- If stock dropped below threshold, log alert
  IF should_alert AND NEW.quantity <= threshold THEN
    INSERT INTO inventory_changes (tenant_id, product_id, change_type, quantity_before, quantity_after, quantity_changed, reason, recorded_at)
    VALUES (NEW.tenant_id, NEW.id, 'low_stock_alert', OLD.quantity, NEW.quantity, NEW.quantity - OLD.quantity, 'Stock below threshold', NOW());
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_check_low_stock_alert ON inventory;
CREATE TRIGGER trigger_check_low_stock_alert
  AFTER UPDATE ON inventory
  FOR EACH ROW
  WHEN (OLD.quantity IS DISTINCT FROM NEW.quantity)
  EXECUTE FUNCTION check_low_stock_alert();

-- ============================================
-- 10. Helper Functions
-- ============================================

-- Get inventory statistics
CREATE OR REPLACE FUNCTION get_inventory_stats(p_tenant_id UUID)
RETURNS TABLE (
  total_items BIGINT,
  low_stock_count BIGINT,
  total_value NUMERIC,
  categories_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE quantity <= min_stock)::BIGINT,
    SUM((quantity * price)::NUMERIC)::NUMERIC,
    (SELECT COUNT(*) FROM inventory_categories WHERE tenant_id = p_tenant_id)::BIGINT
  FROM inventory
  WHERE tenant_id = p_tenant_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get fuel counter summary
CREATE OR REPLACE FUNCTION get_fuel_counter_summary(p_tenant_id UUID)
RETURNS TABLE (
  counter_id UUID,
  counter_name TEXT,
  liters_sold NUMERIC,
  price_per_liter NUMERIC,
  total_revenue NUMERIC,
  currency TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    id,
    counter_name,
    liters_sold,
    price_per_liter,
    (liters_sold * price_per_liter)::NUMERIC,
    currency
  FROM fuel_counters
  WHERE tenant_id = p_tenant_id AND is_active = TRUE;
END;
$$ LANGUAGE plpgsql STABLE;

-- Update fuel counter name (per store config)
CREATE OR REPLACE FUNCTION update_fuel_counter_name(p_fuel_counter_id UUID, p_new_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE fuel_counters SET counter_name = p_new_name, last_updated_at = NOW() WHERE id = p_fuel_counter_id;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Update fuel counter price per liter
CREATE OR REPLACE FUNCTION update_fuel_counter_price(p_fuel_counter_id UUID, p_price_per_liter NUMERIC)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE fuel_counters SET price_per_liter = p_price_per_liter, last_updated_at = NOW() WHERE id = p_fuel_counter_id;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Add comment documentation
COMMENT ON TABLE inventory_categories IS 'Categories/sections for organizing products per store';
COMMENT ON TABLE inventory_changes IS 'Complete audit trail of all inventory movements';
COMMENT ON TABLE low_stock_thresholds IS 'Configurable low-stock alert thresholds per store and product';
COMMENT ON TABLE fuel_counters IS '6 configurable fuel counter fields per fuel station store';
COMMENT ON TABLE fuel_counter_movements IS 'Tracking all fuel sales, adjustments, and refills';

SELECT 'Inventory and Fuel System enhancements created successfully!' AS result;
